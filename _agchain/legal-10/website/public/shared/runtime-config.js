// Runtime configuration for the static site.
//
// This file is safe to commit: the Supabase anon key is intended to be public.
// Keep the service role key out of the browser.
//
// Set these values to enable direct Supabase reads from the static pages.
(function () {
  // Data source mode for static pages:
  // - "json": always read from committed JSON files under /data
  // - "supabase": read from Supabase (requires URL + anon key)
  //
  // Default to "json" so local/dev always shows simulated data.
  window.L10_DATA_MODE = window.L10_DATA_MODE || "json";

  window.L10_SUPABASE_URL = window.L10_SUPABASE_URL || "";
  window.L10_SUPABASE_ANON_KEY = window.L10_SUPABASE_ANON_KEY || "";

  // Optional filters for the leaderboard view (recommended once you have multiple datasets).
  window.L10_LEADERBOARD_BENCHMARK_VERSION =
    window.L10_LEADERBOARD_BENCHMARK_VERSION || "";
  window.L10_LEADERBOARD_DATASET_VERSION =
    window.L10_LEADERBOARD_DATASET_VERSION || "";

  // Private admin gate (lab use). SHA-256 hex digest of the admin password.
  // If empty, /admin/login.html will show "not configured".
  // Default password (for local/dev): "jon123"
  window.L10_ADMIN_PASSWORD_SHA256 =
    window.L10_ADMIN_PASSWORD_SHA256 ||
    "09fa2dbb25ab84c6115452c058fd446054ab0aa3f543cf7b6f55a25136a46f96";
})();
