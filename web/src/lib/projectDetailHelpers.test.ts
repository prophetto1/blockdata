import { beforeEach, describe, expect, it, vi } from 'vitest';

const createSignedUrlMock = vi.fn();
const platformApiFetchMock = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: {
    storage: {
      from: vi.fn(() => ({
        createSignedUrl: createSignedUrlMock,
      })),
    },
  },
}));

vi.mock('@/lib/platformApi', () => ({
  platformApiFetch: (...args: unknown[]) => platformApiFetchMock(...args),
}));

import { resolveSignedUrlForLocators } from '@/lib/projectDetailHelpers';

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('projectDetailHelpers signed URL resolver', () => {
  beforeEach(() => {
    createSignedUrlMock.mockReset();
    platformApiFetchMock.mockReset();
  });

  it('routes users-prefixed locators through the platform-api download URL endpoint', async () => {
    platformApiFetchMock.mockResolvedValue(
      jsonResponse({
        signed_url: 'https://gcs.test/file',
        expires_in_seconds: 1800,
      }),
    );

    await expect(
      resolveSignedUrlForLocators(['users/user-1/assets/projects/project-1/sources/src-1/source/guide.md']),
    ).resolves.toEqual({
      url: 'https://gcs.test/file',
      error: null,
    });

    expect(platformApiFetchMock).toHaveBeenCalledWith(
      '/storage/download-url',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          object_key: 'users/user-1/assets/projects/project-1/sources/src-1/source/guide.md',
        }),
      }),
    );
    expect(createSignedUrlMock).not.toHaveBeenCalled();
  });

  it('preserves Supabase signed URL fallback for legacy uploads-prefixed locators', async () => {
    createSignedUrlMock.mockResolvedValue({
      data: { signedUrl: 'https://legacy.test/file' },
      error: null,
    });

    await expect(
      resolveSignedUrlForLocators(['uploads/source-1/guide.md']),
    ).resolves.toEqual({
      url: 'https://legacy.test/file',
      error: null,
    });

    expect(platformApiFetchMock).not.toHaveBeenCalled();
    expect(createSignedUrlMock).toHaveBeenCalledWith('uploads/source-1/guide.md', 60 * 20);
  });
});
