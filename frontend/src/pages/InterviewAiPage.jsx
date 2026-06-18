import { useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageShell } from "../components/layout/PageShell";
import { AiDisclaimerBadge } from "../components/common/AiDisclaimerBadge";
import { ErrorState } from "../components/common/ErrorState";
import { LoadingSkeleton } from "../components/common/LoadingSkeleton";
import { getDocuments, getDocument } from "../features/documents/api";
import { generateInterviewQuestions, getGenerations } from "../features/ai/api";

const CATEGORY_LABELS = {
  TECHNICAL: "기술",
  PROJECT: "프로젝트",
  PROBLEM_SOLVING: "문제 해결",
  PERSONALITY: "인성",
};

const CATEGORY_COLORS = {
  TECHNICAL: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  PROJECT: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  PROBLEM_SOLVING: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  PERSONALITY: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
};

// UI-07 — 문서 선택, 질문 생성, 결과 표시 (AI-01~04, 06~09)
export default function InterviewAiPage() {
  const { id: jobPostingId } = useParams();
  // applicationId = jobPostingId + 1000 (MSW 컨벤션과 동일)
  const applicationId = Number(jobPostingId) + 1000;

  const [docId, setDocId] = useState("");
  const [versionId, setVersionId] = useState("");
  const [result, setResult] = useState(null);

  const docs = useQuery({
    queryKey: ["documents"],
    queryFn: getDocuments,
  });

  const docDetail = useQuery({
    queryKey: ["document", docId],
    queryFn: () => getDocument(docId),
    enabled: !!docId,
  });

  const generations = useQuery({
    queryKey: ["aiGenerations", applicationId],
    queryFn: () => getGenerations({ applicationId, type: "INTERVIEW_QUESTIONS" }),
  });

  const generate = useMutation({
    mutationFn: ({ regenerate }) =>
      generateInterviewQuestions(applicationId, {
        documentVersionId: Number(versionId),
        regenerate,
      }),
    onSuccess: (data) => {
      setResult(data);
      generations.refetch();
    },
    onError: () => {},
  });

  const errorCode = generate.error?.code;
  const inputCls =
    "rounded-md border border-zinc-300 dark:border-zinc-600 px-3 py-2 text-sm bg-transparent";

  const hasExtractedVersions = (docDetail.data?.versions ?? []).filter(
    (v) => v.hasExtractedText
  );

  return (
    <PageShell
      title="AI 면접 준비"
      description="공고와 제출 서류를 바탕으로 예상 면접 질문을 생성합니다."
    >
      {/* 문서·버전 선택 */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 space-y-4">
        <h2 className="text-sm font-semibold">서류 선택</h2>
        <p className="text-xs text-zinc-500">
          텍스트가 추출된 이력서·자소서 버전을 선택하면 AI가 공고 내용과 연결해 질문을 생성합니다.
        </p>

        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            value={docId}
            onChange={(e) => {
              setDocId(e.target.value);
              setVersionId("");
            }}
            className={`flex-1 ${inputCls}`}
          >
            <option value="">문서 선택</option>
            {(docs.data ?? []).map((d) => (
              <option key={d.documentId} value={d.documentId}>
                {d.title}
              </option>
            ))}
          </select>

          <select
            value={versionId}
            onChange={(e) => setVersionId(e.target.value)}
            disabled={!docId || docDetail.isLoading}
            className={`flex-1 ${inputCls} disabled:opacity-40`}
          >
            <option value="">버전 선택 (텍스트 추출 필요)</option>
            {hasExtractedVersions.map((v) => (
              <option key={v.versionId} value={v.versionId}>
                {v.versionName} · {v.fileName}
              </option>
            ))}
          </select>
        </div>

        {docId && !docDetail.isLoading && hasExtractedVersions.length === 0 && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            이 문서에는 텍스트가 추출된 버전이 없습니다. PDF 또는 TXT 파일을 다시 업로드해 주세요.
          </p>
        )}

        <div className="flex gap-2">
          <button
            disabled={!versionId || generate.isPending}
            onClick={() => generate.mutate({ regenerate: false })}
            className="rounded-md bg-zinc-900 dark:bg-zinc-100 px-4 py-2 text-sm text-white dark:text-zinc-900 disabled:opacity-40"
          >
            {generate.isPending ? "생성 중…" : "예상 질문 생성하기"}
          </button>
          {result && (
            <button
              disabled={generate.isPending}
              onClick={() => generate.mutate({ regenerate: true })}
              className="rounded-md border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-sm disabled:opacity-40"
            >
              재생성
            </button>
          )}
        </div>

        {generate.isPending && (
          <p className="text-xs text-zinc-500">
            Ollama가 공고와 서류를 분석하고 있습니다. 수십 초 걸릴 수 있습니다…
          </p>
        )}
      </div>

      {/* 오류 메시지 */}
      {generate.isError && (
        <ErrorState
          title={
            errorCode === "LLM_UNAVAILABLE"
              ? "AI 서비스를 사용할 수 없습니다"
              : errorCode === "DOCUMENT_TEXT_EMPTY"
              ? "서류 텍스트가 없습니다"
              : "질문 생성에 실패했습니다"
          }
          description={
            errorCode === "LLM_UNAVAILABLE"
              ? "Ollama가 실행 중이지 않습니다. 백엔드 서버를 확인해 주세요."
              : errorCode === "DOCUMENT_TEXT_EMPTY"
              ? "선택한 버전에서 텍스트를 추출할 수 없었습니다. 다른 파일을 업로드하거나 직접 입력해 주세요."
              : generate.error?.message
          }
        />
      )}

      {/* 생성 결과 */}
      {result && (
        <QuestionResult result={result} />
      )}

      {/* 이전 생성 이력 */}
      {!result && (
        <GenerationHistory generations={generations.data ?? []} isLoading={generations.isLoading} />
      )}
    </PageShell>
  );
}

