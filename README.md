# CypressTestHelpers

A lightweight VSCode extension that provides keyboard shortcuts for common Cypress test modifications.

## Features

### Toggle `.only` — `Ctrl+Alt+O`

Adds or removes `.only` from the nearest `it`, `describe`, or `context` block above your cursor.

```js
// Before
it('should load the page', () => {

// After
it.only('should load the page', () => {
```

### Wrap with `Cypress._.times()` — `Ctrl+Alt+P`

Wraps the nearest test block with `Cypress._.times(N, () => { ... })` to repeat it multiple times. Prompts for the repeat count. Run again to unwrap.

```js
// Before
it('should load the page', () => {
  cy.visit('/');
});

// After (with count = 10)
Cypress._.times(10, () => {
  it('should load the page', () => {
    cy.visit('/');
  });
});
```

## Supported File Types

`.js`, `.ts`, `.jsx`, `.tsx`

## Installation

### From source

```bash
git clone <repo-url>
cd cypress-test-helpers
npm install
npm run compile
```

Then press `F5` in VSCode to launch the Extension Development Host.

### From VSIX

```bash
npm install -g @vscode/vsce
vsce package
```

Install the generated `.vsix` via **Extensions** > `...` > **Install from VSIX...**

## License

[MIT](LICENSE.md)
