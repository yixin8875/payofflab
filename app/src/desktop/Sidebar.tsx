import { Link, useLocation } from "react-router-dom";
import { Lock } from "../components/Icons";
import { isNavActive, NAV_FOOTER, NAV_GROUPS, VERSION } from "./nav";

export function Sidebar() {
  const { pathname } = useLocation();

  return (
    <aside className="flex w-[var(--sidebar-w)] shrink-0 flex-col border-r border-line bg-canvas">
      <div className="scroll-pane flex-1 px-2 pb-2 pt-3">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-4">
            <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-faint">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = isNavActive(pathname, item);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      to={item.href}
                      aria-current={active ? "page" : undefined}
                      className="sidebar-item"
                    >
                      <Icon size={15} strokeWidth={active ? 1.9 : 1.6} />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-line px-2 py-2">
        <ul className="space-y-0.5">
          {NAV_FOOTER.map((item) => {
            const active = isNavActive(pathname, item);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link to={item.href} aria-current={active ? "page" : undefined} className="sidebar-item">
                  <Icon size={15} strokeWidth={active ? 1.9 : 1.6} />
                  <span className="truncate">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="mt-2 flex items-center justify-between px-2 text-[10px] text-faint">
          <span className="flex items-center gap-1">
            <Lock size={10} />
            数据保存在本机
          </span>
          <span className="tnum">v{VERSION}</span>
        </div>
      </div>
    </aside>
  );
}
