import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageShell } from "../components/layout/PageShell";
import { usePreviewJobPosting, useCreateJobPosting } from "../features/jobPostings/hooks";
import { STAGE_CODES } from "../constants/stageCodes";

const EMPTY_FORM = {
  companyName: "",
  title: "",
  url: "",
  position: "",
  region: "",
  appliedAt: "",
  deadline: "",
  techStacks: "",
  description: "",
  initialStage: "INTERESTED",
};

// UI-04 — URL 자동 입력, 수동 수정, 지원 상태 설정 (JOB-01~04, 09, CRAWL-01~07)
export default function JobPostingFormPage() {
  const navigate = useNavigate();
  const [urlInput, setUrlInput] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [extractInfo, setExtractInfo] = useState(null); // { status, missing, note? }

  const preview = usePreviewJobPosting();
  const create = useCreateJobPosting();

  const buildBody = (confirmDuplicate) => ({
    ...form,
    appliedAt: form.appliedAt || null,
    deadline: form.deadline || null,
    techStacks: form.techStacks
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    confirmDuplicate,
  });

  const handlePreview = () =>
    preview.mutate(urlInput, {
      onSuccess: (data) => {
        setForm((f) => ({
          ...f,
          url: data.sourceUrl ?? urlInput,
          companyName: data.companyName ?? f.companyName,
          title: data.title ?? f.title,
          position: data.position ?? f.position,
          region: data.region ?? f.region,
          deadline: data.deadline ?? f.deadline,
          techStacks: data.techStacks?.length ? data.techStacks.join(", ") : f.techStacks,
          description: data.description ?? f.description,
        }));
        setExtractInfo({ status: data.extractStatus, missing: data.missingFields ?? [] });
      },
      onError: (err) => {
        setForm((f) => ({ ...f, url: urlInput }));
        setExtractInfo({ status: "FAILED", missing: [], note: err?.message });
      },
    });

  const handleSave = (confirmDuplicate) =>
    create.mutate(buildBody(confirmDuplicate), {
      onSuccess: (data) => navigate(`/job-postings/${data.jobPostingId}`),
      onError: (err) => {
        if (err?.code === "DUPLICATE_JOB_URL") {
          if (window.confirm("이미 등록한 URL입니다. 그래도 저장할까요?")) {
            handleSave(true);
          }
        } else {
          alert(err?.message ?? "저장에 실패했습니다.");
        }
      },
    });

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <PageShell title="공고 등록" description="공고 URL을 입력하면 정보를 자동으로 채웁니다.">
      {/* URL 자동 입력 영역 */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 space-y-3">
        <label className="block text-sm font-medium">공고 URL</label>
        <div className="flex gap-2">
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://careers.example.com/jobs/123"
            className="flex-1 rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm bg-transparent"
          />
          <button
            type="button"
            disabled={!urlInput || preview.isPending}
            onClick={handlePreview}
            className="rounded-md bg-zinc-900 dark:bg-zinc-100 px-4 py-2 text-sm text-white dark:text-zinc-900 disabled:opacity-40"
          >
            {preview.isPending ? "불러오는 중…" : "자동으로 채우기"}
          </button>
        </div>

        {extractInfo && (
          <p className="text-xs text-zinc-500">
            {extractInfo.status === "SUCCESS" && "✓ 자동 입력 완료. 내용을 확인하세요."}
            {extractInfo.status === "PARTIAL" && (
              <>
                ⚠ 일부 항목을 추출하지 못했습니다.
                {extractInfo.missing.length > 0 && (
                  <> 직접 입력 필요: <span className="font-medium text-amber-600">{extractInfo.missing.join(", ")}</span></>
                )}
              </>
            )}
            {extractInfo.status === "FAILED" && (
              <span className="text-red-500">
                추출 실패{extractInfo.note ? `: ${extractInfo.note}` : ""}. 직접 입력으로 등록할 수 있습니다.
              </span>
            )}
          </p>
        )}
      </div>

      {/* 공고 정보 폼 */}
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          handleSave(false);
        }}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="회사명 *" required value={form.companyName} onChange={set("companyName")} />
          <Field label="공고명 *" required value={form.title} onChange={set("title")} />
          <Field label="직무" value={form.position} onChange={set("position")} placeholder="백엔드" />
          <Field label="지역" value={form.region} onChange={set("region")} placeholder="서울 강남구" />
          <Field label="지원일" type="date" value={form.appliedAt} onChange={set("appliedAt")} />
          <Field label="마감일" type="date" value={form.deadline} onChange={set("deadline")} />
        </div>

        <Field
          label="기술 스택 (쉼표 구분)"
          value={form.techStacks}
          onChange={set("techStacks")}
          placeholder="Java, Spring Boot, Oracle"
        />

        <div>
          <label className="block text-sm font-medium mb-1">설명</label>
          <textarea
            value={form.description}
            onChange={set("description")}
            rows={4}
            className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm bg-transparent resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">초기 단계</label>
          <select
            value={form.initialStage}
            onChange={set("initialStage")}
            className="rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm bg-transparent"
          >
            {Object.entries(STAGE_CODES).map(([code, label]) => (
              <option key={code} value={code}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-md border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-sm"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={create.isPending}
            className="rounded-md bg-zinc-900 dark:bg-zinc-100 px-4 py-2 text-sm text-white dark:text-zinc-900 disabled:opacity-40"
          >
            {create.isPending ? "저장 중…" : "등록"}
          </button>
        </div>
      </form>
    </PageShell>
  );
}

function Field({ label, required, type = "text", value, onChange, placeholder }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm bg-transparent"
      />
    </div>
  );
}
