"""
Preprocess Java source to make it parseable by javalang 0.13.0.

Transforms Java 17+ syntax into equivalent Java 8 syntax that javalang
can parse. Designed for zero structural loss — all class, field, method,
and type declarations are preserved. Transformations only affect syntax
inside method bodies (which are discarded during scaffold generation)
or syntactic sugar that has a direct equivalent.

Usage:
    from integrations.javalang.pipeline.preprocess import preprocess
    clean_source = preprocess(java_source)
    tree = javalang.parse.parse(clean_source)
"""

from __future__ import annotations

import re


def preprocess(source: str) -> str:
    """Apply all preprocessing transformations."""
    result = source
    result = _strip_text_blocks(result)
    result = _strip_type_annotations_in_generics(result)
    result = _strip_var_keyword(result)
    result = _strip_switch_arrows(result)
    result = _strip_pattern_matching(result)
    result = _strip_records(result)
    result = _strip_yield(result)
    result = _strip_sealed_permits(result)
    result = _strip_method_references(result)
    result = _fix_record_identifier(result)
    result = _fix_module_in_imports(result)
    return result


def _strip_text_blocks(source: str) -> str:
    r"""Replace text blocks (triple-quoted strings) with regular strings.

    \"""
    some text
    \""" -> "some text"
    """
    def _replace(m: re.Match) -> str:
        content = m.group(1)
        content = content.strip()
        # Escape backslashes first, then quotes
        content = content.replace("\\", "\\\\")
        content = content.replace('"', '\\"')
        content = content.replace("\n", "\\n")
        content = content.replace("\r", "")
        return f'"{content}"'

    return re.sub(r'"""\s*?\n(.*?)"""', _replace, source, flags=re.DOTALL)


def _strip_type_annotations_in_generics(source: str) -> str:
    """Remove type-use annotations inside generic brackets.

    List<@NonNull String> -> List<String>
    Property<@Min(0) Integer> -> Property<Integer>
    Map<String, List<@NonNull String>> -> Map<String, List<String>>

    Uses a character-level scanner that tracks <> depth to handle nesting.
    """
    result = []
    i = 0
    depth = 0
    n = len(source)

    while i < n:
        ch = source[i]

        if ch == '<':
            depth += 1
            result.append(ch)
            i += 1
        elif ch == '>':
            depth = max(0, depth - 1)
            result.append(ch)
            i += 1
        elif ch == '@' and depth > 0:
            # Inside generics — consume the annotation
            i += 1  # skip @
            # Consume annotation name: word chars and dots
            while i < n and (source[i].isalnum() or source[i] in ('_', '.')):
                i += 1
            # Consume optional parenthesized args: @Min(0)
            if i < n and source[i] == '(':
                paren_depth = 1
                i += 1
                while i < n and paren_depth > 0:
                    if source[i] == '(':
                        paren_depth += 1
                    elif source[i] == ')':
                        paren_depth -= 1
                    i += 1
            # Consume trailing whitespace
            while i < n and source[i] == ' ':
                i += 1
        else:
            result.append(ch)
            i += 1

    return ''.join(result)


def _strip_var_keyword(source: str) -> str:
    """Replace var with Object in local variable declarations.

    var x = foo() -> Object x = foo()
    for (var item : list) -> for (Object item : list)

    Only matches var at statement positions — not inside strings or comments.
    """
    lines = source.split('\n')
    result = []
    for line in lines:
        stripped = line.lstrip()
        # Skip comment lines
        if stripped.startswith('//') or stripped.startswith('*') or stripped.startswith('/*'):
            result.append(line)
            continue
        # Only replace var before the first string literal on the line
        string_start = _find_first_string(line)
        if string_start == -1:
            result.append(re.sub(r'\bvar\s+(\w)', r'Object \1', line))
        else:
            prefix = line[:string_start]
            suffix = line[string_start:]
            result.append(re.sub(r'\bvar\s+(\w)', r'Object \1', prefix) + suffix)
    return '\n'.join(result)


def _find_first_string(line: str) -> int:
    """Find index of first unescaped quote in a line, or -1."""
    i = 0
    while i < len(line):
        if line[i] == '"' and (i == 0 or line[i-1] != '\\'):
            return i
        if line[i] == "'" and (i == 0 or line[i-1] != '\\'):
            return i
        i += 1
    return -1


