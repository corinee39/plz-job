# AI 응답 속도 개선 정리

> 공고 상세의 **AI 면접 질문 생성**(`POST /api/ai/interview-questions`)과 **대시보드 리포트**(`POST /api/ai/dashboard-report`)가 너무 느렸던 문제를 어떻게 진단하고 고쳤는지에 대한 기록.
> 핵심 결론부터: **느렸던 진짜 원인은 코드가 아니라 "GPU를 두고 CPU로 추론하던 것"이었다.** warm 기준 수십 초 → **약 1.6초**로 떨어졌다.

---

## 0. 호출 경로 먼저 이해하기

느린 구간을 찾으려면 요청이 어디를 거치는지부터 봐야 한다.

```
프론트(AI 페이지)
  → POST /api/ai/interview-questions       (AiController)
    → AiService.interviewQuestions(...)     프롬프트 조립 + 검증
      → LlmClient.generateJson(prompt)      Ollama HTTP 호출 (동기)
        → Ollama(컨테이너 :11435) → gemma3:4b 추론   ← 시간의 99%가 여기
      ← JSON 문자열
    ← 파싱·검증·disclaimer·DB 저장
  ← ApiResponse<JsonNode>
```

- 백엔드는 Ollama가 **답변 전체를 다 만들 때까지 블로킹**으로 기다린다(`stream: false`).
- 즉 체감 지연 = **거의 전부 LLM 추론 시간**. 백엔드 자바 로직이나 DB는 무시할 수준.
- 따라서 "추론 시간 자체를 줄이는 것"이 유일하게 의미 있는 개선이다.

---

## 1. 진단: 추측하지 말고 측정한다

느리다고 바로 프롬프트를 줄이는 건 헛다리일 수 있다. Ollama 상태부터 찍어봤다.

```bash
curl -s http://localhost:11435/api/ps
```

```json
{ "models": [ { "name": "gemma3:4b", "size": 2881811905,
               "size_vram": 0,            // ← 결정적 단서
               "context_length": 4096 } ] }
```

여기서 **`size_vram: 0`** 이 모든 걸 설명한다.

- `size`(총 크기)는 2.8GB인데 그중 **VRAM에 올라간 양이 0** = 모델이 **GPU를 전혀 안 쓰고 CPU/RAM에서만** 돌고 있다는 뜻.
- 그런데 이 PC엔 GPU가 있다:

```bash
nvidia-smi -L
# GPU 0: NVIDIA GeForce RTX 4060
```

> 🤔 **왜 이게 치명적인가?** 4B(40억 파라미터) 모델을 CPU로 추론하면 토큰을 초당 몇 개밖에 못 뽑는다. 면접 질문 5개 + 꼬리질문 + summary면 출력이 수백~천 토큰이라 수십 초가 걸린다. 같은 모델을 GPU(4060)에 올리면 보통 **10~30배** 빨라진다. 즉 프롬프트를 아무리 다듬어도 CPU인 한 근본적으로 느릴 수밖에 없다.

---

## 2. 왜 GPU를 안 쓰고 있었나 — `docker-compose.yml`

Ollama는 도커 컨테이너(host `11435`)로 떠 있다. compose 파일을 보니 GPU 패스스루가 **주석 처리**돼 있었다.

```yaml
# (before) docker-compose.yml — ollama 서비스
    restart: unless-stopped
    networks: [plzjob-net]
    # ── GPU 가속을 쓰려면 주석 해제 (NVIDIA Container Toolkit 필요) ──
    # deploy:
    #   resources:
    #     reservations:
    #       devices:
    #         - driver: nvidia
    #           count: all
    #           capabilities: [gpu]
```

컨테이너 안에서 GPU가 안 보이면 Ollama는 자동으로 CPU 폴백을 한다. 그래서 `size_vram: 0`이 된 것.

**도커 쪽 준비 상태도 확인**했다(주석을 풀어도 되는지):

```bash
docker info --format '{{json .Runtimes}}'
# ... "nvidia":{"path":"nvidia-container-runtime", ... }  ← 런타임 이미 설치됨
```

