import { useParams } from "react-router-dom";
import { PageShell } from "../components/layout/PageShell";
import { AiDisclaimerBadge } from "../components/common/AiDisclaimerBadge";

// UI-07 — 문서 선택, 질문 생성, 결과 저장 및 재생성 (AI-01~04, 06~09)
export default function InterviewAiPage() {
  const { id } = useParams();

  return (
    <PageShell title="AI 면접 준비" description={`공고 #${id} 기준 예상 면접 질문을 생성합니다.`}>
      <button className="rounded-md bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900">
        예상 질문 생성하기
      </button>
      <AiDisclaimerBadge />
      <p className="text-xs text-zinc-500">
        Ollama 호출은 비동기로 처리되며, 진행 상태가 표시될 예정입니다(§12.2). 질문은 기술/경험/문제해결/인성으로 구분되어
        표시됩니다(AI-04).
      </p>
    </PageShell>
  );
}
