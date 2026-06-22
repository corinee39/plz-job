import { useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { ChevronDown, Sparkles } from "lucide-react";
import { navItems } from "../../constants/nav";

const linkClass = ({ isActive }) =>
  `flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
    isActive
      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
      : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
  }`;

// children 이 있는 메뉴 → 드롭다운(현재 경로가 하위면 자동 펼침)
function NavDropdown({ item }) {
  const { pathname } = useLocation();
  const active = pathname === item.to || pathname.startsWith(item.to + "/");
  const [open, setOpen] = useState(active);
  // 현재 경로가 하위로 바뀌면 자동 펼침 — 렌더 중 상태 보정(React 권장 패턴).
  const [prevActive, setPrevActive] = useState(active);
  if (active !== prevActive) {
    setPrevActive(active);
    if (active) setOpen(true);
  }

  const Icon = item.icon;
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
          active
            ? "font-medium text-zinc-900 dark:text-zinc-100"
            : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
        }`}
        aria-expanded={open}
      >
        {Icon && <Icon size={18} strokeWidth={2} className="shrink-0" />}
        <span>{item.label}</span>
        <ChevronDown
          size={14}
          className={`ml-auto transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="mt-1 ml-3.5 space-y-1 border-l border-zinc-200 dark:border-zinc-800 pl-2">
          {item.children.map((c) => {
            const CIcon = c.icon;
            return (
              <NavLink key={c.to} to={c.to} end className={linkClass}>
                {CIcon && <CIcon size={16} strokeWidth={2} className="shrink-0" />}
                {c.label}
              </NavLink>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden md:flex md:flex-col md:w-56 border-r border-zinc-200 dark:border-zinc-800 shrink-0">
      <Link
        to="/dashboard"
        className="h-14 flex items-center gap-2 px-4 font-semibold text-lg hover:opacity-80 transition-opacity"
      >
        <Sparkles size={20} className="text-brand" strokeWidth={2.2} />
        Plz-Job
      </Link>
      <nav className="flex-1 px-2 py-2 space-y-1">
        {navItems.map((item) =>
          item.children ? (
            <NavDropdown key={item.to} item={item} />
          ) : (
            <NavLink key={item.to} to={item.to} className={linkClass}>
              {item.icon && <item.icon size={18} strokeWidth={2} className="shrink-0" />}
              {item.label}
            </NavLink>
          )
        )}
      </nav>
    </aside>
  );
}
