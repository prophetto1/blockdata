"""Top-level picklable worker functions for ProcessPoolExecutor tests.

Must be top-level module functions (not nested/local) so they work
with both fork and spawn multiprocessing contexts.
"""

import time


def worker_sleep_and_return():
    time.sleep(0.1)
    return "done"


def worker_sleep_long():
    time.sleep(0.2)
    return "done"


def worker_return_42():
    return 42


def worker_raise_value_error():
    raise ValueError("conversion failed")
