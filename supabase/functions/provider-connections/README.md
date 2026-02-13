# provider-connections

Minimal non-key auth storage for agent configuration.

v1 scope:
- Google Vertex AI: service account JSON connect/disconnect/status.

This function stores secrets encrypted in `public.user_provider_connections.credential_encrypted` and never returns plaintext.

