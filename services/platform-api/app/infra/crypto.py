"""AES-GCM encryption/decryption — Python port of api_key_crypto.ts."""
import base64
import hashlib
import logging
import os

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

_logger = logging.getLogger("crypto")
_fallback_counter = None
_plaintext_fallback_counter = None


def _b64url_encode(b: bytes) -> str:
    return base64.urlsafe_b64encode(b).decode("ascii").rstrip("=")


def _b64url_decode(s: str) -> bytes:
    s = s.replace("-", "+").replace("_", "/")
    padding = 4 - len(s) % 4
    if padding != 4:
        s += "=" * padding
    return base64.b64decode(s)


def _derive_key(secret: str, context: str) -> bytes:
    return hashlib.sha256((secret + context).encode("utf-8")).digest()


def encrypt_with_context(plaintext: str, secret: str, context: str) -> str:
    """Encrypt a value compatible with the Deno encryptWithContext function.

    Format: enc:v1:{base64url(iv)}:{base64url(ciphertext)}
    """
    key = _derive_key(secret, context)
    iv = os.urandom(12)
    aesgcm = AESGCM(key)
    ct = aesgcm.encrypt(iv, plaintext.encode("utf-8"), None)
    return f"enc:v1:{_b64url_encode(iv)}:{_b64url_encode(ct)}"


def decrypt_with_context(ciphertext: str, secret: str, context: str) -> str:
    """Decrypt a value encrypted by encryptWithContext (Deno or Python)."""
    if not ciphertext.startswith("enc:v1:"):
        _record_plaintext_passthrough()
        return ciphertext

    parts = ciphertext.split(":")
    if len(parts) != 4:
        raise ValueError("Invalid encrypted format")

    iv = _b64url_decode(parts[2])
    ct = _b64url_decode(parts[3])
    key = _derive_key(secret, context)

    aesgcm = AESGCM(key)
    return aesgcm.decrypt(iv, ct, None).decode("utf-8")


def get_envelope_key() -> str:
    """Return the primary application encryption key."""
    key = os.environ.get("APP_SECRET_ENVELOPE_KEY", "")
    if not key:
        raise RuntimeError(
            "APP_SECRET_ENVELOPE_KEY is required for secret encryption. "
            "Add it to your .env file."
        )
    return key


def decrypt_with_fallback(ciphertext: str, context: str) -> str:
    """Decrypt with the primary envelope key, then the legacy service-role key."""
    if not ciphertext.startswith("enc:v1:"):
        _record_plaintext_passthrough()
        return ciphertext

    primary = os.environ.get("APP_SECRET_ENVELOPE_KEY", "")
    fallback = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

    if primary:
        try:
            return decrypt_with_context(ciphertext, primary, context)
        except Exception as exc:
            _logger.warning(
                "crypto.decrypt_failed key_source=%s exc_type=%s",
                "primary",
                type(exc).__name__,
            )

    if fallback:
        try:
            plaintext = decrypt_with_context(ciphertext, fallback, context)
            _logger.debug("crypto.fallback_decrypt context=%s", context)
            _increment_fallback_counter()
            return plaintext
        except Exception as exc:
            _logger.warning(
                "crypto.decrypt_failed key_source=%s exc_type=%s",
                "fallback",
                type(exc).__name__,
            )

    raise ValueError(
        f"Decryption failed with all available keys for context '{context}'"
    )


def _increment_fallback_counter() -> None:
    global _fallback_counter
    if _fallback_counter is None:
        try:
            from opentelemetry import metrics

            from app.observability.contract import CRYPTO_FALLBACK_COUNTER_NAME

            meter = metrics.get_meter("platform-api")
            _fallback_counter = meter.create_counter(
                CRYPTO_FALLBACK_COUNTER_NAME,
                description="Count of decryptions that required legacy key fallback",
            )
        except Exception:
            return

    if _fallback_counter is not None:
        _fallback_counter.add(1)


def _record_plaintext_passthrough() -> None:
    _logger.warning("crypto.plaintext_passthrough")
    _increment_plaintext_fallback_counter()


def _increment_plaintext_fallback_counter() -> None:
    global _plaintext_fallback_counter
    if _plaintext_fallback_counter is None:
        try:
            from opentelemetry import metrics

            from app.observability.contract import CRYPTO_PLAINTEXT_FALLBACK_COUNTER_NAME

            meter = metrics.get_meter("platform-api")
            _plaintext_fallback_counter = meter.create_counter(
                CRYPTO_PLAINTEXT_FALLBACK_COUNTER_NAME,
                description="Count of plaintext values encountered in encrypted columns",
            )
        except Exception:
            return

    if _plaintext_fallback_counter is not None:
        _plaintext_fallback_counter.add(1)
