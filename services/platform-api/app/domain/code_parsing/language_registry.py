"""Map file extensions to tree-sitter Language objects (lazy-loaded)."""

from tree_sitter import Language

_GRAMMARS: dict[str, Language] = {}

EXTENSION_TO_LANG: dict[str, str] = {
    "java": "java",
    "py": "python",
    "js": "javascript",
    "jsx": "javascript",
    "ts": "typescript",
    "tsx": "tsx",
    "go": "go",
    "rs": "rust",
    "cs": "c_sharp",
}

CODE_EXTENSIONS: frozenset[str] = frozenset(EXTENSION_TO_LANG.keys())


def get_language(source_type: str) -> Language | None:
    """Return the tree-sitter Language for a file extension, or None."""
    lang_name = EXTENSION_TO_LANG.get(source_type)
    if not lang_name:
        return None
    if lang_name not in _GRAMMARS:
        mod = __import__(f"tree_sitter_{lang_name}", fromlist=["language"])
        _GRAMMARS[lang_name] = Language(mod.language())
    return _GRAMMARS[lang_name]


def is_code_extension(source_type: str) -> bool:
    return source_type in CODE_EXTENSIONS
