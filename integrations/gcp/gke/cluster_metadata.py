from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.opensearch.abstract_task import AbstractTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class ClusterMetadata(AbstractTask, RunnableTask):
    """Fetch GKE cluster metadata"""
    cluster_id: Property[str]
    cluster_zone: Property[str] | None = None
    cluster_project_id: Property[str] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def fetch(self, run_context: RunContext) -> Cluster:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        location: str | None = None
        network: str | None = None
        name: str | None = None
        description: str | None = None
        cluster_ipv4_cidr: str | None = None
        sub_network: str | None = None
        endpoint: str | None = None
        zone: str | None = None
        project: str | None = None
        create_time: str | None = None
        node_pools_count: int | None = None
        node_pools: list[NodePool] | None = None
        master_auth: MasterAuth | None = None
        logging_service: str | None = None
        monitoring_service: str | None = None
        link: str | None = None

    @dataclass(slots=True)
    class MasterAuth:
        cluster_certificate: str | None = None
        client_key: str | None = None
        client_certificate: str | None = None

        def get_cluster_certificat(self) -> str:
            raise NotImplementedError  # TODO: translate from Java

        def get_client_certificat(self) -> str:
            raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class NodePool:
        name: str | None = None
        status: com | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    location: str | None = None
    network: str | None = None
    name: str | None = None
    description: str | None = None
    cluster_ipv4_cidr: str | None = None
    sub_network: str | None = None
    endpoint: str | None = None
    zone: str | None = None
    project: str | None = None
    create_time: str | None = None
    node_pools_count: int | None = None
    node_pools: list[NodePool] | None = None
    master_auth: MasterAuth | None = None
    logging_service: str | None = None
    monitoring_service: str | None = None
    link: str | None = None


@dataclass(slots=True, kw_only=True)
class MasterAuth:
    cluster_certificate: str | None = None
    client_key: str | None = None
    client_certificate: str | None = None

    def get_cluster_certificat(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def get_client_certificat(self) -> str:
        raise NotImplementedError  # TODO: translate from Java


@dataclass(slots=True, kw_only=True)
class NodePool:
    name: str | None = None
    status: com | None = None
