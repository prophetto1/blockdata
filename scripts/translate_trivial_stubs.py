#!/usr/bin/env python3
"""
Translate trivial Java method stubs in the Python engine scaffolds.

Handles methods where the Java body is 1-3 lines and falls into known
mechanical translation patterns:
  - isinstance checks:   return this instanceof X  →  return isinstance(self, X)
  - field access:        return this.field          →  return self.field
  - simple returns:      return X                   →  return X (with Java→Python transforms)
  - boolean expressions: return !this.x && this.y   →  return not self.x and self.y
  - null checks:         return this.x != null      →  return self.x is not None
  - empty checks:        return this.x.isEmpty()    →  return len(self.x) == 0
  - delegations:         return this.x.method()     →  return self.x.method()
  - Optional returns:    return Optional.of(x)      →  return x  (Optional removed in Python)
  - void setters:        this.x = y                 →  self.x = y

Run:  python3 scripts/translate_trivial_stubs.py [--dry-run] [--verbose]
"""
from __future__ import annotations

import argparse
import os
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path

KESTRA_JAVA_ROOT = Path("/home/jon/kestra-repos/kestra")
ENGINE_ROOT = Path("engine")

# ── Java source mapping ──────────────────────────────────────────────

def resolve_java_source(py_path: Path) -> Path | None:
    """Read the # Source: header and map to local Java path."""
    with open(py_path) as f:
        for line in f:
            m = re.match(r"#\s*Source:\s*(.+)", line)
            if m:
                win_path = m.group(1).strip()
                # E:\KESTRA\core\src\... → /home/jon/kestra-repos/kestra/core/src/...
                local = win_path.replace("\\", "/")
                local = re.sub(r"^E:/KESTRA/", str(KESTRA_JAVA_ROOT) + "/", local)
                return Path(local) if Path(local).exists() else None
    return None


# ── Java method extraction ───────────────────────────────────────────

def extract_java_methods(java_path: Path) -> dict[str, JavaMethod]:
    """Extract all method signatures and bodies from a Java file."""
    with open(java_path) as f:
        content = f.read()

    methods: dict[str, JavaMethod] = {}

    # Find method signatures with their bodies using brace counting
    # Pattern: modifiers returnType methodName(params) {body}
    sig_pattern = re.compile(
        r"(?:@\w+(?:\([^)]*\))?\s*)*"  # annotations
        r"(?:public|private|protected)\s+"
        r"(?:static\s+)?(?:final\s+)?(?:synchronized\s+)?"
        r"(?:<[^>]+>\s+)?"  # generics
        r"([\w.<>,\[\]\s?]+?)\s+"  # return type
        r"(\w+)\s*"  # method name
        r"\(([^)]*)\)\s*"  # params
        r"(?:throws\s+[\w,\s]+\s*)?"  # throws
        r"\{"  # opening brace
    )

    for m in sig_pattern.finditer(content):
        return_type = m.group(1).strip()
        name = m.group(2)
        params = m.group(3).strip()
        start = m.end()

        # Count braces to find the matching close
        depth = 1
        i = start
        while i < len(content) and depth > 0:
            if content[i] == "{":
                depth += 1
            elif content[i] == "}":
                depth -= 1
            i += 1

        body = content[start : i - 1].strip()

        # Build a lookup key from method name + param count
        param_count = len([p for p in params.split(",") if p.strip()]) if params else 0
        key = f"{name}_{param_count}"

        methods[key] = JavaMethod(
            name=name,
            return_type=return_type,
            params=params,
            body=body,
            line_count=len([l for l in body.split("\n") if l.strip() and not l.strip().startswith("//")]),
        )

        # Also store by just the name (for cases where param count doesn't match due to translation)
        if name not in methods:
            methods[name] = methods[key]

    return methods


@dataclass
class JavaMethod:
    name: str
    return_type: str
    params: str
    body: str
    line_count: int


# ── Java → Python translation rules ─────────────────────────────────

def to_snake(name: str) -> str:
    """camelCase → snake_case."""
    s = re.sub(r"([A-Z]+)([A-Z][a-z])", r"\1_\2", name)
    s = re.sub(r"([a-z0-9])([A-Z])", r"\1_\2", s)
    return s.lower()


