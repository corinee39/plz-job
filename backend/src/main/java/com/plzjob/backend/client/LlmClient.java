package com.plzjob.backend.client;

import com.plzjob.backend.exception.CustomException;
import com.plzjob.backend.exception.ErrorCode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import java.util.Map;

@Slf4j
@Component
public class LlmClient {

    private static final int LLM_TIMEOUT_MS = 180_000;

    private final RestClient rest;

    public LlmClient() {
        SimpleClientHttpRequestFactory f = new SimpleClientHttpRequestFactory();
        f.setConnectTimeout(5_000);
        f.setReadTimeout(LLM_TIMEOUT_MS);
        this.rest = RestClient.builder().requestFactory(f).build();
    }

    @Value("${llm.base-url}")          private String baseUrl;
    @Value("${llm.model}")             private String model;
    @Value("${llm.keep-alive:30m}")    private String keepAlive;   // 모델을 메모리에 상주시켜 콜드 스타트 방지
    @Value("${llm.num-predict:1024}")  private int numPredict;      // 출력 토큰 상한(런어웨이 방지)
    @Value("${llm.num-ctx:4096}")      private int numCtx;          // 컨텍스트 길이(작을수록 빠르고 가벼움)
    @Value("${llm.temperature:0.2}")   private double temperature;  // 낮을수록 JSON 형식을 안정적으로 따름 → 재시도 감소

    /** format="json" — 단순히 유효한 JSON만 강제(스키마 미지정). */
    public String generateJson(String prompt) {
        return generate(prompt, "json");
    }

    /**
     * Ollama 구조화 출력(structured outputs) — format에 JSON 스키마를 넘겨
     * 모델이 정확히 그 스키마(키·타입)만 따르도록 문법 제약한다. 작은 모델이
     * 프롬프트 지시만으로 스키마를 못 맞추거나 입력을 그대로 echo 하는 문제를 방지.
     */
    public String generateJson(String prompt, Object schema) {
        return generate(prompt, schema);
    }

    @SuppressWarnings("unchecked")
    private String generate(String prompt, Object format) {
        try {
            Map<String, Object> res = rest.post().uri(baseUrl + "/api/generate")
                    .body(Map.of(
                            "model", model,
                            "prompt", prompt,
                            "stream", false,
                            "format", format,
                            "keep_alive", keepAlive,
                            "options", Map.of(
                                    "temperature", temperature,
                                    "num_predict", numPredict,
                                    "num_ctx", numCtx)))
                    .retrieve().body(Map.class);
            return res != null ? String.valueOf(res.get("response")) : "";
        } catch (Exception e) {
            log.warn("LLM 호출 실패: url={}/api/generate, model={}, 원인={}: {}",
                    baseUrl, model, e.getClass().getSimpleName(), e.getMessage());
            throw new CustomException(ErrorCode.LLM_UNAVAILABLE);
        }
    }

    public boolean isUp() {
        try {
            rest.get().uri(baseUrl + "/api/tags").retrieve().toBodilessEntity();
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    public String model() { return model; }
}
