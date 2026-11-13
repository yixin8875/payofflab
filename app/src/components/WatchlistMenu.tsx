import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Plus, Star } from "./Icons";
import {
  addGroup,
  groupsForSymbol,
  toggleSymbol,
  useWatchlist,
  type WatchGroup,
} from "../lib/watchlist";

export function WatchlistMenu({ symbol }: { symbol: string }) {
  const groups = useWatchlist();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const box = useRef<HTMLDivElement>(null);

  const memberships = groupsForSymbol(groups, symbol);
  const starred = memberships.length > 0;

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (box.current && !box.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const create = () => {
    const created = addGroup(name, symbol);
    if (!created) return;
    setName("");
    setOpen(false);
  };

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={`btn-secondary h-7 gap-1 px-2.5 ${starred ? "text-accent" : ""}`}
        aria-haspopup="menu"
        aria-expanded={open}
        title={starred ? `已加入 ${memberships.length} 个分组` : "加入自选"}
      >
        <Star size={13} fill={starred ? "currentColor" : "none"} />
        {starred ? `自选 ${memberships.length}` : "自选"}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-1 w-[248px] overflow-hidden rounded-xl border border-line bg-white shadow-[0_10px_30px_rgba(30,25,18,0.14)]"
        >
          <div className="border-b border-line-subtle px-3 py-2">
            <p className="text-[12px] font-semibold">加入自选</p>
            <p className="mt-0.5 text-[11px] text-faint">{symbol} 可同时放入多个分组</p>
          </div>

          <div className="max-h-[220px] overflow-y-auto py-1">
            {groups.map((group) => (
              <GroupToggle
                key={group.id}
                group={group}
                symbol={symbol}
                checked={group.symbols.includes(symbol)}
              />
            ))}
            {groups.length === 0 && (
              <p className="px-3 py-3 text-[11px] text-faint">还没有分组，在下方新建一个。</p>
            )}
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              create();
            }}
            className="flex items-center gap-1 border-t border-line-subtle px-2 py-2"
          >
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="新建分组，例如 半导体"
              maxLength={20}
              className="field h-7 flex-1 px-2 text-[12px]"
              aria-label="新分组名称"
            />
            <button
              type="submit"
              disabled={!name.trim()}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-line text-dim hover:text-text disabled:opacity-40"
              title="新建分组并加入"
              aria-label="新建分组并加入"
            >
              <Plus size={13} />
            </button>
          </form>

          <Link
            to="/watchlist"
            onClick={() => setOpen(false)}
            className="block border-t border-line-subtle px-3 py-1.5 text-[11px] font-medium text-accent hover:bg-hover"
          >
            管理自选分组 →
          </Link>
        </div>
      )}
    </div>
  );
}

function GroupToggle({
  group,
  symbol,
  checked,
}: {
  group: WatchGroup;
  symbol: string;
  checked: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitemcheckbox"
      aria-checked={checked}
      onClick={() => toggleSymbol(group.id, symbol)}
      className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] hover:bg-hover"
    >
      <span
        className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border ${
          checked ? "border-accent bg-accent text-white" : "border-line bg-white"
        }`}
      >
        {checked && <Check size={9} />}
      </span>
      <span className="min-w-0 flex-1 truncate">{group.name}</span>
      <span className="tnum text-[11px] text-faint">{group.symbols.length}</span>
    </button>
  );
}
