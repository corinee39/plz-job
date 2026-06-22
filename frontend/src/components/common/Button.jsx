import { Link } from "react-router-dom";

// 공통 버튼 — 변형(variant)·크기(size)·아이콘을 일관되게 적용한다.
// 페이지마다 제각각이던 버튼 스타일/크기를 한 곳에서 관리한다.
const BASE =
  "inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors " +
  "disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/50";

const SIZES = {
  sm: "px-2.5 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
  icon: "p-2",
};

const VARIANTS = {
  primary:
    "bg-zinc-900 text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300",
  secondary:
    "border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800",
  danger:
    "border border-red-200 dark:border-red-900 text-red-500 hover:bg-red-50 dark:hover:bg-red-950",
  ghost:
    "text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800",
};

// 같은 스타일을 버튼/링크에 공유하기 위한 내부 헬퍼(컴포넌트만 export 하도록 비공개 유지).
function buttonStyles({ variant = "primary", size = "md", className = "" } = {}) {
  return `${BASE} ${SIZES[size] ?? SIZES.md} ${VARIANTS[variant] ?? VARIANTS.primary} ${className}`.trim();
}

const ICON_SIZE = { sm: 14, md: 16, icon: 18 };

// icon: lucide-react 컴포넌트(예: Plus). 텍스트 앞에 적절한 크기로 렌더된다.
export function Button({
  variant = "primary",
  size = "md",
  className = "",
  icon: Icon,
  children,
  type = "button",
  ...props
}) {
  return (
    <button type={type} className={buttonStyles({ variant, size, className })} {...props}>
      {Icon && <Icon size={ICON_SIZE[size] ?? 16} strokeWidth={2} />}
      {children}
    </button>
  );
}

// 라우터 Link를 버튼처럼 보이게 한다(같은 variant/size 사용).
export function LinkButton({ to, variant = "primary", size = "md", className = "", icon: Icon, children, ...props }) {
  return (
    <Link to={to} className={buttonStyles({ variant, size, className })} {...props}>
      {Icon && <Icon size={ICON_SIZE[size] ?? 16} strokeWidth={2} />}
      {children}
    </Link>
  );
}