NVIDIA Container Toolkit이 이미 등록돼 있었다. **즉 주석만 풀면 바로 동작하는 상황**이었다.

> 참고: 네이티브 Ollama(`11434`)로 우회하는 방법도 검토했지만, `curl :11434/api/tags`가 빈 응답 → **꺼져 있어서** 그 경로는 불가. 컨테이너(11435)를 GPU로 돌리는 게 유일한 해법이었다.

### 적용한 변경

```yaml
# (after) docker-compose.yml — ollama 서비스
    restart: unless-stopped
    networks: [plzjob-net]
    # ── GPU 가속 (NVIDIA Container Toolkit 필요). docker의 nvidia 런타임으로 RTX 4060 사용 ──
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]
```

그리고 컨테이너 재생성:

```bash
docker compose up -d ollama
```

> 🤔 **모델은 다시 안 받아도 되나?** 안 받아도 된다. compose가 호스트의 모델 디렉터리(`D:/data/ollama_data/models`)를 컨테이너에 마운트하므로, 컨테이너를 재생성해도 받아둔 `gemma3:4b`를 그대로 재사용한다.

---

## 3. 함께 적용한 백엔드 튜닝 (GPU 전환 전에 먼저 넣었던 것들)

GPU 전환이 핵심이었지만, 그 전에 "코드로 할 수 있는 개선"도 함께 넣어뒀다. 계약(동기 `ApiResponse<JsonNode>` 반환)은 그대로 두고 **실제 추론량**을 줄이는 방향이다.

### 3-1. LLM 호출 옵션 추가 — `LlmClient.java`

기존에는 Ollama에 옵션을 **하나도 안 넘기고** 있었다(기본값에 의존). 4가지를 명시했다.

```java
// 호출 바디에 추가된 부분
"keep_alive", keepAlive,          // 30m — 모델을 메모리에 상주시켜 콜드 스타트 방지
"options", Map.of(
    "temperature", temperature,   // 0.2 — 낮을수록 JSON 형식을 안정적으로 따름
    "num_predict", numPredict,    // 1024 — 출력 토큰 상한(런어웨이 방지)
    "num_ctx",     numCtx)        // 4096 — 컨텍스트 길이
```

각 옵션의 의도:

| 옵션 | 값 | 왜 |
|---|---|---|
| `keep_alive` | `30m` | 기본값은 5분. 그 사이 안 쓰면 모델이 메모리에서 내려가 다음 호출에 **재로딩 비용**(콜드 스타트)이 붙는다. 30분으로 늘려 연속 사용 중엔 항상 warm 상태 유지. |
| `temperature` | `0.2` | 작은 모델은 자유도가 높으면 JSON 스키마를 자주 깬다. 낮추면 형식 준수율↑ → **재시도(아래 3-3)를 덜 타서** 평균 지연↓. |
| `num_predict` | `1024` | 출력 토큰 상한. 모델이 폭주해 끝없이 생성하는 최악의 경우를 막는 안전장치. |
| `num_ctx` | `4096` | 컨텍스트 창을 프롬프트 크기에 맞게 고정. 불필요하게 크면 메모리·계산만 늘어난다. |

이 값들은 전부 `application.yaml`에서 환경변수로 조절 가능하게 뺐다(재컴파일 불필요).

```yaml
llm:
  keep-alive:  ${LLM_KEEP_ALIVE:30m}
  num-predict: ${LLM_NUM_PREDICT:1024}
  num-ctx:     ${LLM_NUM_CTX:4096}
  temperature: ${LLM_TEMPERATURE:0.2}
```

### 3-2. 프롬프트 축소 + 출력 고정 — `AiService.java`

```
(before) 규칙: 질문 5개 이상, 질문마다 followUps 1개 이상.
(after)  규칙: 질문 정확히 5개, 질문마다 followUps 1개.

(before) truncate(description, 1500), truncate(extractedText, 3000)
(after)  truncate(description, 1000), truncate(extractedText, 2000)
```

