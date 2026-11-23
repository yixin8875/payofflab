import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Star } from "./Icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Menu,
  MenuCheckboxItem,
  MenuLinkItem,
  MenuPopup,
  MenuSeparator,
  MenuTrigger,
} from "@/components/ui/menu";
import { addGroup, groupsForSymbol, toggleSymbol, useWatchlist } from "../lib/watchlist";

export function WatchlistMenu({ symbol }: { symbol: string }) {
  const groups = useWatchlist();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  const memberships = groupsForSymbol(groups, symbol);
  const starred = memberships.length > 0;

  const create = () => {
    const created = addGroup(name, symbol);
    if (!created) return;
    setName("");
    setOpen(false);
  };

  return (
    <Menu open={open} onOpenChange={setOpen}>
      <MenuTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className={starred ? "gap-1 text-brand" : "gap-1"}
            title={starred ? `已加入 ${memberships.length} 个分组` : "加入自选"}
          />
        }
      >
        <Star size={13} fill={starred ? "currentColor" : "none"} />
        {starred ? `自选 ${memberships.length}` : "自选"}
      </MenuTrigger>

      <MenuPopup align="end" className="w-[264px] p-0">
        <div className="border-b px-3 py-2">
          <p className="text-sm font-semibold">加入自选</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {symbol} 可同时放入多个分组
          </p>
        </div>

        <div className="max-h-[220px] overflow-y-auto p-1">
          {groups.map((group) => (
            <MenuCheckboxItem
              key={group.id}
              checked={group.symbols.includes(symbol)}
              onCheckedChange={() => toggleSymbol(group.id, symbol)}
            >
              <span className="min-w-0 flex-1 truncate">{group.name}</span>
              <span className="tnum text-xs text-muted-foreground">
                {group.symbols.length}
              </span>
            </MenuCheckboxItem>
          ))}
          {groups.length === 0 && (
            <p className="px-2 py-3 text-xs text-muted-foreground">
              还没有分组，在下方新建一个。
            </p>
          )}
        </div>

        <MenuSeparator />
        <form
          onSubmit={(event) => {
            event.preventDefault();
            create();
          }}
          className="flex items-center gap-1 p-2"
        >
          <div className="min-w-0 flex-1">
            <Input
              size="sm"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="新建分组，例如 半导体"
              maxLength={20}
              aria-label="新分组名称"
            />
          </div>
          <Button
            type="submit"
            size="icon-sm"
            variant="outline"
            disabled={!name.trim()}
            title="新建分组并加入"
            aria-label="新建分组并加入"
          >
            <Plus size={13} />
          </Button>
        </form>

        <MenuSeparator />
        <MenuLinkItem
          render={<Link to="/watchlist" />}
          onClick={() => setOpen(false)}
          className="text-brand"
        >
          管理自选分组 →
        </MenuLinkItem>
      </MenuPopup>
    </Menu>
  );
}