def _strip_switch_arrows(source: str) -> str:
    """Convert switch expression arrows to colons.

    case FOO -> expr; -> case FOO: expr;
    default -> expr; -> default: expr;
    """
    source = re.sub(r'(case\s+[^:;{}-]+?)\s*->', r'\1:', source)
    source = re.sub(r'(default)\s*->', r'\1:', source)
    return source


def _strip_pattern_matching(source: str) -> str:
    """Remove binding variable from pattern matching instanceof.

    x instanceof Foo f -> x instanceof Foo
    """
    return re.sub(
        r'instanceof\s+(\w+(?:\.\w+)*)\s+(\w+)(?=\s*[)&|;,{\s])',
        r'instanceof \1',
        source,
    )


def _strip_records(source: str) -> str:
    """Convert record declarations to class declarations.

    record Foo(String bar, int baz) { }
    -> class Foo { String bar; int baz; }

    record Foo<T>(T value) implements Bar { }
    -> class Foo<T> implements Bar { T value; }
    """
    def _convert_record(m: re.Match) -> str:
        full = m.group(0)

        inner = re.match(
            r'record\s+(\w+)\s*(<[^>]*>)?\s*\((.*?)\)\s*(implements\s+[^{]+?)?\s*\{',
            full,
            re.DOTALL,
        )
        if not inner:
            return full

        rec_name = inner.group(1)
        type_params = inner.group(2) or ""
        params_str = inner.group(3)
        implements = inner.group(4) or ""
        if implements:
            implements = " " + implements.strip() + " "

        # Convert record params to fields
        fields = []
        if params_str.strip():
            for param in params_str.split(","):
                param = param.strip()
                if not param:
                    continue
                # Remove annotations
                param = re.sub(r'@\w+(?:\([^)]*\))?\s*', '', param).strip()
                if param:
                    fields.append(f"    {param};")

        fields_block = "\n".join(fields)
        if fields_block:
            fields_block = "\n" + fields_block

        return f"class {rec_name}{type_params}{implements}{{{fields_block}"

    # Use DOTALL so [^)]* matches newlines in multi-line record params
    return re.sub(
        r'record\s+\w+\s*(?:<[^>]*>)?\s*\(.*?\)\s*(?:implements\s+[^{]+?)?\s*\{',
        _convert_record,
        source,
        flags=re.DOTALL,
    )


def _strip_yield(source: str) -> str:
    """Replace yield with return in switch expressions."""
    return re.sub(r'\byield\s+', 'return ', source)


def _strip_sealed_permits(source: str) -> str:
    """Remove sealed modifier and permits clause.

    sealed class Foo permits Bar, Baz -> class Foo
    """
    source = re.sub(r'\bsealed\s+', '', source)
    source = re.sub(r'\s+permits\s+[\w,\s]+(?=\s*\{)', '', source)
    return source


def _strip_method_references(source: str) -> str:
    """Convert method references that javalang can't handle.

    String[]::new -> String.class
    Foo::bar -> Foo.class
    """
    # Array constructor references: Type[]::new
    source = re.sub(r'(\w+)\[\]::new', r'\1.class', source)
    # General method references: Type::method
    source = re.sub(r'(\w+)::(\w+)', r'\1.\2', source)
    return source


def _fix_record_identifier(source: str) -> str:
    """Fix uses of 'record' as an identifier (not keyword).

    .record(duration) -> .record_(duration)
    After _strip_records has run, remaining 'record' usages are identifiers.
    """
    # .record( — method call on an object
    source = re.sub(r'\.record\s*\(', '.record_(', source)
    # (Record record) — parameter declaration
    source = re.sub(r'\bRecord\s+record\b', 'Record record_', source)
    # private String record; — field named record
    source = re.sub(
        r'(private|protected|public)\s+([\w<>,.\s]+?)\s+record\s*;',
        r'\1 \2 record_;',
        source,
    )
    return source


def _fix_module_in_imports(source: str) -> str:
    """Fix 'module' keyword in import paths.

    import com.foo.module.Bar -> import com.foo.module_.Bar
    javalang treats 'module' as a keyword in some contexts.
    """
    # Only in import statements where module is a package segment
    source = re.sub(
        r'(import\s+[\w.]*?)\.module\.([\w.]+)',
        r'\1.module_.\2',
        source,
    )
    return source
