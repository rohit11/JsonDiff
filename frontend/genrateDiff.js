const fs = require('fs');
const path = require('path');

// Escape HTML characters to safely render in browser
function escapeHtml(str) {
  return str.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
}

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
    .pane { width: 50%; white-space: pre; padding: 10px; box-sizing: border-box; overflow-x: auto; }
    .line {
      display: block;
      padding: 1px 4px;
      min-height: 1em;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .added { background: #144212; color: #b5f1b5; }
    .removed { background: #600; color: #fbb; }
    .changed { background: #604000; color: #ffe5b4; }
    .same { background: #1e1e1e; }
  </style></head><body><div class="container">
    <div class="pane left">
  `;

  // LEFT SIDE
  for (let i = 0; i < maxLines; i++) {
    const leftLine = escapeHtml(leftLines[i] || '');
    const rightLine = escapeHtml(rightLines[i] || '');

    let cls = 'same';
    if (!rightLines[i]) cls = 'removed';
    else if (leftLine !== rightLine) cls = 'changed';

    html += `<div class="line ${cls}">${leftLine}</div>`;
  }

  html += `</div><div class="pane right">`;

  // RIGHT SIDE
  for (let i = 0; i < maxLines; i++) {
    const leftLine = escapeHtml(leftLines[i] || '');
    const rightLine = escapeHtml(rightLines[i] || '');

    let cls = 'same';
    if (!leftLines[i]) cls = 'added';
    else if (leftLine !== rightLine) cls = 'changed';

    html += `<div class="line ${cls}">${rightLine}</div>`;
  }

  html += `</div></div></body></html>`;
  fs.writeFileSync(outputPath, html, 'utf-8');
  console.log(`✅ Side-by-side diff written to: ${outputPath}`);
}

// --- ENTRY POINT ---
// Update these paths based on your folder structure
const leftJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../backend/data/remote/umr/prod/en/en.json')));
const rightJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../backend/data/remote/umr/prod/en/migrated/en.json')));

generateSideBySideHtmlDiff(leftJson, rightJson, 'json_diff.html');