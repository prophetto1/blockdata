const fs = require('fs');
const os = require('os');
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const companion = require('@uppy/companion');

const PORT = parseInt(process.env.COMPANION_PORT || '3020', 10);
const DATA_DIR = process.env.COMPANION_DATADIR || path.join(os.tmpdir(), 'companion-data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ---------------------------------------------------------------------------
// Parse env
// ---------------------------------------------------------------------------

function envOrNull(key) {
  const v = (process.env[key] || '').trim();
  return v.length > 0 ? v : null;
}

function parseCorsOrigins() {
  const raw = envOrNull('COMPANION_CLIENT_ORIGINS');
  if (!raw) return true; // permissive fallback for dev
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

function parseUploadUrls() {
  const raw = envOrNull('COMPANION_UPLOAD_URLS');
  if (!raw) return undefined;
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

function parseUploadHeaders() {
  const raw = envOrNull('COMPANION_UPLOAD_HEADERS');
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    console.warn('COMPANION_UPLOAD_HEADERS is not valid JSON, ignoring.');
    return {};
  }
}

// ---------------------------------------------------------------------------
// Build provider options (only providers with keys get enabled)
// ---------------------------------------------------------------------------

function buildProviderOptions() {
  const providers = {};

  const googleKey = envOrNull('COMPANION_GOOGLE_KEY');
  const googleSecret = envOrNull('COMPANION_GOOGLE_SECRET');
  if (googleKey && googleSecret) {
    providers.drive = { key: googleKey, secret: googleSecret };
  }

  const dropboxKey = envOrNull('COMPANION_DROPBOX_KEY');
  const dropboxSecret = envOrNull('COMPANION_DROPBOX_SECRET');
  if (dropboxKey && dropboxSecret) {
    providers.dropbox = { key: dropboxKey, secret: dropboxSecret };
  }

  const onedriveKey = envOrNull('COMPANION_ONEDRIVE_KEY');
  const onedriveSecret = envOrNull('COMPANION_ONEDRIVE_SECRET');
  if (onedriveKey && onedriveSecret) {
    providers.onedrive = { key: onedriveKey, secret: onedriveSecret };
  }

  const boxKey = envOrNull('COMPANION_BOX_KEY');
  const boxSecret = envOrNull('COMPANION_BOX_SECRET');
  if (boxKey && boxSecret) {
    providers.box = { key: boxKey, secret: boxSecret };
  }

  return providers;
}

// ---------------------------------------------------------------------------
// Express + Companion
// ---------------------------------------------------------------------------

const app = express();

app.use(bodyParser.json());
app.use(
  session({
    secret: process.env.COMPANION_SECRET || 'companion-dev-secret',
    resave: false,
    saveUninitialized: false,
  }),
);

// Health check for Cloud Run
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

const providerOptions = buildProviderOptions();
const enabledProviders = Object.keys(providerOptions);

const companionOptions = {
  providerOptions,
  server: {
    host: process.env.COMPANION_DOMAIN || `localhost:${PORT}`,
    protocol: process.env.COMPANION_PROTOCOL || 'http',
  },
  filePath: DATA_DIR,
  secret: process.env.COMPANION_SECRET || 'companion-dev-secret',
  corsOrigins: parseCorsOrigins(),
  uploadUrls: parseUploadUrls(),
  uploadHeaders: parseUploadHeaders(),
};

const { app: companionApp } = companion.app(companionOptions);
app.use(companionApp);

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

const server = app.listen(PORT, () => {
  console.log(`Uppy Companion listening on :${PORT}`);
  console.log(`Enabled providers: ${enabledProviders.length > 0 ? enabledProviders.join(', ') : '(none)'}`);
  if (companionOptions.uploadUrls) {
    console.log(`Upload URL allowlist: ${companionOptions.uploadUrls.join(', ')}`);
  }
});

companion.socket(server);
