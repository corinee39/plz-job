import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
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
import { getSchedules, createSchedule, deleteSchedule } from "../features/schedules/api";
import { getDocuments, getDocument, linkVersionToApplication } from "../features/documents/api";
import { STAGE_CODES, SCHEDULE_TYPE_LABELS, DOCUMENT_TYPE_LABELS } from "../constants/stageCodes";

const SCHEDULE_TYPE_COLORS = {
  DEADLINE: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  CODING_TEST: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  INTERVIEW: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  ETC: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
};

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

      {/* 제출 문서 연결 (DOC-03) */}
      {appId && (
        <SubmittedDocumentsSection
          appId={appId}
          jobPostingId={id}
          submittedDocuments={j.submittedDocuments ?? []}
        />
      )}

      {/* 일정 */}
      {appId && <ScheduleSection appId={appId} />}

      {/* 회고 링크 */}
      <div className="flex items-center justify-between rounded-xl border border-zinc-200 dark:border-zinc-800 p-5">
        <div>
          <h2 className="text-sm font-semibold">회고</h2>
          <p className="mt-0.5 text-xs text-zinc-500">코딩테스트·면접 회고를 기록합니다.</p>
        </div>
        <Link
          to={`/job-postings/${id}/retrospectives`}
          className="rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800"
        >
          회고 보기 →
        </Link>
      </div>

      {/* AI 면접 질문 링크 (Phase 6) */}
      <div className="flex items-center justify-between rounded-xl border border-dashed border-zinc-200 dark:border-zinc-700 p-5">
        <div>
          <h2 className="text-sm font-semibold">AI 면접 준비</h2>
          <p className="mt-0.5 text-xs text-zinc-500">예상 면접 질문을 AI로 생성합니다.</p>
        </div>
        <Link
          to={`/job-postings/${id}/interview-ai`}
          className="rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800"
        >
          질문 생성 →
        </Link>
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

