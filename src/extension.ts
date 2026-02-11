import * as vscode from 'vscode';

const TEST_BLOCK_RE = /^(\s*)(it|describe|context)(\.only)?\s*\(/;
const TIMES_OPEN_RE = /^(\s*)Cypress\._\.times\(\s*(\d+)\s*,\s*\(\)\s*=>\s*\{\s*$/;

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('cypressTestHelpers.toggleOnly', toggleOnly),
    vscode.commands.registerCommand('cypressTestHelpers.toggleTimes', toggleTimes),
  );
}

function findTestLine(doc: vscode.TextDocument, fromLine: number): number | null {
  for (let i = fromLine; i >= 0; i--) {
    if (TEST_BLOCK_RE.test(doc.lineAt(i).text)) return i;
  }
  return null;
}

async function toggleOnly() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  const lineNum = findTestLine(editor.document, editor.selection.active.line);
  if (lineNum === null) {
    vscode.window.showInformationMessage('No it/describe/context block found above cursor.');
    return;
  }

  const line = editor.document.lineAt(lineNum);
  const match = TEST_BLOCK_RE.exec(line.text);
  if (!match) return;

  const hasOnly = !!match[3];
  const newText = hasOnly
    ? line.text.replace(`${match[2]}.only(`, `${match[2]}(`)
    : line.text.replace(`${match[2]}(`, `${match[2]}.only(`);

  await editor.edit(eb => eb.replace(line.range, newText));
}

async function toggleTimes() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  const doc = editor.document;
  const cursorLine = editor.selection.active.line;

  // Check if already wrapped — look upward for Cypress._.times line right before an it block
  const itLine = findTestLine(doc, cursorLine);
  if (itLine === null) {
    vscode.window.showInformationMessage('No it/describe/context block found above cursor.');
    return;
  }

  // Check line above the test block for existing times wrapper
  if (itLine > 0 && TIMES_OPEN_RE.test(doc.lineAt(itLine - 1).text)) {
    await unwrapTimes(editor, itLine - 1, itLine);
    return;
  }

  // Wrap: prompt for count
  const input = await vscode.window.showInputBox({
    prompt: 'Number of times to repeat',
    value: '10',
    validateInput: v => /^\d+$/.test(v) ? null : 'Enter a number',
  });
  if (!input) return;

  await wrapWithTimes(editor, itLine, parseInt(input, 10));
}

async function wrapWithTimes(editor: vscode.TextEditor, itLineNum: number, count: number) {
  const doc = editor.document;
  const itLine = doc.lineAt(itLineNum);
  const indent = itLine.text.match(/^(\s*)/)![1];

  // Find the closing of this block by counting braces
  const closingLine = findBlockEnd(doc, itLineNum);
  if (closingLine === null) {
    vscode.window.showInformationMessage('Could not find end of test block.');
    return;
  }

  const innerIndent = indent + '\t';

  await editor.edit(eb => {
    // Insert closing line after block end: indent + "});"
    const endLine = doc.lineAt(closingLine);
    eb.insert(new vscode.Position(closingLine + 1, 0), `${indent}});\n`);

    // Re-indent all lines in the block by prepending one tab
    for (let i = itLineNum; i <= closingLine; i++) {
      const l = doc.lineAt(i);
      eb.replace(l.range, '\t' + l.text);
    }

    // Insert opening line before the it block
    eb.insert(new vscode.Position(itLineNum, 0), `${indent}Cypress._.times(${count}, () => {\n`);
  });
}

async function unwrapTimes(editor: vscode.TextEditor, timesLineNum: number, itLineNum: number) {
  const doc = editor.document;

  // Find the closing "})" of the times wrapper
  const timesClose = findBlockEnd(doc, timesLineNum);
  if (timesClose === null) {
    vscode.window.showInformationMessage('Could not find end of Cypress._.times block.');
    return;
  }

  // Dedent inner lines and remove wrapper lines
  const timesLine = doc.lineAt(timesLineNum);
  const wrapperIndent = timesLine.text.match(/^(\s*)/)![1];

  await editor.edit(eb => {
    // Remove closing line
    const closeLineRange = doc.lineAt(timesClose).rangeIncludingLineBreak;
    eb.delete(closeLineRange);

    // Dedent inner lines by removing one leading tab
    for (let i = itLineNum; i < timesClose; i++) {
      const l = doc.lineAt(i);
      const dedented = l.text.startsWith('\t') ? l.text.substring(1) : l.text;
      eb.replace(l.range, dedented);
    }

    // Remove times opening line
    eb.delete(timesLine.rangeIncludingLineBreak);
  });
}

function findBlockEnd(doc: vscode.TextDocument, startLine: number): number | null {
  let depth = 0;
  for (let i = startLine; i < doc.lineCount; i++) {
    const text = doc.lineAt(i).text;
    for (const ch of text) {
      if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) return i;
      }
    }
  }
  return null;
}

export function deactivate() {}
