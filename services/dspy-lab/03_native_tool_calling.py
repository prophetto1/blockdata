"""
Approach 3: Native tool calling via ChatAdapter.
Lets the LM provider handle function-call formatting natively
instead of DSPy serializing tools into the prompt text.
"""

import dspy


# -- Tools ---------------------------------------------------------------

def lookup_case(case_id: str) -> str:
    """Look up a legal case by its identifier."""
    return f"Case {case_id}: Smith v. Jones, decided 2024-01-15, holding for plaintiff."


def summarize_document(text: str, max_words: int = 50) -> str:
    """Summarize a document to the requested length."""
    words = text.split()
    if len(words) <= max_words:
        return text
    return " ".join(words[:max_words]) + "..."


# -- Configure native function calling ----------------------------------

native_adapter = dspy.ChatAdapter(use_native_function_calling=True)

# Uncomment and set your model:
# dspy.configure(
#     lm=dspy.LM("anthropic/claude-sonnet-4-20250514"),
#     adapter=native_adapter,
# )

react = dspy.ReAct(
    signature="question -> answer",
    tools=[lookup_case, summarize_document],
    max_iters=5,
)


# -- Run ------------------------------------------------------------------

if __name__ == "__main__":
    result = react(question="Summarize case 2024-SC-1234")
    print("Answer:", result.answer)
