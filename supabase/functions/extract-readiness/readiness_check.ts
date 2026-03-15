type ReadinessInput = {
  gcpVertexSaKey: string | undefined;
};

type ReadinessResult = {
  is_ready: boolean;
  reasons: string[];
};

/**
 * Check whether platform Vertex extraction can run.
 *
 * Only GCP_VERTEX_SA_KEY is a hard requirement — without it, token exchange
 * cannot happen. GCP_VERTEX_PROJECT_ID is NOT checked here because
 * vertex_auth.ts:getVertexConfig() defaults it to "agchain".
 */
export function checkExtractReadiness(input: ReadinessInput): ReadinessResult {
  const reasons: string[] = [];

  if (!input.gcpVertexSaKey) reasons.push("Missing GCP_VERTEX_SA_KEY");

  return { is_ready: reasons.length === 0, reasons };
}
