# services/platform-api/tests/test_reserved_routes.py
import pytest
from app.core.reserved_routes import RESERVED_SLUGS, check_collisions


def test_reserved_slugs_contains_known_routes():
    assert "health" in RESERVED_SLUGS
    assert "convert" in RESERVED_SLUGS
    assert "citations" in RESERVED_SLUGS
    assert "functions" in RESERVED_SLUGS
    assert "admin" in RESERVED_SLUGS
    assert "api" in RESERVED_SLUGS


def test_check_collisions_passes_for_safe_names():
    safe_names = {"eyecite_clean", "core_log", "scripts_python_script"}
    # Should not raise
    check_collisions(safe_names)


def test_check_collisions_raises_for_reserved_slug():
    bad_names = {"eyecite_clean", "convert", "health"}
    with pytest.raises(RuntimeError, match="collide with reserved"):
        check_collisions(bad_names)
