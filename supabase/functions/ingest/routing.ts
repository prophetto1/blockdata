import type { RuntimePolicy } from "../_shared/admin_policy.ts";
import { detectExtension, sourceTypeFromExtension } from "./storage.ts";

export type IngestRoute = {
  extension: string;
  source_type: string;
  track: "mdast" | "docling" | "pandoc";
};

export function resolveIngestRoute(
  filename: string,
  policy: RuntimePolicy,
): IngestRoute {
  const extension = detectExtension(filename);
  if (!extension) {
    throw new Error("Unsupported file type: missing file extension");
  }

  if (!policy.upload.allowed_extensions.includes(extension)) {
    throw new Error(`Extension not enabled by runtime policy: .${extension}`);
  }

  const track = policy.upload.extension_track_routing[extension];
  if (!track) {
    throw new Error(`Runtime routing policy missing extension mapping: .${extension}`);
  }

  if (!policy.upload.track_enabled[track]) {
    throw new Error(`Track disabled by runtime policy: ${track}`);
  }

  const capability = policy.upload.track_capability_catalog.tracks[track];
  if (!capability.extensions.includes(extension)) {
    throw new Error(
      `Routing policy conflicts with capability catalog: .${extension} -> ${track}`,
    );
  }

  const source_type = sourceTypeFromExtension(extension);
  if (!source_type) {
    throw new Error(`No source_type mapping for extension: .${extension}`);
  }

  return { extension, source_type, track };
}
