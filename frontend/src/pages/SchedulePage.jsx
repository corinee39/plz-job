import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar, dateFnsLocalizer, Views } from "react-big-calendar";
import { format, parse, startOfWeek, getDay, isSameMonth, startOfMonth, endOfMonth, subMonths, addMonths } from "date-fns";
import { ko } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { CalendarDays, Pencil, Trash2, X, Save } from "lucide-react";
import { PageShell } from "../components/layout/PageShell";
import { Button } from "../components/common/Button";
import { AsyncBoundary } from "../components/common/AsyncBoundary";
import { getSchedules, updateSchedule, deleteSchedule } from "../features/schedules/api";
import { formatScheduleDate, toDateInputValue, toStartOfDayDateTime } from "../lib/scheduleDates";
import { SCHEDULE_TYPE_LABELS } from "../constants/stageCodes";

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales: { ko },
});

const VIEW_LABELS = { month: "월", agenda: "목록" };
const CALENDAR_VIEWS = [Views.MONTH, Views.AGENDA];

// UI-03 — 커스텀 캘린더 툴바
function CalendarToolbar({ date, view, views, onNavigate, onView }) {
  const isToday = isSameMonth(date, new Date()) && date.getFullYear() === new Date().getFullYear();
  const label = format(date, "yyyy년 M월", { locale: ko });

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

function formatScheduleDetailDate(iso) {
  return formatScheduleDate(iso, { year: "numeric", month: "long" });
}

// 달력 셀 내 이벤트: 뱃지 + 회사명 + 메모
function EventCell({ event }) {
  const s = event.resource;
  return (
    <span className="flex flex-col gap-0.5 overflow-hidden py-0.5">
      <span className="flex items-center gap-1">
        <ScheduleTypeBadge type={s.scheduleType} />
        <span className="truncate text-xs font-medium text-zinc-800 dark:text-zinc-100">{s.companyName}</span>
      </span>
      {s.memo && (
        <span className="truncate pl-0.5 text-[10px] text-zinc-400 dark:text-zinc-500">{s.memo}</span>
      )}
    </span>
  );
}

function MonthScheduleList({ events, currentDate, onSelect }) {
  const monthEvents = events
    .filter((event) => isSameMonth(event.start, currentDate))
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  if (monthEvents.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 px-4 py-12 text-center">
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
          {format(currentDate, "yyyy년 M월", { locale: ko })} 일정이 없습니다.
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          공고 상세에서 일정을 추가하면 이 목록에 표시됩니다.
        </p>
      </div>
    );
  }

  const grouped = monthEvents.reduce((acc, event) => {
    const key = format(event.start, "yyyy-MM-dd");
    if (!acc.has(key)) acc.set(key, []);
    acc.get(key).push(event);
    return acc;
  }, new Map());

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
      <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 px-4 py-3 dark:bg-zinc-900">
        <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
          {format(currentDate, "yyyy년 M월 일정", { locale: ko })}
        </h2>
        <span className="text-xs text-zinc-500">{monthEvents.length}건</span>
      </div>

      <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {[...grouped.entries()].map(([dateKey, dayEvents]) => {
          const date = dayEvents[0].start;

          return (
            <section key={dateKey} className="grid gap-3 px-4 py-3 sm:grid-cols-[110px_1fr]">
              <div className="text-sm">
                <p className="font-semibold text-zinc-800 dark:text-zinc-100">
                  {format(date, "M월 d일", { locale: ko })}
                </p>
                <p className="text-xs text-zinc-500">
                  {format(date, "eee", { locale: ko })}
                </p>
              </div>

              <ul className="space-y-2">
                {dayEvents.map((event) => {
                  const schedule = event.resource;

                  return (
                    <li key={schedule.scheduleId}>
                      <button
                        type="button"
                        onClick={() => onSelect(event)}
                        className="w-full rounded-lg px-3 py-2 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900"
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <ScheduleTypeBadge type={schedule.scheduleType} />
                          <span className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-100">
                            {schedule.companyName}
                          </span>
                        </span>
                        {schedule.memo && (
                          <span className="mt-1 block truncate text-xs text-zinc-500">
                            {schedule.memo}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
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

  // 현재 뷰 기준 ±1개월 범위를 한 번에 불러온다 (뷰 전환 시 추가 요청 최소화)
  const from = format(startOfMonth(subMonths(currentDate, 1)), "yyyy-MM-dd");
  const to = format(endOfMonth(addMonths(currentDate, 1)), "yyyy-MM-dd");

  const { data = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["schedules", from, to],
    queryFn: () => getSchedules({ from, to }),
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

  // 달력 월 이동 시 쿼리 키(from/to)가 바뀌어 자동으로 새 범위를 재요청한다

  const events = data.map((s) => ({
    id: s.scheduleId,
    title: s.companyName,
    start: new Date(s.startAt),
    end: new Date(new Date(s.startAt).getTime() + 60 * 60 * 1000),
    resource: s,
  }));

  // 월 뷰에서는 인접 월(회색 처리된 날짜)의 일정은 표시하지 않는다.
  // 목록 뷰는 "다른 월" 개념이 없으므로 전체를 그대로 보여준다.
  const visibleEvents =
    currentView === Views.MONTH
      ? events.filter((e) => isSameMonth(e.start, currentDate))
      : events;

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
      startAt: toDateInputValue(selected.startAt),
      memo: selected.memo ?? "",
    });
    setIsEditing(true);
  };

  const handleListNavigate = (action) => {
    setCurrentDate((date) => {
      if (action === "PREV") return subMonths(date, 1);
      if (action === "NEXT") return addMonths(date, 1);
      if (action === "TODAY") return new Date();
      return date;
    });
  };

  return (
    <PageShell title="일정" description="전형 관련 일정을 달력에서 확인합니다." icon={CalendarDays}>
      <AsyncBoundary isLoading={isLoading} isError={isError} onRetry={refetch}>
        {currentView === Views.AGENDA ? (
          <div>
            <CalendarToolbar
              date={currentDate}
              view={currentView}
              views={CALENDAR_VIEWS}
              onNavigate={handleListNavigate}
              onView={setCurrentView}
            />
            <MonthScheduleList
              events={events}
              currentDate={currentDate}
              onSelect={handleSelectEvent}
            />
          </div>
        ) : (
          <div className="h-[600px]">
            <Calendar
              localizer={localizer}
              events={visibleEvents}
              startAccessor="start"
              endAccessor="end"
              culture="ko"
              formats={{
                eventTimeRangeFormat: () => "",
              }}
              date={currentDate}
              view={currentView}
              onNavigate={setCurrentDate}
              onView={setCurrentView}
              views={CALENDAR_VIEWS}
              messages={{
                allDay: "종일",
                date: "날짜",
                time: "",
                event: "일정",
                noEventsInRange: "이 기간에 일정이 없습니다.",
                showMore: (count) => `+${count}개 더`,
              }}
              components={{
                event: EventCell,
                toolbar: CalendarToolbar,
              }}
              eventPropGetter={eventStyleGetter}
              step={60}
              timeslots={1}
              onSelectEvent={handleSelectEvent}
              style={{ height: "100%" }}
            />
          </div>
        )}

        {selected && (
          <div className="mt-4 rounded-xl border border-zinc-200 dark:border-zinc-700 p-4 space-y-3">
            {isEditing ? (
              <EditScheduleRow
                form={editForm}
                setForm={setEditForm}
                onSave={() =>
                  updateMutation.mutate({
                    scheduleId: selected.scheduleId,
                    ...editForm,
                    startAt: toStartOfDayDateTime(editForm.startAt),
                  })
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
                    <Button variant="secondary" size="sm" icon={Pencil} onClick={startEdit}>
                      수정
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      icon={Trash2}
                      disabled={deleteMutation.isPending}
                      onClick={() => {
                        if (confirm("이 일정을 삭제할까요?"))
                          deleteMutation.mutate(selected.scheduleId);
                      }}
                    >
                      삭제
                    </Button>
                    <Button variant="ghost" size="sm" icon={X} onClick={() => setSelected(null)}>
                      닫기
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-zinc-600 dark:text-zinc-300">
                  {formatScheduleDetailDate(selected.startAt)}
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
          type="date"
          value={form.startAt}
          onChange={set("startAt")}
          required
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
        <Button size="sm" icon={Save} disabled={isPending || !form.startAt} onClick={onSave}>
          {isPending ? "저장 중…" : "저장"}
        </Button>
        <Button variant="secondary" size="sm" icon={X} onClick={onCancel}>
          취소
        </Button>
      </div>
    </div>
  );
}
