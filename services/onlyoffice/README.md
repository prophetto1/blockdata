# OnlyOffice Document Server

Self-hosted document editing server (DOCX, XLSX, PPTX, PDF).

## Quick start

```bash
cp .env.example .env
# Edit .env — set a real JWT secret

docker compose up -d
```

The editor API will be available at `http://localhost:9980`.

## Verifying it works

```bash
# Health check
curl http://localhost:9980/healthcheck

# Open the welcome page
open http://localhost:9980
```

## Integration

Your app opens documents by loading the OnlyOffice JS API and pointing it at a
document URL + callback URL for saves:

```html
<script src="http://localhost:9980/web-apps/apps/api/documents/api.js"></script>
```

All API requests must include a JWT signed with `ONLYOFFICE_JWT_SECRET`.

See: https://api.onlyoffice.com/docs/docs-api/get-started/how-it-works/

## Custom fonts

Drop `.ttf` / `.otf` files into the `oo-fonts` volume, then restart:

```bash
docker compose exec documentserver /usr/bin/documentserver-generate-allfonts.sh
```

## Production notes

- Set a strong `ONLYOFFICE_JWT_SECRET`
- Enable HTTPS (uncomment Let's Encrypt env vars or put behind a reverse proxy)
- Back up the `oo-data` volume