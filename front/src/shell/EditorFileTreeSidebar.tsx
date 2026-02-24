import { ChevronRight, File, Folder } from 'lucide-react'

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
} from '@/components/ui/sidebar'
import {
  SHELL_CONTRACT,
  SHELL_SECONDARY_RAIL_STYLE_CONTRACT,
} from '@/contracts/shell'

const data = {
  changes: [
    { file: 'pipelines/orders_daily.py', state: 'M' },
    { file: 'templates/ingest/stripe.yaml', state: 'A' },
    { file: 'blocks/transform_cleanse.ts', state: 'U' },
  ],
  tree: [
    [
      'pipelines',
      [
        'orders_daily.py',
        'customer_sync.py',
        ['shared', ['helpers.py', 'validators.py']],
      ],
    ],
    [
      'templates',
      ['ingest', ['stripe.yaml', 'hubspot.yaml']],
      ['transform', ['normalize.sql', 'dedupe.sql']],
    ],
    ['blocks', ['source_loader.ts', 'transform_cleanse.ts', 'export_sink.ts']],
    ['configs', ['runtime.json', 'env.local.json']],
    'README.md',
  ],
}

type TreeItem = string | [string, ...TreeItem[]]

function TreeNode({ item }: { item: TreeItem }) {
  const [name, ...items] = Array.isArray(item) ? item : [item]

  if (!items.length) {
    return (
      <SidebarMenuButton
        isActive={name === 'transform_cleanse.ts'}
        className="data-[active=true]:bg-sidebar-accent"
      >
        <File />
        <span>{name}</span>
      </SidebarMenuButton>
    )
  }

  return (
    <SidebarMenuItem>
      <Collapsible
        className="group/collapsible [&[data-state=open]>button>svg:first-child]:rotate-90"
        defaultOpen={name === 'pipelines' || name === 'templates'}
      >
        <CollapsibleTrigger asChild>
          <SidebarMenuButton>
            <ChevronRight className="transition-transform" />
            <Folder />
            <span>{name}</span>
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {items.map((subItem, index) => (
              <TreeNode key={`${name}-${index}`} item={subItem as TreeItem} />
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </Collapsible>
    </SidebarMenuItem>
  )
}

export function EditorFileTreeSidebar() {
  return (
    <Sidebar
      collapsible={SHELL_CONTRACT.sidebar.secondary.collapsibleMode}
      className={`${SHELL_CONTRACT.sidebar.secondary.visibilityClassName} border-r`}
      style={SHELL_SECONDARY_RAIL_STYLE_CONTRACT}
    >
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Changes</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {data.changes.map((item) => (
                <SidebarMenuItem key={item.file}>
                  <SidebarMenuButton>
                    <File />
                    <span>{item.file}</span>
                  </SidebarMenuButton>
                  <SidebarMenuBadge>{item.state}</SidebarMenuBadge>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Files</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {data.tree.map((item, index) => (
                <TreeNode key={`tree-${index}`} item={item as TreeItem} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
