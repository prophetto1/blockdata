import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  loadIntegrationCatalog,
  syncIntegrationCatalog,
  updateIntegrationCatalogItem,
} from './integration-catalog.api';

const edgeFetchMock = vi.fn();

vi.mock('@/lib/edge', () => ({
  edgeFetch: (...args: unknown[]) => edgeFetchMock(...args),
}));

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('integration-catalog.api', () => {
  beforeEach(() => {
    edgeFetchMock.mockReset();
  });

  it('loads primary catalog data via edge function', async () => {
    edgeFetchMock.mockResolvedValueOnce(jsonResponse({
      items: [{ item_id: 'a' }],
      services: [{ service_id: 's1' }],
      functions: [{ function_id: 'f1' }],
    }));

    const data = await loadIntegrationCatalog();

    expect(edgeFetchMock).toHaveBeenCalledWith('admin-integration-catalog', { method: 'GET' });
    expect(data.items).toHaveLength(1);
    expect(data.services).toHaveLength(1);
    expect(data.functions).toHaveLength(1);
  });

  it('loads temp catalog source when requested', async () => {
    edgeFetchMock.mockResolvedValueOnce(jsonResponse({
      items: [],
      services: [],
      functions: [],
    }));

    await loadIntegrationCatalog('temp');

    expect(edgeFetchMock).toHaveBeenCalledWith('admin-integration-catalog?catalog_source=temp', { method: 'GET' });
  });

  it('patches item updates to the backend endpoint', async () => {
    edgeFetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }));

    await updateIntegrationCatalogItem('item-123', {
      enabled: true,
      mapped_service_id: 'service-99',
      mapped_function_id: 'function-1',
      mapping_notes: 'wired',
    });

    expect(edgeFetchMock).toHaveBeenCalledWith('admin-integration-catalog', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        target: 'item',
        item_id: 'item-123',
        enabled: true,
        mapped_service_id: 'service-99',
        mapped_function_id: 'function-1',
        mapping_notes: 'wired',
      }),
    });
  });

  it('triggers backend sync action', async () => {
    edgeFetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }));

    await syncIntegrationCatalog();

    expect(edgeFetchMock).toHaveBeenCalledWith('admin-integration-catalog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        target: 'sync_kestra',
        dry_run: false,
      }),
    });
  });

  it('throws a readable error when backend returns non-2xx', async () => {
    edgeFetchMock.mockResolvedValueOnce(new Response('boom', { status: 500 }));

    await expect(loadIntegrationCatalog()).rejects.toThrow('boom');
  });
});
