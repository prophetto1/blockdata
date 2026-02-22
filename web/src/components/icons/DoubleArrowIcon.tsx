import type { CSSProperties } from 'react';

type DoubleArrowIconProps = {
  size?: number;
  style?: CSSProperties;
};

// Matches docs/icons/DA.svg path and viewBox exactly.
export function DoubleArrowIcon({
  size = 20,
  style,
}: DoubleArrowIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 -960 960 960"
      fill="currentColor"
      style={style}
      aria-hidden="true"
      focusable="false"
    >
      <path d="m240-240 172-240-172-240h96l172 240-172 240h-96Zm212 0 172-240-172-240h97l171 240-171 240h-97Z" />
    </svg>
  );
}

