/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, type ReactNode } from 'react';

type ShellTopSlots = {
  left?: ReactNode;
  middle?: ReactNode;
  right?: ReactNode;
  hideLeftDivider?: boolean;
  showRightInMinimal?: boolean;
};

type HeaderCenterState = {
  hasProvider: boolean;
  center: ReactNode;
  setCenter: (node: ReactNode) => void;
  pageHeader: ReactNode;
  setPageHeader: (node: ReactNode) => void;
  shellTopSlots: ShellTopSlots | null;
  setShellTopSlots: (slots: ShellTopSlots | null) => void;
};

const HeaderCenterContext = createContext<HeaderCenterState>({
  hasProvider: false,
  center: null,
  setCenter: () => {},
  pageHeader: null,
  setPageHeader: () => {},
  shellTopSlots: null,
  setShellTopSlots: () => {},
});

export function HeaderCenterProvider({ children }: { children: ReactNode }) {
  const [center, setCenter] = useState<ReactNode>(null);
  const [pageHeader, setPageHeader] = useState<ReactNode>(null);
  const [shellTopSlots, setShellTopSlots] = useState<ShellTopSlots | null>(null);
  return (
    <HeaderCenterContext.Provider
      value={{ hasProvider: true, center, setCenter, pageHeader, setPageHeader, shellTopSlots, setShellTopSlots }}
    >
      {children}
    </HeaderCenterContext.Provider>
  );
}

export function useHeaderCenter() {
  return useContext(HeaderCenterContext);
}
