# Calculator

A dependency-free calculator with a keyboard-friendly interface, calculation history, and light and dark themes.

## Use it

- Open `../calculator.html` for the standalone single-file version.
- Or open `index.html` to run the version that loads the separate source files.

Both work offline in a modern browser. No build step or server is required.

## Features

- Add, subtract, multiply, and divide
- Decimals, sign toggle, percentages, backspace, and repeated equals
- Immediate calculation history; click any result to reuse it
- Full keyboard support
- Light and dark themes, remembered between visits
- Responsive layout and accessible button labels
- Division-by-zero and overflow handling

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `0`–`9` | Enter digits |
| `.` or `,` | Decimal point |
| `+`, `-`, `*`, `/` | Operators |
| `Enter` or `=` | Equals |
| `%` | Percent |
| `Backspace` | Delete the last digit |
| `Esc`, `Delete`, or `C` | Clear |

## Development

The engine is independent of the DOM and has unit tests:

```powershell
node engine.test.js
```

Rebuild the standalone file after changing the source:

```powershell
node build.mjs
```

Files:

- `index.html` — page structure
- `styles.css` — visual design and responsive layout
- `engine.js` — calculation engine and number formatting
- `app.js` — DOM wiring, history rendering, themes, and keyboard input
- `engine.test.js` — engine unit tests
- `build.mjs` — inlines sources into `../calculator.html`
