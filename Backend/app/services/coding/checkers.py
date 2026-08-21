import math
from collections import Counter
from typing import Any

from app.schemas.common import CheckerKind


def is_float(val: Any) -> bool:
    return isinstance(val, float) or (isinstance(val, int) and not isinstance(val, bool))


def normalize_unordered(val: Any) -> Any:
    """Recursively normalizes collections for order-independent comparison."""
    if isinstance(val, list):
        normalized_items = [normalize_unordered(item) for item in val]
        # Try sorting the items
        try:
            return sorted(normalized_items, key=lambda x: str(x))
        except TypeError:
            return normalized_items
    elif isinstance(val, tuple):
        return tuple(normalize_unordered(item) for item in val)
    return val


def check_exact(actual: Any, expected: Any) -> bool:
    if actual == expected:
        return True
    if isinstance(actual, list) and isinstance(expected, list):
        if len(actual) != len(expected):
            return False
        return all(check_exact(a, e) for a, e in zip(actual, expected, strict=False))
    if isinstance(actual, dict) and isinstance(expected, dict):
        if set(actual.keys()) != set(expected.keys()):
            return False
        return all(check_exact(actual[k], expected[k]) for k in actual)
    return False


def check_float(actual: Any, expected: Any, tol: float = 1e-5) -> bool:
    if is_float(actual) and is_float(expected):
        return math.isclose(float(actual), float(expected), abs_tol=tol, rel_tol=tol)
    if isinstance(actual, list) and isinstance(expected, list):
        if len(actual) != len(expected):
            return False
        return all(check_float(a, e, tol) for a, e in zip(actual, expected, strict=False))
    return check_exact(actual, expected)


def check_unordered(actual: Any, expected: Any) -> bool:
    if not isinstance(actual, list) or not isinstance(expected, list):
        return check_exact(actual, expected)
    norm_actual = normalize_unordered(actual)
    norm_expected = normalize_unordered(expected)
    return check_exact(norm_actual, norm_expected)


def check_custom_min_window(
    actual: Any, expected: Any, input_args: list[Any] | None = None
) -> bool:
    if not isinstance(actual, str) or not isinstance(expected, str):
        return check_exact(actual, expected)
    if expected == "":
        return actual == ""
    if len(actual) != len(expected):
        return False
    if input_args and len(input_args) >= 2:
        s, t = input_args[0], input_args[1]
        if isinstance(s, str) and isinstance(t, str):
            if actual not in s:
                return False
            actual_counts = Counter(actual)
            target_counts = Counter(t)
            return all(actual_counts[ch] >= count for ch, count in target_counts.items())
    return actual == expected


def check_result(
    checker_kind: CheckerKind,
    actual: Any,
    expected: Any,
    input_args: list[Any] | None = None,
) -> bool:
    if checker_kind == CheckerKind.FLOAT:
        return check_float(actual, expected)
    elif checker_kind == CheckerKind.UNORDERED:
        return check_unordered(actual, expected)
    elif checker_kind == CheckerKind.CUSTOM_MIN_WINDOW:
        return check_custom_min_window(actual, expected, input_args)
    else:
        return check_exact(actual, expected)
