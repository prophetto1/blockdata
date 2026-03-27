// Minimal data client for the static site.
//
// Goal: keep pages dumb.
// - If Supabase is configured, read from the PostgREST view.
// - Otherwise, fall back to the local JSON files committed in /public/data.
(function () {
  function _dataMode() {
    const mode = String(window.L10_DATA_MODE || "json").trim().toLowerCase();
    return mode === "supabase" ? "supabase" : "json";
  }

  function _supabaseConfig() {
    const url = String(window.L10_SUPABASE_URL || "").trim().replace(/\/+$/, "");
    const anonKey = String(window.L10_SUPABASE_ANON_KEY || "").trim();
    const enabled = _dataMode() === "supabase" && Boolean(url && anonKey);
    return { url, anonKey, enabled };
  }

  function _leaderboardDefaults() {
    return {
      benchmarkVersion: String(window.L10_LEADERBOARD_BENCHMARK_VERSION || "").trim(),
      datasetVersion: String(window.L10_LEADERBOARD_DATASET_VERSION || "").trim(),
    };
  }

  function _headers(anonKey) {
    return {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      "Content-Type": "application/json",
    };
  }

  async function _fetchJson(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to load ${url} (${res.status})`);
    return await res.json();
  }

  async function fetchSupabaseViewRows(
    viewName,
    { select = "*", filters = {}, order = null, limit = 200 } = {}
  ) {
    const { url, anonKey, enabled } = _supabaseConfig();
    if (!enabled) throw new Error("Supabase not configured");

    const params = new URLSearchParams();
    params.set("select", select);
    for (const [key, value] of Object.entries(filters)) {
      if (value === null || value === undefined || value === "") continue;
      params.set(key, `eq.${value}`);
    }
    if (order) params.set("order", order);
    if (limit) params.set("limit", String(limit));

    const endpoint = `${url}/rest/v1/${encodeURIComponent(viewName)}?${params.toString()}`;
    const res = await fetch(endpoint, {
      method: "GET",
      headers: _headers(anonKey),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Supabase request failed (${res.status})`);

    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data;
  }

  async function fetchLeaderboardModels({
    fallbackJsonUrl,
    benchmarkVersion,
    datasetVersion,
    limit = 200,
  } = {}) {
    const defaults = _leaderboardDefaults();
    const bv = benchmarkVersion ?? defaults.benchmarkVersion;
    const dv = datasetVersion ?? defaults.datasetVersion;

    try {
      const rows = await fetchSupabaseViewRows("public_leaderboard_latest_v1", {
        select: "*",
        filters: { benchmark_version: bv, dataset_version: dv },
        order: "chain.desc",
        limit,
      });
      // If Supabase is configured but has no matching rows yet, fall back to local JSON
      // so the site can still show simulated/sample data during early development.
      if (Array.isArray(rows) && rows.length === 0 && fallbackJsonUrl) {
        const json = await _fetchJson(fallbackJsonUrl);
        return Array.isArray(json?.models) ? json.models : [];
      }
      return rows;
    } catch (err) {
      if (!fallbackJsonUrl) throw err;
      console.warn("[l10Data] Supabase unavailable; falling back to local JSON.", err);
      const json = await _fetchJson(fallbackJsonUrl);
      return Array.isArray(json?.models) ? json.models : [];
    }
  }

  async function fetchLeaderboardDataset({
    fallbackJsonUrl,
    benchmarkVersion,
    datasetVersion,
    limit = 200,
  } = {}) {
    const defaults = _leaderboardDefaults();
    const bv = benchmarkVersion ?? defaults.benchmarkVersion;
    const dv = datasetVersion ?? defaults.datasetVersion;

    try {
      const models = await fetchLeaderboardModels({
        fallbackJsonUrl: null,
        benchmarkVersion: bv,
        datasetVersion: dv,
        limit,
      });
      return {
        updated_at: new Date().toISOString().slice(0, 10),
        benchmark_version: bv || null,
        dataset_version: dv || null,
        models,
      };
    } catch (err) {
      if (!fallbackJsonUrl) throw err;
      console.warn("[l10Data] Supabase unavailable; falling back to local JSON.", err);
      const json = await _fetchJson(fallbackJsonUrl);
      return json && typeof json === "object"
        ? json
        : { updated_at: null, benchmark_version: null, dataset_version: null, models: [] };
    }
  }

  window.l10Data = {
    fetchSupabaseViewRows,
    fetchLeaderboardModels,
    fetchLeaderboardDataset,
  };
})();