function SubmittedDocumentsSection({ appId, jobPostingId, submittedDocuments }) {
  const qc = useQueryClient();
  const [docId, setDocId] = useState("");
  const [versionId, setVersionId] = useState("");

  // 연결할 후보 문서·버전 목록
  const { data: documents = [] } = useQuery({
    queryKey: ["documents"],
    queryFn: getDocuments,
  });
  const { data: docDetail } = useQuery({
    queryKey: ["document", docId],
    queryFn: () => getDocument(docId),
    enabled: !!docId,
  });

  const linkMutation = useMutation({
    mutationFn: () => linkVersionToApplication(appId, Number(versionId)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobPosting", jobPostingId] });
      setVersionId("");
    },
    onError: (err) => alert(err?.message ?? "문서 연결에 실패했습니다."),
  });

  const inputCls =
    "rounded-md border border-zinc-300 dark:border-zinc-600 px-2 py-1.5 text-sm bg-transparent";

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 space-y-3">
      <div>
        <h2 className="text-sm font-semibold">제출 문서</h2>
        <p className="mt-0.5 text-xs text-zinc-500">이 공고에 제출한 이력서·자소서 버전을 연결합니다.</p>
      </div>

      {submittedDocuments.length === 0 ? (
        <p className="text-sm text-zinc-500">연결된 문서가 없습니다.</p>
      ) : (
        <ul className="space-y-1.5">
          {submittedDocuments.map((d) => (
            <li key={d.versionId} className="flex items-center gap-2 text-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 shrink-0" />
              <span className="font-medium">{d.documentTitle}</span>
              <span className="text-zinc-500">{d.versionName}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-2 border-t border-zinc-100 dark:border-zinc-800 pt-3">
        <select
          value={docId}
          onChange={(e) => {
            setDocId(e.target.value);
            setVersionId("");
          }}
          className={inputCls}
        >
          <option value="">문서 선택</option>
          {documents.map((d) => (
            <option key={d.documentId} value={d.documentId}>
              [{DOCUMENT_TYPE_LABELS[d.documentType] ?? d.documentType}] {d.title}
            </option>
          ))}
        </select>
        <select
          value={versionId}
          onChange={(e) => setVersionId(e.target.value)}
          disabled={!docId}
          className={`${inputCls} disabled:opacity-40`}
        >
          <option value="">버전 선택</option>
          {(docDetail?.versions ?? []).map((v) => (
            <option key={v.versionId} value={v.versionId}>
              {v.versionName} · {v.fileName}
            </option>
          ))}
        </select>
        <button
          disabled={!versionId || linkMutation.isPending}
          onClick={() => linkMutation.mutate()}
          className="rounded-md bg-zinc-900 dark:bg-zinc-100 px-3 py-1.5 text-xs text-white dark:text-zinc-900 disabled:opacity-40"
        >
          {linkMutation.isPending ? "연결 중…" : "연결"}
        </button>
      </div>
    </div>
  );
}

// PROC-01·02 — 일정 섹션 (§4.4: startAt, memo — scheduledAt·location·notes 미사용)
function ScheduleSection({ appId }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    scheduleType: "INTERVIEW",
    startAt: "",
    memo: "",
  });

  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ["schedules", appId],
    queryFn: () => getSchedules({ applicationId: appId }),
    enabled: !!appId,
  });

  const createMutation = useMutation({
    mutationFn: (body) => createSchedule(appId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["schedules", appId] });
      qc.invalidateQueries({ queryKey: ["schedules"] });
      setShowForm(false);
      setForm({ scheduleType: "INTERVIEW", startAt: "", memo: "" });
    },
    onError: (err) => alert(err?.message ?? "일정 등록에 실패했습니다."),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSchedule,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["schedules", appId] });
      qc.invalidateQueries({ queryKey: ["schedules"] });
    },
    onError: (err) => alert(err?.message ?? "삭제에 실패했습니다."),
  });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const inputCls =
    "rounded-md border border-zinc-300 dark:border-zinc-600 px-2 py-1.5 text-sm bg-transparent";

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">일정</h2>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          {showForm ? "취소" : "+ 일정 추가"}
        </button>
      </div>

      {showForm && (
        <div className="space-y-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 p-3">
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
              required
              className={inputCls}
            />
          </div>
          <input
            placeholder="메모 (선택)"
            value={form.memo}
            onChange={set("memo")}
            className={`w-full ${inputCls}`}
          />
          <button
            disabled={!form.startAt || createMutation.isPending}
            onClick={() =>
              createMutation.mutate({
                scheduleType: form.scheduleType,
                startAt: form.startAt,
                memo: form.memo || null,
              })
            }
            className="rounded-md bg-zinc-900 dark:bg-zinc-100 px-3 py-1.5 text-xs text-white dark:text-zinc-900 disabled:opacity-40"
          >
            {createMutation.isPending ? "등록 중…" : "등록"}
          </button>
        </div>
      )}

      {isLoading ? (
        <p className="text-xs text-zinc-500">불러오는 중…</p>
      ) : schedules.length === 0 ? (
        <p className="text-sm text-zinc-500">등록된 일정이 없습니다.</p>
      ) : (
        <ul className="space-y-2">
          {schedules.map((s) => (
            <li key={s.scheduleId} className="flex items-start justify-between gap-2 text-sm">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      SCHEDULE_TYPE_COLORS[s.scheduleType] ?? SCHEDULE_TYPE_COLORS.ETC
                    }`}
                  >
                    {SCHEDULE_TYPE_LABELS[s.scheduleType] ?? s.scheduleType}
                  </span>
                  <span className="text-xs text-zinc-500">
                    {new Date(s.startAt).toLocaleString("ko-KR", {
                      month: "numeric",
                      day: "numeric",
                      weekday: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                {s.memo && (
                  <p className="text-xs text-zinc-400">{s.memo}</p>
                )}
              </div>
              <button
                disabled={deleteMutation.isPending}
                onClick={() => {
                  if (confirm("이 일정을 삭제할까요?")) deleteMutation.mutate(s.scheduleId);
                }}
                className="mt-0.5 shrink-0 text-xs text-red-500 hover:text-red-700"
              >
                삭제
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
