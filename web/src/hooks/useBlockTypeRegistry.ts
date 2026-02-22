import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

/* ── Types ── */

export interface BlockTypeEntry {
  block_type: string;
  badge_color: string | null;
  description: string | null;
  sort_order: number;
}

export interface DoclingLabelEntry {
  label: string;
  platform_block_type: string;
  badge_color: string | null;
  overlay_border_color: string | null;
  overlay_bg_color: string | null;
  description: string | null;
  sort_order: number;
}

export interface BlockTypeRegistry {
  /** Platform block_type → badge color (e.g. heading → blue) */
  badgeColor: Record<string, string>;
  /** Docling native label → overlay border hex */
  overlayBorder: Record<string, string>;
  /** Docling native label → overlay background rgba */
  overlayBg: Record<string, string>;
  /** Docling native label → platform block_type */
  labelToBlockType: Record<string, string>;
  /** Docling native label → badge color (may differ from platform default) */
  labelBadgeColor: Record<string, string>;
  /** All block type entries ordered by sort_order */
  blockTypes: BlockTypeEntry[];
  /** All docling label entries ordered by sort_order */
  doclingLabels: DoclingLabelEntry[];
}

/* ── Module-level cache (shared across all hook consumers) ── */

let cached: BlockTypeRegistry | null = null;
let fetchPromise: Promise<BlockTypeRegistry> | null = null;

async function fetchRegistry(): Promise<BlockTypeRegistry> {
  const [btRes, dlRes] = await Promise.all([
    supabase
      .from('block_type_catalog')
      .select('block_type, badge_color, description, sort_order')
      .order('sort_order'),
    supabase
      .from('docling_label_catalog')
      .select('label, platform_block_type, badge_color, overlay_border_color, overlay_bg_color, description, sort_order')
      .order('sort_order'),
  ]);

  const blockTypes = (btRes.data ?? []) as BlockTypeEntry[];
  const doclingLabels = (dlRes.data ?? []) as DoclingLabelEntry[];

  const badgeColor: Record<string, string> = {};
  for (const row of blockTypes) {
    badgeColor[row.block_type] = row.badge_color ?? 'gray';
  }

  const overlayBorder: Record<string, string> = {};
  const overlayBg: Record<string, string> = {};
  const labelToBlockType: Record<string, string> = {};
  const labelBadgeColor: Record<string, string> = {};
  for (const row of doclingLabels) {
    if (row.overlay_border_color) overlayBorder[row.label] = row.overlay_border_color;
    if (row.overlay_bg_color) overlayBg[row.label] = row.overlay_bg_color;
    labelToBlockType[row.label] = row.platform_block_type;
    labelBadgeColor[row.label] = row.badge_color ?? badgeColor[row.platform_block_type] ?? 'gray';
  }

  return { badgeColor, overlayBorder, overlayBg, labelToBlockType, labelBadgeColor, blockTypes, doclingLabels };
}

/**
 * Returns the block-type display registry from the DB.
 * Fetches once per app session and caches in memory.
 */
export function useBlockTypeRegistry() {
  const [registry, setRegistry] = useState<BlockTypeRegistry | null>(cached);
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    if (cached) {
      setRegistry(cached);
      setLoading(false);
      return;
    }

    if (!fetchPromise) {
      fetchPromise = fetchRegistry();
    }

    let cancelled = false;
    fetchPromise.then((result) => {
      cached = result;
      if (!cancelled) {
        setRegistry(result);
        setLoading(false);
      }
    }).catch(() => {
      // On failure, fall back silently — consumers use ?? 'gray' defaults
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, []);

  return { registry, loading };
}

/** Bust the cache (e.g. after admin edits the registry). */
export function invalidateBlockTypeRegistry() {
  cached = null;
  fetchPromise = null;
}
