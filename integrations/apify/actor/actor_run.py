from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-apify\src\main\java\io\kestra\plugin\apify\actor\ActorRun.java

from dataclasses import dataclass
from typing import Any, Optional

from integrations.apify.actor.actor_run_list_item import ActorRunListItem
from integrations.apify.actor.actor_run_options import ActorRunOptions
from integrations.apify.actor.actor_run_stats import ActorRunStats
from integrations.apify.actor.actor_run_usage import ActorRunUsage
from integrations.apify.actor.pricinginfo.common_actor_pricing_info import CommonActorPricingInfo
from integrations.aws.glue.model.output import Output
from integrations.apify.actor.run_genral_access import RunGenralAccess


@dataclass(slots=True, kw_only=True)
class ActorRun(ActorRunListItem):
    user_id: str | None = None
    status_message: str | None = None
    stats: ActorRunStats | None = None
    options: ActorRunOptions | None = None
    exit_code: float | None = None
    container_url: str | None = None
    is_container_server_ready: bool | None = None
    git_branch_name: str | None = None
    usage: ActorRunUsage | None = None
    usage_usd: ActorRunUsage | None = None
    pricing_info: CommonActorPricingInfo | None = None
    charged_event_counts: dict[str, float] | None = None
    general_access: RunGenralAccess | None = None

    def get_status_message(self) -> Optional[str]:
        raise NotImplementedError  # TODO: translate from Java

    def get_git_branch_name(self) -> Optional[str]:
        raise NotImplementedError  # TODO: translate from Java

    def get_usage(self) -> Optional[ActorRunUsage]:
        raise NotImplementedError  # TODO: translate from Java

    def get_usage_usd(self) -> Optional[ActorRunUsage]:
        raise NotImplementedError  # TODO: translate from Java

    def get_pricing_info(self) -> Optional[CommonActorPricingInfo]:
        raise NotImplementedError  # TODO: translate from Java

    def get_charged_event_counts(self) -> Optional[dict[str, float]]:
        raise NotImplementedError  # TODO: translate from Java

    def get_general_access(self) -> Optional[RunGenralAccess]:
        raise NotImplementedError  # TODO: translate from Java
