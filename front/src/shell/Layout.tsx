import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  Home,
  FolderKanban,
  Zap,
  Play,
  Activity,
  GitBranch,
  Rocket,
  Blocks,
  Database,
  PenTool,
  GitCompare,
  Terminal,
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { EditorFileTreeSidebar } from '@/shell/EditorFileTreeSidebar'
import {
  SHELL_CONTRACT,
  SHELL_HEADER_STYLE_CONTRACT,
  SHELL_PROVIDER_STYLE_CONTRACT,
} from '@/contracts/shell'

const navItems = [
  { to: '/home', icon: Home, label: 'Home' },
  { to: '/pipelines', icon: FolderKanban, label: 'Pipelines' },
  { to: '/triggers', icon: Zap, label: 'Triggers' },
  { to: '/pipeline-runs', icon: Play, label: 'Runs' },
  { to: '/overview', icon: Activity, label: 'Monitoring' },
  { to: '/apps/pipelines/graph', icon: GitBranch, label: 'Pipeline graph' },
  { to: '/apps/deploy', icon: Rocket, label: 'Deploy' },
  { to: '/apps/templates', icon: Blocks, label: 'Templates' },
  { to: '/apps/products/data', icon: Database, label: 'Data products' },
  { to: '/apps/coder', icon: PenTool, label: 'Editor' },
  { to: '/apps/version-control/terminal', icon: GitCompare, label: 'Version control' },
  { to: '/apps/terminal', icon: Terminal, label: 'Terminal' },
]

function usePageLabel() {
  const { pathname } = useLocation()
  const match = navItems.find(
    (item) => pathname === item.to || pathname.startsWith(`${item.to}/`),
  )
  return match?.label ?? 'Home'
}

function isEditorPath(pathname: string) {
  return (
    pathname === '/apps/coder' ||
    pathname.startsWith('/apps/coder/') ||
    pathname === '/editor' ||
    pathname.startsWith('/editor/')
  )
}

function AppSidebar() {
  const { pathname } = useLocation()

  return (
    <Sidebar collapsible={SHELL_CONTRACT.sidebar.primary.collapsibleMode} variant="sidebar">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild tooltip={SHELL_CONTRACT.brand.name}>
              <NavLink to="/home">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-foreground">
                  <Blocks className="size-4 text-background" />
                </div>
                <span className="truncate font-semibold">{SHELL_CONTRACT.brand.name}</span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Platform</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.to || pathname.startsWith(`${item.to}/`)}
                    tooltip={item.label}
                  >
                    <NavLink to={item.to}>
                      <item.icon />
                      <span>{item.label}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" tooltip="Account">
                  <Avatar className="size-8">
                    <AvatarFallback className="bg-muted text-xs font-medium text-muted-foreground">
                      U
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate text-sm">Account</span>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="right" align="end" className="w-48">
                <DropdownMenuLabel>Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Profile</DropdownMenuItem>
                <DropdownMenuItem>API Keys</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}

function TopHeader() {
  const { pathname } = useLocation()
  const currentLabel = usePageLabel()

  return (
    <header
      className="flex h-[var(--shell-header-height)] shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-[var(--shell-header-height-collapsed)]"
      style={SHELL_HEADER_STYLE_CONTRACT}
    >
      <div className="flex items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-1 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage>{SHELL_CONTRACT.brand.name}</BreadcrumbPage>
            </BreadcrumbItem>
            {pathname !== '/home' && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{currentLabel}</BreadcrumbPage>
                </BreadcrumbItem>
              </>
            )}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </header>
  )
}

export default function Layout() {
  const { pathname } = useLocation()
  const showEditorFileTree = isEditorPath(pathname)

  return (
    <SidebarProvider style={SHELL_PROVIDER_STYLE_CONTRACT}>
      <AppSidebar />
      {showEditorFileTree && <EditorFileTreeSidebar />}
      <SidebarInset>
        <TopHeader />
        <div className={`flex-1 overflow-auto ${SHELL_CONTRACT.content.pagePaddingClassName}`}>
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
