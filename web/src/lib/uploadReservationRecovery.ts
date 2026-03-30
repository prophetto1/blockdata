import { platformApiFetch } from '@/lib/platformApi';

type UploadApiErrorPayload = {
  detail?: {
    code?: string;
    reservation_id?: string;
  } | string;
};

export class UploadApiError extends Error {
  status: number;
  payload: UploadApiErrorPayload | null;

  constructor(message: string, status: number, payload: UploadApiErrorPayload | null) {
    super(message);
    this.name = 'UploadApiError';
    this.status = status;
    this.payload = payload;
  }
}

function parseUploadApiErrorPayload(rawBody: string): UploadApiErrorPayload | null {
  if (!rawBody) return null;
  try {
    return JSON.parse(rawBody) as UploadApiErrorPayload;
  } catch {
    return null;
  }
}

function buildUploadApiErrorMessage(
  rawBody: string,
  payload: UploadApiErrorPayload | null,
  fallbackMessage: string,
  status: number,
): string {
  const detail = payload?.detail;
  if (typeof detail === 'string' && detail.trim()) return detail;
  return rawBody || `${fallbackMessage}: ${status}`;
}

function getPendingReservationConflictId(error: unknown): string | null {
  if (!(error instanceof UploadApiError) || error.status !== 409) return null;
  const detail = error.payload?.detail;
  if (!detail || typeof detail === 'string') return null;
  if (detail.code !== 'pending_reservation_exists') return null;
  return typeof detail.reservation_id === 'string' && detail.reservation_id
    ? detail.reservation_id
    : null;
}

export async function parseUploadApiJsonResponse<T>(
  response: Response,
  fallbackMessage: string,
): Promise<T> {
  if (!response.ok) {
    const rawBody = await response.text().catch(() => '');
    const payload = parseUploadApiErrorPayload(rawBody);
    throw new UploadApiError(
      buildUploadApiErrorMessage(rawBody, payload, fallbackMessage, response.status),
      response.status,
      payload,
    );
  }
  return await response.json() as T;
}

export async function postUploadApiJson<T>(
  path: string,
  body: unknown,
  fallbackMessage = 'storage upload request failed',
): Promise<T> {
  const response = await platformApiFetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return parseUploadApiJsonResponse<T>(response, fallbackMessage);
}

export async function cancelUploadReservation(reservationId: string): Promise<void> {
  try {
    await platformApiFetch(`/storage/uploads/${reservationId}`, { method: 'DELETE' });
  } catch {
    // Best-effort cleanup only. Subsequent reserve attempts still enforce correctness.
  }
}

export async function reserveUploadWithConflictRecovery<T>(
  reserve: () => Promise<T>,
): Promise<T> {
  try {
    return await reserve();
  } catch (error) {
    const reservationId = getPendingReservationConflictId(error);
    if (!reservationId) throw error;
    await cancelUploadReservation(reservationId);
    return await reserve();
  }
}
