/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { RightRailSection } from '@/components/shell/RightRailShell';

type RightRailContent = {
  title: string;
  description?: string;
  sections: RightRailSection[];
  footer?: ReactNode;
};

type RightRailState = {
  content: RightRailContent | null;
  setContent: (content: RightRailContent | null) => void;
  isOpen: boolean;
  toggle: () => void;
};

const STORAGE_KEY = 'blockdata.shell.right_rail_open';

function readStoredOpen(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(STORAGE_KEY) === 'true';
}

const RightRailContext = createContext<RightRailState>({
  content: null,
  setContent: () => {},
  isOpen: false,
  toggle: () => {},
});

export function RightRailProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<RightRailContent | null>(null);
  const [isOpen, setIsOpen] = useState(() => readStoredOpen());

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, String(isOpen));
  }, [isOpen]);

  const toggle = () => setIsOpen((prev) => !prev);

  return (
    <RightRailContext.Provider value={{ content, setContent, isOpen, toggle }}>
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
