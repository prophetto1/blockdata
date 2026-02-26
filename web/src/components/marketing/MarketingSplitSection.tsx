import type { ReactNode } from 'react';

type Props = {
  leftSlot: ReactNode;
  rightSlot: ReactNode;
  gap?: number;
  className?: string;
};

export function MarketingSplitSection({ leftSlot, rightSlot, gap = 48, className }: Props) {
  return (
    <div
      className={`grid items-center grid-cols-1 md:grid-cols-[7fr_5fr] ${className ?? ''}`}
      style={{ gap }}
    >
      <div className="flex flex-col gap-6">
        {leftSlot}
      </div>
      <div>
        {rightSlot}
      </div>
    </div>
  );
}
