"""
Approach 4: Async tools.
For I/O-bound tools (HTTP calls, DB queries) that benefit from asyncio.
"""

import asyncio
import dspy


# -- Async tools ---------------------------------------------------------

async def async_weather(city: str) -> str:
    """Get weather information asynchronously."""
    await asyncio.sleep(0.1)  # simulate network latency
    return f"The weather in {city} is sunny and 75°F"


async def async_search(query: str) -> str:
    """Search asynchronously."""
    await asyncio.sleep(0.1)
    return f"Results for '{query}': found 3 relevant documents."


# -- Agent ----------------------------------------------------------------

react = dspy.ReAct(
    signature="question -> answer",
    tools=[async_weather, async_search],
    max_iters=5,
)


# -- Run ------------------------------------------------------------------

async def main():
    # Use acall for the async path
    result = await react.acall(question="What's the weather in Berlin?")
    print("Answer:", result.answer)

    # Individual async tool call
    tool = dspy.Tool(async_weather)
    weather = await tool.acall(city="Paris")
    print("Direct tool call:", weather)


if __name__ == "__main__":
    asyncio.run(main())
