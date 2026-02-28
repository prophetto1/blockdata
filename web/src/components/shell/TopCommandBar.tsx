import { useMemo, useState } from 'react';
import { Combobox, createListCollection } from '@ark-ui/react/combobox';
import { IconMenu2, IconSparkles, IconList } from '@tabler/icons-react';
import { Moon02Icon, Sun03Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useNavigate } from 'react-router-dom';
import { useHeaderCenter } from '@/components/shell/HeaderCenterContext';
import { AppIcon } from '@/components/ui/app-icon';
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
};

const UI_THEME_KEY = 'ui-theme';

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

function resolveIsDark(): boolean {
  if (typeof document === 'undefined') return true;
  const attr = document.documentElement.getAttribute('data-theme');
  if (attr === 'dark') return true;
  if (attr === 'light') return false;

  if (typeof window !== 'undefined') {
    const stored = window.localStorage.getItem(UI_THEME_KEY);
    if (stored === 'dark' || stored === 'light') {
      document.documentElement.setAttribute('data-theme', stored);
      return stored === 'dark';
    }
  }

  return true;
}

export function TopCommandBar({
  onToggleNav,
  shellGuides = false,
  showAssistantToggle = false,
  assistantOpened = false,
  onToggleAssistant,
}: TopCommandBarProps) {
  const navigate = useNavigate();
  const { center, shellTopSlots } = useHeaderCenter();
  const [isDark, setIsDark] = useState(resolveIsDark);
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

  const toggleColorScheme = () => {
    if (typeof document === 'undefined' || typeof window === 'undefined') return;
    const next = isDark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    window.localStorage.setItem(UI_THEME_KEY, next);
    setIsDark((current) => !current);
  };

  const searchNode = !shellGuides ? (
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
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:hidden"
        >
          <AppIcon icon={IconMenu2} size="lg" />
        </button>
        {shellGuides ? leftNode : null}
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
          <button
            type="button"
            className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Project List"
            title="Project List"
            onClick={() => navigate('/app/projects/list')}
          >
            <AppIcon icon={IconList} size="md" />
            <span className="hidden sm:inline">Project List</span>
          </button>
          {showAssistantToggle && onToggleAssistant ? (
            <button
              type="button"
              className={`top-command-bar-assistant-toggle inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring${assistantOpened ? ' is-active' : ''}`}
              aria-label={assistantOpened ? 'Hide Assistant' : 'Show Assistant'}
              title={assistantOpened ? 'Hide Assistant' : 'Show Assistant'}
              onClick={onToggleAssistant}
            >
              <AppIcon icon={IconSparkles} size="md" />
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
