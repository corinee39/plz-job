import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageShell } from "../components/layout/PageShell";
import { StageBadge } from "../components/common/StageBadge";
import { EmptyState } from "../components/common/EmptyState";
import { ErrorState } from "../components/common/ErrorState";
import { LoadingSkeleton } from "../components/common/LoadingSkeleton";
import { DdayBadge } from "../components/common/DdayBadge";
import { getJobPostings, updateJobPosting, deleteJobPosting } from "../features/jobPostings/api";
import { STAGE_CODES } from "../constants/stageCodes";

// UI-03 — 검색, 상태 필터, 페이지네이션, 수정/삭제 (JOB-05, 06, 08)
export default function JobPostingListPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [stage, setStage] = useState("");
  const [company, setCompany] = useState("");
  const [page, setPage] = useState(0);
  // 인라인 마감일 편집 상태
  const [editDeadlineId, setEditDeadlineId] = useState(null);
  const [editDeadlineVal, setEditDeadlineVal] = useState("");

  const params = {
    page,
    size: 20,
    ...(stage && { stage }),
    ...(company && { company }),
  };

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["jobPostings", params],
    queryFn: () => getJobPostings(params),
    keepPreviousData: true,
  });

  const deadlineMutation = useMutation({
    mutationFn: ({ id, deadline }) => updateJobPosting(id, { deadline: deadline || null }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobPostings"] });
      setEditDeadlineId(null);
    },
    onError: (err) => {
      alert(err?.message ?? "마감일 수정에 실패했습니다.");
      setEditDeadlineId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteJobPosting,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["jobPostings"] }),
    onError: (err) => alert(err?.message ?? "삭제에 실패했습니다."),
  });

  const onStageChange = (e) => { setStage(e.target.value); setPage(0); };
  const onCompanyChange = (e) => { setCompany(e.target.value); setPage(0); };

  const startEditDeadline = (j) => {
    setEditDeadlineId(j.jobPostingId);
    setEditDeadlineVal(j.deadline ?? "");
  };

  const commitDeadline = (id) => {
    deadlineMutation.mutate({ id, deadline: editDeadlineVal });
  };

  return (
    <PageShell title="공고 목록" description="내가 등록한 지원 공고를 관리합니다.">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          <select
            value={stage}
            onChange={onStageChange}
            className="rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm bg-transparent"
          >
            <option value="">전체 단계</option>
            {Object.entries(STAGE_CODES).map(([code, label]) => (
              <option key={code} value={code}>{label}</option>
            ))}
          </select>
          <input
            value={company}
            onChange={onCompanyChange}
            placeholder="회사명 검색"
            className="rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm bg-transparent w-40"
          />
        </div>
        <div className="flex gap-2">
          <Link
            to="/board"
            className="rounded-md border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-sm text-center hover:bg-zinc-50 dark:hover:bg-zinc-800"
          >
            보드 보기
          </Link>
          <Link
            to="/job-postings/new"
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900 text-center"
          >
            + 공고 등록
          </Link>
        </div>
      </div>

      {isLoading ? (
        <LoadingSkeleton />
      ) : isError ? (
        <ErrorState
          title="공고를 불러오지 못했습니다"
          description={error?.message}
          onRetry={refetch}
        />
      ) : data.content.length === 0 ? (
        <EmptyState
          title="등록된 공고가 없습니다"
          description="공고 URL을 입력해 자동으로 등록해 보세요."
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">회사</th>
                  <th className="px-4 py-3 text-left font-medium">공고명</th>
                  <th className="px-4 py-3 text-left font-medium hidden sm:table-cell">직무</th>
                  <th className="px-4 py-3 text-left font-medium hidden md:table-cell">지역</th>
                  <th className="px-4 py-3 text-left font-medium hidden md:table-cell">마감</th>
                  <th className="px-4 py-3 text-left font-medium">단계</th>
                  <th className="px-4 py-3 text-right font-medium">액션</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {data.content.map((j) => (
                  <tr key={j.jobPostingId} className="hover:bg-zinc-50 dark:hover:bg-zinc-900">
                    <td className="px-4 py-3 font-medium">{j.companyName}</td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/job-postings/${j.jobPostingId}`}
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {j.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-zinc-500 hidden sm:table-cell">{j.position ?? "-"}</td>
                    <td className="px-4 py-3 text-zinc-500 hidden md:table-cell">{j.region ?? "-"}</td>
                    <td className="px-4 py-3 text-zinc-500 hidden md:table-cell">
                      {editDeadlineId === j.jobPostingId ? (
                        <input
                          type="date"
                          value={editDeadlineVal}
                          autoFocus
                          onChange={(e) => setEditDeadlineVal(e.target.value)}
                          onBlur={() => commitDeadline(j.jobPostingId)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitDeadline(j.jobPostingId);
                            if (e.key === "Escape") setEditDeadlineId(null);
                          }}
                          className="rounded border border-zinc-300 dark:border-zinc-700 px-2 py-1 text-xs bg-transparent w-32"
                        />
                      ) : (
                        <span
                          className="flex items-center gap-1.5 group cursor-pointer"
                          onClick={() => startEditDeadline(j)}
                          title="클릭해서 마감일 수정"
                        >
                          {j.deadline ? (
                            <>
                              {j.deadline}
                              <DdayBadge deadline={j.deadline} />
                            </>
                          ) : (
                            <span className="text-zinc-300">-</span>
                          )}
                          <span className="opacity-0 group-hover:opacity-60 text-zinc-400 text-xs">✎</span>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StageBadge code={j.stage ?? j.currentStage} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => navigate(`/job-postings/${j.jobPostingId}`)}
                          className="rounded-md border border-zinc-300 dark:border-zinc-700 px-2.5 py-1 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        >
                          수정
                        </button>
                        <button
                          disabled={deleteMutation.isPending}
                          onClick={() => {
                            if (confirm(`'${j.companyName} — ${j.title}' 공고를 삭제할까요?`))
                              deleteMutation.mutate(j.jobPostingId);
                          }}
                          className="rounded-md border border-red-200 dark:border-red-900 px-2.5 py-1 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-950 disabled:opacity-40"
                        >
                          삭제
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-center gap-4 text-sm">
            <button
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-1.5 disabled:opacity-40"
            >
              이전
            </button>
            <span className="text-zinc-500">
              {page + 1} / {data.totalPages || 1}
              {isFetching && " …"}
            </span>
            <button
              disabled={data.last || page + 1 >= data.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-1.5 disabled:opacity-40"
            >
              다음
            </button>
          </div>
        </>
      )}
    </PageShell>
  );
}
