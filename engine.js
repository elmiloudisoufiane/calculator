(function (root, factory) {
  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  if (root) {
    root.CalculatorEngine = api.CalculatorEngine;
    root.CalculatorFormat = api.format;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const MAX_INPUT_DIGITS = 15;
  const MAX_HISTORY_ENTRIES = 30;
  const OPERATORS = new Set(["+", "−", "×", "÷"]);

  function countDigits(value) {
    return (value.match(/\d/g) || []).length;
  }

  function normalizeValue(value) {
    if (!Number.isFinite(value)) return value;
    if (Object.is(value, -0)) return 0;
    if (Number.isInteger(value)) return value;
    return parseFloat(value.toPrecision(12));
  }

  function numberToRaw(value) {
    if (!Number.isFinite(value)) return null;
    return String(normalizeValue(value));
  }

  /**
   * Formats a raw numeric string without turning "0." into "0" while the
   * person is still typing. Grouping separators are added for readability.
   */
  function formatRaw(raw) {
    if (raw === null || raw === undefined || raw === "") return "0";

    let value = String(raw);
    if (value === "Error") return value;

    let sign = "";
    if (value.startsWith("-")) {
      sign = "−";
      value = value.slice(1);
    }

    if (/[eE]/.test(value)) {
      const [coefficient, exponent] = value.split(/[eE]/);
      const trimmed = coefficient.includes(".")
        ? coefficient.replace(/0+$/, "").replace(/\.$/, "")
        : coefficient;
      const exponentNumber = Number(exponent);
      return `${sign}${trimmed}e${exponentNumber >= 0 ? "+" : ""}${exponentNumber}`;
    }

    const dotIndex = value.indexOf(".");
    const integerPart = dotIndex === -1 ? value : value.slice(0, dotIndex);
    const fractionPart = dotIndex === -1 ? null : value.slice(dotIndex + 1);
    const groupedInteger = (integerPart || "0").replace(/\B(?=(\d{3})+(?!\d))/g, ",");

    let output = sign + groupedInteger;
    if (fractionPart !== null) output += `.${fractionPart}`;
    return output;
  }

  function formatNumber(value) {
    if (typeof value !== "number" || !Number.isFinite(value)) return "Error";
    return formatRaw(numberToRaw(value));
  }

  class CalculatorEngine {
    constructor() {
      this.history = [];
      this.reset();
    }

    reset() {
      this.current = "0";
      this.stored = null;
      this.operator = null;
      this.waiting = false;
      this.justEvaluated = false;
      this.error = false;
      this.errorMessage = "";
      this.equation = "";
      this.lastOperator = null;
      this.lastOperand = null;
      this.percentApplied = false;
      this.percentBase = null;
    }

    clear() {
      this.reset();
    }

    clearHistory() {
      this.history = [];
    }

    getDisplay() {
      if (this.error) return "Error";
      return formatRaw(this.current);
    }

    getExpression() {
      if (this.error) return this.errorMessage;

      if (this.operator !== null && this.stored !== null) {
        const left = formatNumber(this.stored);
        if (this.waiting) return `${left} ${this.operator}`;

        const right = this.percentApplied
          ? `${formatNumber(this.percentBase)}%`
          : formatRaw(this.current);
        return `${left} ${this.operator} ${right}`;
      }

      if (this.justEvaluated && this.equation) return this.equation;
      return "";
    }

    inputDigit(digit) {
      if (!/^\d$/.test(digit)) return;

      if (this.error) this.reset();
      if (this.justEvaluated) this.reset();

      this.percentApplied = false;
      this.percentBase = null;

      if (this.waiting) {
        this.current = digit;
        this.waiting = false;
      } else if (this.current === "0") {
        this.current = digit;
      } else if (this.current === "-0") {
        this.current = `-${digit}`;
      } else if (countDigits(this.current) < MAX_INPUT_DIGITS) {
        this.current += digit;
      }
    }

    inputDecimal() {
      if (this.error) this.reset();
      if (this.justEvaluated) this.reset();

      this.percentApplied = false;
      this.percentBase = null;

      if (this.waiting) {
        this.current = "0.";
        this.waiting = false;
      } else if (!this.current.includes(".")) {
        this.current += ".";
      }
    }

    toggleSign() {
      if (this.error) return;
      if (this.waiting) return;

      if (this.justEvaluated) {
        this.justEvaluated = false;
        this.equation = "";
        this.lastOperator = null;
        this.lastOperand = null;
      }

      if (this.current === "0" || this.current === "0.") return;

      this.current = this.current.startsWith("-")
        ? this.current.slice(1)
        : `-${this.current}`;

      this.percentApplied = false;
      this.percentBase = null;
    }

    percent() {
      if (this.error || this.waiting) return;

      const value = Number(this.current);
      if (!Number.isFinite(value)) return;

      let result;
      if ((this.operator === "+" || this.operator === "−") && this.stored !== null) {
        result = (this.stored * value) / 100;
      } else {
        result = value / 100;
      }

      this.current = numberToRaw(result);
      this.percentApplied = true;
      this.percentBase = value;
      this.justEvaluated = false;
      this.equation = "";
    }

    backspace() {
      if (this.error) {
        this.reset();
        return;
      }

      if (this.justEvaluated) {
        this.reset();
        return;
      }

      if (this.waiting) return;

      this.percentApplied = false;
      this.percentBase = null;

      if (this.current.length <= 1) {
        this.current = "0";
        return;
      }

      this.current = this.current.slice(0, -1);
      if (this.current === "" || this.current === "-") this.current = "0";
    }

    setOperator(operator) {
      if (this.error || !OPERATORS.has(operator)) return;

      // Pressing another operator before entering the second number simply
      // swaps the pending operation.
      if (this.operator !== null && this.waiting) {
        this.operator = operator;
        return;
      }

      let base;

      if (this.operator !== null && this.stored !== null) {
        const outcome = this.calculate(
          this.stored,
          Number(this.current),
          this.operator
        );

        if (outcome.error) {
          this.fail(outcome.error);
          return;
        }

        base = outcome.value;
        this.current = numberToRaw(base);
      } else {
        base = Number(this.current);
      }

      if (!Number.isFinite(base)) return;

      this.stored = base;
      this.operator = operator;
      this.waiting = true;
      this.justEvaluated = false;
      this.equation = "";
      this.lastOperator = null;
      this.lastOperand = null;
      this.percentApplied = false;
      this.percentBase = null;
    }

    equals() {
      if (this.error) return;

      if (this.operator !== null && this.stored !== null) {
        const left = this.stored;
        const operator = this.operator;
        const operand = this.waiting ? this.stored : Number(this.current);
        const right = this.percentApplied && !this.waiting
          ? `${formatNumber(this.percentBase)}%`
          : formatNumber(operand);

        const outcome = this.calculate(left, operand, operator);
        if (outcome.error) {
          this.fail(outcome.error);
          return;
        }

        const expression = `${formatNumber(left)} ${operator} ${right}`;
        this.record(expression, outcome.value);

        this.current = numberToRaw(outcome.value);
        this.equation = `${expression} =`;
        this.stored = null;
        this.operator = null;
        this.waiting = false;
        this.justEvaluated = true;
        this.lastOperator = operator;
        this.lastOperand = operand;
        this.percentApplied = false;
        this.percentBase = null;
        return;
      }

      if (this.justEvaluated && this.lastOperator !== null && this.lastOperand !== null) {
        const left = Number(this.current);
        const operator = this.lastOperator;
        const operand = this.lastOperand;
        const outcome = this.calculate(left, operand, operator);

        if (outcome.error) {
          this.fail(outcome.error);
          return;
        }

        const expression = `${formatNumber(left)} ${operator} ${formatNumber(operand)}`;
        this.record(expression, outcome.value);

        this.current = numberToRaw(outcome.value);
        this.equation = `${expression} =`;
        this.justEvaluated = true;
      }
    }

    loadValue(value) {
      if (typeof value !== "number" || !Number.isFinite(value)) return;
      this.reset();
      this.current = numberToRaw(value);
    }

    calculate(left, right, operator) {
      if (operator === "÷" && right === 0) {
        return { error: "Cannot divide by zero" };
      }

      let value;
      switch (operator) {
        case "+":
          value = left + right;
          break;
        case "−":
          value = left - right;
          break;
        case "×":
          value = left * right;
          break;
        case "÷":
          value = left / right;
          break;
        default:
          return { error: "Unknown operation" };
      }

      if (!Number.isFinite(value)) {
        return { error: "Value is out of range" };
      }

      return { value: normalizeValue(value) };
    }

    record(expression, value) {
      this.history.unshift({
        expression,
        result: formatNumber(value),
        value
      });

      if (this.history.length > MAX_HISTORY_ENTRIES) {
        this.history.length = MAX_HISTORY_ENTRIES;
      }
    }

    fail(message) {
      this.error = true;
      this.errorMessage = message;
      this.current = "Error";
      this.stored = null;
      this.operator = null;
      this.waiting = false;
      this.justEvaluated = false;
      this.equation = "";
      this.percentApplied = false;
      this.percentBase = null;
    }
  }

  return {
    CalculatorEngine,
    format: {
      raw: formatRaw,
      number: formatNumber,
      maxInputDigits: MAX_INPUT_DIGITS,
      maxHistoryEntries: MAX_HISTORY_ENTRIES
    }
  };
});
