from __future__ import annotations

from blockdata.connectors.mongodb.abstract_load import AbstractLoad
from blockdata.connectors.mongodb.abstract_task import AbstractTask
from blockdata.connectors.mongodb.aggregate import Aggregate
from blockdata.connectors.mongodb.bulk import Bulk
from blockdata.connectors.mongodb.find import Find
from blockdata.connectors.mongodb.load import Load
from blockdata.connectors.mongodb.trigger import Trigger


def test_family_graph_preserves_shared_bases() -> None:
    assert issubclass(Load, AbstractLoad)
    assert issubclass(Bulk, AbstractLoad)
    assert issubclass(Find, AbstractTask)
    assert issubclass(Aggregate, AbstractTask)
    assert hasattr(Trigger, "evaluate")
