const fs = require('fs');
const path = require('path');

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
    .container { display: flex; flex-direction: column; }
    .row { display: flex; width: 100%; }
    .pane {
      width: 50%;
      box-sizing: border-box;
      padding: 0;
      white-space: pre-wrap;
      overflow-x: auto;
    }
    .line {
      padding: 2px 6px;
      font-family: monospace;
      min-height: 1em;
    }
    .added { background: #144212; color: #b5f1b5; }
    .removed { background: #600; color: #fbb; }
    .changed { background: #604000; color: #ffe5b4; }
    .same { background: #1e1e1e; }
  </style>
  </head><body><div class="container">`;

  for (let i = 0; i < maxLines; i++) {
    const leftLine = escapeHtml(leftLines[i] || '');
    const rightLine = escapeHtml(rightLines[i] || '');

    let cls = 'same';
    if (!rightLines[i]) cls = 'removed';
    else if (!leftLines[i]) cls = 'added';
    else if (leftLine !== rightLine) cls = 'changed';

    html += `
      <div class="row">
        <div class="pane"><div class="line ${cls}">${leftLine}</div></div>
        <div class="pane"><div class="line ${cls}">${rightLine}</div></div>
      </div>`;
  }

  html += `</div></body></html>`;
  fs.writeFileSync(outputPath, html, 'utf-8');
  console.log(`✅ Diff written to: ${outputPath}`);
}

// --- ENTRY POINT ---
const leftJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../backend/data/remote/umr/prod/en/en.json')));
const rightJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../backend/data/remote/umr/prod/en/migrated/en.json')));
generateSideBySideHtmlDiff(leftJson, rightJson, 'json_diff.html');