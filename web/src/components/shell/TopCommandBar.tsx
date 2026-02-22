import { useEffect, useRef, useState } from 'react';
import { ActionIcon, Box, Group, Kbd, TextInput, Tooltip } from '@mantine/core';
import { useHotkeys } from '@mantine/hooks';
import type { Icon } from '@tabler/icons-react';
import { IconMenu2, IconMoon, IconSearch, IconSun } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { AiAssistantIcon } from '@/components/icons/AiAssistantIcon';
import { useHeaderCenter } from '@/components/shell/HeaderCenterContext';
import { GLOBAL_MENUS, NAV_GROUPS } from '@/components/shell/nav-config';
import { styleTokens } from '@/lib/styleTokens';

type TopCommandBarProps = {
  navOpened: boolean;
  onToggleNav: () => void;
  desktopNavOpened?: boolean;
  onToggleDesktopNav?: () => void;
  showAssistantToggle?: boolean;
  assistantOpened: boolean;
  onToggleAssistant: () => void;
  computedColorScheme: 'dark' | 'light';
  onToggleColorScheme: () => void;
};

type SearchAction = {
  id: string;
  label: string;
  group: string;
  path: string;
  icon: Icon;
};

function buildActions(): SearchAction[] {
  const globalPaths = new Set(GLOBAL_MENUS.map((item) => item.path));
  const globalActions: SearchAction[] = GLOBAL_MENUS.map((item) => ({
    id: `global-${item.path}`,
    label: item.label,
    group: 'Global',
    path: item.path,
    icon: item.icon,
  }));
  const groupedActions: SearchAction[] = NAV_GROUPS.flatMap((g) =>
    g.items
      .filter((item) => !globalPaths.has(item.path))
      .map((item) => ({
        id: item.path,
        label: item.label,
        group: g.label,
        path: item.path,
        icon: item.icon,
      })),
  );
  return [...globalActions, ...groupedActions];
}

export function TopCommandBar({
  onToggleNav,
  showAssistantToggle = true,
  assistantOpened,
  onToggleAssistant,
  computedColorScheme,
  onToggleColorScheme,
}: TopCommandBarProps) {
  const { center } = useHeaderCenter();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const allActions = useRef(buildActions()).current;

  const filtered = query.trim()
    ? allActions.filter((a) => a.label.toLowerCase().includes(query.toLowerCase()))
    : allActions;

  useHotkeys([['mod+k', () => { inputRef.current?.focus(); setOpen(true); }]]);

  useEffect(() => { setSelectedIndex(0); }, [query]);

  useEffect(() => {
    if (!open) return undefined;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        !inputRef.current?.contains(e.target as Node) &&
        !dropdownRef.current?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const pick = (action: SearchAction) => {
    navigate(action.path);
    setQuery('');
    setOpen(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && filtered[selectedIndex]) {
      e.preventDefault();
      pick(filtered[selectedIndex]);
    } else if (e.key === 'Escape') {
      setQuery('');
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  return (
    <Box className="top-command-bar">
      <Box className="top-command-bar-left">
        <Tooltip label="Toggle navigation">
          <ActionIcon
            hiddenFrom="sm"
            size="md"
            variant="subtle"
            aria-label="Toggle navigation"
            onClick={onToggleNav}
          >
            <IconMenu2 size={18} />
          </ActionIcon>
        </Tooltip>
        {center}
      </Box>

      <Box className="top-command-bar-center">
        <Box className="top-command-bar-search-wrapper">
          <TextInput
            ref={inputRef}
            className="top-command-bar-search-input"
            placeholder="Search pages..."
            leftSection={<IconSearch size={14} />}
            rightSection={!open ? <Kbd size="xs" className="search-kbd">Ctrl+K</Kbd> : undefined}
            rightSectionWidth={open ? undefined : 56}
            value={query}
            onChange={(e) => { setQuery(e.currentTarget.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            size="xs"
          />
          {open && filtered.length > 0 && (
            <div ref={dropdownRef} className="top-command-bar-search-dropdown">
              {filtered.map((action, i) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.id}
                    type="button"
                    className={`search-dropdown-item${i === selectedIndex ? ' selected' : ''}`}
                    onMouseEnter={() => setSelectedIndex(i)}
                    onClick={() => pick(action)}
                  >
                    <Icon size={16} stroke={1.5} />
                    <span className="search-dropdown-label">{action.label}</span>
                    <span className="search-dropdown-group">{action.group}</span>
                  </button>
                );
              })}
            </div>
          )}
          {open && query.trim() && filtered.length === 0 && (
            <div ref={dropdownRef} className="top-command-bar-search-dropdown">
              <div className="search-dropdown-empty">No results</div>
            </div>
          )}
        </Box>
      </Box>

      <Group className="top-command-bar-right" gap="sm" justify="flex-end" wrap="nowrap">
        {showAssistantToggle && (
          <Tooltip label={assistantOpened ? 'Hide Assistant' : 'Show Assistant'}>
            <ActionIcon
              variant="subtle"
              size="md"
              onClick={onToggleAssistant}
              aria-label={assistantOpened ? 'Hide Assistant' : 'Show Assistant'}
            >
              <AiAssistantIcon
                size={20}
                style={{
                  filter: assistantOpened
                    ? `drop-shadow(0 0 8px ${styleTokens.accents.assistantGlow})`
                    : undefined,
                }}
              />
            </ActionIcon>
          </Tooltip>
        )}
        <Tooltip label={computedColorScheme === 'dark' ? 'Light mode' : 'Dark mode'}>
          <ActionIcon
            variant="subtle"
            size="md"
            onClick={onToggleColorScheme}
            aria-label="Toggle color scheme"
          >
            {computedColorScheme === 'dark' ? <IconSun size={18} /> : <IconMoon size={18} />}
          </ActionIcon>
        </Tooltip>
      </Group>
    </Box>
  );
}
