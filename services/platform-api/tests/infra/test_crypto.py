import pytest

from app.infra.crypto import (
    decrypt_with_context,
    decrypt_with_fallback,
    encrypt_with_context,
    get_envelope_key,
)


def test_encrypt_decrypt_round_trip():
    secret = "test-secret-key"
    context = "provider-connections-v1"
    plaintext = '{"username": "root", "password": "secret"}'

    encrypted = encrypt_with_context(plaintext, secret, context)
    assert encrypted.startswith("enc:v1:")

    decrypted = decrypt_with_context(encrypted, secret, context)
    assert decrypted == plaintext


def test_decrypt_plaintext_fallback():
    result = decrypt_with_context("not-encrypted", "key", "ctx")
    assert result == "not-encrypted"


def test_decrypt_with_fallback_uses_primary_key(monkeypatch):
    primary = "primary-secret-key"
    context = "provider-connections-v1"
    plaintext = '{"token":"abc123"}'
    encrypted = encrypt_with_context(plaintext, primary, context)

    monkeypatch.setenv("APP_SECRET_ENVELOPE_KEY", primary)
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "legacy-secret-key")

    assert decrypt_with_fallback(encrypted, context) == plaintext


def test_decrypt_with_fallback_falls_back_to_legacy(monkeypatch):
    legacy = "legacy-secret-key"
    context = "provider-connections-v1"
    plaintext = '{"token":"legacy123"}'
    encrypted = encrypt_with_context(plaintext, legacy, context)

    monkeypatch.setenv("APP_SECRET_ENVELOPE_KEY", "primary-secret-key")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", legacy)

    assert decrypt_with_fallback(encrypted, context) == plaintext


def test_decrypt_with_fallback_raises_when_both_fail(monkeypatch):
    context = "provider-connections-v1"
    encrypted = encrypt_with_context('{"token":"wrong"}', "wrong-secret-key", context)

    monkeypatch.setenv("APP_SECRET_ENVELOPE_KEY", "primary-secret-key")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "legacy-secret-key")

    with pytest.raises(ValueError):
        decrypt_with_fallback(encrypted, context)


def test_get_envelope_key_raises_when_missing(monkeypatch):
    monkeypatch.delenv("APP_SECRET_ENVELOPE_KEY", raising=False)

    with pytest.raises(RuntimeError):
        get_envelope_key()
