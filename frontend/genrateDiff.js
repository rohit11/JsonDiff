const fs = require('fs');
const path = require('path');
const { diffLines } = require('diff');

function generateSideBySideHtmlDiff(leftJson, rightJson, outputPath) {
  const leftStr = JSON.stringify(leftJson, null, 2);
  const rightStr = JSON.stringify(rightJson, null, 2);

  const leftLines = leftStr.split('\n');
  const rightLines = rightStr.split('\n');

  const maxLines = Math.max(leftLines.length, rightLines.length);
  let html = `
  <html><head><meta charset="UTF-8">
  <style>
    body { margin: 0; background: #1e1e1e; color: #ccc; font-family: monospace; }
    .container { display: flex; }
    .pane { width: 50%; white-space: pre; padding: 10px; box-sizing: border-box; }
    .line { display: block; padding: 1px 4px; }
    .added { background: #144212; color: #b5f1b5; }
    .removed { background: #600; color: #fbb; }
    .changed { background: #604000; color: #ffe5b4; }
    .same { background: #1e1e1e; }
  </style></head><body><div class="container">
    <div class="pane left">
  `;

  for (let i = 0; i < maxLines; i++) {
    const line = leftLines[i] || '';
    const match = rightLines[i] || '';

    let cls = 'same';
    if (!match) cls = 'removed';
    else if (line !== match) cls = 'changed';

    html += `<div class="line ${cls}">${line}</div>`;
  }

  html += `</div><div class="pane right">`;

  for (let i = 0; i < maxLines; i++) {
    const line = rightLines[i] || '';
    const match = leftLines[i] || '';

    let cls = 'same';
    if (!match) cls = 'added';
    else if (line !== match) cls = 'changed';

    html += `<div class="line ${cls}">${line}</div>`;
  }

  html += `</div></div></body></html>`;
  fs.writeFileSync(outputPath, html, 'utf-8');
  console.log(`✅ Side-by-side diff written to ${outputPath}`);
}

// Load and run
const left = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../backend/data/remote/umr/prod/en/en.json')));
const right = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../backend/data/remote/umr/prod/en/migrated/en.json')));
generateSideBySideHtmlDiff(left, right, 'json_diff.html');