def translate_java_expr(expr: str) -> str | None:
    """Translate a single Java expression to Python. Returns None if too complex."""
    expr = expr.rstrip(";").strip()

    # Java literals → Python literals (BEFORE other transforms)
    expr = re.sub(r"\bnull\b", "None", expr)
    expr = re.sub(r"\btrue\b", "True", expr)
    expr = re.sub(r"\bfalse\b", "False", expr)

    # this.field → self.field
    expr = re.sub(r"\bthis\.(\w+)", r"self.\1", expr)
    # bare this → self
    expr = re.sub(r"\bthis\b", "self", expr)

    # instanceof → isinstance
    expr = re.sub(r"(\w+(?:\.\w+)*)\s+instanceof\s+(\w+)", r"isinstance(\1, \2)", expr)

    # ! (boolean not) → not
    expr = re.sub(r"!\s*isinstance", r"not isinstance", expr)
    expr = re.sub(r"!\s*(\w)", r"not \1", expr)

    # && → and, || → or
    expr = expr.replace("&&", " and ").replace("||", " or ")

    # != null → is not None, == null → is None
    expr = re.sub(r"(\w+(?:\.\w+)*)\s*!=\s*null", r"\1 is not None", expr)
    expr = re.sub(r"(\w+(?:\.\w+)*)\s*==\s*null", r"\1 is None", expr)

    # .isEmpty() → len(...) == 0
    expr = re.sub(r"(\w+(?:\.\w+)*)\.isEmpty\(\)", r"len(\1) == 0", expr)

    # .isPresent() → ... is not None
    expr = re.sub(r"(\w+(?:\.\w+)*)\.isPresent\(\)", r"\1 is not None", expr)

    # .size() → len(...)
    expr = re.sub(r"(\w+(?:\.\w+)*)\.size\(\)", r"len(\1)", expr)

    # .get() on Optional → just the variable (Optional removed in Python)
    expr = re.sub(r"(\w+(?:\.\w+)*)\.get\(\)(?!\.)", r"\1", expr)

    # Optional.of(x) → x
    expr = re.sub(r"Optional\.of(?:Nullable)?\(([^)]+)\)", r"\1", expr)

    # Optional.empty() → None
    expr = re.sub(r"Optional\.empty\(\)", "None", expr)

    # .equals(x) → == x
    expr = re.sub(r"(\w+(?:\.\w+)*)\.equals\(([^)]+)\)", r"\1 == \2", expr)

    # Collections.emptyList() → []
    expr = re.sub(r"Collections\.emptyList\(\)", "[]", expr)
    expr = re.sub(r"Collections\.singletonList\(([^)]+)\)", r"[\1]", expr)
    expr = re.sub(r"Collections\.unmodifiableList\(([^)]+)\)", r"list(\1)", expr)
    expr = re.sub(r"List\.of\(\)", "[]", expr)
    expr = re.sub(r"List\.of\(([^)]+)\)", r"[\1]", expr)
    expr = re.sub(r"Map\.of\(\)", "{}", expr)
    expr = re.sub(r"Set\.of\(\)", "set()", expr)
    expr = re.sub(r"Set\.of\(([^)]+)\)", r"{\1}", expr)

    # new ArrayList<>() → []
    expr = re.sub(r"new\s+ArrayList<[^>]*>\(\)", "[]", expr)
    expr = re.sub(r"new\s+ArrayList<[^>]*>\(([^)]+)\)", r"list(\1)", expr)
    expr = re.sub(r"new\s+HashMap<[^>]*>\(\)", "{}", expr)
    expr = re.sub(r"new\s+HashMap<[^>]*>\(([^)]+)\)", r"dict(\1)", expr)
    expr = re.sub(r"new\s+HashSet<[^>]*>\(\)", "set()", expr)
    expr = re.sub(r"new\s+HashSet<[^>]*>\(([^)]+)\)", r"set(\1)", expr)
    expr = re.sub(r"new\s+LinkedHashMap<[^>]*>\(\)", "{}", expr)
    expr = re.sub(r"new\s+ConcurrentHashMap<[^>]*>\(\)", "{}", expr)

    # String operations
    expr = re.sub(r"(\w+)\.length\(\)", r"len(\1)", expr)
    expr = re.sub(r"(\w+)\.trim\(\)", r"\1.strip()", expr)
    expr = re.sub(r"(\w+)\.toLowerCase\(\)", r"\1.lower()", expr)
    expr = re.sub(r"(\w+)\.toUpperCase\(\)", r"\1.upper()", expr)
    expr = re.sub(r"(\w+)\.startsWith\(([^)]+)\)", r"\1.startswith(\2)", expr)
    expr = re.sub(r"(\w+)\.endsWith\(([^)]+)\)", r"\1.endswith(\2)", expr)
    expr = re.sub(r"(\w+)\.contains\(([^)]+)\)", r"\2 in \1", expr)
    expr = re.sub(r"String\.valueOf\(([^)]+)\)", r"str(\1)", expr)
    expr = re.sub(r"Integer\.parseInt\(([^)]+)\)", r"int(\1)", expr)
    expr = re.sub(r"Long\.parseLong\(([^)]+)\)", r"int(\1)", expr)
    expr = re.sub(r"Double\.parseDouble\(([^)]+)\)", r"float(\1)", expr)
    expr = re.sub(r"Boolean\.parseBoolean\(([^)]+)\)", r"bool(\1)", expr)

    # Objects.hash / Objects.equals / Objects.requireNonNull
    expr = re.sub(r"Objects\.hash\(([^)]+)\)", r"hash((\1,))", expr)
    expr = re.sub(r"Objects\.equals\(([^,]+),\s*([^)]+)\)", r"\1 == \2", expr)
    expr = re.sub(r"Objects\.requireNonNull\(([^)]+)\)", r"\1", expr)

    # (Type) cast → remove
    expr = re.sub(r"\(\w+(?:<[^>]+>)?\)\s*", "", expr)

    # camelCase method calls → snake_case
    def snake_method(m):
        return "." + to_snake(m.group(1)) + "("
    expr = re.sub(r"\.([a-z][a-zA-Z]+)\(", snake_method, expr)

    # camelCase field access → snake_case
    def snake_field(m):
        prefix = m.group(1)
        field_name = m.group(2)
        # Don't convert if it looks like a class name (starts upper)
        if field_name[0].isupper():
            return m.group(0)
        return prefix + to_snake(field_name)
    expr = re.sub(r"(self\.)([a-z][a-zA-Z_]+)(?!\()", snake_field, expr)

    # Ternary: a ? b : c → b if a else c
    ternary = re.match(r"^(.+?)\s*\?\s*(.+?)\s*:\s*(.+)$", expr)
    if ternary:
        cond, true_val, false_val = ternary.groups()
        expr = f"{true_val.strip()} if {cond.strip()} else {false_val.strip()}"

    # new ClassName<...>(...) → ClassName(...) — generic object construction
    expr = re.sub(r"\bnew\s+(\w+)\s*<[^>]*>\s*\(", r"\1(", expr)
    # new ClassName(...) → ClassName(...)
    expr = re.sub(r"\bnew\s+(\w+)\s*\(", r"\1(", expr)

    # .getClass() → type(...)
    expr = re.sub(r"(\w+(?:\.\w+)*)\.getClass\(\)", r"type(\1)", expr)

    # .toString() → str(...)
    expr = re.sub(r"(\w+(?:\.\w+)*)\.toString\(\)", r"str(\1)", expr)

    # .orElse(x) → ... if ... is not None else x  (simplified: just keep as or default)
    expr = re.sub(r"(\w+(?:\.\w+)*)\.or_else\(([^)]+)\)", r"(\1 if \1 is not None else \2)", expr)
    expr = re.sub(r"(\w+(?:\.\w+)*)\.orElse\(([^)]+)\)", r"(\1 if \1 is not None else \2)", expr)

    # .orElseGet(() -> x) → simplified
    expr = re.sub(r"\.orElseGet\(\(\)\s*->\s*([^)]+)\)", r" if self is not None else \1", expr)

    # Math.max / Math.min / Math.abs
    expr = re.sub(r"Math\.max\(([^,]+),\s*([^)]+)\)", r"max(\1, \2)", expr)
    expr = re.sub(r"Math\.min\(([^,]+),\s*([^)]+)\)", r"min(\1, \2)", expr)
    expr = re.sub(r"Math\.abs\(([^)]+)\)", r"abs(\1)", expr)

    # Bail if there's still obvious Java left
    if any(kw in expr for kw in [".stream()", ".collect(", "->", "::", "throws", ".class", "synchronized"]):
        return None

    return expr


