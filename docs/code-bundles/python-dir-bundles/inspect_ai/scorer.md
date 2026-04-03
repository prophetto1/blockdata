# Python Bundle: `scorer`

- Source root: `E:\writing-system\_agchain\_reference\inspect_ai\src\inspect_ai`
- Python files: `25`

## Files

- `scorer/__init__.py`
- `scorer/_answer.py`
- `scorer/_choice.py`
- `scorer/_classification.py`
- `scorer/_common.py`
- `scorer/_match.py`
- `scorer/_math.py`
- `scorer/_metric.py`
- `scorer/_metrics/__init__.py`
- `scorer/_metrics/accuracy.py`
- `scorer/_metrics/grouped.py`
- `scorer/_metrics/mean.py`
- `scorer/_metrics/std.py`
- `scorer/_model.py`
- `scorer/_multi.py`
- `scorer/_pattern.py`
- `scorer/_reducer/__init__.py`
- `scorer/_reducer/reducer.py`
- `scorer/_reducer/registry.py`
- `scorer/_reducer/types.py`
- `scorer/_score.py`
- `scorer/_scorer.py`
- `scorer/_scorers.py`
- `scorer/_target.py`
- `scorer/_unicode.py`

## `scorer/__init__.py`

```python
from inspect_ai._util.deprecation import relocated_module_attribute

from ._answer import AnswerPattern, answer
from ._choice import choice
from ._classification import exact, f1
from ._match import includes, match
from ._math import math
from ._metric import (
    CORRECT,
    INCORRECT,
    NOANSWER,
    PARTIAL,
    UNCHANGED,
    Metric,
    MetricProtocol,
    SampleScore,
    Score,
    ScoreEdit,
    Value,
    ValueToFloat,
    metric,
    value_to_float,
)
from ._metrics.accuracy import accuracy
from ._metrics.grouped import grouped
from ._metrics.mean import mean
from ._metrics.std import bootstrap_stderr, std, stderr, var
from ._model import model_graded_fact, model_graded_qa
from ._multi import multi_scorer
from ._pattern import pattern
from ._reducer import (
    ScoreReducer,
    ScoreReducers,
    at_least,
    max_score,
    mean_score,
    median_score,
    mode_score,
    pass_at,
    score_reducer,
)
from ._score import score
from ._scorer import Scorer, scorer
from ._target import Target

__all__ = [
    "includes",
    "match",
    "math",
    "model_graded_qa",
    "model_graded_fact",
    "answer",
    "choice",
    "pattern",
    "f1",
    "exact",
    "AnswerPattern",
    "Scorer",
    "Target",
    "scorer",
    "accuracy",
    "bootstrap_stderr",
    "std",
    "stderr",
    "mean",
    "grouped",
    "var",
    "Metric",
    "MetricProtocol",
    "metric",
    "Score",
    "SampleScore",
    "score",
    "Value",
    "ValueToFloat",
    "value_to_float",
    "CORRECT",
    "INCORRECT",
    "PARTIAL",
    "NOANSWER",
    "UNCHANGED",
    "ScoreEdit",
    "multi_scorer",
    "ScoreReducer",
    "ScoreReducers",
    "score_reducer",
    "mode_score",
    "mean_score",
    "median_score",
    "max_score",
    "at_least",
    "pass_at",
]
_BOOTSTRAP_RENAME_VERSION = "0.3.58"
_PROVENANCE_DATA_VERSION = "0.3.154"
_REMOVED_IN = "0.4"

relocated_module_attribute(
    "bootstrap_std",
    "inspect_ai.scorer.bootstrap_stderr",
    _BOOTSTRAP_RENAME_VERSION,
    _REMOVED_IN,
)
relocated_module_attribute(
    "ProvenanceData",
    "inspect_ai.log.ProvenanceData",
    _PROVENANCE_DATA_VERSION,
    _REMOVED_IN,
)
```

## `scorer/_answer.py`

```python
from enum import Enum
from typing import Literal

from inspect_ai._util.pattern import (
    ANSWER_PATTERN_LETTER,
    ANSWER_PATTERN_LINE,
    ANSWER_PATTERN_WORD,
)

from ._metrics import accuracy, stderr
from ._pattern import pattern as make_pattern
from ._scorer import Scorer, scorer


class AnswerPattern(str, Enum):
    """Regular expressions for extracting answers from output.

    These expressions act on output prefixed with "ANSWER: ".
    """

    LETTER = ANSWER_PATTERN_LETTER
    """Extracts a single letter (used with multiple choice)."""

    WORD = ANSWER_PATTERN_WORD
    """Extracts one or more word characters (used for yes/no output)."""

    LINE = ANSWER_PATTERN_LINE
    """Extracts the rest of the line after ANSWER: (used for more complex output).

    Note that when using a LINE pattern your prompt should instruct the
    model to answer with a separate line at the end.
    """


@scorer(metrics=[accuracy(), stderr()])
def answer(pattern: Literal["letter", "word", "line"]) -> Scorer:
    """Scorer for model output that preceded answers with ANSWER:.

    Some solvers including multiple_choice solicit answers from
    the model prefaced with "ANSWER:". This scorer extracts
    answers of this form for comparison with the target.

    Note that you must specify a `type` for the answer scorer.

    Args:
      pattern: Type of answer
        to extract. "letter" is used with multiple choice and
        extracts a single letter; "word" will extract the next
        word (often used for yes/no answers); "line" will take
        the rest of the line (used for more more complex answers
        that may have embedded spaces). Note that when using
        "line" your prompt should instruct the model to answer
        with a separate line at the end.

    """
    match pattern:
        case "letter":
            return make_pattern(AnswerPattern.LETTER)
        case "word":
            return make_pattern(AnswerPattern.WORD)
        case "line":
            return make_pattern(AnswerPattern.LINE)
```

## `scorer/_choice.py`

```python
from inspect_ai._util.answer import answer_character, answer_index
from inspect_ai.solver._multiple_choice import (
    answer_options,
    unshuffle_choices,
)
from inspect_ai.solver._task_state import Choices, TaskState

from ._metric import CORRECT, INCORRECT, Score
from ._metrics import accuracy, stderr
from ._scorer import Scorer, scorer
from ._target import Target


def _choices_are_shuffled(choices: Choices) -> bool:
    return any(i != choice.original_position for i, choice in enumerate(choices))


def _score_target(target: Target, choices: Choices) -> tuple[list[int], list[str]]:
    target_positions = [
        answer_index(target_character) for target_character in target.text
    ]

    choice_positions = [i for i, choice in enumerate(choices) if choice.correct is True]

    answers = [answer_character(choice) for choice in choice_positions]

    return target_positions, answers


def _shuffled_explanation(choices: Choices) -> str:
    generated_answers = [
        answer_character(i)
        for i, choice in enumerate(choices)
        if choice.correct is True
    ]

    return f"Choices were shuffled before generating a response, the following was sent to the model:\n\n{answer_options(choices)}\nShuffled answer:\nANSWER: {', '.join(generated_answers)}"


@scorer(metrics=[accuracy(), stderr()])
def choice() -> Scorer:
    """
    Scorer for multiple choice answers, required by the `multiple_choice` solver.

    This assumes that the model was called using a template ordered with letters
    corresponding to the answers, so something like:

        What is the capital of France?

        A) Paris
        B) Berlin
        C) London

    The target for the dataset will then have a letter corresponding to the
    correct answer, e.g. the `Target` would be `"A"` for the above question. If
    multiple choices are correct, the `Target` can be an array of these letters.
    """

    async def score(state: TaskState, target: Target) -> Score:
        choices = state.choices

        if _choices_are_shuffled(choices):
            explanation = _shuffled_explanation(choices)
            # Unshuffle the choices so that we can score them correctly against
            # the target
            choices = unshuffle_choices(choices)
        else:
            explanation = state.output.completion

        target_positions, answers = _score_target(target, choices)

        generated_selected_choices = [
            i for i, choice in enumerate(choices) if choice.correct is True
        ]

        target_matches_choices = generated_selected_choices == sorted(target_positions)

        return Score(
            value=CORRECT if target_matches_choices else INCORRECT,
            answer=", ".join(answers),
            explanation=explanation,
        )

    return score
```

## `scorer/_classification.py`

```python
import re
import string
from typing import Callable, List

from inspect_ai.solver._task_state import TaskState

from ._metric import CORRECT, INCORRECT, Score
from ._metrics import mean, stderr
from ._scorer import Scorer, scorer
from ._target import Target


@scorer(metrics=[mean(), stderr()])
def f1(
    answer_fn: Callable[[str], str] | None = None, stop_words: list[str] | None = None
) -> Scorer:
    """Scorer which produces an F1 score

    Computes the `F1` score for the answer (which balances recall precision by taking the harmonic mean between recall and precision).

    Args:
       answer_fn: Custom function to extract the answer from the completion (defaults to using the completion).
       stop_words: Stop words to include in answer tokenization.
    """

    async def score(state: TaskState, target: Target) -> Score:
        # Get generated answer and extract relevant answer text
        answer = (
            answer_fn(state.output.completion) if answer_fn else state.output.completion
        )
        targets = target.target

        f1_score = max_f1_score(answer, targets, stop_words=stop_words)
        return Score(
            value=f1_score,
            answer=answer,
        )

    return score


@scorer(metrics=[mean(), stderr()])
def exact() -> Scorer:
    """Scorer which produces an exact match score

    Normalizes the text of the answer and target(s) and performs an exact matching comparison of the text. This scorer will return `CORRECT` when the answer is an exact match to one or more targets.
    """

    async def score(state: TaskState, target: Target) -> Score:
        # Get generated answer and extract relevant answer text
        answer = state.output.completion
        targets = target.target

        exact_score = max_exact_score(answer, targets)
        return Score(value=CORRECT if exact_score == 1.0 else INCORRECT, answer=answer)

    return score


def max_f1_score(
    answer: str, targets: List[str], stop_words: list[str] | None = None
) -> float:
    # Find the maximum F1 score for this answer
    max_f1 = 0.0
    for target in targets:
        if target[0].strip():
            f1_score = compute_f1(answer, target, stop_words)
            max_f1 = max(max_f1, f1_score)
    return round(max_f1, 2)


def max_exact_score(answer: str, targets: List[str]) -> float:
    # Find the maximum exact score for this answer
    max_exact = 0.0
    answer_words = _to_words(answer)
    for target in targets:
        if target[0].strip():
            target_words = _to_words(target)
            exact_score = 1.0 if target_words == answer_words else 0.0
            max_exact = max(max_exact, exact_score)
    return max_exact


def compute_f1(answer: str, target: str, stop_words: list[str] | None = None) -> float:
    """Takes a predicted answer and a gold answer (that are both either a string or a list of strings), and returns exact match and the SQuAD F1 metric for the prediction."""
    answer_words = _to_words(answer, stop_words)
    target_words = _to_words(target, stop_words)

    return _f1(answer_words=answer_words, target_words=target_words)


def _to_words(answer: str, stop_words: list[str] | None = None) -> set[str]:
    normalized = _normalize(answer, stop_words)
    token_bag = set(normalized.split())
    return token_bag


def _f1(answer_words: set[str], target_words: set[str]) -> float:
    intersection = len(answer_words.intersection(target_words))
    if not answer_words:
        precision = 1.0
    else:
        precision = intersection / float(len(answer_words))
    if not target_words:
        recall = 1.0
    else:
        recall = intersection / float(len(target_words))
    f1 = (
        (2 * precision * recall) / (precision + recall)
        if not (precision == 0.0 and recall == 0.0)
        else 0.0
    )
    return f1


def _is_number(text: str) -> bool:
    try:
        float(text)
        return True
    except ValueError:
        return False


def _remove_articles(text: str) -> str:
    _ARTICLES = re.compile(r"\b(a|an|the)\b", re.UNICODE)
    return _ARTICLES.sub(" ", text)


def _remove_punc(text: str) -> str:
    exclude = set(string.punctuation)
    is_number = _is_number(text)
    if not is_number:
        return "".join(ch for ch in text if ch not in exclude)
    else:
        return text


def _normalize_whitespace(text: str) -> str:
    return " ".join(text.split())


def _normalize_number(text: str) -> str:
    is_number = _is_number(text)
    if is_number:
        return str(float(text))
    else:
        return text


def _tokenize(text: str) -> List[str]:
    return re.split(" |-", text)


def _normalize(text: str, stop_words: list[str] | None = None) -> str:
    """Normalize text to remove extraneous characters and words."""
    tokens = []
    tokenized_answer = _tokenize(text)

    # Process stop words, if present
    if stop_words is not None:
        folded_stop_words = [_normalize_token(word) for word in stop_words]
    else:
        folded_stop_words = []

    # Now process the text
    for token in tokenized_answer:
        token = _normalize_token(token)
        if folded_stop_words is None or token not in folded_stop_words:
            tokens.append(token)

    # re-join the tokens into a normalized string
    tokens = [token for token in tokens if token.strip()]
    normalized = " ".join(tokens).strip()
    return normalized


def _normalize_token(token: str) -> str:
    token = _remove_punc(token.casefold())
    token = _normalize_number(token)
    token = _remove_articles(token)
    token = _normalize_whitespace(token)
    return token
```

## `scorer/_common.py`

```python
import re
from typing import Callable, Literal

from inspect_ai._util.text import (
    str_to_float,
    strip_numeric_punctuation,
    strip_punctuation,
)
from inspect_ai.scorer._unicode import unicode_number_to_float
from inspect_ai.solver._task_state import TaskState

from ._metric import CORRECT, INCORRECT, Score
from ._scorer import Scorer
from ._target import Target


def str_match_scorer(match: Callable[[str, str], tuple[str, bool]]) -> Scorer:
    """Scorer that uses a matching function.

    The matching function returns tuple[str,bool], where str is the answer
    extracted from the model output and bool is whether it matched the target
    """

    async def score(state: TaskState, target: Target) -> Score:
        answer: str | None = None
        for value in target:
            answer, matched = match(state.output.completion, value)
            if matched:
                return Score(
                    value=CORRECT, answer=answer, explanation=state.output.completion
                )

        return Score(
            value=INCORRECT, answer=answer, explanation=state.output.completion
        )

    return score


def match_str(
    value: str,
    target: str,
    location: Literal["begin", "end", "any", "exact"] = "end",
    ignore_case: bool = True,
    ignore_punctuation: bool = True,
    numeric: bool = False,
) -> tuple[str, bool]:
    # strip ws
    v = value.strip()
    t = target.strip()

    # baseline answer (will only change for numeric)
    answer = v

    # further cleanup
    if ignore_case:
        v = v.casefold()
        t = t.casefold()
    if numeric and t.isnumeric():
        # remove punctuation
        v = strip_numeric_punctuation(v)
        t = strip_numeric_punctuation(t)
        # normalize as required
        t = normalize_number(t)
        if location == "begin":
            words = re.split(r"\s+", v)
            v = first_number_normalized(words)
        elif location == "end":
            words = re.split(r"\s+", v)
            words.reverse()
            v = first_number_normalized(words)
        elif location == "exact":
            v = normalize_number(v)
        answer = v
    elif ignore_punctuation:
        v = strip_punctuation(v)
        t = strip_punctuation(t)

    # comparisons
    if location == "begin":
        return answer, v.startswith(t)
    elif location == "end":
        return answer, v.endswith(t)
    elif location == "exact":
        return answer, v == t
    else:
        return answer, t in v


def first_number_normalized(words: list[str]) -> str:
    number = next(
        (word for word in words if word.replace(".", "").isnumeric()), words[0]
    )
    return normalize_number(number)


def normalize_number(number: str, precision: int = 5) -> str:
    if number.replace(".", "").isnumeric():
        # first try parsing with our tried and true parser, if that fails
        # then there were unicode characters that are still .isnumeric()
        # for that case, parse with our new unicode parser
        try:
            num = str_to_float(number)
        except ValueError:
            num = unicode_number_to_float(number)
        return format(num, f".{precision}g")
    else:
        return number
```

## `scorer/_match.py`

