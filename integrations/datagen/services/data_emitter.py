from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-datagen\src\main\java\io\kestra\plugin\datagen\services\DataEmitter.java
# WARNING: Unresolved types: AtomicBoolean, Consumer, CountDownLatch, InterruptedException, Logger, Runnable

from dataclasses import dataclass
from typing import Any

from integrations.datagen.model.callback import Callback
from integrations.datagen.data import Data
from integrations.datagen.services.data_emitter_options import DataEmitterOptions
from integrations.datagen.model.producer import Producer
from integrations.datagen.internal.throughput_throttler import ThroughputThrottler


@dataclass(slots=True, kw_only=True)
class DataEmitter:
    consumer: Consumer[Data] | None = None
    producer: Producer[Data] | None = None
    options: DataEmitterOptions | None = None
    is_shutdown_latch: CountDownLatch | None = None
    shutdown: AtomicBoolean | None = None
    logger: Logger | None = None
    throttler: ThroughputThrottler | None = None

    def run(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def do_send_data(self, data: Data, callback: Callback) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def stop(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def wait_for_termination(self) -> None:
        raise NotImplementedError  # TODO: translate from Java