function QuestionResult({ result }) {
  const grouped = Object.keys(CATEGORY_LABELS).reduce((acc, cat) => {
    const qs = result.questions.filter((q) => q.category === cat);
    if (qs.length > 0) acc[cat] = qs;
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {result.summary && (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
          <p className="text-xs font-medium text-zinc-500 mb-1">분석 요약</p>
          <p className="text-sm text-zinc-700 dark:text-zinc-300">{result.summary}</p>
        </div>
      )}

      {Object.entries(grouped).map(([category, questions]) => (
        <div key={category} className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                CATEGORY_COLORS[category] ?? "bg-zinc-100 text-zinc-600"
              }`}
            >
              {CATEGORY_LABELS[category] ?? category}
            </span>
            <span className="text-xs text-zinc-400">{questions.length}개</span>
          </div>

          <ol className="space-y-5">
            {questions.map((q, i) => (
              <li key={i} className="space-y-2">
                <p className="text-sm font-medium">
                  {i + 1}. {q.question}
                </p>
                {q.reason && (
                  <p className="text-xs text-zinc-500 pl-3 border-l-2 border-zinc-200 dark:border-zinc-700">
                    {q.reason}
                  </p>
                )}
                {q.followUps?.length > 0 && (
                  <ul className="pl-4 space-y-1">
                    {q.followUps.map((fu, fi) => (
                      <li key={fi} className="text-xs text-zinc-600 dark:text-zinc-400 flex gap-2">
                        <span className="shrink-0 text-zinc-400">↳</span>
                        {fu}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ol>
        </div>
      ))}

      <AiDisclaimerBadge text={result.disclaimer} />
    </div>
  );
}

function GenerationHistory({ generations, isLoading }) {
  if (isLoading) return <LoadingSkeleton />;
  if (generations.length === 0) return null;

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 space-y-3">
      <h2 className="text-sm font-semibold">이전 생성 이력</h2>
      <ul className="space-y-1.5">
        {generations.map((g) => (
          <li key={g.generationId} className="flex items-center gap-2 text-xs text-zinc-500">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 shrink-0" />
            {new Date(g.createdAt).toLocaleString("ko-KR")} 생성 (#{g.generationId})
          </li>
        ))}
      </ul>
    </div>
  );
}
