import type { ReactNode } from 'react';
import { Toaster } from 'sonner';

type UIProviderProps = {
  children: ReactNode;
};

export function UIProvider({ children }: UIProviderProps) {
  return (
    <>
      <Toaster position="top-right" richColors />
      {children}
    </>
  );
}