def translate_trivial_body(java: JavaMethod, py_method_name: str) -> str | None:
    """
    Attempt to translate a trivial Java method body to Python.
    Returns the Python body string, or None if too complex.
    """
    body = java.body.strip()
    lines = [l.strip() for l in body.split("\n") if l.strip() and not l.strip().startswith("//")]

    # Only handle 1-3 line methods
    if len(lines) > 3:
        return None

    # Single line: return expr;
    if len(lines) == 1:
        line = lines[0]

        # return expression;
        if line.startswith("return "):
            expr = translate_java_expr(line[7:])
            if expr is not None:
                return f"return {expr}"

        # void: this.field = value;
        m = re.match(r"this\.(\w+)\s*=\s*(.+);", line)
        if m:
            field_name = to_snake(m.group(1))
            value = translate_java_expr(m.group(2))
            if value is not None:
                return f"self.{field_name} = {value}"

        # void: delegate call
        m = re.match(r"this\.(\w+)\.(\w+)\(([^)]*)\);", line)
        if m:
            obj = to_snake(m.group(1))
            method = to_snake(m.group(2))
            args = m.group(3)
            args_translated = translate_java_expr(args) if args else ""
            if args_translated is not None:
                return f"self.{obj}.{method}({args_translated})"

    # Two lines: null/condition check + return
    if len(lines) == 2:
        # if (x == null) return y; / return z;
        m1 = re.match(r"if\s*\((.+)\)\s*return\s+(.+);", lines[0])
        m2 = re.match(r"return\s+(.+);", lines[1])
        if m1 and m2:
            cond = translate_java_expr(m1.group(1))
            early = translate_java_expr(m1.group(2))
            final = translate_java_expr(m2.group(1))
            if cond and early and final:
                return f"if {cond}:\n            return {early}\n        return {final}"

        # if (x == null) { return y; }  (on two lines)
        if lines[0].startswith("if ") and "return" in lines[1]:
            pass  # Let these fall through to None

    # Three lines: if (cond) { return x; } return y;  or  if/else
    if len(lines) == 3:
        # if (cond) return a; else return b; — or — { return a; } return b;
        pass  # These are usually more nuanced, skip for now

    return None


