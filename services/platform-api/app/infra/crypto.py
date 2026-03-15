"""AES-GCM encryption/decryption — Python port of api_key_crypto.ts."""
import base64
import hashlib
import os

from cryptography.hazmat.primitives.ciphers.aead import AESGCM


def _b64url_encode(b: bytes) -> str:
    return base64.b64encode(b).decode("ascii").rstrip("=").replace("+", "-").replace("/", "_")


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
        return ciphertext  # plaintext fallback

    parts = ciphertext.split(":")
    if len(parts) != 4:
        raise ValueError("Invalid encrypted format")

    iv = _b64url_decode(parts[2])
    ct = _b64url_decode(parts[3])
    key = _derive_key(secret, context)

    aesgcm = AESGCM(key)
    return aesgcm.decrypt(iv, ct, None).decode("utf-8")
