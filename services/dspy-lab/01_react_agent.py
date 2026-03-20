"""
Approach 1: dspy.ReAct — fully managed tool orchestration.
The agent decides which tools to call, calls them, and synthesizes an answer.
"""

import dspy


# -- Tools ---------------------------------------------------------------

def get_weather(city: str) -> str:
    """Get the current weather for a city."""
    # Replace with a real API call
    return f"The weather in {city} is sunny and 75°F"


def search_web(query: str) -> str:
    """Search the web for information."""
    # Replace with a real search API
    return f"Search results for '{query}': DSPy is a framework for programming language models."


# -- Agent ----------------------------------------------------------------

react = dspy.ReAct(
    signature="question -> answer",
    tools=[get_weather, search_web],
    max_iters=5,
)


# -- Run ------------------------------------------------------------------

if __name__ == "__main__":
    result = react(question="What's the weather like in Tokyo?")
    print("Answer:", result.answer)
    print("Trajectory:", result.trajectory)