```python
from typing import Literal

from ._common import match_str, str_match_scorer
from ._metrics import accuracy, stderr
from ._scorer import Scorer, scorer


@scorer(metrics=[accuracy(), stderr()])
def match(
    location: Literal["begin", "end", "any", "exact"] = "end",
    *,
    ignore_case: bool = True,
    numeric: bool = False,
) -> Scorer:
    """Scorer which matches text or a number.

    Args:
       location: Location to match at. "any" matches anywhere in the
          output; "exact" requires the output be exactly
          equal to the target (module whitespace, etc.)
       ignore_case: Do case insensitive comparison.
       numeric: Is this a numeric match? (in this
          case different punctuation removal rules are
          used and numbers are normalized before comparison).
    """

    def check(value: str, target: str) -> tuple[str, bool]:
        return match_str(
            value=value,
            target=target,
            location=location,
            ignore_case=ignore_case,
            numeric=numeric,
        )

    return str_match_scorer(check)


@scorer(metrics=[accuracy(), stderr()])
def includes(ignore_case: bool = True) -> Scorer:
    """Check whether the specified text is included in the model output.

    Args:
       ignore_case: Use a case insensitive comparison.

    """

    def check(value: str, target: str) -> tuple[str, bool]:
        if ignore_case:
            value = value.casefold()
            target = target.casefold()
        return value, target in value

    return str_match_scorer(check)
```

## `scorer/_math.py`

