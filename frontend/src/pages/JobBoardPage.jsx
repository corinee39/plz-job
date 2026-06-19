import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { PageShell } from "../components/layout/PageShell";
import { AsyncBoundary } from "../components/common/AsyncBoundary";
import { LoadingSkeleton } from "../components/common/LoadingSkeleton";
import { EmptyState } from "../components/common/EmptyState";
import { DdayBadge } from "../components/common/DdayBadge";
import { getJobPostings, changeStage } from "../features/jobPostings/api";
import { STAGE_CODES, STAGE_KEYS } from "../constants/stageCodes";

// UI-03 확장 — 지원 단계 파이프라인 보드(칸반). 카드를 드래그해 단계 변경(JOB-07).
const BOARD_PARAMS = { page: 0, size: 100 };

export default function JobBoardPage() {
  const qc = useQueryClient();
  const [dragged, setDragged] = useState(null); // 드래그 중인 카드(공고)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["jobPostings", BOARD_PARAMS],
    queryFn: () => getJobPostings(BOARD_PARAMS),
  });

  // JOB-07 — 단계 변경(드롭). 낙관적 업데이트로 카드가 즉시 이동한다.
  const stageMutation = useMutation({
    mutationFn: ({ applicationId, toStage }) => changeStage(applicationId, { toStage }),
    onMutate: async ({ applicationId, toStage }) => {
      await qc.cancelQueries({ queryKey: ["jobPostings"] });
      const prev = qc.getQueriesData({ queryKey: ["jobPostings"] });
      qc.setQueriesData({ queryKey: ["jobPostings"] }, (old) => {
        if (!old?.content) return old;
        return {
          ...old,
          content: old.content.map((c) =>
            c.applicationId === applicationId ? { ...c, currentStage: toStage } : c
          ),
        };
      });
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      ctx?.prev?.forEach(([key, value]) => qc.setQueryData(key, value));
      alert("단계 변경에 실패했습니다.");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["jobPostings"] }),
  });

  const handleDrop = (toStage) => {
    if (dragged && dragged.currentStage !== toStage) {
      stageMutation.mutate({ applicationId: dragged.applicationId, toStage });
    }
    setDragged(null);
  };

  const postings = data?.content ?? [];
  const byStage = STAGE_KEYS.reduce((acc, code) => {
    acc[code] = postings.filter((p) => (p.currentStage ?? p.stage) === code);
    return acc;
  }, {});

  return (
    <PageShell
      title="지원 보드"
      description="공고 카드를 드래그해 지원 단계를 바꿉니다. 좌우로 스크롤하세요."
    >
      <div className="flex justify-end">
        <Link
          to="/job-postings"
          className="rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800"
        >
          목록 보기 →
        </Link>
      </div>

      <AsyncBoundary
        isLoading={isLoading}
        isError={isError}
        onRetry={refetch}
        loadingFallback={<LoadingSkeleton className="h-[60vh] w-full" />}
      >
        {postings.length === 0 ? (
          <EmptyState
            title="등록된 공고가 없습니다"
            description="공고를 등록하면 단계별 보드에서 진행 상황을 관리할 수 있습니다."
            actionLabel="+ 공고 등록"
            actionTo="/job-postings/new"
          />
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-4">
            {STAGE_KEYS.map((code) => (
              <BoardColumn
                key={code}
                code={code}
                cards={byStage[code]}
                onDrop={() => handleDrop(code)}
                onDragStartCard={setDragged}
                isDropTarget={dragged && dragged.currentStage !== code}
              />
            ))}
          </div>
        )}
      </AsyncBoundary>
    </PageShell>
  );
}

function BoardColumn({ code, cards, onDrop, onDragStartCard, isDropTarget }) {
  const [over, setOver] = useState(false);
  return (
    <div className="w-60 shrink-0">
      <div className="flex items-center justify-between px-1 pb-2">
        <span className="text-sm font-medium">{STAGE_CODES[code]}</span>
        <span className="text-xs text-zinc-400">{cards.length}</span>
      </div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (isDropTarget) setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={() => {
          setOver(false);
          onDrop();
        }}
        className={`min-h-[60vh] space-y-2 rounded-lg border p-2 transition-colors ${
          over
            ? "border-blue-400 bg-blue-50/60 dark:bg-blue-950/30"
            : "border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40"
        }`}
      >
        {cards.length === 0 ? (
          <p className="px-1 py-6 text-center text-xs text-zinc-300 dark:text-zinc-600">
            비어 있음
          </p>
        ) : (
          cards.map((card) => (
            <BoardCard key={card.jobPostingId} card={card} onDragStart={onDragStartCard} />
          ))
        )}
      </div>
    </div>
  );
}

function BoardCard({ card, onDragStart }) {
  return (
    <div
      draggable
      onDragStart={() => onDragStart(card)}
      className="cursor-grab rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-3 shadow-sm active:cursor-grabbing"
    >
      <p className="text-xs text-zinc-500 dark:text-zinc-400">{card.companyName}</p>
      <Link
        to={`/job-postings/${card.jobPostingId}`}
        className="mt-0.5 block text-sm font-medium text-zinc-800 hover:underline dark:text-zinc-100"
        onClick={(e) => e.stopPropagation()}
      >
        {card.title}
      </Link>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {card.position && (
          <span className="text-xs text-zinc-400">{card.position}</span>
        )}
        {card.deadline && <DdayBadge deadline={card.deadline} />}
      </div>
    </div>
  );
}
