import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Inbox } from "lucide-react";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ layout */

export function Split({ list, children }: { list: ReactNode; children: ReactNode }) {
  return (
    <div className="flex h-full min-h-0 w-full">
      <aside className="flex w-[var(--list-w)] shrink-0 flex-col border-r bg-muted/30">
        {list}
      </aside>
      <section className="flex min-w-0 flex-1 flex-col bg-background">{children}</section>
    </div>
  );
}

export function Workspace({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-muted/30">{children}</div>
  );
}

/* -------------------------------------------------------------- list pane */

export function ListPane({
  title,
  count,
  actions,
  children,
  footer,
}: {
  title: string;
  count?: number | string;
  actions?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <>
      <div className="flex h-[52px] shrink-0 items-center gap-2 border-b px-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        {count !== undefined && (
          <span className="tnum text-xs text-muted-foreground">{count}</span>
        )}
        <div className="ml-auto flex items-center gap-1">{actions}</div>
      </div>
      <div className="scroll-pane flex-1">{children}</div>
      {footer}
    </>
  );
}

export function ListGroup({
  label,
  count,
  children,
}: {
  label: string;
  count?: number;
  children: ReactNode;
}) {
  return (
    <section className="pb-1">
      <h3 className="flex items-baseline gap-1.5 px-3 pb-1.5 pt-4 text-xs font-medium text-muted-foreground">
        {label}
        {count !== undefined && (
          <span className="font-normal text-muted-foreground/70">{count}</span>
        )}
      </h3>
      <ul>{children}</ul>
    </section>
  );
}

export function ListRow({
  to,
  onSelect,
  selected,
  badge,
  title,
  subtitle,
  meta,
  trailing,
  action,
}: {
  to?: string;
  onSelect?: () => void;
  selected?: boolean;
  badge: ReactNode;
  title: string;
  subtitle?: string;
  meta?: ReactNode;
  trailing?: ReactNode;
  /** Optional control anchored at the right edge, outside the link hit area. */
  action?: ReactNode;
}) {
  const body = (
    <>
      {badge}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium leading-[18px] text-foreground">
          {title}
        </span>
        {subtitle && (
          <span className="block truncate text-xs leading-4 text-muted-foreground">
            {subtitle}
          </span>
        )}
      </span>
      {meta !== undefined && (
        <span className="shrink-0 tnum text-xs text-muted-foreground">{meta}</span>
      )}
      {trailing}
    </>
  );

  if (to) {
    return (
      <li className="relative">
        <Link
          to={to}
          className={cn("list-row", action && "pr-9")}
          data-selected={selected ? "true" : undefined}
        >
          {body}
        </Link>
        {action && (
          <span className="absolute inset-y-0 right-1.5 flex items-center">{action}</span>
        )}
      </li>
    );
  }

  return (
    <li className="relative">
      <button
        type="button"
        onClick={onSelect}
        className={cn("list-row", action && "pr-9")}
        data-selected={selected ? "true" : undefined}
      >
        {body}
      </button>
      {action && <span className="absolute inset-y-0 right-1.5 flex items-center">{action}</span>}
    </li>
  );
}

/* --------------------------------------------------------------- monogram */

/** Square letter mark used in lists — distinct from coss status <Badge>. */
export function Monogram({
  label,
  size = 28,
  rounded = "rounded-lg",
}: {
  label: string;
  seed?: string;
  size?: number;
  rounded?: string;
}) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center bg-secondary text-xs font-medium text-muted-foreground",
        rounded,
      )}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {label.slice(0, 2)}
    </span>
  );
}

/* --------------------------------------------------------------- detail */

export function PaneHeader({
  title,
  subtitle,
  leading,
  children,
}: {
  title: string;
  subtitle?: ReactNode;
  leading?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="flex h-[52px] shrink-0 items-center gap-2.5 border-b bg-background px-4">
      {leading}
      <div className="min-w-0">
        <h1 className="truncate text-sm font-semibold leading-5">{title}</h1>
        {subtitle && (
          <p className="truncate text-xs leading-4 text-muted-foreground">{subtitle}</p>
        )}
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-1.5">{children}</div>
    </div>
  );
}

export function DetailScroll({
  children,
  wide = false,
  className = "",
}: {
  children: ReactNode;
  wide?: boolean;
  className?: string;
}) {
  return (
    <div className="scroll-pane flex-1">
      <div
        className={cn(
          "mx-auto w-full px-8 py-6",
          wide ? "max-w-none" : "max-w-[900px]",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function EmptyDetail({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <Empty className="h-full flex-1 py-10">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Inbox />
        </EmptyMedia>
        <EmptyTitle className="text-base">{title}</EmptyTitle>
        <EmptyDescription className="max-w-[320px]">{body}</EmptyDescription>
      </EmptyHeader>
      {action && <EmptyContent>{action}</EmptyContent>}
    </Empty>
  );
}
