"""Logique métier de la calculatrice (équivalent du Calculator Node.js)."""


class Calculator:
    def add(self, a, b):
        return a + b

    def subtract(self, a, b):
        return a - b

    def multiply(self, a, b):
        return a * b

    def divide(self, a, b):
        if b == 0:
            raise ValueError("Division par zéro impossible.")
        return a / b