```python
"""Mathematical expression scorer using Math-Verify library."""

from typing import TYPE_CHECKING, Any

import regex

from inspect_ai._util.error import pip_dependency_error
from inspect_ai.solver._task_state import TaskState

from ._metric import CORRECT, INCORRECT, Score
from ._metrics import accuracy, stderr
from ._scorer import Scorer, scorer
from ._target import Target

if TYPE_CHECKING:
    pass


# ============================================================================
# STAGE 1: PREPROCESSING
# ============================================================================


def replace_unicode(text: str) -> str:
    """Replace unicode mathematical characters with LaTeX equivalents.

    Args:
        text: Raw text that may contain unicode math characters.

    Returns:
        Text with unicode characters replaced by LaTeX commands.
    """
    # Remove non-printable control characters (ASCII 0-31 except whitespace, and DEL)
    # This removes characters like backspace (\x08) that can corrupt pattern matching
    # Keep: \t (tab), \n (newline), \r (carriage return)
    text = regex.sub(r"[\x00-\x08\x0b-\x0c\x0e-\x1f\x7f]", "", text)

    # Replace unicode box-drawing characters with \boxed{}
    text = text.replace("\u23a7", r"\boxed{")
    text = text.replace("\u23ab", r"}")
    text = text.replace("\n\u2502", r"\boxed{")
    text = text.replace("\u2502", r"}")
    text = text.replace("\n\u2503", r"\boxed{")
    text = text.replace("\u2503", r"}")
    text = text.replace("\n\uf8f0", r"\boxed{")
    text = text.replace("\uf8fb", r"}")

    # Replace mathematical unicode characters
    text = text.replace("\u221a", r"\sqrt")  # Square root symbol
    text = text.replace("\u00d7", r"\cdot")  # Multiplication sign
    text = text.replace("\u202f", r" ")  # Narrow no-break space
    text = text.replace("\u2212", "-")  # Minus sign
    text = text.replace("\u03c0", r"\pi")  # Pi symbol

    return text


# ============================================================================
# STAGE 2: EXTRACTION
# ============================================================================

# Regex patterns for extracting mathematical answers from text
# Pattern: (\\boxed|\\fbox)\s*\{((?:[^{}]|\{(?2)\})*)\}
# Explanation: Matches \boxed{...} or \fbox{...} with support for nested braces
#   - (\\boxed|\\fbox)  : Match either \boxed or \fbox command
#   - \s*               : Optional whitespace (including unicode spaces)
#   - \{                : Opening brace (escaped)
#   - (?:               : Non-capturing group for content
#     [^{}]             : Match any character except braces
#     |                 : OR
#     \{(?2)\}          : Recursively match nested braces ((?2) refers to group 2)
#   )*                  : Repeat zero or more times
#   - \}                : Closing brace (escaped)
_BOXED_CONTENT_PATTERN = r"(\\boxed|\\fbox)\s*\{((?:[^{}]|\{(?2)\})*)\}"

# Pattern: (boxed|fbox|oxed)\s*\{((?:[^{}]|\{(?2)\})*)\}
# Same as above but without backslash (for already-processed text)
# Note: \s* allows for spaces like "boxed {77}" or unicode spaces
# Note: Also matches "oxed" to handle cases where \b was interpreted as backspace
_BOXED_CONTENT_NO_BACKSLASH = r"(boxed|fbox|oxed)\s*\{((?:[^{}]|\{(?2)\})*)\}"

# Pattern: \b\d+\b
# Explanation: Match whole integers with word boundaries
#   - \b    : Word boundary (ensures we match complete numbers)
#   - \d+   : One or more digits
#   - \b    : Word boundary
_INTEGER_PATTERN = r"\b\d+\b"


def remove_inner_boxed(match: str) -> str:
    r"""Remove nested boxed expressions, keeping only outermost content.

    Args:
        match: Text containing potentially nested \boxed{} or \fbox{}.

    Returns:
        Content with inner boxed expressions removed.

    Examples:
        >>> remove_inner_boxed(r"\boxed{\frac{1}{2}}")
        "\\frac{1}{2}"
        >>> remove_inner_boxed(r"\boxed{\boxed{42}}")
        "42"
    """
    matches = list(regex.finditer(_BOXED_CONTENT_PATTERN, match))
    if not matches:
        return match
    for m in matches:
        match = match.replace(m.group(0), m.group(2))
    return match


def find_last_boxed_content(text: str) -> str | None:
    r"""Extract content from the last \boxed{} or \fbox{} in text.

    Args:
        text: Text potentially containing boxed expressions.

    Returns:
        Content of the last boxed expression, or None if not found.

    Examples:
        >>> find_last_boxed_content(r"The answer is \boxed{42}")
        "42"
        >>> find_last_boxed_content(r"\boxed{10} and \boxed{42}")
        "42"
        >>> find_last_boxed_content("No boxed content here")
        None
    """
    matches = list(regex.finditer(_BOXED_CONTENT_NO_BACKSLASH, text))

    if not matches:
        return None

    last_match = remove_inner_boxed(matches[-1].group(2))
    return last_match


def extract_last_integer(text: str) -> int | None:
    """Fallback: extract the last integer found in text.

    Args:
        text: Text to search for integers.

    Returns:
        The last integer found, or None if no integers exist.

    Examples:
        >>> extract_last_integer("The answer is 42")
        42
        >>> extract_last_integer("Results: 10, 20, 30")
        30
        >>> extract_last_integer("No numbers here")
        None
    """
    matches = list(regex.finditer(_INTEGER_PATTERN, text))
    if not matches:
        return None
    try:
        return int(matches[-1].group())
    except Exception as e:
        print(f"Error extracting last integer: {e}")
        return None


# ============================================================================
# STAGE 3: NORMALIZATION
# ============================================================================

# Regex patterns for normalizing LaTeX strings

# Pattern: \\{2,}\n?\(
# Explanation: Match multiple backslashes followed by optional newline and opening paren
#   - \\{2,}  : Two or more backslashes
#   - \n?     : Optional newline character
#   - \(      : Opening parenthesis
_LEADING_BACKSLASHES_PAREN = r"\\{2,}\n?\("

# Pattern: \\begin{align[^}]*}(.*?)\\end{align[^}]*}
# Explanation: Match align environment and capture its content
#   - \\begin{align[^}]*}  : Match \begin{align} or \begin{align*}
#   - (.*?)                : Capture content (non-greedy)
#   - \\end{align[^}]*}    : Match corresponding \end{align} or \end{align*}
_ALIGN_ENVIRONMENT = r"\\begin{align[^}]*}(.*?)\\end{align[^}]*}"

# Pattern: (?<=\d),(?=\d)
# Explanation: Match comma between digits (for removing thousands separators)
#   - (?<=\d)  : Positive lookbehind - preceded by a digit
#   - ,        : The comma to remove
#   - (?=\d)   : Positive lookahead - followed by a digit
#   Example: "1,234" → "1234"
_COMMA_BETWEEN_DIGITS = r"(?<=\d),(?=\d)"

# Pattern: \\sqrt\s*([^\s{}]*)
# Explanation: Match \sqrt followed by space and capture non-braced content
#   - \\sqrt   : The \sqrt command
#   - \s*      : Optional whitespace
#   - ([^\s{}]*) : Capture any non-whitespace, non-brace characters
#   Example: "\sqrt 2" → "\sqrt{2}"
_SQRT_WITHOUT_BRACES = r"\\sqrt\s*([^\s{}]*)"

# Pattern: \\text\{.*?\}
# Explanation: Match \text{...} environments and remove them
#   - \\text   : The \text command
#   - \{       : Opening brace
#   - .*?      : Any content (non-greedy)
#   - \}       : Closing brace
_TEXT_ENVIRONMENT = r"\\text\{.*?\}"

# Pattern: \\mathrm\{(.*?)\}
# Explanation: Match \mathrm{...} and capture content to unwrap it
#   - \\mathrm : The \mathrm command
#   - \{       : Opening brace
#   - (.*?)    : Capture content (non-greedy)
#   - \}       : Closing brace
_MATHRM_ENVIRONMENT = r"\\mathrm\{(.*?)\}"


def strip(s: str) -> str:
    r"""Strip whitespace and LaTeX newlines from string edges.

    Args:
        s: String to strip.

    Returns:
        Stripped string.

    Examples:
        >>> strip("  42  ")
        "42"
        >>> strip(r"\n42\n")
        "42"
        >>> strip(r"\\ 42")
        "42"
    """
    s = s.strip()
    # Remove LaTeX newlines from edges (careful: plain .strip() would remove "\" in "\begin")
    while s.startswith(r"\n"):
        s = s[2:]
    while s.endswith(r"\n"):
        s = s[:-2]
    # Remove LaTeX spacing from start
    while s.startswith("\\ "):
        s = s[2:]
    # Remove multiple backslashes followed by opening paren (e.g., "\\\\(x)")
    while regex.match(_LEADING_BACKSLASHES_PAREN, s):
        s = s[3:]
    return s


def normalize_string(s: str) -> str:
    r"""Normalize a LaTeX string for parsing.

    Removes sizing commands, alignment environments, converts brackets,
    and performs various LaTeX-to-parseable transformations.

    Args:
        s: The LaTeX string to normalize.

    Returns:
        The normalized string.

    Examples:
        >>> normalize_string(r"$\left[\frac{1}{2}\right]$")
        r"(\frac{1}{2})"
        >>> normalize_string("x = 42")
        "42"
        >>> normalize_string(r"\text{answer: }42")
        "42"
    """
    # Remove LaTeX sizing commands that don't affect mathematical meaning
    s = s.replace(r"\left", "").replace(r"\right", "")
    s = s.replace(r"\Bigl", "").replace(r"\Bigr", "")
    s = s.replace(r"\bigl", "").replace(r"\bigr", "")
    s = (
        s.replace(r"\Big", "")
        .replace(r"\big", "")
        .replace(r"\Large", "")
        .replace(r"\large", "")
    )

    # Remove align environments and their alignment markers (&) and line breaks (\\)
    s = regex.sub(
        _ALIGN_ENVIRONMENT,
        lambda m: m.group(1).replace("&", "").replace("\\\\", ""),
        s,
        flags=regex.DOTALL,
    )

    # Convert all bracket types to parentheses for uniform parsing
    s = s.replace("[", "(")
    s = s.replace("]", ")")
    s = s.replace("\\{", "(")  # LaTeX sets become lists
    s = s.replace("\\}", ")")

    # Remove mathematical delimiters and spacing commands
    s = s.replace("$", "")  # Remove inline math delimiters
    s = s.replace("\\ ", " ")  # LaTeX space to regular space
    s = s.replace(r"\hline", "")  # Remove table lines
    s = s.replace(r"\vline", "")
    s = s.replace(r"\quad", " ")  # Quad space to regular space

    # Normalize unicode characters to ASCII equivalents
    s = s.replace("−", "-")  # Unicode minus
    s = s.replace("–", "-")  # En dash
    s = s.replace("·", " \\cdot ")  # Middle dot to cdot

    # Remove degree symbols
    s = s.replace("^\\circ", " ")
    s = s.replace("^{\\circ}", " ")

    # Remove display style command
    s = s.replace("\\displaystyle", "")

    # Convert escaped parentheses to regular ones
    s = s.replace("\\(", "(")
    s = s.replace("\\)", ")")
    s = s.replace("{,}", "")  # Remove empty comma groups (o4-mini quirk)

    # Remove trailing period if present
    if s.endswith("."):
        s = s[:-1]

    # Remove thousands separators (1,234 → 1234)
    s = regex.sub(_COMMA_BETWEEN_DIGITS, "", s)
    s = s.replace("{,}", "")

    # Fix \sqrt without braces: "\sqrt 2" → "\sqrt{2}"
    if "\\sqrt " in s:
        s = regex.sub(_SQRT_WITHOUT_BRACES, r"\\sqrt{\1}", s)

    # Remove text annotations: "\text{answer: }42" → "42"
    s = regex.sub(_TEXT_ENVIRONMENT, "", s)

    # Unwrap \mathrm{...} to plain text
    s = regex.sub(_MATHRM_ENVIRONMENT, r" \1 ", s)

    # Dataset-specific: Replace Fibonacci F_30 with its value
    s = s.replace("F_{30}", "832040")

    # Extract value after equals sign (keep only the answer part)
    if "=" in s:
        s = s.split("=")[-1]

    # Handle approximate values: keep only the left side
    if "\\approx" in s:
        s = s.split("\\approx")[0]
        if s.endswith("("):  # Remove dangling opening paren
            s = s[:-1]

    return strip(s)


def remove_outer_brackets(s: str) -> str:
    """Remove matching outer parentheses if they wrap the entire expression.

    Args:
        s: String potentially wrapped in parentheses.

    Returns:
        String with outer parentheses removed if they matched.

    Examples:
        >>> remove_outer_brackets("(42)")
        "42"
        >>> remove_outer_brackets("((1+2))")
        "1+2"
        >>> remove_outer_brackets("(1)+(2)")
        "(1)+(2)"
    """
    while True:
        if not s:
            return s
        opening = s[0]
        closing = s[-1]

        if opening == "(" and closing == ")":
            count = 0
            matched = True
            for i, char in enumerate(s):
                if char == opening:
                    count += 1
                elif char == closing:
                    count -= 1
                if count == 0 and i != len(s) - 1:
                    matched = False
                    break

            if matched:
                s = s[1:-1]
                continue
        break

    return s


def remove_invalid_characters(text: str) -> str:
    r"""Remove LaTeX spacing commands that interfere with parsing.

    Args:
        text: Text containing LaTeX spacing commands.

    Returns:
        Text with spacing commands removed.

    Examples:
        >>> remove_invalid_characters(r"1\,234")
        "1234"
        >>> remove_invalid_characters(r"x\;=\;42")
        "x=42"
    """
    # Remove LaTeX spacing commands:
    # \; - thick space (5/18 em)
    # \: - medium space (4/18 em)
    # \, - thin space (3/18 em)
    # \! - negative thin space (-3/18 em)
    text = regex.sub(r"\\;", "", text)
    text = regex.sub(r"\\:", "", text)
    text = regex.sub(r"\\,", "", text)
    text = regex.sub(r"\\!", "", text)
    return text


# ============================================================================
# STAGE 4: PARSING
# ============================================================================

# Regex patterns for converting LaTeX mathematical expressions to Python syntax
# These patterns are applied iteratively to handle nested expressions

# Pattern: sqrt(\d+)
# Explanation: Match sqrt followed by digits without braces
#   - sqrt     : Literal "sqrt"
#   - (\d+)    : Capture one or more digits
#   Example: "sqrt2" → "sqrt{2}"
_SQRT_MISSING_BRACES = r"sqrt(\d+)"

# Pattern: frac(\d)
# Explanation: Match frac followed by single digit without braces
#   - frac     : Literal "frac"
#   - (\d)     : Capture single digit
#   Example: "frac1" → "frac{1}"
_FRAC_MISSING_BRACES = r"frac(\d)"

# Pattern: (\d+(\.\d+)?)\s*%
# Explanation: Match number followed by percent sign
#   - (\d+(\.\d+)?)  : Capture integer or decimal number
#   - \s*            : Optional whitespace
#   - %              : Percent sign
#   Example: "33.5%" → "(33.5/100)"
_PERCENTAGE = r"(\d+(\.\d+)?)\s*%"

# Pattern: \\*(?:dfrac|tfrac|frac)\{([^{}]*)\}\{([^{}]*)\}
# Explanation: Match LaTeX fraction commands
#   - \\*                : Optional backslash(es)
#   - (?:dfrac|tfrac|frac) : Match any fraction command
#   - \{([^{}]*)\}       : First braced group (numerator)
#   - \{([^{}]*)\}       : Second braced group (denominator)
#   Example: "\frac{1}{2}" → "(1)/(2)"
_LATEX_FRACTION = r"\\*(?:dfrac|tfrac|frac)\{([^{}]*)\}\{([^{}]*)\}"

# Pattern: \\*binom\{([^{}]*)\}\{([^{}]*)\}
# Explanation: Match LaTeX binomial coefficient
#   - \\*binom         : Binomial command
#   - \{([^{}]*)\}     : First argument (n)
#   - \{([^{}]*)\}     : Second argument (k)
#   Example: "\binom{5}{2}" → "binomial(5, 2)"
_LATEX_BINOM = r"\\*binom\{([^{}]*)\}\{([^{}]*)\}"

# Pattern: \\*sqrt\[(.*?)\]\{(.*?)\}
# Explanation: Match n-th root notation
#   - \\*sqrt          : Square root command
#   - \[(.*?)\]        : Optional bracket for root degree (n)
#   - \{(.*?)\}        : Braced content (radicand)
#   Example: "\sqrt[3]{8}" → "(8)**(1/(3))"
_LATEX_NTH_ROOT = r"\\*sqrt\[(.*?)\]\{(.*?)\}"

# Pattern: \\*sqrt\{(.*?)\}
# Explanation: Match square root
#   - \\*sqrt          : Square root command
#   - \{(.*?)\}        : Braced content
#   Example: "\sqrt{2}" → "(2)**(1/2)"
_LATEX_SQRT = r"\\*sqrt\{(.*?)\}"

# Pattern: \{(\d+)\}
# Explanation: Match braced digits to convert to parens
#   - \{       : Opening brace
#   - (\d+)    : One or more digits
#   - \}       : Closing brace
#   Example: "{42}" → "(42)"
_BRACED_DIGITS = r"\{(\d+)\}"

# Pattern: \bi\b
# Explanation: Match standalone 'i' (imaginary unit) with word boundaries
#   - \b       : Word boundary
#   - i        : The letter 'i'
#   - \b       : Word boundary
#   Example: "2 + 3i" → "2 + 3I" (for SymPy's imaginary unit)
_IMAGINARY_I = r"\bi\b"

# Patterns for implicit multiplication handling
# Pattern: (\d|(?<![a-zA-Z])[a-zA-Z]{1,2}(?![a-zA-Z]))\(
# Explanation: Number or variable followed by opening paren
#   - (\d|...)         : Digit OR...
#   - (?<![a-zA-Z])    : Not preceded by letter (negative lookbehind)
#   - [a-zA-Z]{1,2}    : One or two letters
#   - (?![a-zA-Z])     : Not followed by letter (negative lookahead)
#   - \(               : Opening paren
#   Example: "2(x+1)" → "2*(x+1)", "x(2)" → "x*(2)"
_IMPLICIT_MULT_BEFORE_PAREN = r"(\d|(?<![a-zA-Z])[a-zA-Z]{1,2}(?![a-zA-Z]))\("

# Pattern: \)(\d|(?<![a-zA-Z])[a-zA-Z]{1,2}(?![a-zA-Z]))
# Explanation: Closing paren followed by number or variable
#   Example: "(x+1)2" → "(x+1)*2"
_IMPLICIT_MULT_AFTER_PAREN = r"\)(\d|(?<![a-zA-Z])[a-zA-Z]{1,2}(?![a-zA-Z]))"

# Pattern: (?<=\d)((?<![a-zA-Z])[a-zA-Z]{1,2}(?![a-zA-Z]))
# Explanation: Variable after digit
#   Example: "2x" → "2*x", "3pi" → "3*pi"
_IMPLICIT_MULT_DIGIT_VAR = r"(?<=\d)((?<![a-zA-Z])[a-zA-Z]{1,2}(?![a-zA-Z]))"

# Pattern: ((?<![a-zA-Z])[a-zA-Z]{1,2}(?![a-zA-Z]))(?=\d)
# Explanation: Variable before digit
#   Example: "x2" → "x*2"
_IMPLICIT_MULT_VAR_DIGIT = r"((?<![a-zA-Z])[a-zA-Z]{1,2}(?![a-zA-Z]))(?=\d)"

# Pattern: \{([^{}]*)\}
# Explanation: Convert remaining braces to lists
#   - \{       : Opening brace
#   - ([^{}]*) : Capture content without nested braces
#   - \}       : Closing brace
#   Example: "{1, 2, 3}" → "[1, 2, 3]"
_BRACES_TO_LIST = r"\{([^{}]*)\}"


def _parse_integer(text: str) -> int | None:
    """Try to parse text as a simple integer.

    Args:
        text: Text to parse.

    Returns:
        Integer value if successful, None otherwise.
    """
    if text.isdigit():
        return int(text)
    return None


def _parse_float(text: str) -> int | float | None:
    """Try to parse text as a float (returns int if whole number).

    Args:
        text: Text to parse.

    Returns:
        Numeric value if successful, None otherwise.
    """
    try:
        float_text = float(text)
        if int(float_text) == float_text:
            return int(float_text)
        return float_text
    except ValueError:
        return None


def _preprocess_latex_for_sympify(text: str) -> str:
    """Apply iterative regex transformations to prepare LaTeX for sympify.

    Converts LaTeX commands (frac, sqrt, etc.) to Python-parseable format.

    Args:
        text: LaTeX text to preprocess.

    Returns:
        Preprocessed string ready for sympify.
    """
    # Fix missing braces and convert percentages
    if bool(regex.search(_SQRT_MISSING_BRACES, text)):
        text = regex.sub(_SQRT_MISSING_BRACES, r"sqrt{\1}", text)
    if bool(regex.search(_FRAC_MISSING_BRACES, text)):
        text = regex.sub(_FRAC_MISSING_BRACES, r"frac{\1}", text)
    if bool(regex.search(r"%", text)):
        text = regex.sub(_PERCENTAGE, r"(\1/100)", text)

    latex_str = text

    # First pass: convert LaTeX commands to Python operators
    # Run iteratively (max 5 times) to handle nested expressions
    for _ in range(5):
        init_str = latex_str

        # Convert fractions: \frac{1}{2} → (1)/(2)
        latex_str = regex.sub(_LATEX_FRACTION, r"(\1)/(\2)", latex_str)

        # Convert binomial coefficients: \binom{n}{k} → binomial(n, k)
        latex_str = regex.sub(_LATEX_BINOM, r"binomial(\1, \2)", latex_str)

        # Convert n-th roots: \sqrt[3]{8} → (8)**(1/(3))
        latex_str = regex.sub(_LATEX_NTH_ROOT, r"(\2)**(1/(\1))", latex_str)

        # Convert square roots: \sqrt{2} → (2)**(1/2)
        latex_str = regex.sub(_LATEX_SQRT, r"(\1)**(1/2)", latex_str)

        # Convert operators and constants
        latex_str = latex_str.replace("^", "**")  # Exponentiation
        latex_str = latex_str.replace("\\cdot", "*").replace("\\times", "*")
        latex_str = (
            latex_str.replace("\\pi", " pi ")  # Pi constant
            .replace("\\e", " E ")  # Euler's number
            .replace("\\i", " I ")  # Imaginary unit
        )
        latex_str = regex.sub(_IMAGINARY_I, "I", latex_str)  # Standalone 'i' → 'I'

        # Stop if no changes (convergence)
        if init_str == latex_str:
            break

    # Second pass: handle remaining braces and operators
    # This catches any nested expressions that emerged from the first pass
    for _ in range(5):
        init_str = latex_str

        # Convert braced digits to parens: {42} → (42)
        latex_str = regex.sub(_BRACED_DIGITS, r"(\1)", latex_str)

        # Repeat LaTeX command conversions for newly exposed nested content
        latex_str = regex.sub(_LATEX_FRACTION, r"(\1)/(\2)", latex_str)
        latex_str = regex.sub(_LATEX_BINOM, r"binomial(\1, \2)", latex_str)
        latex_str = regex.sub(_LATEX_NTH_ROOT, r"(\2)**(1/(\1))", latex_str)
        latex_str = regex.sub(_LATEX_SQRT, r"(\1)**(1/2)", latex_str)

        # Re-apply operator conversions
        latex_str = latex_str.replace("^", "**")
        latex_str = latex_str.replace("\\cdot", "*").replace("\\times", "*")
        latex_str = (
            latex_str.replace("\\pi", " pi ")
            .replace("\\e", " E ")
            .replace("\\i", " I ")
        )
        latex_str = regex.sub(_IMAGINARY_I, "I", latex_str)

        if init_str == latex_str:
            break

    # Add explicit multiplication where it's implicit in mathematical notation
    # Example: 2(x+1) → 2*(x+1), (x+1)2 → (x+1)*2, 2x → 2*x
    latex_str = regex.sub(_IMPLICIT_MULT_BEFORE_PAREN, r"\1*(", latex_str)
    latex_str = regex.sub(_IMPLICIT_MULT_AFTER_PAREN, r")*\1", latex_str)
    latex_str = regex.sub(_IMPLICIT_MULT_DIGIT_VAR, r"*\1", latex_str)
    latex_str = regex.sub(_IMPLICIT_MULT_VAR_DIGIT, r"\1*", latex_str)

    # Convert remaining braces to Python lists (for set notation)
    # Example: {1, 2, 3} → [1, 2, 3]
    latex_str = regex.sub(
        _BRACES_TO_LIST,
        lambda m: "[" + m.group(1).replace(",", ", ") + "]",
        latex_str,
    )

    return latex_str


# ============================================================================
# STAGE 5: COMPARISON
# ============================================================================

# Note: Functions _sympify_latex, latex2sympy_fixed, parse_primitives,
# check_answers, parse_answer, and extract_answer are defined within the
# math() scorer function below since they require the sympy optional dependency.


# ============================================================================
# PUBLIC API
# ============================================================================


@scorer(metrics=[accuracy(), stderr()])
def math() -> Scorer:
    """Create a mathematical expression scorer.

    Extracts answers from model output and compares them to target answers
    using mathematical equivalence checking.

    Returns:
        Scorer function for evaluating mathematical answers.
    """
    try:
        import sympy  # type: ignore
        from sympy import N  # type: ignore
        from sympy.parsing.latex import parse_latex  # type: ignore
        from sympy.parsing.sympy_parser import (  # type: ignore
            implicit_application,  # type: ignore
            implicit_multiplication_application,  # type: ignore
            parse_expr,  # type: ignore
            standard_transformations,  # type: ignore
        )
    except ImportError:
        raise pip_dependency_error("math() scorer", ["sympy"]) from None

    def _sympify_latex(latex_str: str) -> Any:
        """Convert preprocessed LaTeX string to SymPy expression.

        Args:
            latex_str: Preprocessed LaTeX string.

        Returns:
            SymPy expression or None if conversion fails.
        """
        try:
            if latex_str == "None":
                return sympy.core.symbol.Symbol("None")
            else:
                transformations = standard_transformations + (
                    implicit_multiplication_application,
                    implicit_application,
                )
                latex_str = parse_expr(latex_str, transformations=transformations)
                return sympy.sympify(
                    latex_str,
                    locals={  # type: ignore[arg-type]
                        "binomial": sympy.binomial,
                        "pi": sympy.pi,
                        "E": sympy.E,
                        "e": sympy.E,
                        "I": sympy.I,
                    },
                )
        except Exception as e:
            print(f"Couldn't parse {latex_str} with sympify: {e}")
            return None

    def latex2sympy_fixed(latex: str) -> Any:
        """Fallback parser using SymPy's native LaTeX parser.

        Args:
            latex: LaTeX string to parse.

        Returns:
            SymPy expression with constants replaced.
        """
        # Fix subscripts: _123 → _{123}
        # Pattern: _([0-9]+)
        # Explanation: Match underscore followed by digits without braces
        #   - _         : Underscore (subscript in LaTeX)
        #   - ([0-9]+)  : One or more digits
        #   Example: "x_123" → "x_{123}"
        latex = regex.sub(r"_([0-9]+)", r"_{\1}", latex)
        latex_parsed = parse_latex(latex)
        # replace constants like pi and e with their numerical value
        known_constants: dict[str, Any] = {
            "pi": sympy.pi,
            "e": sympy.E,
            "I": 1j,
            "i": 1j,
        }

        # Replace any symbol in expr that is in our known_constants dictionary.
        if latex_parsed is not None:
            expr = latex_parsed.xreplace(
                {
                    s: known_constants[s.name]
                    for s in latex_parsed.free_symbols
                    if s.name in known_constants
                }
            )
            return expr
        return latex_parsed

    def parse_primitives(text: str) -> Any:
        """Parse mathematical text into SymPy expression.

        Pipeline:
        1. Try integer parsing
        2. Try float parsing
        3. Try sympify with LaTeX preprocessing (primary method)
        4. Fall back to latex2sympy_fixed() (backup method)

        Args:
            text: Mathematical text to parse.

        Returns:
            Parsed expression (int, float, complex, or SymPy object) or None.
        """
        # Step 1: Try simple integer parsing
        int_result = _parse_integer(text)
        if int_result is not None:
            return int_result

        # Step 2: Try float parsing
        float_result = _parse_float(text)
        if float_result is not None:
            return float_result

        # Step 3: Try sympify with LaTeX preprocessing (primary method)
        latex_str = _preprocess_latex_for_sympify(text)
        sympy_result = _sympify_latex(latex_str)
        if sympy_result is not None:
            return sympy_result

        # Step 4: Fall back to latex2sympy_fixed (backup method)
        text_no_eq = text
        try:
            if "=" in text_no_eq:
                # rfind is used to remove the last occurence of "="
                text_no_eq = text_no_eq[text_no_eq.rfind("=") + 1 :]
            output_val = latex2sympy_fixed(text_no_eq)

            try:
                float_val = float(N(output_val, 101))
                if (
                    float_val.is_integer()
                    or float("inf") == float_val
                    or float("-inf") == float_val
                ):
                    return int(
                        N(latex2sympy_fixed(text_no_eq), 50001)
                    )  # important for large ints
                return float_val
            except:  # noqa: E722
                try:
                    complex_val = complex(N(output_val, 101))
                    return complex_val
                except:  # noqa: E722
                    return output_val
        except Exception as e:
            print(f"Error: Custom parsing error {e}, {text_no_eq}")
            return None

    def check_answers(ans1: Any, ans2: Any) -> bool:
        """Check if two parsed answers are mathematically equivalent.

        Uses SymPy's equals() method when available, otherwise uses
        approximate equality for numerical values.

        Args:
            ans1: First parsed answer.
            ans2: Second parsed answer.

        Returns:
            True if answers are equivalent, False otherwise.
        """

        def _both_have_equals(a: Any, b: Any) -> bool:
            return (
                hasattr(a, "equals")
                and callable(getattr(a, "equals"))
                and hasattr(b, "equals")
                and callable(getattr(b, "equals"))
            )

        def _approx_equal(ans1: Any, ans2: Any) -> bool:
            err = abs(N(ans1 - ans2))
            if err >= 1e-10:
                return False
            denom = max(abs(N(ans1)), abs(N(ans2)))
            if denom < 1e-10:
                return True
            return bool(err / denom < 1e-10)

        if ans1 is None or ans2 is None:
            return False
        if isinstance(ans1, list) != isinstance(ans2, list):
            return False
        if isinstance(ans1, list) and isinstance(ans2, list):
            return False

        try:
            if _both_have_equals(ans1, ans2):
                return bool(ans1.equals(ans2))  # type: ignore[union-attr]
            if isinstance(ans1, str) or isinstance(ans2, str):
                return bool(ans1 == ans2)
            return _approx_equal(ans1, ans2)
        except Exception:
            return False

    def parse_answer(text: str) -> Any:
        """Parse a mathematical answer string into a SymPy expression.

        Pipeline: Normalization → Parsing

        Args:
            text: Mathematical text to parse.

        Returns:
            Parsed expression or None.
        """
        text_normalized_1 = remove_invalid_characters(text)
        text_normalized_2 = remove_outer_brackets(normalize_string(text_normalized_1))
        answer = parse_primitives(text_normalized_2)
        return answer

    def extract_answer(text: str) -> Any:
        """Extract and parse the final answer from model output.

        Pipeline: Preprocessing → Extraction → Normalization → Parsing

        Args:
            text: Raw model output text.

        Returns:
            Parsed answer or None.
        """
        text_normalized = replace_unicode(text)

        # Try to extract boxed content first
        answer = find_last_boxed_content(text_normalized)

        # If no boxed content, use the full text
        if answer is None:
            answer = text_normalized

        # Check for multiple equals signs (ambiguous)
        if answer.count("=") > 1:
            print(f"Warning: more than one '=' in answer {answer}")
            return None

        # Try to parse the extracted/normalized answer
        parsed_answer = parse_answer(answer)

        # If parsing succeeded, validate it's not nonsense
        if parsed_answer is not None:
            # Check if the result contains unexpected free symbols (variables)
            # Expected symbols: I (imaginary unit), pi, E (Euler's number)
            # If we have other symbols, it's likely garbage from parsing plain text
            if hasattr(parsed_answer, "free_symbols"):
                unexpected_symbols = {
                    s.name
                    for s in parsed_answer.free_symbols
                    if s.name not in {"I", "pi", "E", "e"}
                }
                # If there are unexpected symbols, the parser interpreted
                # plain text as variables (e.g., "The answer is 42" → T*h*e*...)
                # In this case, reject the parse and fall back to integer extraction
                if not unexpected_symbols:
                    return parsed_answer
            else:
                # No free symbols (it's a number), return it
                return parsed_answer

        # Fallback 1: Try to extract integer from the answer string
        integer_from_answer = extract_last_integer(answer)
        if integer_from_answer is not None:
            return integer_from_answer

        # Fallback 2: Try to extract integer from the full normalized text
        # (in case the answer extraction was too restrictive)
        return extract_last_integer(text_normalized)

    async def score(state: TaskState, target: Target) -> Score:
        result = extract_answer(state.output.completion)
        target_expr = parse_answer(target.text)

        if check_answers(result, target_expr):
            return Score(
                value=CORRECT,
                answer=str(result),
                explanation=state.output.completion,
            )

        return Score(
            value=INCORRECT,
            answer=str(result),
            explanation=state.output.completion,
        )

    return score
```

