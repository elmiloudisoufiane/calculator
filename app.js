(() => {
  "use strict";

  const engine = new window.CalculatorEngine();
  const root = document.documentElement;
  const calculator = document.querySelector(".calculator");
  const resultEl = document.getElementById("result");
  const expressionEl = document.getElementById("expression");
  const backspaceButton = document.getElementById("backspace");
  const historyToggle = document.getElementById("history-toggle");
  const historyPanel = document.getElementById("history-panel");
  const historyList = document.getElementById("history-list");
  const historyEmpty = document.getElementById("history-empty");
  const historyCount = document.getElementById("history-count");
  const clearHistoryButton = document.getElementById("clear-history");
  const themeToggle = document.getElementById("theme-toggle");
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  const actionButtons = Array.from(document.querySelectorAll("[data-action]"));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  function resultSize(text) {
    const length = text.length;
    if (length <= 10) return "lg";
    if (length <= 13) return "md";
    if (length <= 16) return "sm";
    if (length <= 20) return "xs";
    return "xxs";
  }

  function render(options = {}) {
    const display = engine.getDisplay();
    const expression = engine.getExpression();

    resultEl.textContent = display;
    resultEl.dataset.size = engine.error ? "lg" : resultSize(display);
    resultEl.title = display.length > 14 ? display : "";
    resultEl.setAttribute(
      "aria-label",
      engine.error ? expression : display
    );

    expressionEl.textContent = expression || "\u00a0";
    expressionEl.title = expression.length > 34 ? expression : "";
    calculator.classList.toggle("has-error", engine.error);

    if (options.pop && !engine.error) {
      resultEl.classList.remove("is-popping");
      void resultEl.offsetWidth;
      resultEl.classList.add("is-popping");
    }
  }

  function renderHistory() {
    const entries = engine.history;
    const count = entries.length;

    historyCount.textContent = String(count);
    historyCount.hidden = count === 0;
    clearHistoryButton.disabled = count === 0;
    historyEmpty.hidden = count > 0;
    historyList.replaceChildren();

    const fragment = document.createDocumentFragment();

    entries.forEach((entry) => {
      const wrapper = document.createElement("div");
      wrapper.className = "history-entry";
      wrapper.setAttribute("role", "listitem");

      const button = document.createElement("button");
      button.type = "button";
      button.className = "history-entry-button";
      button.setAttribute(
        "aria-label",
        `Reuse ${entry.result} from ${entry.expression}`
      );

      const expression = document.createElement("span");
      expression.className = "history-expression";
      expression.textContent = entry.expression;

      const result = document.createElement("span");
      result.className = "history-result";
      result.textContent = entry.result;

      button.append(expression, result);
      button.addEventListener("click", (event) => {
        engine.loadValue(entry.value);
        render({ pop: true });

        if (window.matchMedia("(max-width: 860px)").matches) {
          setHistoryOpen(false);
        }

        if (event.detail > 0) button.blur();
      });

      wrapper.append(button);
      fragment.append(wrapper);
    });

    historyList.append(fragment);
    updateHistoryIndicator();
  }

  function updateHistoryIndicator() {
    const isOpen = root.classList.contains("history-open");
    historyToggle.classList.toggle(
      "has-unread",
      engine.history.length > 0 && !isOpen
    );
  }

  function setHistoryOpen(isOpen, options = {}) {
    root.classList.toggle("history-open", isOpen);
    historyToggle.classList.toggle("is-active", isOpen);
    historyToggle.setAttribute("aria-expanded", String(isOpen));
    historyToggle.setAttribute(
      "aria-label",
      isOpen ? "Hide calculation history" : "Show calculation history"
    );
    historyPanel.setAttribute("aria-hidden", String(!isOpen));
    updateHistoryIndicator();

    if (isOpen && options.focus) {
      const firstEntry = historyList.querySelector("button");
      if (firstEntry) firstEntry.focus({ preventScroll: true });
    }
  }

  function setTheme(theme, persist = true) {
    const nextTheme = theme === "light" ? "light" : "dark";
    root.dataset.theme = nextTheme;

    const isDark = nextTheme === "dark";
    themeToggle.setAttribute(
      "aria-label",
      isDark ? "Switch to light theme" : "Switch to dark theme"
    );
    themeToggle.title = isDark ? "Switch to light theme" : "Switch to dark theme";
    themeMeta?.setAttribute("content", isDark ? "#090a0f" : "#f0ede7");

    if (persist) {
      try {
        localStorage.setItem("calculator-theme", nextTheme);
      } catch (_) {
        // The theme still applies for this page view when storage is blocked.
      }
    }
  }

  function flash(button) {
    if (!button) return;
    button.classList.add("is-pressed");
    window.clearTimeout(button._pressTimer);
    button._pressTimer = window.setTimeout(() => {
      button.classList.remove("is-pressed");
    }, reduceMotion.matches ? 20 : 115);
  }

  function perform(action, value) {
    const previousTopEntry = engine.history[0];

    switch (action) {
      case "digit":
        engine.inputDigit(value);
        break;
      case "decimal":
        engine.inputDecimal();
        break;
      case "operator":
        engine.setOperator(value);
        break;
      case "equals":
        engine.equals();
        break;
      case "percent":
        engine.percent();
        break;
      case "sign":
        engine.toggleSign();
        break;
      case "backspace":
        engine.backspace();
        break;
      case "clear":
        engine.clear();
        break;
      default:
        return;
    }

    render({ pop: action === "equals" });

    if (engine.history[0] !== previousTopEntry) {
      renderHistory();
    }
  }

  actionButtons.forEach((button) => {
    button.addEventListener("click", (event) => {
      perform(button.dataset.action, button.dataset.value);
      if (event.detail > 0) button.blur();
    });
  });

  backspaceButton.addEventListener("click", (event) => {
    perform("backspace");
    if (event.detail > 0) backspaceButton.blur();
  });

  historyToggle.addEventListener("click", (event) => {
    setHistoryOpen(!root.classList.contains("history-open"));
    if (event.detail > 0) historyToggle.blur();
  });

  clearHistoryButton.addEventListener("click", (event) => {
    engine.clearHistory();
    renderHistory();
    if (event.detail > 0) clearHistoryButton.blur();
  });

  themeToggle.addEventListener("click", (event) => {
    setTheme(root.dataset.theme === "dark" ? "light" : "dark");
    if (event.detail > 0) themeToggle.blur();
  });

  function findActionButton(action, value) {
    return actionButtons.find((button) => {
      if (button.dataset.action !== action) return false;
      return value === undefined || button.dataset.value === value;
    });
  }

  window.addEventListener("keydown", (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;

    const target = event.target;
    const focusedButton = target instanceof Element
      ? target.closest("button")
      : null;

    // Let the browser natively activate a focused button when Enter or Space
    // is pressed, so tabbing through the interface keeps working normally.
    if ((event.key === "Enter" || event.key === " ") && focusedButton) {
      return;
    }

    let action = null;
    let value;
    let button = null;

    if (/^\d$/.test(event.key)) {
      action = "digit";
      value = event.key;
      button = findActionButton("digit", value);
    } else if (event.key === "." || event.key === ",") {
      action = "decimal";
      button = findActionButton("decimal");
    } else if (event.key === "+" || event.key === "-") {
      action = "operator";
      value = event.key === "-" ? "−" : "+";
      button = findActionButton("operator", value);
    } else if (event.key === "*" || event.key === "x" || event.key === "X") {
      action = "operator";
      value = "×";
      button = findActionButton("operator", value);
    } else if (event.key === "/") {
      action = "operator";
      value = "÷";
      button = findActionButton("operator", value);
    } else if (event.key === "Enter" || event.key === "=") {
      action = "equals";
      button = findActionButton("equals");
    } else if (event.key === "Backspace") {
      action = "backspace";
      button = backspaceButton;
    } else if (event.key === "%") {
      action = "percent";
      button = findActionButton("percent");
    } else if (
      event.key === "Escape" ||
      event.key === "Delete" ||
      event.key === "c" ||
      event.key === "C"
    ) {
      action = "clear";
      button = findActionButton("clear");
    }

    if (!action) return;

    event.preventDefault();
    perform(action, value);
    flash(button);
  });

  const initialTheme = root.dataset.theme === "light" ? "light" : "dark";
  setTheme(initialTheme, false);
  setHistoryOpen(root.classList.contains("history-open"));
  render();
  renderHistory();
})();
