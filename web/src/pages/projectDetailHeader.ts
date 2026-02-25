export type ProjectDetailHeaderMode = 'parse' | 'extract' | 'transform';

export function resolveProjectDetailHeaderTitle(mode: ProjectDetailHeaderMode): 'Parse' | 'Extract' | 'Transform' {
  if (mode === 'extract') return 'Extract';
  if (mode === 'transform') return 'Transform';
  return 'Parse';
}
