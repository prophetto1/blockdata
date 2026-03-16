from __future__ import annotations

import json
from typing import Any, Iterable, Iterator, TextIO


class FileSerde:
    @staticmethod
    def read_jsonl(input_stream: TextIO) -> Iterator[Any]:
        for line in input_stream:
            stripped = line.strip()
            if not stripped:
                continue
            yield json.loads(stripped)

    @staticmethod
    def write_jsonl(output_stream: TextIO, rows: Iterable[Any]) -> int:
        count = 0
        for row in rows:
            output_stream.write(json.dumps(row, default=str))
            output_stream.write("\n")
            count += 1
        output_stream.flush()
        return count
