"""
Pure unit tests - no database. These are the fast, safe tests to run
constantly; they never touch the shared live Neon database.
"""
from app.core.security import create_access_token, decode_access_token, hash_password, verify_password


def test_password_hash_roundtrip():
    hashed = hash_password("Demo@1234")
    assert hashed != "Demo@1234"  # never store plaintext
    assert verify_password("Demo@1234", hashed)


def test_wrong_password_fails():
    hashed = hash_password("Demo@1234")
    assert not verify_password("WrongPassword", hashed)


def test_token_roundtrip_carries_role_claim():
    """The whole point of Phase 10's latency fix (see docs/architecture.md)
    is that role checks read this claim without a DB call - if this regresses,
    every protected endpoint silently gets slower and nobody notices in CI."""
    token = create_access_token(subject="11111111-1111-1111-1111-111111111111", extra_claims={"role": "ADMIN"})
    payload = decode_access_token(token)
    assert payload is not None
    assert payload["sub"] == "11111111-1111-1111-1111-111111111111"
    assert payload["role"] == "ADMIN"


def test_tampered_token_is_rejected():
    token = create_access_token(subject="x", extra_claims={"role": "ADMIN"})
    tampered = token[:-4] + "abcd"
    assert decode_access_token(tampered) is None


def test_garbage_token_is_rejected():
    assert decode_access_token("not.a.jwt") is None
