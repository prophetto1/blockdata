"""Startup collision check — prevents plugins from shadowing explicit routes."""

RESERVED_SLUGS: frozenset[str] = frozenset({
    "health",
    "functions",
    "convert",
    "citations",
    "admin",
    "api",
    "docs",
    "openapi.json",
    "redoc",
})


def check_collisions(function_names: set[str]) -> None:
    """Raise RuntimeError if any plugin function name matches a reserved slug."""
    collisions = function_names & RESERVED_SLUGS
    if collisions:
        raise RuntimeError(
            f"Plugin function names collide with reserved routes: {sorted(collisions)}. "
            "Rename the conflicting plugins or their task_types."
        )
