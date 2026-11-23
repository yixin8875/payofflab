import { Link, useLocation } from "react-router-dom";
import {
  Sidebar as SidebarShell,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { isNavActive, NAV_FOOTER, NAV_GROUPS, VERSION, type NavItem } from "./nav";

export function Sidebar() {
  const { pathname } = useLocation();

  const renderItem = (item: NavItem) => {
    const active = isNavActive(pathname, item);
    const Icon = item.icon;
    return (
      <SidebarMenuItem key={item.href}>
        <SidebarMenuButton
          isActive={active}
          render={
            <Link to={item.href} aria-current={active ? "page" : undefined} />
          }
        >
          <Icon size={16} />
          <span>{item.label}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <SidebarShell
      collapsible="none"
      className="h-auto shrink-0 border-r border-sidebar-border"
      style={{ width: "var(--sidebar-w)" }}
    >
      <SidebarContent>
        {NAV_GROUPS.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>{group.items.map(renderItem)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="gap-0">
        <SidebarMenu>{NAV_FOOTER.map(renderItem)}</SidebarMenu>
        <div className="flex items-center justify-end px-2 py-1 text-xs text-muted-foreground">
          <span className="tnum">v{VERSION}</span>
        </div>
      </SidebarFooter>
    </SidebarShell>
  );
}
