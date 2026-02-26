import { describe, expect, it } from 'vitest';
import { isDocumentsMenuRoute } from './documentsMenuRoute';

describe('isDocumentsMenuRoute', () => {
  it('returns true for documents dropdown routes', () => {
    expect(isDocumentsMenuRoute('/app/projects/project-1')).toBe(true);
    expect(isDocumentsMenuRoute('/app/projects/project-1/upload')).toBe(true);
    expect(isDocumentsMenuRoute('/app/extract/project-1')).toBe(true);
    expect(isDocumentsMenuRoute('/app/transform/project-1')).toBe(true);
  });

  it('returns false for non-documents routes', () => {
    expect(isDocumentsMenuRoute('/app/projects/list')).toBe(false);
    expect(isDocumentsMenuRoute('/app/flows/project-1/overview')).toBe(false);
    expect(isDocumentsMenuRoute('/app/settings')).toBe(false);
  });
});
