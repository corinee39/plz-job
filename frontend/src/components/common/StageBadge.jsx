import { STAGE_CODES } from "../../constants/stageCodes";

// §12.4: 색상만으로 상태를 구분하지 않고 텍스트(라벨)를 함께 표시한다.
const COLOR_BY_PREFIX = {
  PASS: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  FAIL: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  WITHDRAWN: "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
};

function colorFor(code) {
  if (code.endsWith("_PASS") || code === "FINAL_PASS") return COLOR_BY_PREFIX.PASS;
  if (code.endsWith("_FAIL")) return COLOR_BY_PREFIX.FAIL;
  if (code === "WITHDRAWN") return COLOR_BY_PREFIX.WITHDRAWN;
  return "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300";
}

export function StageBadge({ code }) {
  const label = STAGE_CODES[code] ?? code;
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${colorFor(code)}`}>
      {label}
    </span>
  );
}
