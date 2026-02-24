import { useMemo, useState, useCallback, useEffect } from "react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnSizingState,
  type SortingState,
} from "@tanstack/react-table";
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Group,
  Loader,
  Menu,
  Paper,
  SegmentedControl,
  Select,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconArrowBarToDown,
  IconArrowBarToUp,
  IconArrowsVertical,
  IconCheck,
  IconChevronDown,
  IconColumns,
  IconDownload,
  IconFilter,
  IconRotateClockwise,
  IconTrash,
} from "@tabler/icons-react";
import { supabase } from "@/lib/supabase";
import { useBlocks } from "@/hooks/useBlocks";
import { useBlockTypeRegistry } from "@/hooks/useBlockTypeRegistry";
import { useOverlays } from "@/hooks/useOverlays";
import { extractSchemaFields, type SchemaFieldMeta } from "@/lib/schema-fields";
import type { RunWithSchema } from "@/lib/types";
import { ErrorAlert } from "@/components/common/ErrorAlert";

type RowData = Record<string, unknown>;
type ViewerMode = "compact" | "comfortable";
type BlockTypeView = "normalized" | "parser_native";
type ViewerFontSize = "small" | "medium" | "large";
type ViewerFontFamily = "sans" | "serif" | "mono";
type ViewerVerticalAlign = "top" | "center" | "bottom";

type BlockViewerGridProps = {
  convUid: string;
  selectedRunId: string | null;
  selectedRun: RunWithSchema | null;
  onExport?: () => void;
  onDelete?: () => void;
};

const PAGE_SIZES = ["50", "100", "250", "500", "1000"];
const VIEW_MODE_KEY = "blockdata-view-mode";
const BLOCK_TYPE_VIEW_KEY = "blockdata-type-view";
const HIDDEN_COLS_KEY = "blockdata-hidden-cols";
const DEFAULT_HIDDEN_COLS = ["block_uid", "parser_path"];
const VIEWER_FONT_SIZE_KEY = "blockdata-viewer-font-size";
const VIEWER_FONT_FAMILY_KEY = "blockdata-viewer-font-family";
const VIEWER_VERTICAL_ALIGN_KEY = "blockdata-viewer-vertical-align";
const COLUMN_WIDTHS_KEY_BASE = "blockdata-column-widths";

const DEWRAP_PREFIX_STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "he",
  "if",
  "in",
  "is",
  "it",
  "of",
  "on",
  "or",
  "so",
  "the",
  "to",
  "we",
]);

function loadPersistedColumnWidths(storageKey: string): ColumnSizingState {
  if (typeof localStorage === "undefined") return {};
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const next: ColumnSizingState = {};
    for (const [key, value] of Object.entries(parsed)) {
      const width = typeof value === "number" ? value : Number(value);
      if (Number.isFinite(width) && width > 0) next[key] = Math.round(width);
    }
    return next;
  } catch {
    return {};
  }
}

function stringifyDebugConfig(value: unknown): string {
  const seen = new WeakSet<object>();
  return JSON.stringify(
    value,
    (_key, currentValue) => {
      if (typeof currentValue === "function")
        return `[Function ${currentValue.name || "anonymous"}]`;
      if (typeof currentValue === "symbol") return currentValue.toString();
      if (currentValue instanceof Set) return Array.from(currentValue);
      if (currentValue instanceof Map)
        return Array.from(currentValue.entries());
      if (typeof currentValue === "object" && currentValue !== null) {
        if (seen.has(currentValue)) return "[Circular]";
        seen.add(currentValue);
      }
      return currentValue;
    },
    2,
  );
}

function normalizeBlockContentForDisplay(value: unknown): string {
  if (typeof value !== "string") return "";
  let text = value.replace(/\r\n?/g, "\n");
  text = text.replace(/([A-Za-z])-\s*\n\s*([A-Za-z])/g, "$1-$2");
  text = text.replace(
    /\b([A-Za-z]{2})\s*\n\s*([A-Za-z]{2,})\b/g,
    (_m, left: string, right: string) => {
      return DEWRAP_PREFIX_STOP_WORDS.has(left.toLowerCase())
        ? `${left} ${right}`
        : `${left}${right}`;
    },
  );
  text = text.replace(
    /\b([A-Za-z]{3,})\s*\n\s*([A-Za-z]{1,2})(?=\s+[A-Z])/g,
    "$1$2",
  );
  text = text.replace(/\s*\n\s*/g, " ");
  text = text.replace(/\s{2,}/g, " ").trim();
  return text;
}

