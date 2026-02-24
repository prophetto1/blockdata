import * as React from "react"
import { Link, useLocation } from "react-router-dom"
import {
  Home,
  GitFork,
  Zap,
  Play,
  Globe,
  Workflow,
  Rocket,
  LayoutTemplate,
  Users,
  PenTool,
  GitBranch,
  Terminal,
} from "lucide-react"

import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar"

/*
 * Mage AI sidebar — exact order, exact names.
 * Separated by dotted dividers in Mage; we use SidebarSeparator.
 */

const navItems = [
  { to: "/", icon: Home, label: "Home", group: 0 },
  { to: "/pipelines", icon: GitFork, label: "Pipelines", group: 1 },
  { to: "/triggers", icon: Zap, label: "Triggers", group: 2 },
  { to: "/runs", icon: Play, label: "Runs", group: 2 },
  { to: "/monitoring", icon: Globe, label: "Monitoring", group: 2 },
  { to: "/pipeline-graph", icon: Workflow, label: "Pipeline graph", group: 3 },
  { to: "/deploy", icon: Rocket, label: "Deploy", group: 3 },
  { to: "/templates", icon: LayoutTemplate, label: "Templates", group: 4 },
  { to: "/data-products", icon: Users, label: "Data products", group: 4 },
  { to: "/editor", icon: PenTool, label: "Editor", group: 5 },
  { to: "/version-control", icon: GitBranch, label: "Version control", group: 5 },
  { to: "/terminal", icon: Terminal, label: "Terminal", group: 5 },
]

const user = {
  name: "User",
  email: "user@datablocks.run",
  avatar: "",
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { pathname } = useLocation()

  // Group items and insert separators between groups
  let lastGroup = -1
  const elements: React.ReactNode[] = []

  for (const item of navItems) {
    if (item.group !== lastGroup && lastGroup !== -1) {
      elements.push(<SidebarSeparator key={`sep-${item.group}`} />)
    }
    lastGroup = item.group

    const isActive = item.to === "/"
      ? pathname === "/"
      : pathname.startsWith(item.to)

    elements.push(
      <SidebarMenuItem key={item.to}>
        <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
          <Link to={item.to}>
            <item.icon />
            <span>{item.label}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    )
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <LayoutTemplate className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">datablocks</span>
                  <span className="truncate text-xs text-muted-foreground">platform</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarMenu>
          {elements}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}