- **"이상" → "정확히"**: `이상`은 출력량 무제한이라 모델이 7~8개씩 길게 뽑을 수 있다. 고정하면 **생성 토큰 수가 예측 가능**해지고, 생성 시간은 출력 토큰 수에 거의 비례하므로 그만큼 짧아진다.
- **truncate 축소**: 프롬프트가 작아지면 생성 시작 전 **prefill(입력 처리)** 시간이 준다.

> 🤔 **이 튜닝만으로는 왜 부족했나?** 토큰을 줄여도 *CPU의 토큰당 속도 자체*가 느리면 한계가 있다. 그래서 "조금 빨라졌지만 여전히 느림" 상태였고, 진짜 병목인 GPU 전환(2장)으로 넘어간 것.

### 3-3. (기존 코드) 재시도 2배 함정

`AiService.callAndParse`는 JSON 파싱/검증 실패 시 **최대 2회** LLM을 호출한다. 첫 응답이 스키마를 어기면 그대로 한 번 더 부르므로 지연이 2배가 된다. → 3-1의 `temperature: 0.2`가 이 재시도 발생 자체를 줄여 평균 지연을 낮춘다.

---

## 4. 측정 결과

### GPU 전환 검증

```bash
# 컨테이너가 GPU를 보는가
docker exec plzjob-ollama nvidia-smi -L
# GPU 0: NVIDIA GeForce RTX 4060   ✓

# 모델이 VRAM에 올라갔는가
curl -s http://localhost:11435/api/ps
# gemma3:4b  size_vram = 2748380610 / total = 2748380610   ← 100% VRAM ✓
```

`size_vram`이 `0` → 총 크기와 동일(=전량 VRAM)로 바뀐 게 핵심 증거.

### 응답 시간 (실측)

| 항목 | Before (CPU) | After (GPU) |
|---|---|---|
| 컨테이너 GPU 인식 | ✗ | ✓ RTX 4060 |
| 모델 적재 위치 | RAM (`size_vram=0`) | **VRAM 100%** (`size_vram≈2.75GB`) |
| **warm 생성 1건** | 수십 초 | **약 1.6초** |
| 첫 호출(콜드, VRAM 적재 포함) | — | 약 69초 (1회성) |
| GPU 메모리 사용 | — | 4161 / 8188 MiB |

---

## 5. 개선 요약 (영향 큰 순서)

1. **(핵심) GPU 패스스루 활성화** — CPU→RTX 4060. 단일 변경으로 가장 큰 효과. `docker-compose.yml`
2. **`keep_alive: 30m`** — 콜드 스타트 제거(연속 사용 시 항상 warm). `LlmClient.java`
3. **`temperature: 0.2`** — JSON 형식 안정 → 재시도 2배 회피. `LlmClient.java`
4. **출력 고정("정확히 5개") + 프롬프트 축소** — 생성·prefill 토큰 절감. `AiService.java`
5. **`num_predict` / `num_ctx` 상한** — 폭주 방지·메모리 절약. `LlmClient.java`

---

## 6. 남은 개선 여지 (아직 안 한 것)

- **콜드 스타트(첫 69초) 제거**: 백엔드 기동 시 더미 프롬프트로 모델을 미리 워밍업(preload)하면, 사용자의 첫 요청도 빠르게 받을 수 있다.
- **SSE 스트리밍**: 토큰을 생성되는 대로 화면에 흘려보내면 *체감* 지연이 더 줄어든다. 단, 응답 계약(동기 JSON 반환·DB 저장)과 프론트엔드를 함께 바꿔야 해서 작업량이 크다.
- **더 빠른 모델/양자화**: 품질이 허용된다면 더 작은 모델로 추가 단축 가능(`LLM_MODEL`로 교체).

---

### 한 줄 결론

> 프롬프트 튜닝도 거들었지만, **진짜 병목은 "GPU 미사용"이었고 docker-compose의 GPU 패스스루 한 줄(주석 해제)이 수십 초 → 1.6초 개선의 대부분을 만들었다.** 성능 문제는 추측보다 `/api/ps`·`nvidia-smi` 같은 **측정**으로 원인을 먼저 특정하는 게 빠르다.
