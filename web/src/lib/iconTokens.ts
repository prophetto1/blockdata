export type IconToken = Readonly<{
  size: number;
  stroke?: number;
}>;

function defineIconToken(size: number, stroke?: number): IconToken {
  return stroke === undefined ? { size } : { size, stroke };
}

export const ICON_TOKENS = {
  shell: {
    configAction: defineIconToken(20, 2),
    paneChevron: defineIconToken(20, 2),
    nav: defineIconToken(16, 1.9),
    action: defineIconToken(16, 1.9),
    compactControl: defineIconToken(20, 1.9),
  },
  inline: {
    xs: defineIconToken(12, 1.8),
    sm: defineIconToken(14, 1.8),
    md: defineIconToken(16, 1.8),
    lg: defineIconToken(18, 1.8),
  },
} as const;
