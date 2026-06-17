import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageShell } from "../components/layout/PageShell";
import { StageBadge } from "../components/common/StageBadge";
import { ErrorState } from "../components/common/ErrorState";
import { LoadingSkeleton } from "../components/common/LoadingSkeleton";
import {
  getJobPosting,
  changeStage,
  getStageHistories,
} from "../features/jobPostings/api";
import { STAGE_CODES } from "../constants/stageCodes";

// UI-05 — 공고 정보, 지원 단계 변경, 단계 이력 (JOB-06·07)
export default function JobPostingDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const detail = useQuery({
    queryKey: ["jobPosting", id],
    queryFn: () => getJobPosting(id),
  });

  const appId = detail.data?.applicationId;

  const histories = useQuery({
    queryKey: ["stageHistories", appId],
    queryFn: () => getStageHistories(appId),
    enabled: !!appId,
  });

  const [toStage, setToStage] = useState("");
  const [memo, setMemo] = useState("");

  const stageMutation = useMutation({
    mutationFn: () => changeStage(appId, { toStage, memo: memo || null }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobPosting", id] });
      qc.invalidateQueries({ queryKey: ["stageHistories", appId] });
      qc.invalidateQueries({ queryKey: ["jobPostings"] });
      setToStage("");
      setMemo("");
    },
    onError: (err) => alert(err?.message ?? "단계 변경에 실패했습니다."),
  });

  if (detail.isLoading) return <LoadingSkeleton />;
  if (detail.isError)
    return (
      <ErrorState
        title="공고를 불러오지 못했습니다"
        description={detail.error?.message}
        onRetry={detail.refetch}
      />
    );

  const j = detail.data;

  return (
    <PageShell
      title={`${j.companyName} — ${j.title}`}
      description={[j.position, j.region].filter(Boolean).join(" · ")}
    >
      {/* 공고 기본 정보 */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 space-y-3">
        <div className="flex flex-wrap gap-2 items-center">
          <StageBadge code={j.currentStage} />
          {j.deadline && (
            <span className="text-xs text-zinc-500">마감 {j.deadline}</span>
          )}
          {j.url && (
            <a
              href={j.url}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline ml-auto"
            >
              원문 공고 ↗
            </a>
          )}
        </div>
        {j.techStacks?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {j.techStacks.map((t) => (
              <span
                key={t}
                className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-xs text-zinc-600 dark:text-zinc-300"
              >
                {t}
              </span>
            ))}
          </div>
        )}
        {j.description && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap">
            {j.description}
          </p>
        )}
      </div>

      {/* 단계 변경 */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 space-y-3">
        <h2 className="text-sm font-semibold">지원 단계 변경</h2>
        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            value={toStage}
            onChange={(e) => setToStage(e.target.value)}
            className="rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm bg-transparent flex-1"
          >
            <option value="">단계 선택</option>
            {Object.entries(STAGE_CODES).map(([code, label]) => (
              <option key={code} value={code}>{label}</option>
            ))}
          </select>
          <input
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="메모 (선택)"
            className="rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm bg-transparent flex-1"
          />
          <button
            disabled={!toStage || stageMutation.isPending}
            onClick={() => stageMutation.mutate()}
            className="rounded-md bg-zinc-900 dark:bg-zinc-100 px-4 py-2 text-sm text-white dark:text-zinc-900 disabled:opacity-40 shrink-0"
          >
            {stageMutation.isPending ? "변경 중…" : "변경"}
          </button>
        </div>
      </div>

      {/* 단계 이력 */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 space-y-3">
        <h2 className="text-sm font-semibold">단계 이력</h2>
        {histories.isLoading ? (
          <LoadingSkeleton />
        ) : histories.data?.length === 0 ? (
          <p className="text-sm text-zinc-500">이력이 없습니다.</p>
        ) : (
          <ol className="space-y-3">
            {histories.data?.map((h) => (
              <li key={h.historyId} className="flex gap-3 text-sm">
                <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-zinc-400 shrink-0 mt-2" />
                <div>
                  <span className="text-zinc-500">
                    {h.fromStage ? (
                      <>
                        <StageBadge code={h.fromStage} />
                        {" → "}
                      </>
                    ) : (
                      "시작 → "
                    )}
                  </span>
                  <StageBadge code={h.toStage} />
                  <span className="ml-2 text-xs text-zinc-400">
                    {new Date(h.changedAt).toLocaleString("ko-KR")}
                  </span>
                  {h.memo && (
                    <p className="mt-0.5 text-zinc-500 text-xs">{h.memo}</p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* 이후 Phase에서 붙을 영역 안내 */}
      <div className="rounded-xl border border-dashed border-zinc-200 dark:border-zinc-700 p-5 space-y-1">
        <p className="text-xs text-zinc-400">
          Phase 4: 제출 문서 연결 · Phase 5: 일정/회고 · Phase 6: AI 면접 질문
        </p>
      </div>

      <div className="flex justify-between">
        <button
          onClick={() => navigate("/job-postings")}
          className="rounded-md border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-sm"
        >
          ← 목록으로
        </button>
      </div>
    </PageShell>
  );
}
