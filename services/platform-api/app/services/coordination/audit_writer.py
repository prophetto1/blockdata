from __future__ import annotations

import json
from pathlib import Path

from .contracts import (
    COORDINATION_OUTBOX_MAX_BYTES,
    COORDINATION_RUNTIME_AGENT_ID,
    CoordinationUnavailableError,
    utc_now_iso,
)


class CoordinationAuditWriter:
    def __init__(
        self,
        runtime_root: Path,
        *,
        host: str,
        agent_id: str = COORDINATION_RUNTIME_AGENT_ID,
        outbox_max_bytes: int = COORDINATION_OUTBOX_MAX_BYTES,
    ) -> None:
        self.runtime_root = Path(runtime_root)
        self.host = host
        self.agent_id = agent_id
        self.outbox_max_bytes = outbox_max_bytes

    @property
    def audit_root(self) -> Path:
        return self.runtime_root / "coordination-audit" / self.agent_id

    @property
    def outbox_root(self) -> Path:
        return self.runtime_root / "coordination-outbox" / self.host / self.agent_id

    def audit_file_for(self, occurred_at: str | None = None) -> Path:
        day = (occurred_at or utc_now_iso())[:10]
        return self.audit_root / f"{day}.ndjson"

    def outbox_file_for(self, occurred_at: str | None = None) -> Path:
        day = (occurred_at or utc_now_iso())[:10]
        return self.outbox_root / f"{day}.ndjson"

    def append_audit_event(self, envelope: dict) -> Path:
        target = self.audit_file_for(envelope.get("occurred_at"))
        target.parent.mkdir(parents=True, exist_ok=True)
        with target.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(envelope))
            handle.write("\n")
        return target

    def get_outbox_backlog(self) -> dict[str, int]:
        return self._directory_backlog(self.outbox_root)

    def _directory_backlog(self, root: Path) -> dict[str, int]:
        if not root.exists():
            return {"files": 0, "events": 0, "bytes": 0}

        files = sorted(path for path in root.rglob("*.ndjson") if path.is_file())
        events = 0
        bytes_total = 0
        for path in files:
            text = path.read_text(encoding="utf-8")
            lines = [line for line in text.splitlines() if line.strip()]
            events += len(lines)
            bytes_total += path.stat().st_size

        return {"files": len(files), "events": events, "bytes": bytes_total}

    def buffer_event(self, envelope: dict) -> Path:
        serialized = json.dumps(envelope) + "\n"
        current = self.get_outbox_backlog()
        next_bytes = current["bytes"] + len(serialized.encode("utf-8"))
        if next_bytes > self.outbox_max_bytes:
            raise CoordinationUnavailableError("Local coordination outbox cap exceeded")

        target = self.outbox_file_for(envelope.get("occurred_at"))
        target.parent.mkdir(parents=True, exist_ok=True)
        with target.open("a", encoding="utf-8") as handle:
            handle.write(serialized)
        return target

    def read_recent_events(self, *, task_id: str | None = None, limit: int = 50) -> list[dict]:
        if not self.audit_root.exists():
            return []

        matches: list[dict] = []
        files = sorted(path for path in self.audit_root.glob("*.ndjson"))
        for path in files:
            for line in path.read_text(encoding="utf-8").splitlines():
                if not line.strip():
                    continue
                parsed = json.loads(line)
                if task_id is not None and parsed.get("task_id") != task_id:
                    continue
                matches.append(parsed)

        return matches[-limit:]

    def latest_audit_file(self) -> str:
        return str(self.audit_file_for())
