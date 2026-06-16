import { useParams } from "react-router-dom";
import { PageShell } from "../components/layout/PageShell";
import { StageBadge } from "../components/common/StageBadge";

// UI-05 — 공고 정보, 지원 단계, 일정, 제출 문서, 회고, AI 질문 (JOB-06·07, DOC-03, PROC-01~04, AI-02~04)
export default function JobPostingDetailPage() {
  const { id } = useParams();

  return (
    <PageShell title={`공고 상세 (#${id})`} description="지원 단계, 일정, 제출 문서, 회고를 확인합니다.">
      <div className="flex items-center gap-2">
        <span className="text-sm text-zinc-500">현재 단계</span>
        <StageBadge code="APPLIED" />
      </div>
      <p className="text-sm text-zinc-500">
        추후 단계 변경 이력(JOB-07), 제출 문서 연결(DOC-03), 일정/회고, AI 면접 질문 영역이 들어갈 자리입니다.
      </p>
    </PageShell>
  );
}
