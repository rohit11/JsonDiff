const fs = require('fs');
const path = require('path');

function readJSON(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function compareValues(left, right) {
  if (left === right) return 'same';
  if (left === undefined) return 'added';
  if (right === undefined) return 'removed';
  return 'changed';
}

function buildHTMLDiff(leftJson, rightJson, outputPath) {
  const leftFlags = leftJson['feature-flags'] || [];
  const rightFlags = rightJson['feature-flags'] || [];
  const allKeys = new Set([...leftFlags.map(f => f.key), ...rightFlags.map(f => f.key)]);

  let html = \`
  <html><head><meta charset="UTF-8">
  <style>
    body { font-family: monospace; background: #1e1e1e; color: #d4d4d4; margin: 0; }
    .container { display: flex; }
    .pane { width: 50%; padding: 10px; box-sizing: border-box; white-space: pre-wrap; }
    .line { padding: 2px; }
    .same { background: #1e1e1e; }
    .added { background: #144212; color: #b5f1b5; }
    .removed { background: #600; color: #fbb; }
    .changed { background: #604000; color: #ffe5b4; }
  </style></head><body><div class="container">\`;

  html += \`<div class="pane left">\`;
  for (let key of allKeys) {
    const left = leftFlags.find(f => f.key === key);
    const right = rightFlags.find(f => f.key === key);
    if (!left) continue;
    for (let k in left) {
      if (k === 'key') continue;
      const cls = compareValues(left[k], right?.[k]);
      html += \`<div class="line \${cls}">\${k}: \${JSON.stringify(left[k])}</div>\`;
    }
    html += \`<div class="line same">---</div>\`;
  }
  html += \`</div><div class="pane right">\`;

  for (let key of allKeys) {
    const left = leftFlags.find(f => f.key === key);
    const right = rightFlags.find(f => f.key === key);
    if (!right) continue;
    for (let k in right) {
      if (k === 'key') continue;
      const cls = compareValues(left?.[k], right[k]);
      html += \`<div class="line \${cls}">\${k}: \${JSON.stringify(right[k])}</div>\`;
    }
    html += \`<div class="line same">---</div>\`;
  }

  html += \`</div></div></body></html>\`;

  fs.writeFileSync(outputPath, html, 'utf-8');
  console.log(\`â HTML diff generated: \${outputPath}\`);
}

const leftJson = readJSON('left.json');
const rightJson = readJSON('right.json');
buildHTMLDiff(leftJson, rightJson, 'json_diff.html');