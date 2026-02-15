import { createContext, useContext, useState, type ReactNode } from 'react';

type HeaderCenterState = {
  center: ReactNode;
  setCenter: (node: ReactNode) => void;
};

const HeaderCenterContext = createContext<HeaderCenterState>({
  center: null,
  setCenter: () => {},
});

export function HeaderCenterProvider({ children }: { children: ReactNode }) {
  const [center, setCenter] = useState<ReactNode>(null);
  return (
    <HeaderCenterContext.Provider value={{ center, setCenter }}>
      {children}
    </HeaderCenterContext.Provider>
  );
}

export function useHeaderCenter() {
  return useContext(HeaderCenterContext);
}