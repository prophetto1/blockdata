import { useRef } from 'react';
import {
  IconArrowsTransferDown,
  IconChevronDown,
  IconTransform,
} from '@tabler/icons-react';
import {
  MenuContent,
  MenuItem,
  MenuPortal,
  MenuPositioner,
  MenuRoot,
  MenuTrigger,
} from '@/components/ui/menu';
import { Workbench, type WorkbenchHandle } from '@/components/workbench/Workbench';
import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';
import { isPreviewInstanceTab } from '@/lib/previewTabInstance';
import {
  useEltWorkbench,
  ELT_TABS,
  ELT_PULL_TABS,
  ELT_DEFAULT_PANES,
} from './useEltWorkbench';

export default function DocumentTest() {
  useShellHeaderTitle({ title: 'Document Workbench' });

  const workbenchRef = useRef<WorkbenchHandle>(null);
  const {
    openTabIds,
    renderContent,
    dynamicTabLabel,
    transformPanes,
    handlePanesChange,
  } = useEltWorkbench(workbenchRef);

  return (
    <div className="flex h-[calc(100vh-var(--app-shell-header-height))] flex-col overflow-hidden">
      {/* ELT-specific toolbar — bg matches sidebar/header for visual continuity */}
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        {ELT_TABS.map((tab) => {
          const isOpen = tab.id === 'preview'
            ? openTabIds.has('preview') || [...openTabIds].some(isPreviewInstanceTab)
            : openTabIds.has(tab.id);
          return (
            <button
              key={tab.id}
              type="button"
              className={`workbench-panel-button${isOpen ? ' is-open' : ''}`}
              onClick={() => workbenchRef.current?.toggleTab(tab.id)}
            >
              <tab.icon size={15} />
              {tab.label}
            </button>
          );
        })}

        <div className="mx-1 h-4 w-px bg-border" />

        <MenuRoot positioning={{ placement: 'bottom-start', offset: { mainAxis: 6 } }}>
          <MenuTrigger asChild>
            <button
              type="button"
              className={`workbench-panel-button${ELT_PULL_TABS.some((t) => openTabIds.has(t.id)) ? ' is-open' : ''}`}
              aria-label="Open Pull (DLT)"
            >
              <IconArrowsTransferDown size={15} />
              Pull
              <IconChevronDown size={14} />
            </button>
          </MenuTrigger>
          <MenuPortal>
            <MenuPositioner>
              <MenuContent>
                {ELT_PULL_TABS.map((entry) => (
                  <MenuItem
                    key={entry.id}
                    value={entry.id}
                    onClick={() => workbenchRef.current?.addTab(entry.id)}
                  >
                    {entry.label}
                  </MenuItem>
                ))}
              </MenuContent>
            </MenuPositioner>
          </MenuPortal>
        </MenuRoot>

        <button type="button" className="workbench-panel-button" disabled>
          <IconTransform size={15} />
          Transform
        </button>
      </div>

      {/* Workbench with padding for inset card look */}
      <div className="flex min-h-0 flex-1 flex-col px-2 pb-2 pt-2">
        <Workbench
          ref={workbenchRef}
          tabs={ELT_TABS}
          defaultPanes={ELT_DEFAULT_PANES}
          saveKey="elt-document-workbench-v2"
          renderContent={renderContent}
          dynamicTabLabel={dynamicTabLabel}
          transformPanes={transformPanes}
          onPanesChange={handlePanesChange}
          hideToolbar
          minColumns={3}
          disableDrag
        />
      </div>
    </div>
  );
}