function parseEditedValue(
  value: unknown,
  meta: SchemaFieldMeta | undefined,
): unknown {
  if (value === null || value === undefined) return null;
  if (meta?.type === "number") {
    if (typeof value === "number") return Number.isFinite(value) ? value : null;
    const parsed = Number(String(value).trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (meta?.type === "boolean") {
    if (typeof value === "boolean") return value;
    const normalized = String(value).trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
    return null;
  }
  if (
    (meta?.type === "array" || meta?.type === "object") &&
    typeof value === "string"
  ) {
    const trimmed = value.trim();
    if (!trimmed) return null;
    try {
      return JSON.parse(trimmed);
    } catch {
      return value;
    }
  }
  return value;
}

function parserNativeMetaFromLocator(locator: unknown): {
  parserBlockType: string | null;
  parserPath: string | null;
} {
  if (!locator || typeof locator !== "object" || Array.isArray(locator)) {
    return { parserBlockType: null, parserPath: null };
  }
  const obj = locator as Record<string, unknown>;
  const parserBlockType =
    typeof obj.parser_block_type === "string" ? obj.parser_block_type : null;
  const parserPath =
    typeof obj.parser_path === "string"
      ? obj.parser_path
      : typeof obj.path === "string"
        ? obj.path
        : typeof obj.pointer === "string"
          ? obj.pointer
          : null;
  return { parserBlockType, parserPath };
}

function extractPagesFromLocator(locator: unknown): number[] {
  if (!locator || typeof locator !== "object" || Array.isArray(locator))
    return [];
  const obj = locator as Record<string, unknown>;
  const pages = new Set<number>();
  if (Array.isArray(obj.page_nos)) {
    for (const value of obj.page_nos) {
      if (typeof value !== "number" || !Number.isFinite(value)) continue;
      const page = Math.trunc(value);
      if (page > 0) pages.add(page);
    }
  }
  if (
    pages.size === 0 &&
    typeof obj.page_no === "number" &&
    Number.isFinite(obj.page_no)
  ) {
    const page = Math.trunc(obj.page_no);
    if (page > 0) pages.add(page);
  }
  return Array.from(pages).sort((a, b) => a - b);
}

function formatPageLabels(pages: number[]): string | null {
  if (pages.length === 0) return null;
  return pages.map((page) => `p${page}`).join(", ");
}

function statusColor(status?: string): string {
  if (status === "confirmed") return "green";
  if (status === "ai_complete") return "yellow";
  if (status === "pending") return "gray";
  if (status === "claimed") return "blue";
  if (status === "failed") return "red";
  return "gray";
}

function prettyCellValue(value: unknown): string {
  if (value === null || value === undefined) return "--";
  if (typeof value === "string") return value || "--";
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

type EditableSchemaCellProps = {
  value: unknown;
  onCommit: (nextValue: unknown) => Promise<boolean>;
};

function EditableSchemaCell({ value, onCommit }: EditableSchemaCellProps) {
  const [draft, setDraft] = useState(
    prettyCellValue(value) === "--" ? "" : prettyCellValue(value),
  );
  const [saving, setSaving] = useState(false);

  const commit = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    const ok = await onCommit(draft);
    setSaving(false);
    if (!ok)
      setDraft(prettyCellValue(value) === "--" ? "" : prettyCellValue(value));
  }, [draft, onCommit, saving, value]);

  return (
    <TextInput
      value={draft}
      onChange={(event) => setDraft(event.currentTarget.value)}
      onBlur={() => {
        void commit();
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          void commit();
        }
        if (event.key === "Escape") {
          event.preventDefault();
          setDraft(
            prettyCellValue(value) === "--" ? "" : prettyCellValue(value),
          );
        }
      }}
      size="xs"
      rightSection={saving ? <Loader size={12} /> : null}
      disabled={saving}
      aria-label="Edit field value"
    />
  );
}

