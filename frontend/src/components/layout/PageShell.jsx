// icon: lucide-react 컴포넌트(선택). 제목 왼쪽에 표시된다.
// actions: 제목 오른쪽 영역에 둘 버튼 등(선택).
export function PageShell({ title, description, icon: Icon, actions, children }) {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          {Icon && (
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
              <Icon size={20} strokeWidth={2} />
            </div>
          )}
          <div>
            <h1 className="text-xl font-semibold">{title}</h1>
            {description && (
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
            )}
          </div>
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}
