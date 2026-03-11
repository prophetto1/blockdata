# services/platform-api/tests/test_conversion_pool.py
import asyncio
import pytest
from app.workers.conversion_pool import ConversionPool
from tests.helpers.pool_workers import (
    worker_sleep_and_return,
    worker_sleep_long,
    worker_return_42,
    worker_raise_value_error,
)


@pytest.fixture
def pool():
    p = ConversionPool(max_workers=2)
    yield p
    p.shutdown()


def test_pool_initializes_not_saturated(pool):
    assert pool.is_saturated is False
    assert pool.active_count == 0


def test_pool_status(pool):
    status = pool.status()
    assert status["max_workers"] == 2
    assert status["active"] == 0
    assert status["saturated"] is False


def test_pool_tracks_active_count(pool):
    """Verify active count increments during work and decrements after."""
    results = []

    async def run_test():
        fut1 = pool.submit(worker_sleep_and_return)
        fut2 = pool.submit(worker_sleep_and_return)
        await asyncio.sleep(0.01)
        results.append(pool.active_count)
        r1 = await fut1
        r2 = await fut2
        results.append(pool.active_count)
        return r1, r2

    r1, r2 = asyncio.run(run_test())
    assert r1 == "done"
    assert r2 == "done"
    assert results[0] == 2  # both active during work
    assert results[1] == 0  # both done


def test_pool_reports_saturated_when_full():
    pool = ConversionPool(max_workers=1)

    async def run_test():
        fut1 = pool.submit(worker_sleep_long)
        await asyncio.sleep(0.01)
        saturated_during = pool.is_saturated
        await fut1
        saturated_after = pool.is_saturated
        return saturated_during, saturated_after

    during, after = asyncio.run(run_test())
    assert during is True
    assert after is False
    pool.shutdown()


def test_pool_submit_returns_awaitable(pool):
    async def run_test():
        result = await pool.submit(worker_return_42)
        return result

    result = asyncio.run(run_test())
    assert result == 42


def test_pool_propagates_exceptions(pool):
    async def run_test():
        with pytest.raises(ValueError, match="conversion failed"):
            await pool.submit(worker_raise_value_error)

    asyncio.run(run_test())


def test_pool_rejects_when_overloaded():
    """Pool raises PoolOverloaded when active + queued exceeds capacity."""
    from app.workers.conversion_pool import PoolOverloaded
    pool = ConversionPool(max_workers=1, max_queue_depth=1)

    async def run_test():
        # Fill the pool (1 active) and queue (1 queued)
        fut1 = pool.submit(worker_sleep_long)
        fut2 = pool.submit(worker_sleep_long)
        await asyncio.sleep(0.01)
        # Third submission should be rejected
        with pytest.raises(PoolOverloaded):
            pool.submit(worker_return_42)
        await fut1
        await fut2

    asyncio.run(run_test())
    pool.shutdown()
