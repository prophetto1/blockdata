"""
Shared LM configuration for all examples.
Import this at the top of any script, or run it standalone to verify your setup.

Usage:
    import configure  # auto-configures dspy on import
    # then use dspy as normal
"""

import os
import dspy

# -- Pick your model -----------------------------------------------------
# DSPy uses litellm under the hood, so prefix with the provider:
#   "anthropic/claude-sonnet-4-20250514"
#   "openai/gpt-4o"
#   "openai/gpt-4o-mini"

MODEL = os.environ.get("DSPY_MODEL", "anthropic/claude-sonnet-4-20250514")

lm = dspy.LM(
    model=MODEL,
    # api_key is read from ANTHROPIC_API_KEY or OPENAI_API_KEY env vars automatically
    max_tokens=4096,
)

dspy.configure(lm=lm)

# -- Verify ---------------------------------------------------------------

if __name__ == "__main__":
    print(f"Configured DSPy with model: {MODEL}")
    # Quick smoke test
    qa = dspy.Predict("question -> answer")
    result = qa(question="What is DSPy?")
    print("Test answer:", result.answer)