# ── Python file processing ───────────────────────────────────────────

@dataclass
class Stats:
    files_scanned: int = 0
    stubs_found: int = 0
    translated: int = 0
    skipped_no_java: int = 0
    skipped_complex: int = 0
    skipped_no_match: int = 0
    errors: list[str] = field(default_factory=list)


def process_file(py_path: Path, dry_run: bool, verbose: bool, stats: Stats) -> str | None:
    """Process a single Python file, translating trivial stubs. Returns new content or None."""
    stats.files_scanned += 1

    with open(py_path) as f:
        content = f.read()

    if "# TODO: translate from Java" not in content:
        return None

    java_path = resolve_java_source(py_path)
    if not java_path:
        stubs = content.count("# TODO: translate from Java")
        stats.skipped_no_java += stubs
        return None

    java_methods = extract_java_methods(java_path)
    if not java_methods:
        return None

    lines = content.split("\n")
    new_lines = []
    changed = False

    i = 0
    while i < len(lines):
        line = lines[i]

        if "# TODO: translate from Java" not in line:
            new_lines.append(line)
            i += 1
            continue

        stats.stubs_found += 1

        # Find the def line above this stub
        def_line_idx = None
        py_method_name = None
        for j in range(i - 1, max(i - 8, -1), -1):
            m = re.match(r"\s+def\s+(\w+)\s*\(([^)]*)\)", lines[j])
            if m:
                def_line_idx = j
                py_method_name = m.group(1)
                py_params = m.group(2)
                break

        if not py_method_name:
            new_lines.append(line)
            stats.skipped_no_match += 1
            i += 1
            continue

        # Map snake_case Python name back to camelCase Java name
        parts = py_method_name.split("_")
        java_name = parts[0] + "".join(p.capitalize() for p in parts[1:])

        # Count params (excluding self)
        param_list = [p.strip() for p in py_params.split(",") if p.strip() and p.strip() != "self"]
        param_count = len(param_list)

        # Look up Java method — try multiple strategies
        key = f"{java_name}_{param_count}"
        java_method = java_methods.get(key) or java_methods.get(java_name)

        if not java_method:
            # Try with different param counts (Python may collapse overloads)
            for delta in range(0, 4):
                java_method = java_methods.get(f"{java_name}_{param_count + delta}")
                if java_method:
                    break
                java_method = java_methods.get(f"{java_name}_{max(0, param_count - delta)}")
                if java_method:
                    break

        if not java_method:
            # Try the Python name directly (some names don't camelCase-convert cleanly)
            java_method = java_methods.get(py_method_name)

        if not java_method:
            # Try common prefix patterns: get_x → getX, is_x → isX, set_x → setX
            for prefix in ("get", "is", "set", "has", "can", "should", "to", "from", "of"):
                if py_method_name.startswith(prefix + "_"):
                    rest = py_method_name[len(prefix) + 1:]
                    alt = prefix + rest[0].upper() + rest[1:] if rest else prefix
                    java_method = java_methods.get(alt)
                    if java_method:
                        break

        if not java_method:
                new_lines.append(line)
                stats.skipped_no_match += 1
                i += 1
                continue

        # Attempt translation
        translation = translate_trivial_body(java_method, py_method_name)

        if translation is None:
            new_lines.append(line)
            stats.skipped_complex += 1
            i += 1
            continue

        # Get the indentation from the stub line
        indent = re.match(r"(\s*)", line).group(1)

        # Replace the stub with the translation
        translated_lines = translation.split("\n")
        new_lines.append(indent + translated_lines[0] + "  # auto-translated")
        for tl in translated_lines[1:]:
            new_lines.append(indent + tl if tl.strip() else tl)

        stats.translated += 1
        changed = True

        if verbose:
            print(f"  {py_path}:{i+1} {py_method_name} ← {java_method.name}")
            print(f"    Java:   {java_method.body.strip()[:100]}")
            print(f"    Python: {translation[:100]}")

        i += 1

    if changed:
        return "\n".join(new_lines)
    return None


