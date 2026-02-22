# Uppy Companion (Cloud File Import Proxy)

OAuth proxy server for cloud file imports. Handles authentication with Google Drive, Dropbox, OneDrive, and Box, then streams selected files to the blockdata ingest edge function.

## How it works

1. User clicks a cloud provider icon in the Uppy Dashboard.
2. Browser opens an OAuth popup via Companion.
3. User authorizes access; Companion receives an OAuth token.
4. User picks files in the provider's file browser (served by Companion).
5. Companion downloads files from the cloud provider and uploads them as multipart POST requests to the ingest endpoint.

## Required environment variables

| Variable | Description |
|---|---|
| `COMPANION_SECRET` | Random secret for session signing and token generation |
| `COMPANION_DOMAIN` | Public hostname (e.g. `blockdata-uppy-companion-xxxxx-uc.a.run.app`) |
| `COMPANION_PROTOCOL` | `https` (Cloud Run terminates TLS) |
| `COMPANION_CLIENT_ORIGINS` | Comma-separated allowed CORS origins |
| `COMPANION_UPLOAD_URLS` | Comma-separated upload destination allowlist |

Provider keys (only set the providers you want to enable):

| Variable | Where to register |
|---|---|
| `COMPANION_GOOGLE_KEY` / `SECRET` | [Google Cloud Console](https://console.cloud.google.com/apis/credentials) |
| `COMPANION_DROPBOX_KEY` / `SECRET` | [Dropbox App Console](https://www.dropbox.com/developers/apps) |
| `COMPANION_ONEDRIVE_KEY` / `SECRET` | [Azure Portal](https://portal.azure.com) > App registrations |
| `COMPANION_BOX_KEY` / `SECRET` | [Box Developer Console](https://app.box.com/developers/console) |

See `.env.example` for the full list with comments.

## OAuth redirect URIs

When registering each OAuth app, add this redirect URI:

```
https://<COMPANION_DOMAIN>/<provider>/redirect
```

Provider path segments:

- Google Drive: `/drive/redirect`
- Dropbox: `/dropbox/redirect`
- OneDrive: `/onedrive/redirect`
- Box: `/box/redirect`

## Local development

```bash
cp .env.example .env
# Fill in at least COMPANION_SECRET and one provider's key/secret
npm install
npm start
# Companion runs at http://localhost:3020
# Set VITE_UPPY_COMPANION_URL=http://localhost:3020 in web/.env
```

## Deploy to Cloud Run

From the repo root:

```powershell
.\scripts\deploy-cloud-run-uppy-companion.ps1 -ProjectId agchain -Region us-central1
```

The script outputs the Cloud Run URL. Set it as `VITE_UPPY_COMPANION_URL` in the web app's environment.

## Health check

```
GET /health
→ { "status": "ok" }
```
