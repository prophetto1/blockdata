import { describe, expect, it } from 'vitest';
import { GLOBAL_MENUS } from './nav-config';

describe('GLOBAL_MENUS', () => {
  it('includes an Editor menu entry', () => {
    expect(
      GLOBAL_MENUS.some((item) => item.label === 'Editor' && item.path === '/app/editor'),
    ).toBe(true);
  });

  it('includes an Integrations menu entry', () => {
    expect(
      GLOBAL_MENUS.some((item) => item.label === 'Integrations' && item.path === '/app/integrations'),
    ).toBe(true);
  });

  it('does not include legacy Ark UI catalog or MCP menu targets', () => {
    expect(
      GLOBAL_MENUS.some((item) => item.path === '/app/ui' || item.path === '/app/mcp'),
    ).toBe(false);
  });
});
