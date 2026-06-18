package com.calculator;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;

/** Tests unitaires de Calculator (équivalent calculator.test.js avec JUnit 5). */
class CalculatorTest {

    private Calculator calculator;

    @BeforeEach
    void setUp() {
        calculator = new Calculator();
    }

    @ParameterizedTest
    @CsvSource({"2, 3, 5", "-5, -3, -8", "7, 0, 7"})
    void add(double a, double b, double expected) {
        assertEquals(expected, calculator.add(a, b));
    }

    @Test
    void addPrecisionFlottante() {
        assertEquals(0.3, calculator.add(0.1, 0.2), 1e-9);
    }

    @ParameterizedTest
    @CsvSource({"5, 3, 2", "-10, 4, -14", "7, 7, 0", "0, 5, -5", "-3, -8, 5"})
    void subtract(double a, double b, double expected) {
        assertEquals(expected, calculator.subtract(a, b));
    }

    @ParameterizedTest
    @CsvSource({"2, 3, 6", "4, 5, 20", "10, 0, 0", "-4, 3, -12", "-6, -7, 42"})
    void multiply(double a, double b, double expected) {
        assertEquals(expected, calculator.multiply(a, b));
    }

    @ParameterizedTest
    @CsvSource({"6, 3, 2", "10, 2, 5", "5, 2, 2.5", "-9, 3, -3", "-8, -2, 4", "0, 5, 0"})
    void divide(double a, double b, double expected) {
        assertEquals(expected, calculator.divide(a, b));
    }

    @ParameterizedTest
    @ValueSource(doubles = {5, -5, 0})
    void divideByZero(double a) {
        ArithmeticException exception =
                assertThrows(ArithmeticException.class, () -> calculator.divide(a, 0));
        assertEquals("Division par zéro impossible.", exception.getMessage());
    }
}
