import { NavLink } from "react-router-dom";
import { navItems } from "../../constants/nav";

export function Sidebar() {
  return (
    <aside className="hidden md:flex md:flex-col md:w-56 border-r border-zinc-200 dark:border-zinc-800 shrink-0">
      <div className="h-14 flex items-center px-4 font-semibold text-lg">Plz-Job</div>
      <nav className="flex-1 px-2 py-2 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `block rounded-md px-3 py-2 text-sm transition-colors ${
                isActive
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
