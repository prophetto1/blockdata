/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, type ReactNode } from 'react';

type ShellTopSlots = {
  left?: ReactNode;
  middle?: ReactNode;
  right?: ReactNode;
};

type HeaderCenterState = {
  center: ReactNode;
  setCenter: (node: ReactNode) => void;
  shellTopSlots: ShellTopSlots | null;
  setShellTopSlots: (slots: ShellTopSlots | null) => void;
};

const HeaderCenterContext = createContext<HeaderCenterState>({
  center: null,
  setCenter: () => {},
  shellTopSlots: null,
  setShellTopSlots: () => {},
});

export function HeaderCenterProvider({ children }: { children: ReactNode }) {
  const [center, setCenter] = useState<ReactNode>(null);
  const [shellTopSlots, setShellTopSlots] = useState<ShellTopSlots | null>(null);
  return (
    <HeaderCenterContext.Provider value={{ center, setCenter, shellTopSlots, setShellTopSlots }}>
      {children}
    </HeaderCenterContext.Provider>
  );
}

export function useHeaderCenter() {
  return useContext(HeaderCenterContext);
}