## `scorer/_metric.py`

```python
from collections.abc import Mapping, Sequence
from dataclasses import dataclass, field
from logging import getLogger
from typing import (
    Any,
    Callable,
    Literal,
    ParamSpec,
    Protocol,
    Type,
    Union,
    overload,
    runtime_checkable,
)

from pydantic import BaseModel, Field

from inspect_ai._util.error import PrerequisiteError
from inspect_ai._util.metadata import MT, metadata_as
from inspect_ai._util.registry import (
    RegistryInfo,
    is_registry_object,
    registry_add,
    registry_create,
    registry_info,
    registry_name,
    registry_params,
    registry_tag,
)
from inspect_ai.log._edit import ProvenanceData

logger = getLogger(__name__)

CORRECT = "C"
"""Value to assign for correct answers."""

INCORRECT = "I"
"""Value to assign for incorrect answers."""

PARTIAL = "P"
"""Value to assign for partial credit."""

NOANSWER = "N"
"""Value to assign for no answer or refusal to answer."""


Value = Union[
    str | int | float | bool,
    Sequence[str | int | float | bool],
    Mapping[str, str | int | float | bool | None],
]
"""Value provided by a score.

Use the methods of `Score` to easily treat
the `Value` as a simple scalar of various types.
"""

UNCHANGED: Literal["UNCHANGED"] = "UNCHANGED"
"""Sentinel value to indicate an unchanged field in score edits."""


class ScoreEdit(BaseModel):
    """A single edit to a score."""

    value: Value | Literal["UNCHANGED"] = "UNCHANGED"
    """New value for the score, or UNCHANGED to keep current value."""

    answer: str | None | Literal["UNCHANGED"] = "UNCHANGED"
    """New answer for the score, or UNCHANGED to keep current answer."""

    explanation: str | None | Literal["UNCHANGED"] = "UNCHANGED"
    """New explanation for the score, or UNCHANGED to keep current explanation."""

    metadata: dict[str, Any] | Literal["UNCHANGED"] = "UNCHANGED"
    """New metadata for the score, or UNCHANGED to keep current metadata."""

    provenance: ProvenanceData | None = None
    """Provenance data for this edit. None indicates this is the original score."""


class Score(BaseModel):
    """Score generated by a scorer."""

    value: Value
    """Score value."""

    answer: str | None = Field(default=None)
    """Answer extracted from model output (optional)"""

    explanation: str | None = Field(default=None)
    """Explanation of score (optional)."""

    metadata: dict[str, Any] | None = Field(default=None)
    """Additional metadata related to the score"""

    history: list[ScoreEdit] = Field(default_factory=list)
    """Edit history - users can access intermediate states."""

    @property
    def text(self) -> str:
        """Read the score as text."""
        return self.as_str()

    def as_str(self) -> str:
        """Read the score as a string."""
        return str(self._as_scalar())

    def as_int(self) -> int:
        """Read the score as an integer."""
        return int(self._as_scalar())

    def as_float(self) -> float:
        """Read the score as a float."""
        return float(self._as_scalar())

    def as_bool(self) -> bool:
        """Read the score as a boolean."""
        return bool(self._as_scalar())

    def as_list(self) -> list[str | int | float | bool]:
        """Read the score as a list."""
        if isinstance(self.value, list):
            return self.value
        else:
            raise ValueError("This score is not a list")

    def as_dict(self) -> dict[str, str | int | float | bool | None]:
        """Read the score as a dictionary."""
        if isinstance(self.value, dict):
            return self.value
        else:
            raise ValueError("This score is not a dictionary")

    def _as_scalar(self) -> str | int | float | bool:
        if isinstance(self.value, str | int | float | bool):
            return self.value
        else:
            raise ValueError("This score is not a scalar")


class SampleScore(BaseModel):
    """Score for a Sample."""

    score: Score
    """A score"""

    sample_id: str | int | None = Field(default=None)
    """A sample id"""

    sample_metadata: dict[str, Any] | None = Field(default=None)
    """Metadata from the sample"""

    def sample_metadata_as(self, metadata_cls: Type[MT]) -> MT | None:
        """Pydantic model interface to sample metadata.

        Args:
          metadata_cls: Pydantic model type

        Returns:
          BaseModel: Instance of metadata_cls bound to sample metadata.
        """
        if self.sample_metadata is not None:
            return metadata_as(self.sample_metadata, metadata_cls)
        else:
            return None

    scorer: str | None = Field(default=None)
    """Registry name of scorer that created this score."""


ValueToFloat = Callable[[Value], float]
"""Function used by metrics to translate from a Score value to a float value."""


def value_to_float(
    correct: Value = CORRECT,
    incorrect: Value = INCORRECT,
    partial: Value = PARTIAL,
    noanswer: Value = NOANSWER,
) -> ValueToFloat:
    """Create a ValueToFloat function.

    Create a ValueToFloat function that maps scalar values of
    different types into floats. For strings, common boolean
    representations (e.g. 'yes', 'no', 'true', 'false') are
    mapped to 1 and 0. In addition, the specified correct,
    incorrect, partial, and noanswer values (by default "C"
    "I", "P", and "N") are mapped to 1, 0, 0.5, and 0. Note that
    those are the default literal values, but they can be
    customized. Strings with only numbers are converted, and
    numeric values are cast to float. Arrays and dictionaries
    give a warning and return 0.

    Args:
       correct (Value): Value that represents a correct answer (1)
       incorrect (Value): Value that represents an incorrect answer (0)
       partial (Value): Value to assign partial credit for (0.5)
       noanswer (Value): Value for refusals to answer (0)

    Returns:
        ValueToFloat function.
    """

    def to_float(value: Value) -> float:
        if isinstance(value, int | float | bool):
            return float(value)
        elif value == correct:
            return 1.0
        elif value == partial:
            return 0.5
        elif value == incorrect or value == noanswer:
            return 0
        elif isinstance(value, str):
            value = value.lower()
            if value in ["yes", "true"]:
                return 1.0
            elif value in ["no", "false"]:
                return 0.0
            elif is_number(value):
                return float(value)

        # couldn't extract a value
        logger.warning(f"Unable to convert value to float: {value}")
        return 0.0

    return to_float


def is_number(s: str) -> bool:
    try:
        float(s)
        return True
    except ValueError:
        return False


@runtime_checkable
class MetricDeprecated(Protocol):
    def __call__(self, scores: list[Score]) -> Value: ...


@runtime_checkable
class MetricProtocol(Protocol):
    def __call__(self, scores: list[SampleScore]) -> Value:
        r"""Compute a metric on a list of scores.

        Args:
          scores: List of scores.

        Returns:
          Metric value

        Examples:
          ```python
          @metric
          def mean() -> Metric:
              def metric(scores: list[SampleScore]) -> Value:
                  return np.mean([score.score.as_float() for score in scores]).item()
              return metric
          ```
        """
        ...


Metric = MetricProtocol | MetricDeprecated
"""Metric protocol.

The Metric signature changed in release v0.3.64. Both
the previous and new signatures are supported -- you
should use `MetricProtocol` for new code as the
depreacated signature will eventually be removed.
"""


P = ParamSpec("P")


@dataclass(frozen=True)
class MetricSpec:
    """Scorer specification used to (re-)create scorers."""

    metric: str
    """Metric name"""

    args: dict[str, Any] = field(default_factory=dict)
    """Metric arguments."""


def metric_register(metric: Callable[P, Metric], name: str = "") -> Callable[P, Metric]:
    r"""Register a function or class as a metric.

    Args:
        metric (MetricType):
            Function that returns a Metric or class
            deriving fromMetric
        name (str): Name of metric (Optional, defaults to object name)

    Returns:
        Metric type with registry attributes.
    """
    metric_name = name if name else getattr(metric, "__name__")
    registry_add(metric, RegistryInfo(type="metric", name=metric_name))
    return metric


def metric_create(name: str, **kwargs: Any) -> Metric:
    r"""Create a Metric based on its registered name.

    Metrics can be functions that return a Metric or classes
    deriving from Metric

    Args:
        name (str): Name of metric (Optional, defaults to object name)
        **kwargs (dict): Optional creation arguments for the metric

    Returns:
        Metric with registry info attribute
    """
    return registry_create("metric", name, **kwargs)


def to_metric_specs(
    metrics: list[Metric | dict[str, list[Metric]]] | dict[str, list[Metric]],
) -> list[MetricSpec | dict[str, list[MetricSpec]]] | dict[str, list[MetricSpec]]:
    if isinstance(metrics, list):
        result: list[MetricSpec | dict[str, list[MetricSpec]]] = []
        for metric_item in metrics:
            if isinstance(metric_item, dict):
                # It's a dict of metric groups
                result.append(
                    {
                        k: [as_metric_spec(v) for v in metric_list]
                        for k, metric_list in metric_item.items()
                    }
                )
            else:
                # It's a direct metric
                result.append(as_metric_spec(metric_item))
        return result
    else:
        return {
            k: [as_metric_spec(v) for v in metric_list]
            for k, metric_list in metrics.items()
        }


def as_metric_spec(metric: Metric) -> MetricSpec:
    if not is_registry_object(metric):
        raise PrerequisiteError(
            f"The metric {getattr(metric, '__name__', '<unknown>')} was not created by a function decorated with @metric so cannot be recorded."
        )
    return MetricSpec(metric=registry_info(metric).name, args=registry_params(metric))


@overload
def metric(name: str) -> Callable[[Callable[P, Metric]], Callable[P, Metric]]: ...


@overload
# type: ignore
def metric(name: Callable[P, Metric]) -> Callable[P, Metric]: ...


def metric(
    name: str | Callable[P, Metric],
) -> Callable[[Callable[P, Metric]], Callable[P, Metric]] | Callable[P, Metric]:
    r"""Decorator for registering metrics.

    Args:
      name: Optional name for metric. If the decorator has no name
        argument then the name of the underlying MetricType
        will be used to automatically assign a name.

    Examples:
      ```python
      @metric
      def mean() -> Metric:
          def metric(scores: list[SampleScore]) -> Value:
              return np.mean([score.score.as_float() for score in scores]).item()
          return metric
    ```
    """

    # create_metric_wrapper:
    #  (a) Add the MetricType to the registry using the appropriately
    #      package-namespaced name
    #  (b) Ensure that instances of Metric created by MetricType also
    #      carry registry info.
    def create_metric_wrapper(
        metric_type: Callable[P, Metric], name: str | None = None
    ) -> Callable[P, Metric]:
        metric_name = registry_name(
            metric_type, name if name else getattr(metric_type, "__name__")
        )

        def metric_wrapper(*args: P.args, **kwargs: P.kwargs) -> Metric:
            metric = metric_type(*args, **kwargs)
            registry_tag(
                metric_type,
                metric,
                RegistryInfo(type="metric", name=metric_name),
                *args,
                **kwargs,
            )
            return metric

        return metric_register(metric_wrapper, metric_name)

    # for decorators with an explicit name, one more wrapper for the name
    if isinstance(name, str):

        def wrapper(metric_type: Callable[P, Metric]) -> Callable[P, Metric]:
            return create_metric_wrapper(metric_type, name)

        return wrapper

    # create a metric wrapper for the passed metric_type
    else:
        metric_type = name
        return create_metric_wrapper(metric_type)
```

## `scorer/_metrics/__init__.py`

```python
from .accuracy import accuracy
from .grouped import grouped
from .mean import mean
from .std import bootstrap_stderr, std, stderr, var

__all__ = [
    "accuracy",
    "mean",
    "grouped",
    "bootstrap_stderr",
    "std",
    "stderr",
    "var",
]
```

## `scorer/_metrics/accuracy.py`

```python
from logging import getLogger

from .._metric import (
    Metric,
    SampleScore,
    ValueToFloat,
    metric,
    value_to_float,
)

logger = getLogger(__name__)


@metric
def accuracy(to_float: ValueToFloat = value_to_float()) -> Metric:
    r"""Compute proportion of total answers which are correct.

    Args:
       to_float: Function for mapping `Value` to float for computing
          metrics. The default `value_to_float()` maps CORRECT ("C") to 1.0,
          INCORRECT ("I") to 0, PARTIAL ("P") to 0.5, and NOANSWER ("N") to 0,
          casts numeric values to float directly, and prints a warning and returns
          0 if the Value is a complex object (list or dict).

    Returns:
       Accuracy metric
    """

    def metric(scores: list[SampleScore]) -> float:
        total = 0.0
        for item in scores:
            total += to_float(item.score.value)
        return total / float(len(scores))

    return metric
```

## `scorer/_metrics/grouped.py`

```python
from typing import Literal, cast

import numpy as np

from inspect_ai.scorer._metric import (
    Metric,
    MetricProtocol,
    SampleScore,
    Value,
    ValueToFloat,
    metric,
    value_to_float,
)


@metric
def grouped(
    metric: Metric,
    group_key: str,
    *,
    all: Literal["samples", "groups"] | Literal[False] = "samples",
    all_label: str = "all",
    value_to_float: ValueToFloat = value_to_float(),
    name_template: str = "{group_name}",
) -> Metric:
    """
    Creates a grouped metric that applies the given metric to subgroups of samples.

    Args:
      metric: The metric to apply to each group of samples.
      group_key: The metadata key used to group samples. Each sample must have this key in its metadata.
      all: How to compute the "all" aggregate score:
          - "samples": Apply the metric to all samples regardless of groups
          - "groups": Calculate the mean of all group scores
          - False: Don't calculate an aggregate score
      all_label: The label for the "all" key in the returned dictionary.
      value_to_float: Function to convert metric values to floats, used when all="groups".
      name_template: Template for the name of each group. The default is "{group_name}".

    Returns:
        A new metric function that returns a dictionary mapping group names to their scores,
        with an optional "all" key for the aggregate score.
    """

    def grouped_metric(scores: list[SampleScore]) -> Value:
        # Satisfy the type checker that the metric is a MetricProtocol
        metric_protocol = cast(MetricProtocol, metric)

        # Slice the scores into groups
        scores_dict: dict[str, list[SampleScore]] = {}
        for sample_score in scores:
            if (
                sample_score.sample_metadata is None
                or group_key not in sample_score.sample_metadata
            ):
                raise ValueError(
                    f"Sample {sample_score.sample_id} has no {group_key} metadata. To compute a grouped metric each sample metadata must have a value for '{group_key}'"
                )
            group_name = str(sample_score.sample_metadata.get(group_key))
            if group_name not in scores_dict:
                scores_dict[group_name] = []
            scores_dict[group_name].append(sample_score)

        # Compute the per group metric
        grouped_scores = {
            name_template.format(group_name=group_name): metric_protocol(values)
            for group_name, values in scores_dict.items()
        }

        if not all:
            return cast(Value, grouped_scores)
        else:
            # Compute the all metric
            all_group_metric = None
            if all == "samples":
                # samples means apply the metric to all samples
                all_group_metric = metric_protocol(scores)
            elif all == "groups":
                # group means the overall score is the mean of all the group scores
                all_group_metric = np.mean(
                    [value_to_float(val) for val in grouped_scores.values()]
                ).item()

            return cast(Value, {**grouped_scores, all_label: all_group_metric})

    return grouped_metric
```

