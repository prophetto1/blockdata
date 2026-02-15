import type { CSSProperties } from 'react';

// Small deterministic SVG so we don't depend on an external asset pipeline.
// Sparkles glyph only (no background box). The parent control should provide the dark rounded square.
export function AiAssistantIcon({
  size = 22,
  style,
}: {
  size?: number;
  style?: CSSProperties;
}) {
  const sparklePath = (cx: number, cy: number, a: number, d: number): string => {
    // 8-point sparkle: N, NE, E, SE, S, SW, W, NW (alternating long/short radii).
    return [
      `M ${cx} ${cy - a}`,
      `L ${cx + d} ${cy - d}`,
      `L ${cx + a} ${cy}`,
      `L ${cx + d} ${cy + d}`,
      `L ${cx} ${cy + a}`,
      `L ${cx - d} ${cy + d}`,
      `L ${cx - a} ${cy}`,
      `L ${cx - d} ${cy - d}`,
      'Z',
    ].join(' ');
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={style}
      aria-hidden="true"
      focusable="false"
    >
      {/* 3-sparkle cluster (pink/red + blue + violet) */}
      <path d={sparklePath(10.2, 9.6, 3.0, 1.1)} fill="#FF4D6D" />
      <path d={sparklePath(15.9, 12.7, 2.2, 0.85)} fill="#4DA3FF" />
      <path d={sparklePath(8.2, 14.9, 1.7, 0.65)} fill="#A78BFA" />
    </svg>
  );
}
