import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageShell } from "../components/layout/PageShell";
import { AsyncBoundary } from "../components/common/AsyncBoundary";
import { getSchedules, updateSchedule, deleteSchedule } from "../features/schedules/api";
import { SCHEDULE_TYPE_LABELS } from "../constants/stageCodes";

const TYPE_COLORS = {
  DEADLINE: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  CODING_TEST: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  INTERVIEW: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  ETC: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
};

function ScheduleTypeBadge({ type }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_COLORS[type] ?? TYPE_COLORS.ETC}`}>
      {SCHEDULE_TYPE_LABELS[type] ?? type}
    </span>
  );
}

function formatDateTime(iso) {
  return new Date(iso).toLocaleString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// PROC-02·05 — 일정 목록 (§4.4)
export default function SchedulePage() {
  const qc = useQueryClient();
  const [showAll, setShowAll] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const { data = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["schedules"],
    queryFn: () => getSchedules({}),
  });

  const updateMutation = useMutation({
    mutationFn: ({ scheduleId, ...body }) => updateSchedule(scheduleId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["schedules"] });
      setEditId(null);
    },
    onError: (err) => alert(err?.message ?? "수정에 실패했습니다."),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSchedule,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["schedules"] }),
    onError: (err) => alert(err?.message ?? "삭제에 실패했습니다."),
  });

  // status 필드(PROC-05)로 필터링 — 없으면 startAt으로 fallback
  const now = new Date().toISOString();
  const visible = showAll
    ? data
    : data.filter((s) => (s.status ? s.status === "UPCOMING" : s.startAt >= now));

  return (
    <PageShell title="일정" description="전형 관련 일정을 한눈에 확인합니다.">
      <AsyncBoundary isLoading={isLoading} isError={isError} onRetry={refetch}>
        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-500">{visible.length}건</span>
          <button
            onClick={() => setShowAll((v) => !v)}
            className="text-xs text-zinc-500 underline-offset-2 hover:underline"
          >
            {showAll ? "예정된 일정만 보기" : "지난 일정 포함"}
          </button>
        </div>

        {visible.length === 0 ? (
          <p className="py-12 text-center text-sm text-zinc-500">
            {showAll
              ? "일정이 없습니다."
              : "예정된 일정이 없습니다. 공고 상세 페이지에서 일정을 추가하세요."}
          </p>
        ) : (
          <ul className="space-y-3">
            {visible.map((s) => {
              const isPast = s.status === "PAST" || s.startAt < now;
              return (
                <li
                  key={s.scheduleId}
                  className={`rounded-xl border p-4 space-y-2 transition-opacity ${
                    isPast
                      ? "border-zinc-100 dark:border-zinc-800 opacity-50"
                      : "border-zinc-200 dark:border-zinc-700"
                  }`}
                >
                  {editId === s.scheduleId ? (
                    <EditScheduleRow
                      form={editForm}
                      setForm={setEditForm}
                      onSave={() =>
                        updateMutation.mutate({ scheduleId: s.scheduleId, ...editForm })
                      }
                      onCancel={() => setEditId(null)}
                      isPending={updateMutation.isPending}
                    />
                  ) : (
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <ScheduleTypeBadge type={s.scheduleType} />
                          <span className="text-sm font-medium">{s.companyName}</span>
                        </div>
                        <p className="text-sm text-zinc-600 dark:text-zinc-300">
                          {formatDateTime(s.startAt)}
                        </p>
                        {s.memo && (
                          <p className="text-xs text-zinc-400">{s.memo}</p>
                        )}
                      </div>
                      <div className="flex shrink-0 gap-2 mt-0.5">
                        <button
                          onClick={() => {
                            setEditId(s.scheduleId);
                            setEditForm({
                              scheduleType: s.scheduleType,
                              startAt: s.startAt.slice(0, 16),
                              memo: s.memo ?? "",
                            });
                          }}
                          className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                        >
                          수정
                        </button>
                        <button
                          disabled={deleteMutation.isPending}
                          onClick={() => {
                            if (confirm("이 일정을 삭제할까요?"))
                              deleteMutation.mutate(s.scheduleId);
                          }}
                          className="text-xs text-red-500 hover:text-red-700"
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </AsyncBoundary>
    </PageShell>
  );
}

// PROC-01 — 일정 수정 폼 (§4.4: startAt, memo)
function EditScheduleRow({ form, setForm, onSave, onCancel, isPending }) {
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const inputCls =
    "rounded-md border border-zinc-300 dark:border-zinc-600 px-2 py-1.5 text-sm bg-transparent";
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <select value={form.scheduleType} onChange={set("scheduleType")} className={inputCls}>
          {Object.entries(SCHEDULE_TYPE_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <input
          type="datetime-local"
          value={form.startAt}
          onChange={set("startAt")}
          className={inputCls}
        />
      </div>
      <input
        placeholder="메모"
        value={form.memo}
        onChange={set("memo")}
        className={`w-full ${inputCls}`}
      />
      <div className="flex gap-2">
        <button
          disabled={isPending}
          onClick={onSave}
          className="rounded-md bg-zinc-900 dark:bg-zinc-100 px-3 py-1.5 text-xs text-white dark:text-zinc-900 disabled:opacity-40"
        >
          {isPending ? "저장 중…" : "저장"}
        </button>
        <button onClick={onCancel} className="text-xs text-zinc-500 hover:text-zinc-900">
          취소
        </button>
      </div>
    </div>
  );
}
