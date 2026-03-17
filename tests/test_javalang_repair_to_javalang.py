from __future__ import annotations

import javalang

from integrations.javalang.repair_to_javalang import repair_source


def test_repair_source_recovers_record_and_reports_applied_rule() -> None:
    source = """
package example;

public record Person(String name, int age) implements java.io.Serializable {
}
"""

    result = repair_source(source)

    assert result.parseable is True
    assert result.changed is True
    assert "records" in result.applied_rules
    assert "class Person" in result.repaired_source
    javalang.parse.parse(result.repaired_source)


def test_repair_source_leaves_parseable_source_unchanged() -> None:
    source = """
package example;

public class Person {
    private final String name;
}
"""

    result = repair_source(source)

    assert result.parseable is True
    assert result.changed is False
    assert result.applied_rules == []
    assert result.repaired_source == source
