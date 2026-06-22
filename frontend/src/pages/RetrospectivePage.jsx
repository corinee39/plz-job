import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { NotebookPen, Plus, Pencil, Trash2 } from "lucide-react";
import { PageShell } from "../components/layout/PageShell";
import { Button } from "../components/common/Button";
import { AsyncBoundary } from "../components/common/AsyncBoundary";
import { getJobPosting } from "../features/jobPostings/api";
import {
  getRetrospectives,
  createRetrospective,
  updateRetrospective,
  deleteRetrospective,
} from "../features/retrospectives/api";
import { RETRO_TYPE_LABELS, DIFFICULTY_LABELS } from "../constants/stageCodes";

// API 명세서 §4.4 — PROC-03·04: 필드명 type / improvement (구 retrospectiveType / improvements 아님)
const EMPTY_FORM = {
  type: "CODING_TEST",
  difficulty: "NORMAL",
  content: "",
  improvement: "",
};

const selectCls =
  "rounded-md border border-zinc-300 dark:border-zinc-600 px-3 py-2 text-sm bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100";
const textareaCls =
  "w-full rounded-md border border-zinc-300 dark:border-zinc-600 px-3 py-2 text-sm bg-transparent resize-none";

export default function RetrospectivePage() {
  const { id } = useParams(); // jobPostingId
  const qc = useQueryClient();
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const jobQuery = useQuery({
    queryKey: ["jobPosting", id],
    queryFn: () => getJobPosting(id),
  });
  const appId = jobQuery.data?.applicationId;

  const retroQuery = useQuery({
    queryKey: ["retrospectives", appId],
    queryFn: () => getRetrospectives(appId),
    enabled: !!appId,
  });

  const createMutation = useMutation({
    mutationFn: (body) => createRetrospective(appId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["retrospectives", appId] });
      setForm(EMPTY_FORM);
    },
    onError: (err) => alert(err?.message ?? "저장에 실패했습니다."),
  });

  const updateMutation = useMutation({
    mutationFn: ({ retroId, ...body }) => updateRetrospective(retroId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["retrospectives", appId] });
      setEditId(null);
    },
    onError: (err) => alert(err?.message ?? "수정에 실패했습니다."),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteRetrospective,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["retrospectives", appId] }),
    onError: (err) => alert(err?.message ?? "삭제에 실패했습니다."),
  });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <PageShell
      title="회고"
      icon={NotebookPen}
      description={
        jobQuery.data
          ? `${jobQuery.data.companyName} — ${jobQuery.data.title}`
          : "코딩테스트·면접 회고를 기록합니다."
      }
    >
      {/* 등록 폼 */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 space-y-3">
        <h2 className="text-sm font-semibold">회고 추가</h2>
        <div className="flex flex-wrap gap-2">
          <select value={form.type} onChange={set("type")} className={selectCls}>
            {Object.entries(RETRO_TYPE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
          <select value={form.difficulty} onChange={set("difficulty")} className={selectCls}>
            {Object.entries(DIFFICULTY_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
        <textarea
          placeholder="질문 및 답변 내용"
          value={form.content}
          onChange={set("content")}
          rows={4}
          className={textareaCls}
        />
        <textarea
          placeholder="개선점 (선택)"
          value={form.improvement}
          onChange={set("improvement")}
          rows={2}
          className={textareaCls}
        />
        <Button
          icon={Plus}
          disabled={!form.content.trim() || createMutation.isPending}
          onClick={() =>
            createMutation.mutate({
              type: form.type,
              difficulty: form.difficulty,
              content: form.content,
              improvement: form.improvement.trim() || null,
            })
          }
        >
          {createMutation.isPending ? "저장 중…" : "회고 추가"}
        </Button>
      </div>

      {/* 회고 목록 */}
      <AsyncBoundary
        isLoading={jobQuery.isLoading || retroQuery.isLoading}
        isError={retroQuery.isError}
        onRetry={retroQuery.refetch}
      >
        {(retroQuery.data ?? []).length === 0 ? (
          <p className="py-6 text-center text-sm text-zinc-500">
            아직 작성한 회고가 없습니다.
          </p>
        ) : (
          <ul className="space-y-4">
            {retroQuery.data.map((r) => (
              <li
                key={r.retrospectiveId}
                className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 space-y-3"
              >
                {editId === r.retrospectiveId ? (
                  <EditRetroForm
                    form={editForm}
                    setForm={setEditForm}
                    onSave={() =>
                      updateMutation.mutate({ retroId: r.retrospectiveId, ...editForm })
                    }
                    onCancel={() => setEditId(null)}
                    isPending={updateMutation.isPending}
                  />
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-wrap gap-2">
                        <Chip>{RETRO_TYPE_LABELS[r.type] ?? r.type}</Chip>
                        <Chip>{DIFFICULTY_LABELS[r.difficulty] ?? r.difficulty}</Chip>
                      </div>
                      <div className="flex shrink-0 gap-3">
                        <button
                          onClick={() => {
                            setEditId(r.retrospectiveId);
                            setEditForm({
                              type: r.type,
                              difficulty: r.difficulty,
                              content: r.content,
                              improvement: r.improvement ?? "",
                            });
                          }}
                          className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                        >
                          <Pencil size={13} /> 수정
                        </button>
                        <button
                          disabled={deleteMutation.isPending}
                          onClick={() => {
                            if (confirm("이 회고를 삭제할까요?"))
                              deleteMutation.mutate(r.retrospectiveId);
                          }}
                          className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-700"
                        >
                          <Trash2 size={13} /> 삭제
                        </button>
                      </div>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{r.content}</p>
                    {r.improvement && (
                      <div className="border-t border-zinc-100 dark:border-zinc-800 pt-3">
                        <p className="mb-1 text-xs font-medium text-zinc-500">개선점</p>
                        <p className="text-sm whitespace-pre-wrap text-zinc-600 dark:text-zinc-400">
                          {r.improvement}
                        </p>
                      </div>
                    )}
                    <p className="text-xs text-zinc-400">
                      {new Date(r.createdAt).toLocaleString("ko-KR")}
                    </p>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </AsyncBoundary>
    </PageShell>
  );
}

function Chip({ children }) {
  return (
    <span className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-xs text-zinc-600 dark:text-zinc-300">
      {children}
    </span>
  );
}

// PROC-03 — 회고 수정 폼 (§4.4: type / improvement)
function EditRetroForm({ form, setForm, onSave, onCancel, isPending }) {
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <select value={form.type} onChange={set("type")} className={selectCls}>
          {Object.entries(RETRO_TYPE_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <select value={form.difficulty} onChange={set("difficulty")} className={selectCls}>
          {Object.entries(DIFFICULTY_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </div>
      <textarea
        value={form.content}
        onChange={set("content")}
        rows={4}
        placeholder="질문 및 답변"
        className={textareaCls}
      />
      <textarea
        value={form.improvement}
        onChange={set("improvement")}
        rows={2}
        placeholder="개선점"
        className={textareaCls}
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
