import importlib


def test_javalang_dependency_is_importable():
    module = importlib.import_module("javalang")
    assert module is not None


def test_serialize_token_returns_json_safe_dict():
    import javalang

    from app.plugins.javalang_base import _serialize_token

    token = next(javalang.tokenizer.tokenize("class Test {}"))
    data = _serialize_token(token)
    assert data["value"] == "class"
    assert data["type"] == token.__class__.__name__


async def test_javalang_tokenize_plugin():
    from app.domain.plugins.models import ExecutionContext
    from app.plugins.javalang_tokenize import JavalangTokenizePlugin

    plugin = JavalangTokenizePlugin()
    result = await plugin.run({"code": "class Test {}"}, ExecutionContext())
    assert result.state == "SUCCESS"
    assert result.data["tokens"][0]["value"] == "class"


async def test_javalang_reformat_tokens_plugin():
    from app.domain.plugins.models import ExecutionContext
    from app.plugins.javalang_reformat_tokens import JavalangReformatTokensPlugin

    result = await JavalangReformatTokensPlugin().run({"code": "class Test {}"}, ExecutionContext())
    assert result.state == "SUCCESS"
    assert isinstance(result.data["text"], str)


async def test_javalang_parse_plugin():
    from app.domain.plugins.models import ExecutionContext
    from app.plugins.javalang_parse import JavalangParsePlugin

    result = await JavalangParsePlugin().run({"code": "class Test {}"}, ExecutionContext())
    assert result.state == "SUCCESS"
    assert "CompilationUnit" in result.data["ast"]["node_type"]


async def test_javalang_parse_expression_plugin():
    from app.domain.plugins.models import ExecutionContext
    from app.plugins.javalang_parse_expression import JavalangParseExpressionPlugin

    result = await JavalangParseExpressionPlugin().run({"expression": "a + b"}, ExecutionContext())
    assert result.state == "SUCCESS"


async def test_javalang_parse_member_signature_plugin():
    from app.domain.plugins.models import ExecutionContext
    from app.plugins.javalang_parse_member_signature import JavalangParseMemberSignaturePlugin

    result = await JavalangParseMemberSignaturePlugin().run({"signature": "void test()"}, ExecutionContext())
    assert result.state == "SUCCESS"


async def test_javalang_parse_constructor_signature_plugin():
    from app.domain.plugins.models import ExecutionContext
    from app.plugins.javalang_parse_constructor_signature import JavalangParseConstructorSignaturePlugin

    result = await JavalangParseConstructorSignaturePlugin().run({"signature": "Test()"}, ExecutionContext())
    assert result.state == "SUCCESS"


async def test_javalang_parse_type_plugin():
    from app.domain.plugins.models import ExecutionContext
    from app.plugins.javalang_parse_type import JavalangParseTypePlugin

    result = await JavalangParseTypePlugin().run({"type_source": "List<String>"}, ExecutionContext())
    assert result.state == "SUCCESS"


async def test_javalang_parse_type_signature_plugin():
    from app.domain.plugins.models import ExecutionContext
    from app.plugins.javalang_parse_type_signature import JavalangParseTypeSignaturePlugin

    result = await JavalangParseTypeSignaturePlugin().run({"signature": "class Foo extends Bar {}"}, ExecutionContext())
    assert result.state == "SUCCESS"