# ── Main ─────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Translate trivial Java stubs to Python")
    parser.add_argument("--dry-run", action="store_true", help="Don't write files, just report")
    parser.add_argument("--verbose", "-v", action="store_true", help="Show each translation")
    parser.add_argument("--path", default="engine", help="Root path to scan (default: engine)")
    args = parser.parse_args()

    stats = Stats()
    root = Path(args.path)

    for dirpath, dirnames, filenames in os.walk(root):
        for fname in sorted(filenames):
            if not fname.endswith(".py"):
                continue
            py_path = Path(dirpath) / fname
            result = process_file(py_path, args.dry_run, args.verbose, stats)
            if result is not None and not args.dry_run:
                with open(py_path, "w") as f:
                    f.write(result)

    print()
    print("=" * 60)
    print(f"Files scanned:          {stats.files_scanned}")
    print(f"Stubs found:            {stats.stubs_found}")
    print(f"Translated:             {stats.translated}")
    print(f"Skipped (no Java src):  {stats.skipped_no_java}")
    print(f"Skipped (too complex):  {stats.skipped_complex}")
    print(f"Skipped (no match):     {stats.skipped_no_match}")
    print(f"{'[DRY RUN]' if args.dry_run else 'DONE — files written'}")
    print("=" * 60)


if __name__ == "__main__":
    main()
