from app.infra.crypto import encrypt_with_context, decrypt_with_context


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
