from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True, kw_only=True)
class ActorRunUsage:
    actor_compute_units: float | None = None
    dataset_reads: float | None = None
    dataset_writes: float | None = None
    key_value_store_reads: float | None = None
    key_value_store_writes: float | None = None
    key_value_store_lists: float | None = None
    request_queue_reads: float | None = None
    request_queue_writes: float | None = None
    data_transfer_internal_gbytes: float | None = None
    data_transfer_external_gbytes: float | None = None
    proxy_residential_transfer_gbytes: float | None = None
    proxy_serps: float | None = None

    def get_actor_compute_units(self) -> Optional[Double]:
        raise NotImplementedError  # TODO: translate from Java

    def get_dataset_reads(self) -> Optional[Double]:
        raise NotImplementedError  # TODO: translate from Java

    def get_dataset_writes(self) -> Optional[Double]:
        raise NotImplementedError  # TODO: translate from Java

    def get_key_value_store_reads(self) -> Optional[Double]:
        raise NotImplementedError  # TODO: translate from Java

    def get_key_value_store_writes(self) -> Optional[Double]:
        raise NotImplementedError  # TODO: translate from Java

    def get_key_value_store_lists(self) -> Optional[Double]:
        raise NotImplementedError  # TODO: translate from Java

    def get_request_queue_reads(self) -> Optional[Double]:
        raise NotImplementedError  # TODO: translate from Java

    def get_request_queue_writes(self) -> Optional[Double]:
        raise NotImplementedError  # TODO: translate from Java

    def get_data_transfer_internal_gbytes(self) -> Optional[Double]:
        raise NotImplementedError  # TODO: translate from Java

    def get_data_transfer_external_gbytes(self) -> Optional[Double]:
        raise NotImplementedError  # TODO: translate from Java

    def get_proxy_residential_transfer_gbytes(self) -> Optional[Double]:
        raise NotImplementedError  # TODO: translate from Java

    def get_proxy_serps(self) -> Optional[Double]:
        raise NotImplementedError  # TODO: translate from Java
