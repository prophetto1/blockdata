import type { ReactNode, CSSProperties } from 'react';

type Props = {
  children?: ReactNode;
  /** max-width class (default: max-w-5xl) */
  containerClass?: string;
  py?: number;
  className?: string;
  style?: CSSProperties;
  innerClassName?: string;
};

export function MarketingSection({
  children,
  containerClass = 'max-w-5xl',
  py = 72,
  className,
  style,
  innerClassName,
}: Props) {
  return (
    <div className={className} style={{ paddingTop: py, paddingBottom: py, ...style }}>
      <div className={`mx-auto px-4 sm:px-6 md:px-8 ${containerClass}`}>
        <div className={innerClassName}>
          {children}
        </div>
      </div>
    </div>
  );
}
