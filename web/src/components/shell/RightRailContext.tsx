/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { RightRailSection } from '@/components/shell/RightRailShell';

type RightRailContent = {
  title: string;
  description?: string;
  sections: RightRailSection[];
  footer?: ReactNode;
};

export type RightRailTab = 'help' | 'ai';

type RightRailState = {
  content: RightRailContent | null;
  setContent: (content: RightRailContent | null) => void;
  isOpen: boolean;
  toggle: () => void;
  activeTab: RightRailTab;
  setActiveTab: (tab: RightRailTab) => void;
  chatDetached: boolean;
  setChatDetached: (detached: boolean) => void;
};

const STORAGE_KEY = 'blockdata.shell.right_rail_open';
const TAB_KEY = 'blockdata.shell.right_rail_tab';
const DETACHED_KEY = 'blockdata.shell.chat_detached';

function readStored(key: string, defaultValue: string): string {
  if (typeof window === 'undefined') return defaultValue;
  return window.localStorage.getItem(key) ?? defaultValue;
}

function readStoredBool(key: string, defaultValue: boolean): boolean {
  if (typeof window === 'undefined') return defaultValue;
  const raw = window.localStorage.getItem(key);
  if (raw === null) return defaultValue;
  return raw === 'true';
}

const RightRailContext = createContext<RightRailState>({
  content: null,
  setContent: () => {},
  isOpen: false,
  toggle: () => {},
  activeTab: 'ai',
  setActiveTab: () => {},
  chatDetached: false,
  setChatDetached: () => {},
});

export function RightRailProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<RightRailContent | null>(null);
  const [isOpen, setIsOpen] = useState(() => readStoredBool(STORAGE_KEY, false));
  const [activeTab, setActiveTabRaw] = useState<RightRailTab>(
    () => (readStored(TAB_KEY, 'ai') as RightRailTab),
  );
  const [chatDetached, setChatDetachedRaw] = useState(
    () => readStoredBool(DETACHED_KEY, false),
  );

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, String(isOpen));
  }, [isOpen]);

  useEffect(() => {
    window.localStorage.setItem(TAB_KEY, activeTab);
  }, [activeTab]);

  useEffect(() => {
    window.localStorage.setItem(DETACHED_KEY, String(chatDetached));
  }, [chatDetached]);

  const toggle = () => setIsOpen((prev) => !prev);

  const setActiveTab = (tab: RightRailTab) => {
    setActiveTabRaw(tab);
    if (!isOpen) setIsOpen(true);
  };

  const setChatDetached = (detached: boolean) => {
    setChatDetachedRaw(detached);
    if (detached) {
      setIsOpen(false);
    }
  };

  return (
    <RightRailContext.Provider
      value={{
        content, setContent,
        isOpen, toggle,
        activeTab, setActiveTab,
        chatDetached, setChatDetached,
      }}
    >
      {children}
    </RightRailContext.Provider>
  );
}

export function useRightRailContext() {
  return useContext(RightRailContext);
}

/**
 * Pages call this hook to register help-rail content.
 * Content is cleared on unmount.
 */
export function useRightRail(input: RightRailContent | null) {
  const { setContent } = useRightRailContext();

  useEffect(() => {
    setContent(input ?? null);
    return () => setContent(null);
  }, [
    input?.title,
    input?.description,
    input?.sections,
    input?.footer,
    setContent,
  ]);
}