## `scorer/_metrics/mean.py`

```python
import numpy as np

from .._metric import Metric, SampleScore, metric


@metric
def mean() -> Metric:
    """Compute mean of all scores.

    Returns:
       mean metric
    """

    def metric(scores: list[SampleScore]) -> float:
        return np.mean([score.score.as_float() for score in scores]).item()

    return metric
```

## `scorer/_metrics/std.py`

```python
from logging import getLogger
from typing import cast

import numpy as np

from .._metric import (
    Metric,
    SampleScore,
    ValueToFloat,
    metric,
    value_to_float,
)

logger = getLogger(__name__)


@metric
def bootstrap_stderr(
    num_samples: int = 1000, to_float: ValueToFloat = value_to_float()
) -> Metric:
    """Standard error of the mean using bootstrap.

    Args:
       num_samples: Number of bootstrap samples to take.
       to_float: Function for mapping
          Value to float for computing metrics. The default
          `value_to_float()` maps CORRECT ("C") to 1.0,
          INCORRECT ("I") to 0, PARTIAL ("P") to 0.5, and
          NOANSWER ("N") to 0, casts numeric values to
          float directly, and prints a warning and returns
          0 if the Value is a complex object (list or dict).

    Returns:
       bootstrap_stderr metric
    """

    def metric(scores: list[SampleScore]) -> float:
        values = [to_float(score.score.value) for score in scores]
        std = np.std(
            [
                np.mean(np.random.choice(values, len(values), replace=True))
                for _ in range(num_samples)
            ]
        )
        return cast(float, std.item())

    return metric


@metric
def stderr(
    to_float: ValueToFloat = value_to_float(), cluster: str | None = None
) -> Metric:
    """Standard error of the mean using Central Limit Theorem.

    Args:
       to_float: Function for mapping `Value` to float for computing
          metrics. The default `value_to_float()` maps CORRECT ("C") to 1.0,
          INCORRECT ("I") to 0, PARTIAL ("P") to 0.5, and NOANSWER ("N") to 0,
          casts numeric values to float directly, and prints a warning and returns
          0 if the Value is a complex object (list or dict).
       cluster (str | None): The key from the Sample metadata
          corresponding to a cluster identifier for computing
          [clustered standard errors](https://en.wikipedia.org/wiki/Clustered_standard_errors).

    Returns:
       stderr metric
    """

    def clustered_metric(scores: list[SampleScore]) -> float:
        """Computes a clustered standard error.

        For details, see Appendix A of https://arxiv.org/pdf/2411.00640.
        The version here uses a finite cluster correction (unlike the paper)
        """
        assert cluster is not None
        cluster_list = []
        value_list = []
        for sample_score in scores:
            if (
                sample_score.sample_metadata is None
                or cluster not in sample_score.sample_metadata
            ):
                raise ValueError(
                    f"Sample {sample_score.sample_id} has no cluster metadata. To compute `stderr` with clustering, each sample metadata must have a value for '{cluster}'"
                )
            cluster_list.append(sample_score.sample_metadata[cluster])
            value_list.append(to_float(sample_score.score.value))
        clusters = np.array(cluster_list)
        values = np.array(value_list)
        mean = float(np.mean(values))

        # Convert to numpy arrays and get unique clusters
        unique_clusters = np.unique(clusters)
        cluster_count = len(unique_clusters)

        # Compute clustered variance using NumPy operations
        clustered_variance = 0.0
        for cluster_id in unique_clusters:
            # get a data vector for this cluster
            cluster_data = values[clusters == cluster_id]
            # this computes X' \Omega X = \sum_i \sum_j (s_{i,c} - mean) * (s_{j,c} - mean)
            clustered_variance += np.outer(
                cluster_data - mean, cluster_data - mean
            ).sum()

        # Multiply by C / (C - 1) to unbias the variance estimate
        standard_error = np.sqrt(
            clustered_variance * cluster_count / (cluster_count - 1)
        ) / len(scores)

        return cast(float, standard_error)

    def metric(scores: list[SampleScore]) -> float:
        values = [to_float(score.score.value) for score in scores]
        n = len(values)

        # standard deviation is calculated by dividing by n-ddof so ensure
        # that we won't divide by zero
        if (n - 1) < 1:
            return 0

        # Calculate the sample standard deviation
        sample_std = np.std(values, ddof=1)

        # Calculate the standard error of the mean
        standard_error = sample_std / np.sqrt(n)

        return cast(float, standard_error)

    if cluster is not None:
        return clustered_metric

    return metric


@metric
def std(to_float: ValueToFloat = value_to_float()) -> Metric:
    """Calculates the sample standard deviation of a list of scores.

    Args:
       to_float: Function for mapping `Value` to float for computing
          metrics. The default `value_to_float()` maps CORRECT ("C") to 1.0,
          INCORRECT ("I") to 0, PARTIAL ("P") to 0.5, and NOANSWER ("N") to 0,
          casts numeric values to float directly, and prints a warning and returns
          0 if the Value is a complex object (list or dict).


    Returns:
        std metric
    """

    def metric(scores: list[SampleScore]) -> float:
        values = [to_float(score.score.value) for score in scores]
        n = len(values)

        # standard deviation is calculated by dividing by n-ddof so ensure
        # that we won't divide by zero
        if (n - 1) < 1:
            return 0

        # Calculate the sample standard deviation
        sample_std = np.std(values, ddof=1)

        return cast(float, sample_std)

    return metric


@metric
def var(to_float: ValueToFloat = value_to_float()) -> Metric:
    """Compute the sample variance of a list of scores.

    Args:
        to_float (ValueToFloat): Function for mapping
            Value to float for computing metrics. The default
            `value_to_float()` maps CORRECT ("C") to 1.0,
            INCORRECT ("I") to 0, PARTIAL ("P") to 0.5, and
            NOANSWER ("N") to 0, casts numeric values to
            float directly, and prints a warning and returns
            0 if the Value is a complex object (list or dict).

    Returns:
       var metric
    """

    def metric(scores: list[SampleScore]) -> float:
        values = [to_float(score.score.value) for score in scores]
        n = len(values)
        # variance is calculated by dividing by n-ddof so ensure
        # that we won't divide by zero
        if (n - 1) < 1:
            return 0

        variance = np.var(values, ddof=1)

        return cast(float, variance)

    return metric
```

## `scorer/_model.py`

```python
import re
from functools import partial
from typing import Any, Callable

from inspect_ai._util.content import Content, ContentText
from inspect_ai._util.dict import omit
from inspect_ai._util.format import format_function_call
from inspect_ai._util.list import remove_last_match_and_after
from inspect_ai.model._chat_message import (
    ChatMessage,
    ChatMessageAssistant,
    ChatMessageSystem,
    ChatMessageTool,
    ChatMessageUser,
)
from inspect_ai.model._model import Model, get_model
from inspect_ai.model._model_output import ModelOutput
from inspect_ai.solver._task_state import TaskState
from inspect_ai.util import resource

from ._metric import INCORRECT, Score
from ._metrics import accuracy, stderr
from ._multi import multi_scorer
from ._scorer import Scorer, scorer
from ._target import Target


@scorer(metrics=[accuracy(), stderr()])
def model_graded_fact(
    template: str | None = None,
    instructions: str | None = None,
    grade_pattern: str | None = None,
    include_history: bool | Callable[[TaskState], str] = False,
    partial_credit: bool = False,
    model: list[str | Model] | str | Model | None = None,
    model_role: str | None = "grader",
) -> Scorer:
    """Score a question/answer task with a fact response using a model.

    Args:
      template: Template for grading prompt. This template uses
        four variables: `question`, `criterion`, `answer`, and
        `instructions` (which is fed from the `instructions` parameter).
        Variables from sample `metadata` are also available in the template.
      instructions: Grading instructions. This should
        include a prompt for the model to answer (e.g. with
        with chain of thought reasoning) in a way that matches
        the specified `grade_pattern`, for example, the default
        `grade_pattern` looks for one of GRADE: C, GRADE: P, or
        GRADE: I).
      grade_pattern: Regex to extract the grade from the
        model response. Defaults to looking for e.g. GRADE: C
        The regex should have a single capture group that
        extracts exactly the letter C, P, or I.
      include_history:
        Whether to include the full chat history in the presented
        question. Defaults to `False`, which presents only the
        original sample input. Optionally provide a function to
        customise how the chat history is presented.
      partial_credit: Whether to allow for "partial" credit for
         answers (by default assigned a score of 0.5). Defaults
         to `False`. Note that this parameter is only used
         with the default `instructions` (as custom instructions
         provide their own prompts for grades).
      model: Model or models to use for grading. If a list is provided,
        each model grades independently and the final grade is computed by
        majority vote. When this parameter is provided, it takes precedence
        over `model_role`.
      model_role: Named model role to use for grading (default: "grader").
        Ignored if `model` is provided. If specified and a model is bound to
        this role (e.g. via the `model_roles` argument to `eval()`), that model
        is used. If no role-bound model is available, the model being
        evaluated (the default model) is used.
    """
    return model_graded_qa(
        template=template if template else DEFAULT_MODEL_GRADED_FACT_TEMPLATE,
        instructions=instructions,
        grade_pattern=grade_pattern,
        include_history=include_history,
        partial_credit=partial_credit,
        model=model,
        model_role=model_role,
    )


@scorer(metrics=[accuracy(), stderr()])
def model_graded_qa(
    template: str | None = None,
    instructions: str | None = None,
    grade_pattern: str | None = None,
    include_history: bool | Callable[[TaskState], str] = False,
    partial_credit: bool = False,
    model: list[str | Model] | str | Model | None = None,
    model_role: str | None = "grader",
) -> Scorer:
    """Score a question/answer task using a model.

    Args:
      template: Template for grading prompt. This template has
        four variables:
           - `question`, `criterion`, `answer`, and
        `instructions` (which is fed from the `instructions` parameter).
        Variables from sample `metadata` are also available in the template.
      instructions: Grading instructions. This should
        include a prompt for the model to answer (e.g. with
        with chain of thought reasoning) in a way that matches
        the specified `grade_pattern`, for example, the default
        `grade_pattern` looks for one of GRADE: C, GRADE: P, or
        GRADE: I.
      grade_pattern: Regex to extract the grade from the
        model response. Defaults to looking for e.g. GRADE: C
        The regex should have a single capture group that
        extracts exactly the letter C, P, I.
      include_history:
        Whether to include the full chat history in the presented
        question. Defaults to `False`, which presents only the
        original sample input. Optionally provide a function to
        customise how the chat history is presented.
      partial_credit: Whether to allow for "partial" credit for
        answers (by default assigned a score of 0.5). Defaults
        to `False`. Note that this parameter is only used
        with the default `instructions` (as custom instructions
        provide their own prompts for grades).
      model: Model or models to use for grading. If a list is provided,
        each model grades independently and the final grade is computed by
        majority vote. When this parameter is provided, it takes precedence
        over `model_role`.
      model_role: Named model role to use for grading (default: "grader").
        Ignored if `model` is provided. If specified and a model is bound to
        this role (e.g. via the `model_roles` argument to `eval()`), that
        model is used. If no role-bound model is available, the model being
        evaluated (the default model) is used.
    """
    # bind variables
    get_scorer = partial(
        _model_graded_qa_single,
        template,
        instructions,
        grade_pattern,
        include_history,
        partial_credit,
        model_role=model_role,
    )
    # if only a single model is passed, return a single scorer
    if model is None or not isinstance(model, list):
        return get_scorer(model)

    # otherwise, use multi scorer
    assert isinstance(model, list)
    scorers = [get_scorer(model) for model in model]
    return multi_scorer(scorers, "mode")


@scorer(metrics=[accuracy(), stderr()])
def _model_graded_qa_single(
    template: str | None = None,
    instructions: str | None = None,
    grade_pattern: str | None = None,
    include_history: bool | Callable[[TaskState], str] = False,
    partial_credit: bool = False,
    model: str | Model | None = None,
    model_role: str | None = "grader",
) -> Scorer:
    # returns a scorer that does model graded qa for a single model

    # resolve grading template, instructions, and grade_pattern
    template = template if template else DEFAULT_MODEL_GRADED_QA_TEMPLATE
    grading_template = resource(template)
    instructions = (
        instructions if instructions else default_instructions(partial_credit)
    )

    async def score(state: TaskState, target: Target) -> Score:
        # resolve model
        nonlocal model
        # Order of precedence: `model` > `model_role` > default model
        if model is not None:
            model = model if isinstance(model, Model) else get_model(model)
        elif model_role is not None:
            model = get_model(role=model_role)
        else:
            model = get_model()

        # metadata without grading template variables
        metadata = omit(
            state.metadata, ["question", "answer", "criterion", "instructions"]
        )

        # present the question
        if include_history is True:
            question = chat_history(state)
        elif callable(include_history):
            question = include_history(state)
        else:
            question = state.input_text

        # format the scoring template
        scoring_prompt = model_scoring_prompt(
            template=grading_template,
            question=question,
            output=state.output,
            criterion=target.text,
            instructions=instructions,
            metadata=metadata,
        )

        # query the model for the score
        result = await model.generate([scoring_prompt])

        # extract the grade
        match = re.search(grade_pattern or DEFAULT_GRADE_PATTERN, result.completion)
        if match:
            return Score(
                value=match.group(1),
                answer=state.output.completion,
                explanation=result.completion,
                metadata=dict(
                    grading=[
                        scoring_prompt,
                        result.message,
                    ]
                ),
            )
        else:
            return Score(
                value=INCORRECT,
                explanation="Grade not found in model output: "
                + f"{result.completion}",
                metadata=dict(
                    grading=[
                        scoring_prompt,
                        result.message,
                    ]
                ),
            )

    return score


# these templates are based on the openai closedqa templates here:
# https://github.com/openai/evals/blob/main/evals/registry/modelgraded/closedqa.yaml
DEFAULT_MODEL_GRADED_QA_TEMPLATE = """
You are assessing a submitted answer on a given task based on a criterion. Here is the data:

[BEGIN DATA]
***
[Task]: {question}
***
[Submission]: {answer}
***
[Criterion]: {criterion}
***
[END DATA]

Does the submission meet the criterion?

{instructions}
"""

DEFAULT_MODEL_GRADED_FACT_TEMPLATE = """
You are comparing a submitted answer to an expert answer on a given question. Here is the data:

[BEGIN DATA]
************
[Question]: {question}
************
[Expert]: {criterion}
************
[Submission]: {answer}
************
[END DATA]

Compare the factual content of the submitted answer with the expert answer. Ignore any differences in style, grammar, or punctuation.

Does the submission contain the content in the expert answer?

{instructions}
"""


def default_instructions(partial_credit: bool) -> str:
    partial_letter = "P" if partial_credit else ""
    partial_prompt = '"P" for partially correct answers,' if partial_credit else ""
    return f"""
After assessing the submitted answer, reply with 'GRADE: $LETTER' (without quotes) where LETTER is one of C{partial_letter}I.  Please choose ONE option for the grade: either "C" for correct answers, {partial_prompt}or "I" for incorrect answers.

For example, after reviewing a correct answer you might write 'GRADE: C' or after reviewing an incorrect answer you might write 'GRADE: I'.

First, write out in a step by step manner your reasoning about the criterion to be sure that your conclusion is correct. Avoid simply stating the correct answers at the outset. Then, end with your answer formatted as 'GRADE: $LETTER' (without quotes) where LETTER is one of C{partial_letter}I.
"""


DEFAULT_GRADE_PATTERN = r"(?i)GRADE\s*:\s*([CPI])(.*)$"
"""Regex to extract the grade from the COT above."""


def chat_history(state: TaskState) -> str:
    # filter out system messages
    messages: list[ChatMessage] = [
        message
        for message in state.messages
        if not isinstance(message, ChatMessageSystem)
    ]

    # present message history (removing the final assistant message
    # and after as it will be contained in the 'Answer:'):
    messages = remove_last_match_and_after(
        messages, lambda message: isinstance(message, ChatMessageAssistant)
    )

    # begin history with text of first message (it will come right after
    # 'Task' or 'Question' in the template)
    history: list[str] = []
    if len(messages) > 0:
        history.append(messages[0].text)

        # for subsequent messages present with e.g. Assistant: {message.text}
        for message in messages[1:]:
            if isinstance(message, ChatMessageUser):
                history.append(f"User: {message.text}")
            elif isinstance(message, ChatMessageAssistant):
                assistant_message = [message.text] if message.text else []
                if message.tool_calls:
                    assistant_message.extend(
                        [
                            format_function_call(
                                tool_call.function, tool_call.arguments
                            )
                            for tool_call in message.tool_calls
                        ]
                    )
                history.append("Assistant: " + "\n\n".join(assistant_message))
            elif isinstance(message, ChatMessageTool):
                history.append(
                    f"Tool ({message.function}): {message.tool_error or ''}{message.text}"
                )

    return "\n\n".join(history)


def model_scoring_prompt(
    *,
    template: str,
    question: str,
    output: ModelOutput,
    criterion: str,
    instructions: str,
    metadata: dict[str, Any],
) -> ChatMessageUser:
    # we need to remove media objects from output and reference them as attachements in the answer
    answer = output.completion
    media: list[Content] = (
        [
            content
            for content in output.message.content
            if content.type in ["image", "audio", "video"]
        ]
        if len(output.choices) > 0 and isinstance(output.message.content, list)
        else []
    )
    if len(media) > 0:
        if len(answer) > 0:
            answer = f"{answer} (see also attached media)"
        else:
            answer = "See attached media"

    # format the prompt
    prompt = template.format(
        question=question,
        answer=answer,
        criterion=criterion,
        instructions=instructions,
        **metadata,
    )

    # return with media if necessary
    if len(media) > 0:
        return ChatMessageUser(content=[ContentText(text=prompt)] + media)
    else:
        return ChatMessageUser(content=prompt)
```

