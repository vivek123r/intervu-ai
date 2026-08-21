from app.schemas.common import CheckerKind
from app.services.coding.checkers import (
    check_custom_min_window,
    check_exact,
    check_float,
    check_result,
    check_unordered,
)


def test_check_exact():
    assert check_exact(42, 42)
    assert not check_exact(42, 43)
    assert check_exact([1, 2, 3], [1, 2, 3])
    assert not check_exact([1, 2], [1, 2, 3])
    assert check_exact({"a": 1, "b": [2, 3]}, {"a": 1, "b": [2, 3]})
    assert not check_exact({"a": 1}, {"a": 2})
    assert check_exact(None, None)
    assert not check_exact(None, 0)


def test_check_float():
    assert check_float(3.1415926, 3.1415927)
    assert not check_float(3.14, 3.15)
    assert check_float([1.0000001, 2.0], [1.0000002, 2.0])
    assert check_result(CheckerKind.FLOAT, 2.5, 2.5)


def test_check_unordered():
    # 1D list
    assert check_unordered([1, 2, 3], [3, 1, 2])
    assert not check_unordered([1, 2, 3], [1, 2, 4])

    # 2D list (e.g. 3Sum)
    a = [[-1, 0, 1], [-1, -1, 2]]
    b = [[-1, 2, -1], [1, 0, -1]]
    assert check_unordered(a, b)

    # 2D strings (e.g. Group Anagrams)
    g1 = [["bat"], ["nat", "tan"], ["ate", "eat", "tea"]]
    g2 = [["eat", "tea", "ate"], ["tan", "nat"], ["bat"]]
    assert check_unordered(g1, g2)


def test_check_custom_min_window():
    s = "ADOBECODEBANC"
    t = "ABC"
    expected = "BANC"

    assert check_custom_min_window("BANC", expected, [s, t])
    # Different window of same valid length containing all chars
    assert not check_custom_min_window("CODEBA", expected, [s, t])  # longer length
    assert not check_custom_min_window("BANE", expected, [s, t])  # not in s
    assert check_custom_min_window("", "", ["a", "b"])
