const Calculator = require('../src/calculator');

describe('Calculator', () => {
    let calculator;

    beforeEach(() => {
        calculator = new Calculator();
    });

    describe('add', () => {
        it.each`
            a | b | expected
            ${2} | ${3} | ${5}
            ${-5} | ${-3} | ${-8}
            ${7} | ${0} | ${7}
        `("devrait retourner $a + $b = $expected", ({ a, b, expected }) => {
            expect(calculator.add(a, b)).toBe(expected);
        });
        it.each`
            a | b | expected
            ${0.1} | ${0.2} | ${0.3000000}
        `("devrait retourner $a + $b = $expected (précision flottante)", ({ a, b, expected }) => {
            expect(calculator.add(a, b)).toBeCloseTo(expected);
        });
    });

    describe('subtract', () => {
        it.each`
            a | b | expected
            ${5} | ${3} | ${2}
            ${-10} | ${4} | ${-14}
            ${3} | ${5} | ${-2}
            ${0} | ${0} | ${0}
            ${-5} | ${-3} | ${-2}
        `('calcule la différence de $a et $b', ({ a, b, expected }) => {
            expect(calculator.subtract(a, b)).toBe(expected);
        });
    });

    describe('multiply', () => {
        it.each`
            a | b | expected
            ${2} | ${3} | ${6}
            ${4} | ${5} | ${20}
            ${-2} | ${3} | ${-6}
            ${-4} | ${-5} | ${20}
            ${7} | ${0} | ${0}
        `('calcule le produit de $a et $b', ({ a, b, expected }) => {
            expect(calculator.multiply(a, b)).toBe(expected);
        });
    });

    describe('divide', () => {
        it.each`
            a | b | expected
            ${6} | ${3} | ${2}
            ${10} | ${2} | ${5}
            ${-10} | ${2} | ${-5}
            ${9} | ${-3} | ${-3}
            ${0} | ${5} | ${0}
        `('calcule le quotient de $a et $b', ({ a, b, expected }) => {
            expect(calculator.divide(a, b)).toBe(expected);
        });

        it.each`
            a | b | expected
            ${1} | ${3} | ${0.3333333}
        `('calcule le quotient décimal de $a et $b', ({ a, b, expected }) => {
            expect(calculator.divide(a, b)).toBeCloseTo(expected);
        });

        it('lance une erreur lors de la division par zéro', () => {
            expect(() => calculator.divide(5, 0)).toThrow("Division par zéro impossible.");
        });
    });

});