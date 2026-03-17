import json
import pytest
from app.domain.code_parsing.tree_sitter_service import parse_source


JAVA_SOURCE = b"""\
package demo;

public class Foo {
    private String name;

    public String getName() {
        return name;
    }
}
"""

PY_SOURCE = b"""\
class Bar:
    def __init__(self, x: int):
        self.x = x

    def value(self) -> int:
        return self.x
"""


def test_java_ast_has_root():
    result = parse_source(JAVA_SOURCE, "java")
    ast = json.loads(result.ast_json)
    assert ast["type"] == "program"
    assert len(ast["children"]) > 0


def test_java_symbols_extracted():
    result = parse_source(JAVA_SOURCE, "java")
    symbols = json.loads(result.symbols_json)
    names = [s["name"] for s in symbols]
    assert "Foo" in names
    assert "getName" in names


def test_java_symbol_kinds():
    result = parse_source(JAVA_SOURCE, "java")
    symbols = json.loads(result.symbols_json)
    by_name = {s["name"]: s for s in symbols}
    assert by_name["Foo"]["kind"] == "class"
    assert by_name["getName"]["kind"] == "method"
    assert by_name["getName"]["parent"] == "Foo"


def test_python_parses():
    result = parse_source(PY_SOURCE, "py")
    ast = json.loads(result.ast_json)
    assert ast["type"] == "module"


def test_python_symbols():
    result = parse_source(PY_SOURCE, "py")
    symbols = json.loads(result.symbols_json)
    names = [s["name"] for s in symbols]
    assert "Bar" in names
    assert "value" in names


def test_node_count_positive():
    result = parse_source(JAVA_SOURCE, "java")
    assert result.node_count > 0


def test_unsupported_type_raises():
    with pytest.raises(ValueError, match="Unsupported"):
        parse_source(b"hello", "xyz")