## `scorer/_multi.py`

```python
import functools

from inspect_ai._util._async import tg_collect
from inspect_ai.scorer._reducer.registry import create_reducers
from inspect_ai.solver._task_state import TaskState

from ._metric import Score
from ._reducer.types import ScoreReducer
from ._scorer import Scorer
from ._target import Target


def multi_scorer(scorers: list[Scorer], reducer: str | ScoreReducer) -> Scorer:
    r"""Returns a Scorer that runs multiple Scorers in parallel and aggregates their results into a single Score using the provided reducer function.

    Args:
        scorers: a list of Scorers.
        reducer: a function which takes in a list of Scores and returns a single Score.
    """
    reducer = create_reducers(reducer)[0]

    async def score(state: TaskState, target: Target) -> Score:
        scores = await tg_collect(
            [functools.partial(_scorer, state, target) for _scorer in scorers]
        )
        # Filter out None values from scores list
        resolved_scores = [score for score in scores if score is not None]
        return reducer(resolved_scores)

    return score
```

## `scorer/_pattern.py`

```python
import re
from typing import Any

from inspect_ai.solver._task_state import TaskState

from ._metric import CORRECT, INCORRECT, Score
from ._metrics import accuracy, stderr
from ._scorer import Scorer, scorer
from ._target import Target


def match_target(match: str, target: Target, ignore_case: bool) -> bool:
    if ignore_case:
        match = match.lower()
        target = Target([t.lower() for t in target])

    return match in target


def match_first(
    matches: tuple[str | Any, ...], target: Target, ignore_case: bool
) -> str | None:
    for match in matches:
        if not isinstance(match, str):
            continue

        if match_target(match, target, ignore_case):
            return match

    return None


def match_all_groups(
    matches: tuple[str | Any, ...], target: Target, ignore_case: bool
) -> str | None:
    for match in matches:
        if not isinstance(match, str):
            continue

        if not match_target(match, target, ignore_case):
            return None

    return target.text


@scorer(metrics=[accuracy(), stderr()])
def pattern(pattern: str, ignore_case: bool = True, match_all: bool = False) -> Scorer:
    """Scorer which extracts the model answer using a regex.

    Note that at least one regex group is required to match
    against the target.

    The regex can have a single capture group or multiple groups.
    In the case of multiple groups, the scorer can be configured
    to match either one or all of the extracted groups

    Args:
       pattern: Regular expression for extracting the
          answer from model output.
       ignore_case: Ignore case when comparing
          the extract answer to the targets. (Default: True)
       match_all: With multiple captures, do all captured
          values need to match the target? (Default: False)
    """

    async def score(state: TaskState, target: Target) -> Score:
        # extract the answer
        match = re.search(
            pattern, state.output.completion, re.IGNORECASE if ignore_case else 0
        )

        if match:
            groups = match.groups()
            if match_all:
                found_match = match_all_groups(
                    matches=groups, target=target, ignore_case=ignore_case
                )
                answer = found_match
            else:
                found_match = match_first(
                    matches=groups, target=target, ignore_case=ignore_case
                )

                if found_match is None and len(groups) == 1:
                    # A common use of a pattern is to extract a single answer
                    # from some templated text. If we fail to match in that
                    # scenario, it's worth returning the failed match because
                    # this is useful information for the user.
                    answer = groups[0]
                else:
                    answer = found_match

            return Score(
                value=CORRECT if found_match else INCORRECT,
                answer=answer,
                explanation=state.output.completion,
            )
        else:
            # didn't find the scoring pattern
            return Score(
                value=INCORRECT,
                explanation="Scoring pattern not matched in output: "
                + f"{state.output.completion}",
            )

    return score
```

## `scorer/_reducer/__init__.py`

```python
from .reducer import at_least, max_score, mean_score, median_score, mode_score, pass_at
from .registry import (
    create_reducers,
    reducer_log_name,
    reducer_log_names,
    score_reducer,
    validate_reducer,
)
from .types import ScoreReducer, ScoreReducers

__all__ = [
    "ScoreReducer",
    "ScoreReducers",
    "score_reducer",
    "create_reducers",
    "reducer_log_name",
    "reducer_log_names",
    "mean_score",
    "median_score",
    "mode_score",
    "max_score",
    "at_least",
    "pass_at",
    "validate_reducer",
]
```

## `scorer/_reducer/reducer.py`

```python
import statistics
from collections import Counter
from typing import Callable, cast

import numpy as np

from inspect_ai.scorer._metric import Score, Value, ValueToFloat, value_to_float

from .registry import REDUCER_NAME, score_reducer
from .types import ScoreReducer


@score_reducer(name="mode")
def mode_score() -> ScoreReducer:
    r"""Take the mode from a list of scores."""

    def reduce(scores: list[Score]) -> Score:
        r"""A utility function for the most common score in a list of scores.

        Args:
            scores: a list of Scores.
        """

        def most_common(
            counts: Counter[str | int | float | bool],
        ) -> str | int | float | bool:
            return counts.most_common(1)[0][0]

        if isinstance(scores[0].value, dict):
            return _count_dict(scores, most_common)
        elif isinstance(scores[0].value, list):
            return _count_list(scores, most_common)
        else:
            return _count_scalar(scores, most_common)

    return reduce


@score_reducer(name="mean")
def mean_score(value_to_float: ValueToFloat = value_to_float()) -> ScoreReducer:
    r"""Take the mean of a list of scores.

    Args:
       value_to_float: Function to convert the value to a float
    """

    def reduce(scores: list[Score]) -> Score:
        if isinstance(scores[0].value, dict):
            return _compute_dict_stat(scores, value_to_float, statistics.mean)
        elif isinstance(scores[0].value, list):
            return _compute_list_stat(scores, value_to_float, statistics.mean)
        else:
            return _compute_scalar_stat(scores, value_to_float, statistics.mean)

    return reduce


@score_reducer(name="median")
def median_score(value_to_float: ValueToFloat = value_to_float()) -> ScoreReducer:
    r"""Take the median value from a list of scores.

    Args:
       value_to_float: Function to convert the value to a float
    """

    def reduce(scores: list[Score]) -> Score:
        if isinstance(scores[0].value, dict):
            return _compute_dict_stat(scores, value_to_float, statistics.median)
        elif isinstance(scores[0].value, list):
            return _compute_list_stat(scores, value_to_float, statistics.median)
        else:
            return _compute_scalar_stat(scores, value_to_float, statistics.median)

    return reduce


@score_reducer
def at_least(
    k: int, value: float = 1.0, value_to_float: ValueToFloat = value_to_float()
) -> ScoreReducer:
    r"""Score correct if there are at least k score values greater than or equal to the value.

    Args:
       k: Number of score values that must exceed `value`.
       value: Score value threshold.
       value_to_float: Function to convert score values to float.
    """

    def reduce(scores: list[Score]) -> Score:
        def gte_n(
            counter: Counter[str | int | float | bool],
        ) -> str | int | float | bool:
            count_gte_n = sum(
                count for key, count in counter.items() if value_to_float(key) >= value
            )
            return 1 if count_gte_n >= k else 0

        if isinstance(scores[0].value, dict):
            return _count_dict(scores, gte_n)
        elif isinstance(scores[0].value, list):
            return _count_list(scores, gte_n)
        else:
            return _count_scalar(scores, gte_n)

    setattr(at_least, REDUCER_NAME, f"at_least_{k}")
    return reduce


@score_reducer
def pass_at(
    k: int, value: float = 1.0, value_to_float: ValueToFloat = value_to_float()
) -> ScoreReducer:
    r"""Probability of at least 1 correct sample given `k` epochs (<https://arxiv.org/pdf/2107.03374>).

    Args:
       k: Epochs to compute probability for.
       value: Score value threshold.
       value_to_float: Function to convert score values to float.
    """

    def reduce(scores: list[Score]) -> Score:
        def pass_at_k(values: list[float]) -> float:
            total = len(values)
            correct = sum(1 for v in values if v >= value)
            if total - correct < k:
                return 1.0
            else:
                return 1.0 - cast(  # type: ignore[redundant-cast]
                    float,
                    np.prod(1.0 - k / np.arange(total - correct + 1, total + 1)).item(),
                )

        if isinstance(scores[0].value, dict):
            return _compute_dict_stat(scores, value_to_float, pass_at_k)
        elif isinstance(scores[0].value, list):
            return _compute_list_stat(scores, value_to_float, pass_at_k)
        else:
            return _compute_scalar_stat(scores, value_to_float, pass_at_k)

    setattr(pass_at, REDUCER_NAME, f"pass_at_{k}")
    return reduce


@score_reducer(name="max")
def max_score(value_to_float: ValueToFloat = value_to_float()) -> ScoreReducer:
    r"""Take the maximum value from a list of scores.

    Args:
       value_to_float: Function to convert the value to a float
    """

    def reduce(scores: list[Score]) -> Score:
        if isinstance(scores[0].value, dict):
            dict_result: dict[str, str | int | float | bool | None] = {}
            keys = scores[0].value.keys()  # type: ignore
            for key in keys:
                max_value = max(
                    [score.value[key] for score in scores],  # type: ignore
                    key=value_to_float,  # type: ignore
                )
                dict_result[key] = max_value
            return _reduced_score(dict_result, scores)
        elif isinstance(scores[0].value, list):
            list_result: list[str | int | float | bool] = []
            list_size = len(scores[0].value)  # type: ignore
            for i in range(list_size):
                max_value = max(
                    [score.value[i] for score in scores],  # type:ignore
                    key=value_to_float,  # type: ignore
                )
                if max_value is None:
                    raise ValueError(
                        "List of scores values unexpectedly had a `None` max score"
                    )
                else:
                    list_result.append(max_value)
            return _reduced_score(list_result, scores)
        else:
            max_score = max(scores, key=lambda score: value_to_float(score.value))
            return _reduced_score(max_score.value, scores)

    return reduce


def _count_scalar(
    scores: list[Score],
    counter_fn: Callable[[Counter[str | int | float | bool]], str | int | float | bool],
) -> Score:
    r"""Counts scores and provides Counter to a counter_fn

    Args:
        scores: a list of Scores.
        counter_fn: a function which returns a scalar value based upon the counter
    """
    score_values: list[str | int | float | bool] = []
    for score in scores:
        scalar_value = score._as_scalar()
        if _is_reducible(scalar_value):
            score_values.append(scalar_value)

    # there are no reducible values
    if len(score_values) == 0:
        return _nan_score(scores)

    counts = Counter(score_values)
    return _reduced_score(counter_fn(counts), scores)


def _count_dict(
    scores: list[Score],
    counter_fn: Callable[[Counter[str | int | float | bool]], str | int | float | bool],
) -> Score:
    r"""Counts scores within a dictionary and provides Counter (for each key) to a counter_fn

    Args:
        scores: a list of Scores.
        counter_fn: a function which returns a scalar value based upon the counter
    """
    # Make sure these are all dictionaries be we proceed
    _check_value_dict(scores)

    dict_result: dict[str, str | int | float | bool] = {}
    keys = scores[0].value.keys()  # type: ignore
    for key in keys:
        key_values = []
        for score in scores:
            key_value = cast(str | int | float | bool, score.value[key])  # type: ignore
            if _is_reducible(key_value):
                key_values.append(key_value)

        # there are no reducible values
        if len(key_values) == 0:
            dict_result[key] = float("nan")
        else:
            counts: Counter[str | int | float | bool] = Counter(key_values)
            dict_result[key] = counter_fn(counts)
    return _reduced_score(
        cast(dict[str, str | int | float | bool | None], dict_result), scores
    )


def _count_list(
    scores: list[Score],
    counter_fn: Callable[[Counter[str | int | float | bool]], str | int | float | bool],
) -> Score:
    r"""Counts scores within a list and provides Counter (for each index) to a counter_fn

    Args:
        scores: a list of Scores.
        counter_fn: a function which returns a scalar value based upon the counter
    """
    # Make sure these are all lists before we continue
    _check_value_list(scores)

    list_result: list[str | int | float | bool] = []
    list_size = len(scores[0].value)  # type: ignore
    for i in range(list_size):
        index_values = []
        for score in scores:
            index_value = cast(str | int | float | bool, score.value[i])  # type:ignore
            if _is_reducible(index_value):
                index_values.append(index_value)
        if len(index_values) == 0:
            list_result.append(float("nan"))
        else:
            counts: Counter[str | int | float | bool] = Counter(index_values)
            list_result.append(counter_fn(counts))
    return _reduced_score(list_result, scores)


def _compute_dict_stat(
    scores: list[Score],
    value_to_float: ValueToFloat,
    statistic: Callable[[list[float]], float],
) -> Score:
    r"""Applies a statistic function to reduce key by key a dictionary

    Args:
        scores: a list of Scores.
        value_to_float: Function to convert the value to a float
        statistic: the statistic to apply
    """
    # Make sure these are all dictionaries be we proceed
    _check_value_dict(scores)

    dict_result: dict[str, str | int | float | bool | None] = {}
    for key in scores[0].value.keys():  # type: ignore
        values = []
        for score in scores:
            key_value = value_to_float(score.value[key])  # type: ignore
            if _is_reducible(key_value):
                values.append(value_to_float(key_value))

        if len(values) == 0:
            dict_result[key] = float("nan")
        else:
            dict_result[key] = statistic(values)
    return _reduced_score(dict_result, scores)


def _compute_list_stat(
    scores: list[Score],
    value_to_float: ValueToFloat,
    statistic: Callable[[list[float]], float],
) -> Score:
    r"""Applies a statistic function to reduce index by index a list

    Args:
        scores: a list of Scores.
        value_to_float: function to convert the value to a float
        statistic: the statistic to apply
    """
    # Make sure these are all lists before we continue
    _check_value_list(scores)

    list_result: list[str | int | float | bool] = []
    list_size = len(scores[0].value)  # type: ignore
    for i in range(list_size):
        values = []
        for score in scores:
            list_values = cast(list[str | int | float | bool], score.value)
            value = value_to_float(list_values[i])
            if _is_reducible(value):
                values.append(value)
        if len(values) == 0:
            list_result.append(float("nan"))
        else:
            list_result.append(statistic(values))
    return _reduced_score(list_result, scores)


def _compute_scalar_stat(
    scores: list[Score],
    value_to_float: ValueToFloat,
    statistic: Callable[[list[float]], float],
) -> Score:
    r"""Applies a statistic function to reduce scalar scores

    Args:
        scores: a list of Scores.
        value_to_float: function to convert the value to a float
        statistic: the statistic to apply
    """
    values = []
    for score in scores:
        if _is_reducible(value_to_float(score.value)):
            values.append(value_to_float(score.value))

    # there are no reducible values
    if len(values) == 0:
        return _nan_score(scores)

    result = statistic(values)
    return _reduced_score(result, scores)


def _check_value_dict(scores: list[Score]) -> None:
    r"""Ensure that all score values are dictionaries

    Args:
        scores: a list of Scores.
    """
    for score in scores:
        if not isinstance(score.value, dict):
            raise ValueError(
                "Attempting to reduce a dictionary score for a non-dictionary value"
            )


def _check_value_list(scores: list[Score]) -> None:
    r"""Ensure that all score values are lists

    Args:
        scores: a list of Scores.
    """
    for score in scores:
        if not isinstance(score.value, list):
            raise ValueError("Attempting to reduce a list score for a non-list value")


def _reduced_score(value: Value, scores: list[Score]) -> Score:
    r"""Create a Score based upon a single Value and list of Scores that produced it

    Args:
        value: the reduced Value
        scores: ths list of scores being reduced
    """
    return Score(
        value=value,
        # retain remaining fields only if equal across all Scores
        answer=scores[0].answer
        if len(set(score.answer for score in scores)) == 1
        else None,
        explanation=scores[0].explanation
        if len(set(score.explanation for score in scores)) == 1
        else None,
        metadata=scores[0].metadata,
    )


def _nan_score(scores: list[Score]) -> Score:
    r"""Create a NaN Score based upon a single Value and list of Scores that produced it

    Args:
        value: the reduced Value
        scores: ths list of scores being reduced
    """
    return Score(
        value=float("nan"),
        # retain remaining fields only if equal across all Scores
        answer=scores[0].answer
        if len(set(score.answer for score in scores)) == 1
        else None,
        explanation=scores[0].explanation
        if len(set(score.explanation for score in scores)) == 1
        else None,
        metadata=scores[0].metadata,
    )


def _is_reducible(value: str | int | float | bool) -> bool:
    """Check if a value is reducible (not a NaN float)."""
    return not (isinstance(value, float) and np.isnan(value))
```