export function BlockViewerGridTanStackCodex({
  convUid,
  selectedRunId,
  selectedRun,
  onExport,
  onDelete,
}: BlockViewerGridProps) {
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [viewMode, setViewMode] = useState<ViewerMode>(() => {
    const stored =
      typeof localStorage !== "undefined"
        ? localStorage.getItem(VIEW_MODE_KEY)
        : null;
    if (stored === "expanded") return "comfortable";
    return stored === "compact" || stored === "comfortable"
      ? stored
      : "compact";
  });
  const [viewerFontSize, setViewerFontSize] = useState<ViewerFontSize>(() => {
    const stored =
      typeof localStorage !== "undefined"
        ? localStorage.getItem(VIEWER_FONT_SIZE_KEY)
        : null;
    return stored === "small" || stored === "medium" || stored === "large"
      ? stored
      : "medium";
  });
  const [viewerFontFamily, setViewerFontFamily] = useState<ViewerFontFamily>(
    () => {
      const stored =
        typeof localStorage !== "undefined"
          ? localStorage.getItem(VIEWER_FONT_FAMILY_KEY)
          : null;
      return stored === "serif" || stored === "mono" ? stored : "sans";
    },
  );
  const [viewerVerticalAlign, setViewerVerticalAlign] =
    useState<ViewerVerticalAlign>(() => {
      const stored =
        typeof localStorage !== "undefined"
          ? localStorage.getItem(VIEWER_VERTICAL_ALIGN_KEY)
          : null;
      return stored === "top" || stored === "bottom" ? stored : "center";
    });
  const [blockTypeView, setBlockTypeView] = useState<BlockTypeView>(() => {
    const stored =
      typeof localStorage !== "undefined"
        ? localStorage.getItem(BLOCK_TYPE_VIEW_KEY)
        : null;
    return stored === "normalized" ? "normalized" : "parser_native";
  });
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(() => {
    if (typeof localStorage === "undefined")
      return new Set(DEFAULT_HIDDEN_COLS);
    const stored = localStorage.getItem(HIDDEN_COLS_KEY);
    if (!stored) return new Set(DEFAULT_HIDDEN_COLS);
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return new Set(
          parsed.filter((value): value is string => typeof value === "string"),
        );
      }
    } catch {
      // ignore bad storage
    }
    return new Set(DEFAULT_HIDDEN_COLS);
  });
  const [confirmingAll, setConfirmingAll] = useState(false);
  const [blockActionBusy, setBlockActionBusy] = useState<
    Record<string, boolean>
  >({});
  const [showGridConfigInspector, setShowGridConfigInspector] = useState(false);
  const [configRefreshTick, setConfigRefreshTick] = useState(0);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({});

  const { registry } = useBlockTypeRegistry();
  const badgeColorMap = useMemo(() => registry?.badgeColor ?? {}, [registry]);

  const {
    blocks,
    totalCount,
    loading: blocksLoading,
    error: blocksError,
  } = useBlocks(convUid, pageIndex, pageSize);
  const {
    overlayMap,
    loading: overlaysLoading,
    error: overlaysError,
    refetch: refetchOverlays,
    patchOverlay,
  } = useOverlays(selectedRunId);

  const schemaFields = useMemo(
    () =>
      selectedRun?.schemas?.schema_jsonb
        ? extractSchemaFields(selectedRun.schemas.schema_jsonb)
        : [],
    [selectedRun],
  );
  const schemaFieldByKey = useMemo(
    () => new Map(schemaFields.map((field) => [field.key, field])),
    [schemaFields],
  );

  const columnWidthStorageKey = useMemo(() => {
    const schemaSignature =
      schemaFields.length > 0
        ? schemaFields.map((field) => field.key).join("|")
        : "no-schema";
    const runSignature = selectedRunId ? "with-run" : "no-run";
    return `${COLUMN_WIDTHS_KEY_BASE}:v2:${runSignature}:${blockTypeView}:${schemaSignature}`;
  }, [blockTypeView, schemaFields, selectedRunId]);

  const rowDataBase = useMemo<RowData[]>(() => {
    return blocks.map((block) => {
      const overlay = overlayMap.get(block.block_uid) ?? null;
      const normalizedLocator = block.block_locator ?? null;
      const { parserBlockType, parserPath } =
        parserNativeMetaFromLocator(normalizedLocator);
      const pageLabels = formatPageLabels(
        extractPagesFromLocator(normalizedLocator),
      );
      const normalizedLocatorJson = normalizedLocator
        ? JSON.stringify(normalizedLocator)
        : null;
      const row: RowData = {
        block_index: block.block_index,
        block_pages: pageLabels,
        block_type: block.block_type,
        block_type_view: block.block_type,
        block_content: block.block_content,
        block_uid: block.block_uid,
        block_locator_view: normalizedLocatorJson,
        parser_block_type: parserBlockType,
        parser_path: parserPath,
        _overlay_status: overlay?.status ?? null,
        _claimed_by: overlay?.claimed_by ?? null,
        _claimed_at: overlay?.claimed_at ?? null,
        _attempt_count: overlay?.attempt_count ?? null,
        _last_error: overlay?.last_error ?? null,
        _confirmed_at: overlay?.confirmed_at ?? null,
        _confirmed_by: overlay?.confirmed_by ?? null,
      };

      if (overlay) {
        const data =
          overlay.status === "confirmed"
            ? overlay.overlay_jsonb_confirmed
            : overlay.status === "ai_complete"
              ? overlay.overlay_jsonb_staging
              : null;
        if (data && Object.keys(data).length > 0) {
          for (const field of schemaFields) {
            row[`field_${field.key}`] = data[field.key] ?? null;
          }
        }
      }
      return row;
    });
  }, [blocks, overlayMap, schemaFields]);

  const blockTypes = useMemo(() => {
    const types = new Set<string>();
    rowDataBase.forEach((row) => {
      const typeValue = row.block_type_view;
      if (typeof typeValue === "string" && typeValue) types.add(typeValue);
    });
    return Array.from(types).sort();
  }, [rowDataBase]);

  const rowData = useMemo(() => {
    if (typeFilter.length === 0) return rowDataBase;
    return rowDataBase.filter((row) => {
      const typeValue = row.block_type_view;
      return typeof typeValue === "string" && typeFilter.includes(typeValue);
    });
  }, [rowDataBase, typeFilter]);

  const hasParserTypeData = useMemo(
    () =>
      rowDataBase.some((row) => {
        const value = row.parser_block_type;
        return typeof value === "string" && value.trim().length > 0;
      }),
    [rowDataBase],
  );

  const stagedCount = useMemo(() => {
    let count = 0;
    for (const overlay of overlayMap.values())
      if (overlay.status === "ai_complete") count += 1;
    return count;
  }, [overlayMap]);

  const confirmedCount = useMemo(() => {
    let count = 0;
    for (const overlay of overlayMap.values())
      if (overlay.status === "confirmed") count += 1;
    return count;
  }, [overlayMap]);

  const hasRun = !!selectedRunId;

  const firstUserSchemaColId = useMemo<string | null>(() => {
    if (!hasRun) return null;
    const orderedIds = [
      "_overlay_status",
      "_review_actions",
      ...schemaFields.map((f) => `field_${f.key}`),
      "_claimed_by",
      "_claimed_at",
      "_attempt_count",
      "_last_error",
      "_confirmed_at",
      "_confirmed_by",
    ];
    return orderedIds.find((id) => !hiddenCols.has(id)) ?? null;
  }, [hasRun, hiddenCols, schemaFields]);

  const setBlockBusy = useCallback((blockUid: string, busy: boolean) => {
    setBlockActionBusy((prev) => {
      const next = { ...prev };
      if (busy) next[blockUid] = true;
      else delete next[blockUid];
      return next;
    });
  }, []);

  const isBusyForBlock = useCallback(
    (blockUid: string) => !!blockActionBusy[blockUid],
    [blockActionBusy],
  );

  const handleSchemaFieldCommit = useCallback(
    async (
      blockUid: string,
      fieldKey: string,
      nextRawValue: unknown,
      previousRawValue: unknown,
    ): Promise<boolean> => {
      if (!selectedRunId) return false;
      const overlay = overlayMap.get(blockUid);
      if (!overlay || overlay.status !== "ai_complete") return false;

      const fieldMeta = schemaFieldByKey.get(fieldKey);
      const parsedValue = parseEditedValue(nextRawValue, fieldMeta);
      const parsedPreviousValue = parseEditedValue(previousRawValue, fieldMeta);
      if (JSON.stringify(parsedValue) === JSON.stringify(parsedPreviousValue))
        return true;

      const nextStaging = {
        ...(overlay.overlay_jsonb_staging ?? {}),
        [fieldKey]: parsedValue,
      };

      try {
        const { error } = await supabase.rpc("update_overlay_staging", {
          p_run_id: selectedRunId,
          p_block_uid: blockUid,
          p_staging_jsonb: nextStaging,
        });
        if (error) throw new Error(error.message);
        patchOverlay(blockUid, (current) => ({
          ...current,
          overlay_jsonb_staging: nextStaging,
        }));
        return true;
      } catch (e) {
        notifications.show({
          color: "red",
          title: "Save failed",
          message: e instanceof Error ? e.message : String(e),
        });
        return false;
      }
    },
    [overlayMap, patchOverlay, schemaFieldByKey, selectedRunId],
  );

  const handleConfirmAllStaged = useCallback(async () => {
    if (!selectedRunId) return;
    setConfirmingAll(true);
    try {
      const { data, error } = await supabase.rpc("confirm_overlays", {
        p_run_id: selectedRunId,
      });
      if (error) throw new Error(error.message);
      notifications.show({
        color: "green",
        title: "Staged overlays confirmed",
        message: `${Number(data ?? 0)} block(s) confirmed.`,
      });
      await refetchOverlays();
    } catch (e) {
      notifications.show({
        color: "red",
        title: "Confirm all failed",
        message: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setConfirmingAll(false);
    }
  }, [refetchOverlays, selectedRunId]);

  const handleConfirmBlock = useCallback(
    async (blockUid: string) => {
      if (!selectedRunId) return;
      setBlockBusy(blockUid, true);
      try {
        const { data, error } = await supabase.rpc("confirm_overlays", {
          p_run_id: selectedRunId,
          p_block_uids: [blockUid],
        });
        if (error) throw new Error(error.message);
        const confirmed = Number(data ?? 0);
        if (confirmed === 0) {
          notifications.show({
            color: "blue",
            title: "No change",
            message: "Block is no longer staged.",
          });
        }
        await refetchOverlays();
      } catch (e) {
        notifications.show({
          color: "red",
          title: "Confirm block failed",
          message: e instanceof Error ? e.message : String(e),
        });
      } finally {
        setBlockBusy(blockUid, false);
      }
    },
    [refetchOverlays, selectedRunId, setBlockBusy],
  );

  const handleRejectBlock = useCallback(
    async (blockUid: string) => {
      if (!selectedRunId) return;
      setBlockBusy(blockUid, true);
      try {
        const { data, error } = await supabase.rpc(
          "reject_overlays_to_pending",
          { p_run_id: selectedRunId, p_block_uids: [blockUid] },
        );
        if (error) throw new Error(error.message);
        const reset = Number(data ?? 0);
        if (reset === 0) {
          notifications.show({
            color: "blue",
            title: "No change",
            message: "Block is no longer staged.",
          });
        }
        await refetchOverlays();
      } catch (e) {
        notifications.show({
          color: "red",
          title: "Reject block failed",
          message: e instanceof Error ? e.message : String(e),
        });
      } finally {
        setBlockBusy(blockUid, false);
      }
    },
    [refetchOverlays, selectedRunId, setBlockBusy],
  );

  useEffect(() => {
    setColumnSizing(loadPersistedColumnWidths(columnWidthStorageKey));
  }, [columnWidthStorageKey]);

  useEffect(() => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(columnWidthStorageKey, JSON.stringify(columnSizing));
    }
  }, [columnSizing, columnWidthStorageKey]);

  useEffect(() => {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(
      HIDDEN_COLS_KEY,
      JSON.stringify(Array.from(hiddenCols)),
    );
  }, [hiddenCols]);

  const handleViewModeChange = (value: string) => {
    const next: ViewerMode =
      value === "comfortable" ? "comfortable" : "compact";
    setViewMode(next);
    if (typeof localStorage !== "undefined")
      localStorage.setItem(VIEW_MODE_KEY, next);
  };

  const handleBlockTypeViewChange = (value: string) => {
    const next: BlockTypeView =
      value === "parser_native" ? "parser_native" : "normalized";
    setBlockTypeView(next);
    setTypeFilter([]);
    if (typeof localStorage !== "undefined")
      localStorage.setItem(BLOCK_TYPE_VIEW_KEY, next);
  };

  const handleViewerFontSizeChange = (value: string) => {
    const next: ViewerFontSize =
      value === "small" || value === "large" ? value : "medium";
    setViewerFontSize(next);
    if (typeof localStorage !== "undefined")
      localStorage.setItem(VIEWER_FONT_SIZE_KEY, next);
  };

  const handleViewerFontFamilyChange = (value: string) => {
    const next: ViewerFontFamily =
      value === "serif" || value === "mono" ? value : "sans";
    setViewerFontFamily(next);
    if (typeof localStorage !== "undefined")
      localStorage.setItem(VIEWER_FONT_FAMILY_KEY, next);
  };

  const handleViewerVerticalAlignChange = (value: string | null) => {
    const next: ViewerVerticalAlign =
      value === "top" || value === "bottom" ? value : "center";
    setViewerVerticalAlign(next);
    if (typeof localStorage !== "undefined")
      localStorage.setItem(VIEWER_VERTICAL_ALIGN_KEY, next);
  };

  const toggleColumn = (colId: string) => {
    setHiddenCols((prev) => {
      const next = new Set(prev);
      if (next.has(colId)) next.delete(colId);
      else next.add(colId);
      return next;
    });
  };

  const allColumns = useMemo(() => {
    const cols: { id: string; label: string }[] = [
      { id: "block_index", label: "ID" },
      { id: "block_type", label: "Type" },
      { id: "block_content", label: "Block" },
      { id: "block_uid", label: "Block UID" },
      { id: "block_locator", label: "Locator" },
      { id: "parser_path", label: "Parser Path" },
    ];
    if (hasParserTypeData)
      cols.push({ id: "parser_block_type", label: "Parser Type" });
    if (hasRun) {
      cols.push({ id: "_overlay_status", label: "Status" });
      cols.push({ id: "_review_actions", label: "Review" });
      schemaFields.forEach((field) =>
        cols.push({ id: `field_${field.key}`, label: field.key }),
      );
      cols.push(
        { id: "_claimed_by", label: "Claimed By" },
        { id: "_claimed_at", label: "Claimed At" },
        { id: "_attempt_count", label: "Attempts" },
        { id: "_last_error", label: "Last Error" },
        { id: "_confirmed_at", label: "Confirmed At" },
        { id: "_confirmed_by", label: "Confirmed By" },
      );
    }
    return cols;
  }, [hasParserTypeData, hasRun, schemaFields]);

  const columnVisibility = useMemo(() => {
    const visibility: Record<string, boolean> = {};
    allColumns.forEach((col) => {
      visibility[col.id] = !hiddenCols.has(col.id);
    });
    return visibility;
  }, [allColumns, hiddenCols]);

  const columns = useMemo<ColumnDef<RowData>[]>(() => {
    const immutableCols: ColumnDef<RowData>[] = [
      {
        id: "block_index",
        header: "ID",
        accessorFn: (row) => row.block_index,
        size: 60,
        minSize: 50,
        cell: (ctx) => <Text size="xs">{prettyCellValue(ctx.getValue())}</Text>,
      },
      {
        id: "block_pages",
        header: "Pages",
        accessorFn: (row) => row.block_pages,
        size: 92,
        minSize: 86,
        cell: (ctx) => <Text size="xs">{prettyCellValue(ctx.getValue())}</Text>,
      },
      {
        id: "block_type",
        accessorFn: (row) => row.block_type_view,
        header: ({ column }) => {
          const selectedCount = typeFilter.length;
          return (
            <div className="block-grid-type-header">
              <span
                className="block-grid-header-label block-grid-type-header-label"
                onClick={() =>
                  column.toggleSorting(column.getIsSorted() === "asc")
                }
                onKeyDown={(event) => {
                  if (event.key !== "Enter" && event.key !== " ") return;
                  event.preventDefault();
                  column.toggleSorting(column.getIsSorted() === "asc");
                }}
                role="button"
                tabIndex={0}
                aria-label="Sort by type"
              >
                Type
              </span>
              {blockTypes.length > 1 && (
                <Menu
                  shadow="md"
                  width={200}
                  position="bottom-start"
                  withinPortal
                  closeOnItemClick={false}
                >
                  <Menu.Target>
                    <ActionIcon
                      variant={selectedCount > 0 ? "light" : "subtle"}
                      size="xs"
                      aria-label="Filter block types"
                    >
                      <IconFilter size={12} />
                    </ActionIcon>
                  </Menu.Target>
                  <Menu.Dropdown>
                    {blockTypes.map((type) => (
                      <Menu.Item
                        key={type}
                        leftSection={
                          typeFilter.includes(type) ? (
                            <IconCheck size={14} />
                          ) : (
                            <span
                              style={{ width: 14, display: "inline-block" }}
                            />
                          )
                        }
                        onClick={() =>
                          setTypeFilter((prev) =>
                            prev.includes(type)
                              ? prev.filter((item) => item !== type)
                              : [...prev, type],
                          )
                        }
                      >
                        <Text size="xs">{type}</Text>
                      </Menu.Item>
                    ))}
                    {selectedCount > 0 && (
                      <>
                        <Menu.Divider />
                        <Menu.Item c="dimmed" onClick={() => setTypeFilter([])}>
                          <Text size="xs">Clear all</Text>
                        </Menu.Item>
                      </>
                    )}
                  </Menu.Dropdown>
                </Menu>
              )}
            </div>
          );
        },
        size: 136,
        minSize: 120,
        cell: (ctx) => {
          const value = ctx.getValue();
          const type = typeof value === "string" ? value : "--";
          return (
            <Badge
              size="xs"
              variant="light"
              color={badgeColorMap[type] ?? "gray"}
            >
              {type}
            </Badge>
          );
        },
      },
      {
        id: "block_content",
        header: "Block",
        accessorFn: (row) => row.block_content,
        size: 460,
        minSize: 220,
        cell: (ctx) => {
          const normalized = normalizeBlockContentForDisplay(ctx.getValue());
          return (
            <Tooltip
              label={normalized}
              disabled={normalized.length <= 80}
              multiline
              maw={500}
              withArrow
            >
              <Text
                size="xs"
                style={{ whiteSpace: "normal", lineHeight: 1.45 }}
              >
                {normalized || "--"}
              </Text>
            </Tooltip>
          );
        },
      },
      {
        id: "block_uid",
        header: "Block UID",
        accessorFn: (row) => row.block_uid,
        size: 220,
        minSize: 160,
        cell: (ctx) => <Text size="xs">{prettyCellValue(ctx.getValue())}</Text>,
      },
      {
        id: "block_locator",
        header: "Locator",
        accessorFn: (row) => row.block_locator_view,
        size: 280,
        minSize: 180,
        cell: (ctx) => <Text size="xs">{prettyCellValue(ctx.getValue())}</Text>,
      },
    ];

    if (blockTypeView === "parser_native" && hasParserTypeData) {
      immutableCols.push({
        id: "parser_block_type",
        header: "Parser Type",
        accessorFn: (row) => row.parser_block_type,
        size: 160,
        minSize: 120,
        cell: (ctx) => <Text size="xs">{prettyCellValue(ctx.getValue())}</Text>,
      });
    }
    if (blockTypeView === "parser_native") {
      immutableCols.push({
        id: "parser_path",
        header: "Parser Path",
        accessorFn: (row) => row.parser_path,
        size: 280,
        minSize: 180,
        cell: (ctx) => <Text size="xs">{prettyCellValue(ctx.getValue())}</Text>,
      });
    }

    if (!hasRun)
      return [
        { id: "group_immutable", header: "Immutable", columns: immutableCols },
      ];

    const userCols: ColumnDef<RowData>[] = [
      {
        id: "_overlay_status",
        header: "Status",
        accessorFn: (row) => row._overlay_status,
        size: 100,
        minSize: 90,
        cell: (ctx) => {
          const status =
            typeof ctx.getValue() === "string"
              ? String(ctx.getValue())
              : undefined;
          return status ? (
            <Badge size="xs" variant="light" color={statusColor(status)}>
              {status}
            </Badge>
          ) : (
            <Text size="xs" c="dimmed">
              --
            </Text>
          );
        },
      },
      {
        id: "_review_actions",
        header: "Review",
        accessorFn: () => null,
        enableSorting: false,
        size: 100,
        minSize: 96,
        cell: (ctx) => {
          const row = ctx.row.original;
          const status = row._overlay_status as string | undefined;
          const blockUid = row.block_uid as string | undefined;
          if (!blockUid || status !== "ai_complete")
            return (
              <Text size="xs" c="dimmed">
                --
              </Text>
            );
          const busy = isBusyForBlock(blockUid);
          return (
            <Group gap={4} wrap="nowrap">
              <Tooltip label="Confirm block">
                <ActionIcon
                  size="sm"
                  variant="light"
                  color="green"
                  loading={busy}
                  disabled={busy}
                  onClick={() => void handleConfirmBlock(blockUid)}
                >
                  <IconCheck size={12} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Reject to pending">
                <ActionIcon
                  size="sm"
                  variant="light"
                  color="yellow"
                  loading={busy}
                  disabled={busy}
                  onClick={() => void handleRejectBlock(blockUid)}
                >
                  <IconRotateClockwise size={12} />
                </ActionIcon>
              </Tooltip>
            </Group>
          );
        },
      },
      ...schemaFields.map(
        (field): ColumnDef<RowData> => ({
          id: `field_${field.key}`,
          header: field.key,
          accessorFn: (row) => row[`field_${field.key}`],
          size: 180,
          minSize: 140,
          cell: (ctx) => {
            const row = ctx.row.original;
            const overlayStatus = row._overlay_status as string | undefined;
            const blockUid = row.block_uid as string | undefined;
            const value = ctx.getValue();
            if (!blockUid || overlayStatus !== "ai_complete") {
              return <Text size="xs">{prettyCellValue(value)}</Text>;
            }
            return (
              <EditableSchemaCell
                key={`${blockUid}:${field.key}:${String(value)}`}
                value={value}
                onCommit={(nextValue) =>
                  handleSchemaFieldCommit(blockUid, field.key, nextValue, value)
                }
              />
            );
          },
        }),
      ),
    ];

    const overlayCols: ColumnDef<RowData>[] = [
      {
        id: "_claimed_by",
        header: "Claimed By",
        accessorFn: (row) => row._claimed_by,
        size: 140,
        minSize: 120,
        cell: (ctx) => <Text size="xs">{prettyCellValue(ctx.getValue())}</Text>,
      },
      {
        id: "_claimed_at",
        header: "Claimed At",
        accessorFn: (row) => row._claimed_at,
        size: 160,
        minSize: 130,
        cell: (ctx) => <Text size="xs">{prettyCellValue(ctx.getValue())}</Text>,
      },
      {
        id: "_attempt_count",
        header: "Attempts",
        accessorFn: (row) => row._attempt_count,
        size: 90,
        minSize: 80,
        cell: (ctx) => <Text size="xs">{prettyCellValue(ctx.getValue())}</Text>,
      },
      {
        id: "_last_error",
        header: "Last Error",
        accessorFn: (row) => row._last_error,
        size: 220,
        minSize: 160,
        cell: (ctx) => <Text size="xs">{prettyCellValue(ctx.getValue())}</Text>,
      },
      {
        id: "_confirmed_at",
        header: "Confirmed At",
        accessorFn: (row) => row._confirmed_at,
        size: 160,
        minSize: 130,
        cell: (ctx) => <Text size="xs">{prettyCellValue(ctx.getValue())}</Text>,
      },
      {
        id: "_confirmed_by",
        header: "Confirmed By",
        accessorFn: (row) => row._confirmed_by,
        size: 140,
        minSize: 120,
        cell: (ctx) => <Text size="xs">{prettyCellValue(ctx.getValue())}</Text>,
      },
    ];

    return [
      { id: "group_immutable", header: "Immutable", columns: immutableCols },
      {
        id: "group_user",
        header: `User-Defined - ${selectedRun?.schemas?.schema_ref ?? "unknown"}`,
        columns: userCols,
      },
      { id: "group_overlay", header: "Overlay Metadata", columns: overlayCols },
    ];
  }, [
    badgeColorMap,
    blockTypeView,
    blockTypes,
    handleConfirmBlock,
    handleRejectBlock,
    handleSchemaFieldCommit,
    hasParserTypeData,
    hasRun,
    isBusyForBlock,
    schemaFields,
    selectedRun,
    typeFilter,
  ]);

  const table = useReactTable({
    data: rowData,
    columns,
    state: { sorting, columnVisibility, columnSizing },
    getRowId: (row) => String(row.block_uid ?? ""),
    enableColumnResizing: true,
    columnResizeMode: "onChange",
    onSortingChange: setSorting,
    onColumnSizingChange: setColumnSizing,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const getHeaderCellClassName = useCallback(
    (columnId: string) => {
      const classes = ["tanstack-grid-th"];
      if (
        columnId === "block_index" ||
        columnId === "block_pages" ||
        columnId === "block_type"
      )
        classes.push("block-grid-col-center-header");
      if (firstUserSchemaColId === columnId)
        classes.push("user-schema-boundary-header");
      return classes.join(" ");
    },
    [firstUserSchemaColId],
  );

  const getBodyCellClassName = useCallback(
    (columnId: string, row: RowData) => {
      const classes = ["tanstack-grid-td"];
      if (
        columnId === "block_index" ||
        columnId === "block_pages" ||
        columnId === "block_type"
      )
        classes.push("block-grid-col-center-cell");
      if (columnId === "block_content")
        classes.push("block-grid-col-block-cell");
      if (columnId === "block_uid") classes.push("cell-break-anywhere");
      if (firstUserSchemaColId === columnId)
        classes.push("user-schema-boundary-cell");
      if (columnId.startsWith("field_")) {
        if (row._overlay_status === "ai_complete")
          classes.push("overlay-staged-cell");
        if (row._overlay_status === "confirmed")
          classes.push("overlay-confirmed-cell");
      }
      return classes.join(" ");
    },
    [firstUserSchemaColId],
  );

  const totalPages = Math.ceil(totalCount / pageSize);
  const error = blocksError || overlaysError;

  const gridConfigSnapshot = useMemo(
    () => ({
      source: "BlockViewerGridTanStackCodex",
      generatedAt: new Date().toISOString(),
      state: {
        refreshTick: configRefreshTick,
        convUid,
        selectedRunId,
        hasRun,
        rowCount: rowData.length,
        totalCount,
        pageIndex,
        pageSize,
        viewMode,
        viewerFontSize,
        viewerFontFamily,
        viewerVerticalAlign,
        blockTypeView,
        typeFilter,
        hiddenCols: Array.from(hiddenCols),
        sorting,
        columnSizing,
      },
      columnIds: table.getAllLeafColumns().map((column) => column.id),
      visibleColumnIds: table
        .getVisibleLeafColumns()
        .map((column) => column.id),
    }),
    [
      blockTypeView,
      columnSizing,
      configRefreshTick,
      convUid,
      hasRun,
      hiddenCols,
      pageIndex,
      pageSize,
      rowData.length,
      selectedRunId,
      sorting,
      table,
      totalCount,
      typeFilter,
      viewMode,
      viewerFontFamily,
      viewerFontSize,
      viewerVerticalAlign,
    ],
  );

  const gridConfigSnapshotJson = useMemo(
    () => stringifyDebugConfig(gridConfigSnapshot),
    [gridConfigSnapshot],
  );

  const toolbarControls = (
    <Group
      className="block-grid-toolbar-row"
      justify="space-between"
      wrap="nowrap"
      gap={8}
    >
      <Group className="block-grid-toolbar-main" gap="xs" wrap="nowrap">
        <Group className="block-grid-toolbar-group" gap={6} wrap="nowrap">
          <SegmentedControl
            className="block-grid-segmented-boxed"
            data={[
              { value: "compact", label: "Compact" },
              { value: "comfortable", label: "Comfortable" },
            ]}
            value={viewMode}
            onChange={handleViewModeChange}
            size="xs"
          />
          <SegmentedControl
            className="block-grid-segmented-boxed"
            data={[
              { value: "small", label: "S" },
              { value: "medium", label: "M" },
              { value: "large", label: "L" },
            ]}
            value={viewerFontSize}
            onChange={handleViewerFontSizeChange}
            size="xs"
          />
          <SegmentedControl
            className="block-grid-segmented-boxed"
            data={[
              { value: "sans", label: "Sans" },
              { value: "serif", label: "Serif" },
              { value: "mono", label: "Mono" },
            ]}
            value={viewerFontFamily}
            onChange={handleViewerFontFamilyChange}
            size="xs"
          />
        </Group>

        <Group className="block-grid-toolbar-group" gap={6} wrap="nowrap">
          <Menu shadow="md" width={170} position="bottom-start" withinPortal>
            <Menu.Target>
              <Button
                variant="default"
                className="block-grid-topline-button"
                size="compact-xs"
                px={6}
                rightSection={<IconChevronDown size={10} />}
                aria-label="Vertical align"
              >
                <Group gap={6} wrap="nowrap">
                  <Text size="xs" fw={600}>
                    Align
                  </Text>
                  {viewerVerticalAlign === "top" ? (
                    <IconArrowBarToUp size={14} />
                  ) : viewerVerticalAlign === "center" ? (
                    <IconArrowsVertical size={14} />
                  ) : (
                    <IconArrowBarToDown size={14} />
                  )}
                </Group>
              </Button>
            </Menu.Target>
            <Menu.Dropdown className="block-grid-topline-menu-dropdown">
              <Menu.Item
                leftSection={<IconArrowBarToUp size={14} />}
                onClick={() => handleViewerVerticalAlignChange("top")}
              >
                Top
              </Menu.Item>
              <Menu.Item
                leftSection={<IconArrowsVertical size={14} />}
                onClick={() => handleViewerVerticalAlignChange("center")}
              >
                Center
              </Menu.Item>
              <Menu.Item
                leftSection={<IconArrowBarToDown size={14} />}
                onClick={() => handleViewerVerticalAlignChange("bottom")}
              >
                Bottom
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>

          <Menu
            shadow="md"
            width={250}
            position="bottom-end"
            withinPortal
            closeOnItemClick={false}
          >
            <Menu.Target>
              <Button
                variant="default"
                className="block-grid-topline-button"
                size="compact-xs"
                px={6}
                leftSection={<IconColumns size={14} />}
                rightSection={<IconChevronDown size={10} />}
                aria-label="Columns"
              >
                Columns
              </Button>
            </Menu.Target>
            <Menu.Dropdown className="block-grid-topline-menu-dropdown">
              <Menu.Label>Representation (affects columns)</Menu.Label>
              <Text size="10px" c="dimmed" px="xs" pb={4}>
                Normalized shows baseline columns. Parser Native reveals Parser
                Type/Path columns for inspection.
              </Text>
              <Menu.Item
                onClick={() => handleBlockTypeViewChange("normalized")}
                leftSection={
                  blockTypeView === "normalized" ? (
                    <IconCheck size={14} />
                  ) : (
                    <span style={{ width: 14, display: "inline-block" }} />
                  )
                }
              >
                <Text size="xs">Normalized</Text>
              </Menu.Item>
              <Menu.Item
                onClick={() => handleBlockTypeViewChange("parser_native")}
                leftSection={
                  blockTypeView === "parser_native" ? (
                    <IconCheck size={14} />
                  ) : (
                    <span style={{ width: 14, display: "inline-block" }} />
                  )
                }
              >
                <Text size="xs">Parser Native</Text>
              </Menu.Item>
              <Menu.Divider />
              <Menu.Label>Columns</Menu.Label>
              {allColumns.map((col) => (
                <Menu.Item
                  key={col.id}
                  onClick={() => toggleColumn(col.id)}
                  leftSection={
                    <Text size="xs" fw={500}>
                      {hiddenCols.has(col.id) ? "[ ]" : "[x]"}
                    </Text>
                  }
                >
                  <Text size="xs">{col.label}</Text>
                </Menu.Item>
              ))}
            </Menu.Dropdown>
          </Menu>
        </Group>

        {hasRun && (
          <Text size="xs" c="dimmed" className="block-grid-toolbar-metrics">
            {confirmedCount} confirmed - {stagedCount} staged
          </Text>
        )}
      </Group>
      <Group className="block-grid-toolbar-actions" gap={4} wrap="nowrap">
        <Button
          variant={showGridConfigInspector ? "filled" : "default"}
          color="gray"
          className="block-grid-topline-button"
          size="compact-xs"
          px={8}
          onClick={() => {
            setShowGridConfigInspector((prev) => !prev);
            setConfigRefreshTick((prev) => prev + 1);
          }}
        >
          Grid Config
        </Button>
        {onExport && (
          <Tooltip label="Export">
            <ActionIcon
              className="block-grid-topline-icon"
              variant="default"
              color="gray"
              size="md"
              onClick={onExport}
              aria-label="Export"
            >
              <IconDownload size={16} />
            </ActionIcon>
          </Tooltip>
        )}
        {onDelete && (
          <Tooltip label="Delete">
            <ActionIcon
              className="block-grid-topline-icon"
              variant="default"
              color="red"
              size="md"
              onClick={onDelete}
              aria-label="Delete"
            >
              <IconTrash size={16} />
            </ActionIcon>
          </Tooltip>
        )}
      </Group>
    </Group>
  );

  return (
    <>
      <Paper p="xs" mb={4}>
        {toolbarControls}
      </Paper>

      {showGridConfigInspector && (
        <Paper withBorder p="xs" mb={4}>
          <Group justify="space-between" mb={6}>
            <Text size="xs" fw={600}>
              TanStack Grid Config Inspector
            </Text>
            <Group gap={4}>
              <Button
                variant="subtle"
                size="compact-xs"
                onClick={() => setConfigRefreshTick((prev) => prev + 1)}
              >
                Refresh
              </Button>
              <Button
                variant="subtle"
                size="compact-xs"
                onClick={() => setShowGridConfigInspector(false)}
              >
                Hide
              </Button>
            </Group>
          </Group>
          <pre className="block-grid-config-inspector">
            {gridConfigSnapshotJson}
          </pre>
        </Paper>
      )}

      {hasRun && stagedCount > 0 && (
        <Alert color="yellow" variant="light" mb={4}>
          <Group justify="space-between" wrap="wrap" gap="xs">
            <Text size="xs">
              Staged - awaiting review: {stagedCount} block(s). Edit staged
              cells, confirm per block, or confirm all.
            </Text>
            <Button
              size="compact-xs"
              variant="light"
              leftSection={<IconCheck size={12} />}
              onClick={handleConfirmAllStaged}
              loading={confirmingAll}
              disabled={!selectedRunId || stagedCount === 0}
            >
              Confirm All Staged
            </Button>
          </Group>
        </Alert>
      )}

      {error && <ErrorAlert message={error} />}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          minHeight: 0,
        }}
      >
        <div
          className={`block-viewer-grid grid-${viewMode} grid-font-${viewerFontSize} grid-font-family-${viewerFontFamily} grid-valign-${viewerVerticalAlign}`}
          style={{
            flex: 1,
            width: "100%",
            opacity: blocksLoading || overlaysLoading ? 0.5 : 1,
            transition: "opacity 0.15s",
          }}
        >
          <div className="tanstack-grid-shell">
            <div className="tanstack-grid-scroll">
              <table className="tanstack-grid-table">
                <thead className="tanstack-grid-thead">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr
                      key={headerGroup.id}
                      className="tanstack-grid-header-row"
                    >
                      {headerGroup.headers.map((header) => {
                        if (header.isPlaceholder)
                          return (
                            <th key={header.id} className="tanstack-grid-th" />
                          );
                        const headerColumnId = header.column.id;
                        return (
                          <th
                            key={header.id}
                            className={getHeaderCellClassName(headerColumnId)}
                            style={{ width: header.getSize() }}
                            colSpan={header.colSpan}
                          >
                            <div className="tanstack-grid-th-content">
                              {flexRender(
                                header.column.columnDef.header,
                                header.getContext(),
                              )}
                            </div>
                            {header.column.getCanResize() && (
                              <div
                                onMouseDown={header.getResizeHandler()}
                                onTouchStart={header.getResizeHandler()}
                                className={`tanstack-grid-resizer${header.column.getIsResizing() ? " is-resizing" : ""}`}
                              />
                            )}
                          </th>
                        );
                      })}
                    </tr>
                  ))}
                </thead>
                <tbody className="tanstack-grid-tbody">
                  {table.getRowModel().rows.length === 0 && (
                    <tr className="tanstack-grid-row">
                      <td
                        className="tanstack-grid-td tanstack-grid-empty"
                        colSpan={Math.max(
                          table.getVisibleLeafColumns().length,
                          1,
                        )}
                      >
                        <Text size="xs" c="dimmed">
                          No rows for current filters.
                        </Text>
                      </td>
                    </tr>
                  )}
                  {table.getRowModel().rows.map((row) => (
                    <tr key={row.id} className="tanstack-grid-row">
                      {row.getVisibleCells().map((cell) => (
                        <td
                          key={cell.id}
                          className={getBodyCellClassName(
                            cell.column.id,
                            row.original,
                          )}
                          style={{ width: cell.column.getSize() }}
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {totalCount > 0 && (
          <Group justify="center" className="block-grid-pagination-wrap">
            <Group gap="md" wrap="nowrap" className="block-grid-pagination-row">
              <Group
                gap={6}
                wrap="nowrap"
                className="block-grid-page-size-control"
              >
                <Text size="xs" c="dimmed">
                  Blocks / page
                </Text>
                <Select
                  data={PAGE_SIZES}
                  value={String(pageSize)}
                  onChange={(value) => {
                    setPageSize(Number(value) || 50);
                    setPageIndex(0);
                  }}
                  w={72}
                  size="xs"
                  aria-label="Blocks per page"
                />
              </Group>

              {totalPages > 1 && (
                <Group gap={8} wrap="nowrap" className="block-grid-page-nav">
                  <Text
                    size="xs"
                    fw={600}
                    className={`block-grid-page-nav-action${pageIndex > 0 ? "" : " is-disabled"}`}
                    onClick={() =>
                      pageIndex > 0 &&
                      setPageIndex((current) => Math.max(0, current - 1))
                    }
                  >
                    Previous
                  </Text>
                  <Text
                    size="xs"
                    c="dimmed"
                    className="block-grid-page-nav-status"
                  >
                    {pageIndex + 1} / {totalPages}
                  </Text>
                  <Text
                    size="xs"
                    fw={600}
                    className={`block-grid-page-nav-action${pageIndex < totalPages - 1 ? "" : " is-disabled"}`}
                    onClick={() =>
                      pageIndex < totalPages - 1 &&
                      setPageIndex((current) =>
                        Math.min(totalPages - 1, current + 1),
                      )
                    }
                  >
                    Next
                  </Text>
                </Group>
              )}
            </Group>
          </Group>
        )}
      </div>
    </>
  );
}
