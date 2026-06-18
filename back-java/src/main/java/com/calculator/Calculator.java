package com.calculator;

/** Logique métier de la calculatrice (équivalent du Calculator Node.js). */
public class Calculator {

    public double add(double a, double b) {
        return a + b;
    }

    public double subtract(double a, double b) {
        return a - b;
    }

    public double multiply(double a, double b) {
        return a * b;
    }

    public double divide(double a, double b) {
        if (b == 0) {
            throw new ArithmeticException("Division par zéro impossible.");
        }
        return a / b;
    }
}