## `scorer/_reducer/registry.py`

```python
import re
from typing import Any, Callable, TypeVar, cast, overload

from inspect_ai._util.error import PrerequisiteError
from inspect_ai._util.registry import (
    RegistryInfo,
    registry_add,
    registry_create,
    registry_info,
    registry_log_name,
    registry_name,
    registry_params,
    registry_tag,
    set_registry_info,
)

from .types import ScoreReducer, ScoreReducers

REDUCER_NAME = "__REDUCER_NAME__"


ScoreReducerType = TypeVar("ScoreReducerType", bound=Callable[..., ScoreReducer])


@overload
def score_reducer(func: ScoreReducerType) -> ScoreReducerType: ...


@overload
def score_reducer() -> Callable[[ScoreReducerType], ScoreReducerType]: ...


@overload
def score_reducer(*, name: str) -> Callable[[ScoreReducerType], ScoreReducerType]: ...


def score_reducer(
    func: ScoreReducerType | None = None, *, name: str | None = None
) -> Callable[[ScoreReducerType], ScoreReducerType] | ScoreReducerType:
    """Decorator for registering Score Reducers.

    Args:
        func: Function returning `ScoreReducer` targeted by
            plain task decorator without attributes (e.g. `@score_reducer`)
        name: Optional name for reducer. If the decorator has no name
            argument then the name of the function will be used to automatically assign a name.

    Returns:
        ScoreReducer with registry attributes or a decorator function.
    """

    def create_reducer_wrapper(reducer_type: ScoreReducerType) -> ScoreReducerType:
        # get the name and params
        nonlocal name
        reducer_name = name or registry_name(
            reducer_type, getattr(reducer_type, "__name__")
        )

        # create and return the wrapper
        def wrapper(*w_args: Any, **w_kwargs: Any) -> ScoreReducer:
            # create the task
            score_reducer = reducer_type(*w_args, **w_kwargs)
            # If a name has been explicitly set, use that
            reducer_nm = getattr(score_reducer, REDUCER_NAME, reducer_name)
            # tag it
            registry_tag(
                reducer_type,
                score_reducer,
                RegistryInfo(
                    type="score_reducer",
                    name=reducer_nm,
                ),
                *w_args,
                **w_kwargs,
            )
            # return it
            return score_reducer

        return reducer_register(
            score_reducer=cast(ScoreReducerType, wrapper), name=reducer_name
        )

    if func is not None:
        return create_reducer_wrapper(func)
    else:
        return create_reducer_wrapper


def reducer_register(score_reducer: ScoreReducerType, name: str) -> ScoreReducerType:
    r"""Register a task.

    Args:
        score_reducer (ReducerType):
            function that returns a Task or class
            deriving from Task
        name (str): Name of task

    Returns:
        ScoreReducer with registry attributes.
    """
    registry_add(
        score_reducer,
        RegistryInfo(type="score_reducer", name=name),
    )
    return score_reducer


def reducer_log_names(
    reducer: ScoreReducer | list[ScoreReducer] | None,
) -> list[str] | None:
    reducer = [reducer] if isinstance(reducer, ScoreReducer) else reducer
    if reducer is not None:
        names = [reducer_log_name(r) for r in reducer]
        return names
    else:
        return None


def reducer_log_name(reducer: ScoreReducer) -> str:
    name = registry_log_name(reducer)
    params = registry_params(reducer)
    if "k" in params:
        name = f"{name}_{params.get('k')}"
    return name


@overload
def create_reducers(reducers: ScoreReducers) -> list[ScoreReducer]: ...


@overload
def create_reducers(reducers: None) -> None: ...


def create_reducers(reducers: ScoreReducers | None) -> list[ScoreReducer] | None:
    if reducers is None:
        return None

    def create_reducer(name: str) -> ScoreReducer:
        # special case to get digit parameters
        params: dict[str, Any] = {}
        match = re.match(r"^(.*?)_(\d+)$", name)
        if match:
            name = match.group(1)
            params["k"] = int(match.group(2))

        return cast(
            Callable[..., ScoreReducer], registry_create("score_reducer", name)
        )(**params)

    if isinstance(reducers, ScoreReducer):
        return [reducers]
    elif isinstance(reducers, str):
        return [create_reducer(reducers)]
    else:
        return [
            r if isinstance(r, ScoreReducer) else create_reducer(r) for r in reducers
        ]


def set_reducer_name(reducer: ScoreReducer, name: str) -> None:
    info = registry_info(reducer)
    set_registry_info(
        reducer,
        RegistryInfo(
            type="score_reducer",
            name=name,
            metadata=info.metadata,
        ),
    )


def validate_reducer(epochs: int, reducer: ScoreReducer) -> None:
    params = registry_params(reducer)
    if "k" in params:
        k = int(params["k"])
        if k > epochs:
            name = registry_log_name(reducer)
            # don't interfere w/ unknown uses of 'k' (i.e. only validate built in)
            if name.startswith("pass_at") or name.startswith("at_least"):
                raise PrerequisiteError(
                    f"Reducer '{name}_{k}' requires {k} epochs however evaluation has only {epochs} epochs."
                )
```

## `scorer/_reducer/types.py`

```python
from typing import Protocol, runtime_checkable

from .._metric import Score


@runtime_checkable
class ScoreReducer(Protocol):
    def __call__(self, scores: list[Score]) -> Score:
        """Reduce a set of scores to a single score.

        Args:
          scores: List of scores.
        """
        ...

    @property
    def __name__(self) -> str: ...


ScoreReducers = str | ScoreReducer | list[str] | list[ScoreReducer]
r"""One or more score reducers."""
```

## `scorer/_score.py`

```python
from contextvars import ContextVar
from copy import copy

from inspect_ai.model._conversation import ModelConversation
from inspect_ai.model._model import sample_model_usage, sample_role_usage
from inspect_ai.solver._task_state import TaskState, sample_state

from ._metric import Score
from ._scorer import Scorer
from ._target import Target


async def score(conversation: ModelConversation) -> list[Score]:
    """Score a model conversation.

    Score a model conversation (you may pass `TaskState` or `AgentState`
    as the value for `conversation`)

    Args:
      conversation: Conversation to submit for scoring.
        Note that both `TaskState` and `AgentState` can be passed
        as the `conversation` parameter.

    Returns:
      List of scores (one for each task scorer)

    Raises:
      RuntimeError: If called from outside a task or within
        a task that does not have a scorer.

    """
    from inspect_ai.event._score import ScoreEvent
    from inspect_ai.log._transcript import transcript

    # get TaskState (if the `conversation` is a `TaskState` use it directly,
    # otherwise synthesize one)
    if isinstance(conversation, TaskState):
        state = conversation
    else:
        current_state = sample_state()
        if current_state is None:
            raise RuntimeError(
                "The score() function can only be called while executing a task"
            )
        state = copy(current_state)
        state.messages = conversation.messages
        state.output = conversation.output

    # get current scorers and target
    scorers = _scorers.get(None)
    target = _target.get(None)
    if scorers is None or target is None:
        raise RuntimeError(
            "The score() function can only be called while executing a task with a scorer."
        )

    scores: list[Score] = []
    for scorer in scorers:
        score = await scorer(state, target)
        if score is not None:
            scores.append(score)
            transcript()._event(
                ScoreEvent(
                    score=score,
                    target=target.target,
                    intermediate=True,
                    model_usage=sample_model_usage() or None,
                    role_usage=sample_role_usage() or None,
                )
            )

    return scores


def init_scoring_context(scorers: list[Scorer], target: Target) -> None:
    _scorers.set(scorers)
    _target.set(target)


_scorers: ContextVar[list[Scorer]] = ContextVar("scorers")
_target: ContextVar[Target] = ContextVar("target")
```

## `scorer/_scorer.py`

```python
from collections.abc import Mapping, Sequence
from copy import deepcopy
from dataclasses import dataclass, field
from functools import wraps
from typing import (
    Any,
    Callable,
    ParamSpec,
    Protocol,
    cast,
    runtime_checkable,
)

from inspect_ai._util._async import is_callable_coroutine
from inspect_ai._util.error import PrerequisiteError
from inspect_ai._util.registry import (
    RegistryInfo,
    is_registry_object,
    registry_add,
    registry_create,
    registry_info,
    registry_name,
    registry_params,
    registry_tag,
    registry_unqualified_name,
)
from inspect_ai.solver._task_state import TaskState

from ._metric import Metric, MetricSpec, Score, as_metric_spec
from ._target import Target


@runtime_checkable
class Scorer(Protocol):
    async def __call__(
        self,
        state: TaskState,
        target: Target,
    ) -> Score | None:
        r"""Score model outputs.

        Evaluate the passed outputs and targets and return a
        dictionary with scoring outcomes and context.

        Args:
            state: Task state
            target: Ideal target for the output.

        Examples:
          ```python
          @scorer
          def custom_scorer() -> Scorer:
              async def score(state: TaskState, target: Target) -> Score:
                  # Compare state / model output with target
                  # to yield a score
                  return Score(value=...)

              return score
          ````
        """
        ...


@dataclass(frozen=True)
class ScorerSpec:
    """Scorer specification used to (re-)create scorers."""

    scorer: str
    """Scorer name"""

    args: dict[str, Any] = field(default_factory=dict)
    """Scorer arguments."""

    metadata: dict[str, Any] | None = field(default=None)
    """Scorer metadata"""

    metrics: (
        list[MetricSpec | dict[str, list[MetricSpec]]]
        | dict[str, list[MetricSpec]]
        | None
    ) = field(default=None)
    """Scorer metrics"""


P = ParamSpec("P")


def scorer_register(
    scorer: Callable[P, Scorer], name: str = "", metadata: dict[str, Any] | None = None
) -> Callable[P, Scorer]:
    r"""Register a function or class as a scorer.

    Args:
        scorer (ScorerType):
            Scorer, function that returns a Scorer, or class
            deriving from the Scorer protocol.
        name (str): Name of scorer (Optional, defaults to object name)
        metadata (dict[str,Any]): Additional values to serialize
            in metadata.

    Returns:
        Scorer with registry attributes.
    """
    scorer_name = name if name else getattr(scorer, "__name__")
    registry_add(
        scorer,
        RegistryInfo(
            type="scorer",
            name=scorer_name,
            metadata=metadata if metadata is not None else {},
        ),
    )
    return scorer


def scorer_create(name: str, **kwargs: Any) -> Scorer:
    r"""Create a Scorer based on its registered name.

    Args:
        name (str): Name of scorer (Optional, defaults to object name)
        **kwargs (dict): Optional creation arguments for the scorer

    Returns:
        Scorer with registry info attribute
    """
    return registry_create("scorer", name, **kwargs)


def scorer(
    metrics: Sequence[Metric | Mapping[str, Sequence[Metric]]]
    | Mapping[str, Sequence[Metric]],
    name: str | None = None,
    **metadata: Any,
) -> Callable[[Callable[P, Scorer]], Callable[P, Scorer]]:
    r"""Decorator for registering scorers.

    Args:
        metrics: One or more metrics to calculate
            over the scores.
        name: Optional name for scorer. If the decorator has no name
            argument then the name of the underlying ScorerType
            object will be used to automatically assign a name.
        **metadata: Additional values to serialize
            in metadata.

    Returns:
        Scorer with registry attributes.

    Examples:
      ```python
      @scorer
      def custom_scorer() -> Scorer:
          async def score(state: TaskState, target: Target) -> Score:
              # Compare state / model output with target
              # to yield a score
              return Score(value=...)

          return score
      ````
    """

    def wrapper(scorer_type: Callable[P, Scorer]) -> Callable[P, Scorer]:
        # determine the name (explicit or implicit from object)
        scorer_name = registry_name(
            scorer_type, name if name else getattr(scorer_type, "__name__")
        )

        # wrap instantiations of scorer so they carry registry info and metrics
        @wraps(scorer_type)
        def scorer_wrapper(*args: P.args, **kwargs: P.kwargs) -> Scorer:
            scorer = scorer_type(*args, **kwargs)

            if not is_callable_coroutine(scorer):
                raise TypeError(
                    f"'{scorer_name}' is not declared as an async callable."
                )

            registry_tag(
                scorer_type,
                scorer,
                RegistryInfo(
                    type="scorer",
                    name=scorer_name,
                    metadata={SCORER_METRICS: metrics} | metadata,
                ),
                *args,
                **kwargs,
            )
            return scorer

        # register the scorer
        return scorer_register(
            scorer=cast(Callable[P, Scorer], scorer_wrapper),
            name=scorer_name,
            metadata={SCORER_METRICS: metrics} | metadata,
        )

    return wrapper


def as_scorer_spec(scorer: Scorer) -> ScorerSpec:
    if not is_registry_object(scorer):
        raise PrerequisiteError(
            f"The scorer {getattr(scorer, '__name__', '<unknown>')} was not created by a function decorated with @scorer so cannot be recorded."
        )
    name = registry_unqualified_name(scorer)
    metrics = scorer_metrics(scorer)
    resolved_metrics = resolve_metrics(metrics)

    args = registry_params(scorer)
    metadata = deepcopy(registry_info(scorer).metadata)
    del metadata[SCORER_METRICS]

    return ScorerSpec(
        scorer=name, args=args, metadata=metadata, metrics=resolved_metrics
    )


def resolve_metrics(
    metrics: list[Metric | dict[str, list[Metric]]] | dict[str, list[Metric]],
) -> (
    list[MetricSpec | dict[str, list[MetricSpec]]] | dict[str, list[MetricSpec]] | None
):
    if isinstance(metrics, list):
        resolved_metrics: list[MetricSpec | dict[str, list[MetricSpec]]] = []
        for metric_item in metrics:
            if isinstance(metric_item, Metric):
                resolved_metrics.append(as_metric_spec(metric_item))
            else:
                resolved_metrics.append(
                    {
                        metric_group: [
                            as_metric_spec(metric) for metric in metrics_list
                        ]
                        for metric_group, metrics_list in metric_item.items()
                    }
                )
        return resolved_metrics
    else:
        return {
            metric_group: [as_metric_spec(metric) for metric in metrics_list]
            for metric_group, metrics_list in metrics.items()
        }


def scorer_metrics(
    scorer: Scorer,
) -> list[Metric | dict[str, list[Metric]]] | dict[str, list[Metric]]:
    metrics_raw = registry_info(scorer).metadata[SCORER_METRICS]
    if isinstance(metrics_raw, dict):
        return cast(dict[str, list[Metric]], metrics_raw)
    else:
        return cast(list[Metric | dict[str, list[Metric]]], metrics_raw)


def unique_scorer_name(scorer: Scorer | str, already_used_names: list[str]) -> str:
    base_name = scorer if isinstance(scorer, str) else registry_unqualified_name(scorer)
    scorer_name = base_name
    count = 1
    while scorer_name in already_used_names:
        scorer_name = f"{base_name}{count}"
        count = count + 1
    return scorer_name


SCORER_METRICS = "metrics"
```

