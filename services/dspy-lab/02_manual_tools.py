"""
Approach 2: Manual tool handling.
You control the tool-call loop — useful when you need custom routing,
logging, or retry logic around individual calls.
"""

import dspy


# -- Tools ---------------------------------------------------------------

def weather(city: str) -> str:
    """Get weather information for a city."""
    return f"The weather in {city} is sunny"


def calculator(expression: str) -> str:
    """Evaluate a mathematical expression safely."""
    allowed = set("0123456789+-*/.() ")
    if not all(c in allowed for c in expression):
        return "Error: invalid characters in expression"
    try:
        return f"The result is {eval(expression)}"  # noqa: S307
    except Exception as e:
        return f"Error: {e}"


# -- Signature with tool outputs -----------------------------------------

class ToolSignature(dspy.Signature):
    """Pick the right tool and arguments to answer the question."""

    question: str = dspy.InputField()
    tools: list[dspy.Tool] = dspy.InputField()
    outputs: dspy.ToolCalls = dspy.OutputField()


# -- Run ------------------------------------------------------------------

if __name__ == "__main__":
    tools = {
        "weather": dspy.Tool(weather),
        "calculator": dspy.Tool(calculator),
    }

    predictor = dspy.Predict(ToolSignature)
    response = predictor(
        question="What is 42 * 17?",
        tools=list(tools.values()),
    )

    for call in response.outputs.tool_calls:
        result = call.execute()
        print(f"Tool: {call.name}  Args: {call.args}  Result: {result}")
