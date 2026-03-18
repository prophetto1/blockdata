"""Parse source code via tree-sitter into AST JSON + symbol outlines."""

import json
from tree_sitter import Parser, Node

from app.domain.code_parsing.language_registry import get_language, EXTENSION_TO_LANG
from app.domain.code_parsing.models import ParseResult

CLASS_TYPES = frozenset({
    "class_declaration", "class_definition", "interface_declaration",
    "enum_declaration", "record_declaration", "struct_declaration",
})
FUNC_TYPES = frozenset({
    "method_declaration", "function_definition", "function_declaration",
    "method_definition", "arrow_function",
})


def _node_to_dict(node: Node) -> dict:
    result = {
        "type": node.type,
        "start": list(node.start_point),
        "end": list(node.end_point),
    }
    if node.child_count == 0:
        result["text"] = node.text.decode("utf-8", errors="replace")
    else:
        result["children"] = [_node_to_dict(c) for c in node.children]
    return result


def _count_nodes(node: Node) -> int:
    return 1 + sum(_count_nodes(c) for c in node.children)


def _extract_symbols(node: Node) -> list[dict]:
    symbols: list[dict] = []

    def _walk(n: Node, parent_name: str | None = None):
        kind = None
        if n.type in CLASS_TYPES:
            kind = "class"
        elif n.type in FUNC_TYPES:
            kind = "method" if parent_name else "function"

        if kind:
            name_node = n.child_by_field_name("name")
            name = name_node.text.decode("utf-8") if name_node else "<anonymous>"
            symbols.append({
                "kind": kind,
                "name": name,
                "start_line": n.start_point[0],
                "end_line": n.end_point[0],
                "parent": parent_name,
            })
            for child in n.children:
                _walk(child, name)
        else:
            for child in n.children:
                _walk(child, parent_name)

    _walk(node)
    return symbols


def parse_source(source: bytes, source_type: str) -> ParseResult:
    """Parse source bytes into AST JSON + symbol outline JSON."""
    language = get_language(source_type)
    if language is None:
        raise ValueError(f"Unsupported source type: {source_type}")

    parser = Parser(language)
    tree = parser.parse(source)

    ast_dict = _node_to_dict(tree.root_node)
    ast_json = json.dumps(
        ast_dict, ensure_ascii=False, sort_keys=True, separators=(",", ":"),
    ).encode("utf-8")

    symbols = _extract_symbols(tree.root_node)
    symbols_json = json.dumps(
        symbols, ensure_ascii=False, separators=(",", ":"),
    ).encode("utf-8")

    return ParseResult(
        ast_json=ast_json,
        symbols_json=symbols_json,
        source_type=source_type,
        language=EXTENSION_TO_LANG[source_type],
        node_count=_count_nodes(tree.root_node),
    )
