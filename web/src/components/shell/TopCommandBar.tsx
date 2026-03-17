import { useMemo, useState } from 'react';
import { Combobox, createListCollection } from '@ark-ui/react/combobox';
import { Menu02Icon, SparklesIcon, Moon02Icon, Sun03Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useHeaderCenter } from '@/components/shell/HeaderCenterContext';
import { ProjectSwitcher } from '@/components/shell/ProjectSwitcher';
import { useTheme } from '@/hooks/useTheme';

import {
  ICON_CONTEXT_SIZE,
  ICON_SIZES,
  ICON_STANDARD,
  ICON_STROKES,
} from '@/lib/icon-contract';
import './TopCommandBar.css';

type TopCommandBarProps = {
  onToggleNav: () => void;
  shellGuides?: boolean;
  showAssistantToggle?: boolean;
  assistantOpened?: boolean;
  onToggleAssistant?: () => void;
  hideProjectSwitcher?: boolean;
  hideSearch?: boolean;
};

type TopSearchOption = {
  value: string;
  label: string;
};

const TOP_SEARCH_OPTIONS: TopSearchOption[] = [
  { value: 'upload', label: 'Upload' },
  { value: 'parse', label: 'Parse' },
  { value: 'extract', label: 'Extract' },
  { value: 'transform', label: 'Transform' },
  { value: 'settings', label: 'Settings' },
];

export function TopCommandBar({
  onToggleNav,
  shellGuides = false,
  showAssistantToggle = false,
  assistantOpened = false,
  onToggleAssistant,
  hideProjectSwitcher = false,
  hideSearch = false,
}: TopCommandBarProps) {
  const { center, shellTopSlots } = useHeaderCenter();
  const { isDark, toggle: toggleColorScheme } = useTheme();
  const [searchValue, setSearchValue] = useState('');
  const searchCollection = useMemo(
    () => createListCollection({ items: TOP_SEARCH_OPTIONS }),
    [],
  );
  const visibleSearchItems = useMemo(() => {
    const query = searchValue.trim().toLowerCase();
    if (!query) return searchCollection.items;
    return searchCollection.items.filter((item) => item.label.toLowerCase().includes(query));
  }, [searchCollection, searchValue]);
  const utilityIconSize = ICON_SIZES[ICON_CONTEXT_SIZE[ICON_STANDARD.utilityTopRight.context]];
  const utilityIconStroke = ICON_STROKES[ICON_STANDARD.utilityTopRight.stroke];

  const searchNode = !shellGuides && !hideSearch ? (
    <Combobox.Root
      className="top-command-bar-search-wrap"
      collection={searchCollection}
      inputValue={searchValue}
      onInputValueChange={(details) => setSearchValue(details.inputValue)}
      onValueChange={(details) => {
        const selected = details.value[0];
        if (!selected) return;
        const next = searchCollection.items.find((item) => item.value === selected);
        if (next) setSearchValue(next.label);
      }}
      openOnChange
      openOnClick={false}
      closeOnSelect
      selectionBehavior="preserve"
      positioning={{ placement: 'bottom-start', sameWidth: true, offset: { mainAxis: 6 } }}
    >
      <Combobox.Control>
        <Combobox.Input
          type="search"
          className="top-command-bar-search-input"
          placeholder="Search"
          aria-label="Search"
        />
      </Combobox.Control>
      <Combobox.Positioner className="top-command-bar-search-positioner">
        <Combobox.Content className="top-command-bar-search-content">
          {visibleSearchItems.length === 0 ? (
            <Combobox.Empty className="top-command-bar-search-empty">
              No matches
            </Combobox.Empty>
          ) : (
            visibleSearchItems.map((item) => (
              <Combobox.Item
                key={item.value}
                item={item}
                className="top-command-bar-search-item"
              >
                <Combobox.ItemText>{item.label}</Combobox.ItemText>
              </Combobox.Item>
            ))
          )}
        </Combobox.Content>
      </Combobox.Positioner>
    </Combobox.Root>
  ) : null;

  const className = `top-command-bar${shellGuides ? ' top-command-bar--shell-guides' : ' top-command-bar--minimal'}`;
  const leftNode = shellTopSlots?.left ?? null;
  const resolvedMiddleNode = shellGuides ? (shellTopSlots?.middle ?? null) : center;
  const rightNode = shellTopSlots?.right ?? null;
  const showRightSlot = shellGuides || Boolean(shellTopSlots?.showRightInMinimal);

  return (
    <div
      className={className}
    >
      <div className="top-command-bar-left">
        <button
          type="button"
          aria-label="Toggle navigation"
          title="Toggle navigation"
          onClick={onToggleNav}
          className="inline-flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
        >
          <HugeiconsIcon icon={Menu02Icon} size={24} strokeWidth={1.8} />
        </button>
        {shellGuides ? leftNode : null}
        {!hideProjectSwitcher && <ProjectSwitcher />}
      </div>
      <div className="top-command-bar-center">
        {resolvedMiddleNode}
      </div>
      {searchNode ? (
        <div className="top-command-bar-search">
          {searchNode}
        </div>
      ) : null}
      <div className="top-command-bar-right">
        <div className="top-command-bar-right-content">
          {showRightSlot ? (
            <div className="top-command-bar-right-slot">
              {rightNode}
            </div>
          ) : null}
          {showAssistantToggle && onToggleAssistant ? (
            <button
              type="button"
              className={`top-command-bar-assistant-toggle inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring${assistantOpened ? ' is-active' : ''}`}
              aria-label={assistantOpened ? 'Hide Assistant' : 'Show Assistant'}
              title={assistantOpened ? 'Hide Assistant' : 'Show Assistant'}
              onClick={onToggleAssistant}
            >
              <HugeiconsIcon icon={SparklesIcon} size={20} strokeWidth={1.8} />
            </button>
          ) : null}
          <button
            type="button"
            className={`top-command-bar-theme-toggle ${ICON_STANDARD.utilityTopRight.buttonClass}`}
            aria-label="Toggle color scheme"
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            onClick={toggleColorScheme}
          >
            {isDark
              ? (
                <HugeiconsIcon
                  icon={Sun03Icon}
                  size={utilityIconSize}
                  strokeWidth={utilityIconStroke}
                />
              )
              : (
                <HugeiconsIcon
                  icon={Moon02Icon}
                  size={utilityIconSize}
                  strokeWidth={utilityIconStroke}
                />
              )}
          </button>
        </div>
      </div>
    </div>
  );
}
