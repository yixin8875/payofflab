import { Link } from "react-router-dom";
import { Brand } from "./Brand";
import { ArrowRight, Moon } from "./Icons";

const LINKS = [
  { href: "/calculator", label: "构建" },
  { href: "/options-chain", label: "期权链" },
  { href: "/tools/option-finder", label: "扫描" },
  { href: "/strategies", label: "策略" },
  { href: "/methodology", label: "方法" },
];

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line/60 bg-chrome/80 backdrop-blur-xl backdrop-saturate-150">
      <nav
        aria-label="主导航"
        className="mx-auto flex h-14 max-w-[1240px] items-center gap-6 px-4 sm:px-6"
      >
        <Brand />
        <ul className="hidden items-center gap-0.5 md:flex">
          {LINKS.map((l) => (
            <li key={l.href}>
              <Link
                to={l.href}
                className="rounded-md px-3 py-1.5 text-[14px] font-medium text-muted transition-colors duration-150 hover:bg-hover hover:text-text"
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="ml-auto flex items-center gap-2">
          <button type="button" className="icon-btn h-9 w-9" aria-label="切换主题">
            <Moon size={18} />
          </button>
          <Link to="/calculator" className="btn-primary h-9 px-3.5 text-[13.5px]">
            打开应用
            <ArrowRight size={14} />
          </Link>
        </div>
      </nav>
    </header>
  );
}
