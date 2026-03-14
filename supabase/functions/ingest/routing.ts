import type { RuntimePolicy } from "../_shared/admin_policy.ts";
import { detectExtension, sourceTypeFromExtension } from "./storage.ts";

export type IngestRoute = {
  extension: string;
  source_type: string;
  track: "docling";
};

export function resolveIngestRoute(
  filename: string,
  policy: RuntimePolicy,
): IngestRoute | null {
  const extension = detectExtension(filename);
  if (!extension) return null;

  const source_type = sourceTypeFromExtension(extension);
  if (!source_type) return null;

  const routingKeys = new Set<string>([extension, source_type]);
  for (const key of routingKeys) {
    const track = policy.upload.extension_track_routing[key];
    if (!track) continue;
    if (!policy.upload.track_enabled[track]) continue;

    const capability = policy.upload.track_capability_catalog.tracks[track];
    if (!capability?.extensions.includes(key)) continue;

    return { extension, source_type, track };
  }

  return null;
}
