import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar, dateFnsLocalizer, Views } from "react-big-calendar";
import { format, parse, startOfWeek, getDay, isSameMonth } from "date-fns";
import { ko } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { PageShell } from "../components/layout/PageShell";
import { AsyncBoundary } from "../components/common/AsyncBoundary";
import { getSchedules, updateSchedule, deleteSchedule } from "../features/schedules/api";
import { SCHEDULE_TYPE_LABELS } from "../constants/stageCodes";

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales: { ko },
});

const VIEW_LABELS = { month: "월", week: "주", agenda: "목록" };

// UI-03 — 커스텀 캘린더 툴바
function CalendarToolbar({ date, view, views, onNavigate, onView }) {
  const isToday = isSameMonth(date, new Date()) && date.getFullYear() === new Date().getFullYear();
  const label = format(date, view === "month" ? "yyyy년 M월" : view === "week" ? "yyyy년 M월" : "yyyy년 M월", { locale: ko });

  return (
    <div className="mb-3 grid grid-cols-3 items-center gap-2">
      {/* 빈 왼쪽 칸 (균형용) */}
      <div />
      {/* 월 내비게이션 — 중앙 */}
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={() => onNavigate("PREV")}
          className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          aria-label="이전"
        >
          ◀
        </button>
        <span className="min-w-[110px] text-center text-sm font-semibold text-zinc-800 dark:text-zinc-100">
          {label}
        </span>
        <button
          onClick={() => onNavigate("NEXT")}
          className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          aria-label="다음"
        >
          ▶
        </button>
      </div>

      {/* 오늘 버튼 + 뷰 전환 — 오른쪽 정렬 */}
      <div className="flex items-center justify-end gap-1.5">
        <button
          onClick={() => onNavigate("TODAY")}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            isToday
              ? "bg-zinc-200 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400 cursor-default"
              : "bg-zinc-900 text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          }`}
        >
          오늘
        </button>
        <div className="ml-1 flex rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden">
          {views.map((v) => (
            <button
              key={v}
              onClick={() => onView(v)}
              className={`px-2.5 py-1 text-xs transition-colors ${
                view === v
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }`}
            >
              {VIEW_LABELS[v] ?? v}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// 상세 패널 뱃지 색
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

// 달력 셀 내 이벤트: 뱃지 + 회사명 + 시간 + 메모
function EventCell({ event }) {
  const s = event.resource;
  const time = new Date(s.startAt).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <span className="flex flex-col gap-0.5 overflow-hidden py-0.5">
      <span className="flex items-center gap-1">
        <ScheduleTypeBadge type={s.scheduleType} />
        <span className="truncate text-xs font-medium text-zinc-800 dark:text-zinc-100">{s.companyName}</span>
      </span>
      <span className="pl-0.5 text-[10px] text-zinc-500 dark:text-zinc-400">{time}</span>
      {s.memo && (
        <span className="truncate pl-0.5 text-[10px] text-zinc-400 dark:text-zinc-500">{s.memo}</span>
      )}
    </span>
  );
}

// PROC-02·05 — 일정 달력 (§4.4)
export default function SchedulePage() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState(Views.MONTH);

  const { data = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["schedules"],
    queryFn: () => getSchedules({}),
  });

  const updateMutation = useMutation({
    mutationFn: ({ scheduleId, ...body }) => updateSchedule(scheduleId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["schedules"] });
      setIsEditing(false);
    },
    onError: (err) => alert(err?.message ?? "수정에 실패했습니다."),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSchedule,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["schedules"] });
      setSelected(null);
    },
    onError: (err) => alert(err?.message ?? "삭제에 실패했습니다."),
  });

  const events = data.map((s) => ({
    id: s.scheduleId,
    title: s.companyName,
    start: new Date(s.startAt),
    end: new Date(new Date(s.startAt).getTime() + 60 * 60 * 1000),
    resource: s,
  }));

  const eventStyleGetter = () => ({
    style: {
      backgroundColor: "transparent",
      border: "none",
      borderRadius: "4px",
      padding: "1px 2px",
      boxShadow: "none",
    },
  });

  const handleSelectEvent = (event) => {
    setSelected(event.resource);
    setIsEditing(false);
  };

  const startEdit = () => {
    setEditForm({
      scheduleType: selected.scheduleType,
      startAt: selected.startAt.slice(0, 16),
      memo: selected.memo ?? "",
    });
    setIsEditing(true);
  };

  return (
    <PageShell title="일정" description="전형 관련 일정을 달력에서 확인합니다.">
      <AsyncBoundary isLoading={isLoading} isError={isError} onRetry={refetch}>
        <div className="h-[600px]">
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            culture="ko"
            formats={{ agendaDateFormat: (date) => format(date, "M월 d일 (eee)", { locale: ko }) }}
            date={currentDate}
            view={currentView}
            onNavigate={setCurrentDate}
            onView={setCurrentView}
            views={[Views.MONTH, Views.WEEK, Views.AGENDA]}
            messages={{
              allDay: "종일",
              date: "날짜",
              time: "시간",
              event: "일정",
              noEventsInRange: "이 기간에 일정이 없습니다.",
              showMore: (count) => `+${count}개 더`,
            }}
            components={{ event: EventCell, toolbar: CalendarToolbar }}
            eventPropGetter={eventStyleGetter}
            step={60}
            timeslots={1}
            onSelectEvent={handleSelectEvent}
            style={{ height: "100%" }}
          />
        </div>

        {selected && (
          <div className="mt-4 rounded-xl border border-zinc-200 dark:border-zinc-700 p-4 space-y-3">
            {isEditing ? (
              <EditScheduleRow
                form={editForm}
                setForm={setEditForm}
                onSave={() =>
                  updateMutation.mutate({ scheduleId: selected.scheduleId, ...editForm })
                }
                onCancel={() => setIsEditing(false)}
                isPending={updateMutation.isPending}
              />
            ) : (
              <>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <ScheduleTypeBadge type={selected.scheduleType} />
                    <span className="text-sm font-medium">{selected.companyName}</span>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={startEdit}
                      className="rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-1.5 text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800"
                    >
                      수정
                    </button>
                    <button
                      disabled={deleteMutation.isPending}
                      onClick={() => {
                        if (confirm("이 일정을 삭제할까요?"))
                          deleteMutation.mutate(selected.scheduleId);
                      }}
                      className="rounded-md border border-red-200 dark:border-red-900 px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-950 disabled:opacity-40"
                    >
                      삭제
                    </button>
                    <button
                      onClick={() => setSelected(null)}
                      className="rounded-md border border-zinc-200 dark:border-zinc-700 px-3 py-1.5 text-xs text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                    >
                      닫기
                    </button>
                  </div>
                </div>
                <p className="text-sm text-zinc-600 dark:text-zinc-300">
                  {formatDateTime(selected.startAt)}
                </p>
                {selected.memo && (
                  <p className="text-xs text-zinc-400">{selected.memo}</p>
                )}
              </>
            )}
          </div>
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
        <button
          onClick={onCancel}
          className="rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-1.5 text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800"
        >
          취소
        </button>
      </div>
    </div>
  );
}
