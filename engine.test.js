"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { CalculatorEngine, format } = require("./engine.js");

function press(engine, sequence) {
  for (const step of sequence) {
    const [action, value] = step.split(":");
    switch (action) {
      case "d":
        for (const digit of value) engine.inputDigit(digit);
        break;
      case ".":
        engine.inputDecimal();
        break;
      case "op":
        engine.setOperator(value);
        break;
      case "=":
        engine.equals();
        break;
      case "%":
        engine.percent();
        break;
      case "sign":
        engine.toggleSign();
        break;
      case "back":
        engine.backspace();
        break;
      case "clear":
        engine.clear();
        break;
      default:
        throw new Error(`Unknown test action: ${action}`);
    }
  }
}

test("adds, subtracts, multiplies, and divides", () => {
  const engine = new CalculatorEngine();

  press(engine, ["d:12", "op:+", "d:8", "="]);
  assert.equal(engine.getDisplay(), "20");
  assert.equal(engine.getExpression(), "12 + 8 =");

  press(engine, ["clear", "d:9", "op:−", "d:14", "="]);
  assert.equal(engine.getDisplay(), "−5");

  press(engine, ["clear", "d:7", "op:×", "d:6", "="]);
  assert.equal(engine.getDisplay(), "42");

  press(engine, ["clear", "d:81", "op:÷", "d:9", "="]);
  assert.equal(engine.getDisplay(), "9");
});

test("keeps decimal arithmetic free of floating point noise", () => {
  const engine = new CalculatorEngine();
  press(engine, ["d:0", ".", "d:1", "op:+", "d:0", ".", "d:2", "="]);
  assert.equal(engine.getDisplay(), "0.3");
  assert.equal(engine.history[0].result, "0.3");
});

test("chains calculations immediately", () => {
  const engine = new CalculatorEngine();
  press(engine, ["d:2", "op:+", "d:3", "op:×", "d:4", "="]);
  assert.equal(engine.getDisplay(), "20");
});

test("replaces a pending operator", () => {
  const engine = new CalculatorEngine();
  press(engine, ["d:8", "op:+", "op:×", "d:3", "="]);
  assert.equal(engine.getDisplay(), "24");
});

test("repeats the last operation on repeated equals", () => {
  const engine = new CalculatorEngine();
  press(engine, ["d:5", "op:+", "d:2", "=", "=", "="]);
  assert.equal(engine.getDisplay(), "11");
  assert.equal(engine.history.length, 3);
  assert.equal(engine.history[0].expression, "9 + 2");
});

test("handles both forms of percent like a pocket calculator", () => {
  const engine = new CalculatorEngine();

  press(engine, ["d:200", "op:+", "d:10", "%", "="]);
  assert.equal(engine.getDisplay(), "220");
  assert.equal(engine.getExpression(), "200 + 10% =");
  assert.equal(engine.history[0].expression, "200 + 10%");

  press(engine, ["clear", "d:200", "op:×", "d:10", "%", "="]);
  assert.equal(engine.getDisplay(), "20");

  press(engine, ["clear", "d:50", "%"]);
  assert.equal(engine.getDisplay(), "0.5");
});

test("handles sign changes and backspace edits", () => {
  const engine = new CalculatorEngine();
  press(engine, ["d:42", "sign"]);
  assert.equal(engine.getDisplay(), "−42");
  press(engine, ["sign"]);
  assert.equal(engine.getDisplay(), "42");

  press(engine, ["back", "back"]);
  assert.equal(engine.getDisplay(), "0");
});

test("does not allow more than fifteen typed digits", () => {
  const engine = new CalculatorEngine();
  press(engine, ["d:12345678901234567890"]);
  assert.equal(engine.getDisplay(), "123,456,789,012,345");
});

test("shows an error on division by zero and recovers on a new number", () => {
  const engine = new CalculatorEngine();
  press(engine, ["d:9", "op:÷", "d:0", "="]);
  assert.equal(engine.error, true);
  assert.equal(engine.getDisplay(), "Error");
  assert.equal(engine.getExpression(), "Cannot divide by zero");
  assert.equal(engine.history.length, 0);

  press(engine, ["d:7"]);
  assert.equal(engine.error, false);
  assert.equal(engine.getDisplay(), "7");
});

test("clears the current entry but keeps history until asked", () => {
  const engine = new CalculatorEngine();
  press(engine, ["d:2", "op:+", "d:2", "="]);
  assert.equal(engine.history.length, 1);

  press(engine, ["clear"]);
  assert.equal(engine.getDisplay(), "0");
  assert.equal(engine.history.length, 1);

  engine.clearHistory();
  assert.equal(engine.history.length, 0);
});

test("loads a previous result for reuse", () => {
  const engine = new CalculatorEngine();
  press(engine, ["d:6", "op:×", "d:7", "="]);
  const result = engine.history[0].value;

  press(engine, ["clear"]);
  engine.loadValue(result);
  assert.equal(engine.getDisplay(), "42");
  assert.equal(engine.getExpression(), "");
});

test("formats grouped and exponential values", () => {
  assert.equal(format.number(1234567.89), "1,234,567.89");
  assert.equal(format.raw("0."), "0.");
  assert.equal(format.number(-1234), "−1,234");
  assert.equal(format.number(1e21), "1e+21");
});

test("supports equals before a second operand", () => {
  const engine = new CalculatorEngine();
  press(engine, ["d:5", "op:+", "="]);
  assert.equal(engine.getDisplay(), "10");
  assert.equal(engine.history[0].expression, "5 + 5");
});

test("percent rule rejects division by zero after percent", () => {
  const engine = new CalculatorEngine();
  press(engine, ["d:10", "op:÷", "d:0", "%", "="]);
  assert.equal(engine.getDisplay(), "Error");
});
