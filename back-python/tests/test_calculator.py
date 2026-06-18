"""Tests unitaires de la classe Calculator (équivalent calculator.test.js)."""

import sys
from pathlib import Path

import pytest

# Permet d'importer calculator.py depuis le dossier parent
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from calculator import Calculator


@pytest.fixture
def calculator():
    return Calculator()


@pytest.mark.parametrize("a, b, expected", [(2, 3, 5), (-5, -3, -8), (7, 0, 7)])
def test_add(calculator, a, b, expected):
    assert calculator.add(a, b) == expected


def test_add_precision_flottante(calculator):
    assert calculator.add(0.1, 0.2) == pytest.approx(0.3)


@pytest.mark.parametrize(
    "a, b, expected",
    [(5, 3, 2), (-10, 4, -14), (7, 7, 0), (0, 5, -5), (-3, -8, 5)],
)
def test_subtract(calculator, a, b, expected):
    assert calculator.subtract(a, b) == expected


@pytest.mark.parametrize(
    "a, b, expected",
    [(2, 3, 6), (4, 5, 20), (10, 0, 0), (-4, 3, -12), (-6, -7, 42)],
)
def test_multiply(calculator, a, b, expected):
    assert calculator.multiply(a, b) == expected


@pytest.mark.parametrize(
    "a, b, expected",
    [(6, 3, 2), (10, 2, 5), (5, 2, 2.5), (-9, 3, -3), (-8, -2, 4), (0, 5, 0)],
)
def test_divide(calculator, a, b, expected):
    assert calculator.divide(a, b) == expected


@pytest.mark.parametrize("a", [5, -5, 0])
def test_divide_par_zero(calculator, a):
    with pytest.raises(ValueError, match="Division par zéro impossible."):
        calculator.divide(a, 0)
