from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.apify.actor.actor_job_status import ActorJobStatus
from integrations.apify.actor.actor_run_meta import ActorRunMeta


@dataclass(slots=True, kw_only=True)
class ActorRunListItem:
    id: str | None = None
    act_id: str | None = None
    actor_task_id: str | None = None
    started_at: str | None = None
    finished_at: str | None = None
    status: ActorJobStatus | None = None
    meta: ActorRunMeta | None = None
    build_id: str | None = None
    build_number: str | None = None
    default_key_value_store_id: str | None = None
    default_dataset_id: str | None = None
    default_request_queue_id: str | None = None
    usage_total_usd: str | None = None

    def get_actor_task_id(self) -> Optional[String]:
        raise NotImplementedError  # TODO: translate from Java

    def get_build_id(self) -> Optional[String]:
        raise NotImplementedError  # TODO: translate from Java