## `scorer/_scorers.py`

```python
from __future__ import annotations

from typing import TYPE_CHECKING, Sequence, TypeAlias

if TYPE_CHECKING:
    from inspect_scout import Scanner, Transcript

    from ._scorer import Scorer


Scorers: TypeAlias = (
    "Scorer" | "Scanner[Transcript]" | Sequence["Scorer" | "Scanner[Transcript]"]
)
"""Set of scorers."""
```

## `scorer/_target.py`

```python
from typing import Sequence, Union, overload


class Target(Sequence[str]):
    """Target for scoring against the current TaskState.

    Target is a sequence of one or more strings. Use the
    `text` property to access the value as a single string.
    """

    def __init__(self, target: str | list[str]) -> None:
        self.target = target if isinstance(target, list) else [target]

    @overload
    def __getitem__(self, index: int) -> str: ...

    @overload
    def __getitem__(self, index: slice) -> Sequence[str]: ...

    def __getitem__(self, index: Union[int, slice]) -> Union[str, Sequence[str]]:
        return self.target[index]

    def __len__(self) -> int:
        return len(self.target)

    @property
    def text(self) -> str:
        return "".join(self.target)
```

## `scorer/_unicode.py`

```python
from __future__ import annotations

import unicodedata
from typing import Optional, Tuple, cast


def unicode_number_to_float(s: str) -> float:
    """
    Convert a Unicode number string to a Python float.

    Supports:
      • Unicode vulgar fractions embedded in the base:  '2½', '−½', '十二⅓'
      • Superscript exponents:                          '3²', '1.5⁻³', '⅔³'
    while preserving:
      • Chinese numerals (十/百/千/万/億/兆, 零/〇/○, 两/兩, financial forms; 點/点 decimals)
      • Digits from many scripts, Unicode signs, mixed separators
      • Single-char numerics (Ⅻ, ½, ⅔, etc.)
      • ASCII scientific notation 'e'/'E' in the base

    Precedence:
      - Leading sign binds to the base, then superscript exponent is applied:
        '-2²' → (-2)**2 == 4.0;  '-½²' → (-0.5)**2 == 0.25.

    Raises ValueError if the input cannot be interpreted as a number.
    """
    if not isinstance(s, str):
        raise TypeError("Input must be a str")

    text = s.strip()
    if not text:
        raise ValueError("Empty string")

    # 1) Consume leading signs (ASCII/Unicode/Chinese). Keep sign with the base.
    text, base_is_negative = _consume_leading_signs(text)

    # 2) If what's left is a single numeric symbol (e.g., ½, Ⅻ), handle fast-path.
    single = _try_single_char_numeric(text)
    if single is not None:
        base_value = float(single)
        if base_is_negative:
            base_value = -base_value
        return base_value

    # 3) Split off a trailing superscript exponent, if present (e.g., '³', '⁻²').
    base_text, exp = _split_superscript_exponent(text)

    # 4) Parse base (no leading sign here), with optional embedded vulgar fraction.
    parsed_base_value = _parse_number_with_optional_vulgar_fraction(base_text)
    if parsed_base_value is None:
        raise ValueError(f"Could not parse number from {s!r}")
    base_value = parsed_base_value

    if base_is_negative:
        base_value = -base_value

    # 5) Apply superscript exponent if any.
    if exp is not None:
        try:
            result = base_value**exp
        except Exception as exc:
            raise ValueError(f"Invalid exponent operation for {s!r}: {exc}") from exc
        return float(result)

    return float(base_value)


# ---- Superscript exponent handling -----------------------------------------

_SUPERSCRIPT_DIGITS = set("⁰¹²³⁴⁵⁶⁷⁸⁹")
_SUPERSCRIPT_SIGNS = {"⁻", "⁺"}
_SUPERSCRIPT_TRANS = str.maketrans("⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺", "0123456789-+")


def _split_superscript_exponent(s: str) -> Tuple[str, Optional[int]]:
    """If s ends with superscript digits (optionally preceded by a superscript sign), return (base_without_exponent, exponent_int). Otherwise return (s, None).

    Whitespace at the end is ignored for detection. If removing the exponent
    would leave an empty base (e.g., '²'), we do NOT treat it as an exponent.
    """
    if not s:
        return s, None

    # Ignore trailing whitespace/group separators to find the superscript tail
    end = len(s) - 1
    while end >= 0 and (s[end].isspace() or s[end] in _GROUP_SEPARATORS):
        end -= 1
    if end < 0:
        return s.strip(), None

    j = end
    # Collect superscript digits from the end
    while j >= 0 and s[j] in _SUPERSCRIPT_DIGITS:
        j -= 1
    start = j + 1

    # No superscript digits -> no exponent
    if start > end:
        return s.strip(), None

    # Optionally include a single leading superscript sign
    if j >= 0 and s[j] in _SUPERSCRIPT_SIGNS:
        start = j

    base = s[:start].rstrip()
    exponent_text = s[start : end + 1]

    # If the base would be empty, don't treat it as an exponent (e.g., '²')
    if not base:
        return s.strip(), None

    exp_ascii = exponent_text.translate(_SUPERSCRIPT_TRANS)
    # Must contain digits (not just a '+'/'-')
    if exp_ascii in ("", "+", "-") or all(c in "+-" for c in exp_ascii):
        raise ValueError(f"Invalid exponent in {s!r}")

    try:
        exp_val = int(exp_ascii)
    except Exception:
        raise ValueError(f"Invalid exponent in {s!r}")
    return base, exp_val


# ---- Vulgar fraction handling (embedded in base) ----------------------------


def _fraction_char_value(ch: str) -> Optional[float]:
    """Return numeric value if ch is a 'vulgar fraction'-like character (0<val<1)."""
    try:
        val = unicodedata.numeric(ch)
    except Exception:
        return None
    return float(val) if 0.0 < val < 1.0 else None


def _parse_number_with_optional_vulgar_fraction(s: str) -> Optional[float]:
    """Parse a number possibly containing a single embedded vulgar fraction char.

    Examples: '2½', '１２½', '十二⅓', '½'  (signs already removed).
    """
    if not s:
        return None

    # Find any single 'fraction-like' char (0<unicodedata.numeric(ch)<1)
    frac_hits = [(i, _fraction_char_value(ch)) for i, ch in enumerate(s)]
    frac_hits = [(i, v) for i, v in frac_hits if v is not None]

    if not frac_hits:
        return _parse_core_number_no_leading_signs(s)

    if len(frac_hits) > 1:
        raise ValueError(f"Multiple fraction characters in {s!r}")

    idx, frac_val = frac_hits[0]
    head = s[:idx].strip()
    tail = s[idx + 1 :].strip()

    # The tail after a vulgar fraction must be empty or just separators/space
    if tail and any(not (c.isspace() or c in _GROUP_SEPARATORS) for c in tail):
        raise ValueError(f"Unexpected characters after fraction in {s!r}")

    # Parse the head (it might be empty, or Chinese, or any supported digits)
    if head:
        parsed_head_val = _parse_core_number_no_leading_signs(head)
        if parsed_head_val is None:
            raise ValueError(f"Invalid base part in {s!r}")
        head_val = parsed_head_val
    else:
        head_val = 0.0

    return head_val + cast(float, frac_val)


# ---- Core number parsing (no leading signs here) ----------------------------


def _parse_core_number_no_leading_signs(s: str) -> Optional[float]:
    s = s.strip()
    if not s:
        return None

    # Chinese numerals?
    if _looks_like_chinese_numeral(s):
        val = _parse_chinese_number(s)
        if val is not None:
            return float(val)

    # Generic Unicode digits with locale-like separators and ASCII e/E notation
    gen = _parse_generic_unicode_digits(s)
    if gen is not None:
        return float(gen)

    # Last-chance: a single numeric symbol (Ⅻ, Ⅴ, etc.)
    if len(s) == 1:
        return _try_single_char_numeric(s)

    return None


# ---- Shared helpers & original parsing utilities ----------------------------


def _consume_leading_signs(s: str) -> Tuple[str, bool]:
    """Remove leading plus/minus (ASCII/Unicode) and Chinese 正/负(負).

    Returns (remaining_text, is_negative).
    Multiple minus signs toggle: '−-+3' -> negative if odd number of minuses.
    """
    neg = False
    text = s.lstrip()
    while text:
        ch = text[0]
        if ch in _MINUS_CHARS or ch in _CH_NEG:
            neg = not neg
            text = text[1:].lstrip()
            continue
        if ch in _PLUS_CHARS or ch in _CH_POS:
            text = text[1:].lstrip()
            continue
        break
    return text, neg


def _try_single_char_numeric(s: str) -> Optional[float]:
    if len(s) == 1:
        try:
            return float(unicodedata.numeric(s))
        except Exception:
            return None
    return None


# Unicode signs and separators
_MINUS_CHARS = {"-", "−", "﹣", "－"}  # hyphen-minus, minus sign, small, fullwidth
_PLUS_CHARS = {"+", "＋", "﹢"}
_DECIMAL_SEP_EXTRAS = {"٫", "．"}  # Arabic decimal sep, fullwidth dot
_GROUP_SEPARATORS = {
    ",",
    "，",
    "﹐",
    "、",
    "٬",
    " ",
    "\u00a0",
    "\u202f",
    "\u2009",
    "\u2007",
    "\u2008",
    "'",
    "’",
    "ʼ",
    "＇",
}

# Chinese numerals and symbols
_CH_DIGITS = {
    "零": 0,
    "〇": 0,
    "○": 0,
    "一": 1,
    "二": 2,
    "三": 3,
    "四": 4,
    "五": 5,
    "六": 6,
    "七": 7,
    "八": 8,
    "九": 9,
    "壹": 1,
    "贰": 2,
    "貳": 2,
    "叁": 3,
    "參": 3,
    "肆": 4,
    "伍": 5,
    "陆": 6,
    "陸": 6,
    "柒": 7,
    "捌": 8,
    "玖": 9,
    "两": 2,
    "兩": 2,
    "幺": 1,
}
_CH_ALT_TENS = {"廿": 20, "卅": 30, "卌": 40}
_CH_SMALL_UNITS = {"十": 10, "拾": 10, "百": 100, "佰": 100, "千": 1000, "仟": 1000}
_CH_LARGE_UNITS = {
    "万": 10_000,
    "萬": 10_000,
    "亿": 100_000_000,
    "億": 100_000_000,
    "兆": 1_000_000_000_000,
}
_CH_NEG = {"负", "負"}
_CH_POS = {"正"}
_CH_DEC_WORDS = {"点", "點"}


def _looks_like_chinese_numeral(s: str) -> bool:
    pool = (
        set(_CH_DIGITS)
        | set(_CH_SMALL_UNITS)
        | set(_CH_LARGE_UNITS)
        | _CH_DEC_WORDS
        | _CH_NEG
        | _CH_POS
        | set(_CH_ALT_TENS)
    )
    return any(ch in pool for ch in s)


def _parse_generic_unicode_digits(s: str) -> Optional[float]:
    """Parse numbers composed of digits across scripts, with locale-ish decimal/grouping and ASCII e/E.

    Leading signs should already be removed by the caller.
    """
    s = s.strip()
    if not s:
        return None

    dot_positions = [i for i, ch in enumerate(s) if ch == "."]
    comma_positions = [i for i, ch in enumerate(s) if ch == ","]

    # Choose decimal mark heuristic
    decimal_char: Optional[str] = None
    if dot_positions and comma_positions:
        decimal_char = "." if dot_positions[-1] > comma_positions[-1] else ","
    elif dot_positions:
        decimal_char = "."
    elif comma_positions:
        last = comma_positions[-1]
        tail_digits = sum(
            1 for ch in s[last + 1 :] if _char_to_ascii_digit(ch) is not None
        )
        if tail_digits in (1, 2, 3) and "." not in s:
            decimal_char = ","

    out: list[str] = []
    seen_decimal = False
    seen_exp = False

    i = 0
    while i < len(s):
        ch = s[i]

        # ASCII scientific notation exponent
        if ch in ("e", "E") and not seen_exp:
            if not out:
                return None
            out.append(ch)
            seen_exp = True
            i += 1
            if i < len(s) and (s[i] in _PLUS_CHARS or s[i] in _MINUS_CHARS):
                out.append("+" if s[i] in _PLUS_CHARS else "-")
                i += 1
            continue

        # treat only the chosen decimal as decimal
        if ch in _DECIMAL_SEP_EXTRAS or (decimal_char and ch == decimal_char):
            if seen_decimal:
                return None  # keep strict behavior on a 2nd decimal
            out.append(".")
            seen_decimal = True
            i += 1
            continue

        # treat the *other* punctuation as grouping
        if (
            ch in _GROUP_SEPARATORS
            or ch.isspace()
            or (decimal_char and ch in {",", "."} and ch != decimal_char)
        ):
            i += 1
            continue

        # Digits across scripts
        dig = _char_to_ascii_digit(ch)
        if dig is not None:
            out.append(dig)
            i += 1
            continue

        # Whitespace → skip
        if ch.isspace():
            i += 1
            continue

        # Chinese numerals encountered → let the Chinese parser handle at higher level
        if (
            ch in _CH_DEC_WORDS
            or ch in _CH_DIGITS
            or ch in _CH_SMALL_UNITS
            or ch in _CH_LARGE_UNITS
            or ch in _CH_ALT_TENS
        ):
            return None

        # Unknown symbol → fail
        return None

    if not out or all(c in {".", "e", "E", "+", "-"} for c in out):
        return None

    try:
        return float("".join(out))
    except Exception:
        return None


def _char_to_ascii_digit(ch: str) -> Optional[str]:
    if "0" <= ch <= "9":
        return ch
    try:
        return str(unicodedata.decimal(ch))
    except Exception:
        pass
    try:
        d = unicodedata.digit(ch)
        return str(d)
    except Exception:
        pass
    if ch in _CH_DIGITS:
        return str(_CH_DIGITS[ch])
    return None


def _parse_chinese_number(s: str) -> Optional[float]:
    """Parse a Chinese numeral string (no leading sign here).

    Supports 點/点 as decimal and large units up to 兆. Does not implement '三分之二'.
    """
    if not s:
        return None

    s = s.strip()

    # Split integer / fractional on Chinese or fullwidth/ASCII dot
    integer_part = s
    frac_part = ""
    for dec in list(_CH_DEC_WORDS) + ["．", "."]:
        if dec in s:
            integer_part, _, frac_part = s.partition(dec)
            break

    # Digits-only Chinese (e.g., 二〇二五)
    if not any(
        ch in _CH_SMALL_UNITS or ch in _CH_LARGE_UNITS or ch in _CH_ALT_TENS
        for ch in integer_part
    ):
        digits = []
        for ch in integer_part:
            if ch.isspace():
                continue
            d = _char_to_ascii_digit(ch)
            if d is None:
                return None
            digits.append(d)
        int_val = int("".join(digits)) if digits else 0
    else:
        parsed_int_val = _parse_chinese_integer_with_units(integer_part)
        if parsed_int_val is None:
            return None
        int_val = parsed_int_val

    frac_val = 0.0
    if frac_part:
        base = 0.1
        for ch in frac_part:
            if ch.isspace():
                continue
            d = _char_to_ascii_digit(ch)
            if d is None:
                return None
            frac_val += int(d) * base
            base /= 10.0

    return float(int_val) + frac_val


def _parse_chinese_integer_with_units(s: str) -> Optional[int]:
    total = 0
    section = 0
    number = 0

    def flush_section_with(large_unit: Optional[int] = None) -> None:
        nonlocal total, section, number
        section += number
        number = 0
        if large_unit is None:
            total += section
            section = 0
        else:
            total += section * large_unit
            section = 0

    i = 0
    while i < len(s):
        ch = s[i]
        i += 1

        if ch.isspace():
            continue

        if ch in _CH_ALT_TENS:
            section += _CH_ALT_TENS[ch]
            continue

        if ch in ("零", "〇", "○"):
            continue

        if ch in _CH_DIGITS:
            number = _CH_DIGITS[ch]
            continue

        d = _char_to_ascii_digit(ch)
        if d is not None:
            number = int(d)
            continue

        if ch in _CH_SMALL_UNITS:
            unit_val = _CH_SMALL_UNITS[ch]
            section += (number or 1) * unit_val
            number = 0
            continue

        if ch in _CH_LARGE_UNITS:
            large_val = _CH_LARGE_UNITS[ch]
            flush_section_with(large_val)
            continue

        return None

    flush_section_with(None)
    return total
```
