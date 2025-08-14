const fs = require('fs');
const path = require('path');

// Escape HTML entities
function escapeHtml(line) {
  return line
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Sample JSONs demonstrating all combinations
const leftJson = {
  id: "123",
  name: "John",
  status: "active",             // same
  role: "admin",                // changed
  removed_field: "old value",   // removed
  nested: {
    unchanged: "yes",
    changed: "from left"
  }
};

const rightJson = {
  id: "123",
  name: "John",
  status: "active",             // same
  role: "editor",               // changed
  added_field: "new value",     // added
  nested: {
    unchanged: "yes",
    changed: "from right"
  }
};

// Format as string arrays
const leftLines = JSON.stringify(leftJson, null, 2).split('\n');
const rightLines = JSON.stringify(rightJson, null, 2).split('\n');
const maxLines = Math.max(leftLines.length, rightLines.length);

// Start HTML output
let html = `
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { background: #1e1e1e; color: #ccc; font-family: monospace; margin: 0; }
    .container { display: flex; flex-direction: column; }
    .row { display: flex; }
    .pane {
      width: 50%;
      padding: 0 6px;
      white-space: pre-wrap;
      overflow-x: auto;
      box-sizing: border-box;
      border-right: 1px solid #444;
    }
    .line {
      padding: 2px 4px;
      min-height: 1em;
    }
    .added { background: #144212; color: #b5f1b5; }
    .removed { background: #600; color: #fbb; }
    .changed { background: #604000; color: #ffe5b4; }
    .same { background: #1e1e1e; }
    .gap { background: #333333; color: #888; font-style: italic; }
  </style>
</head>
<body>
  <div class="container">`;

// Build diff line-by-line
for (let i = 0; i < maxLines; i++) {
  const left = leftLines[i] || '';
  const right = rightLines[i] || '';

  let clsLeft = 'same';
  let clsRight = 'same';

  if (!left && right) {
    clsLeft = 'gap';
    clsRight = 'added';
  } else if (!right && left) {
    clsLeft = 'removed';
    clsRight = 'gap';
  } else if (left !== right) {
    clsLeft = 'changed';
    clsRight = 'changed';
  }

  html += `
    <div class="row">
      <div class="pane"><div class="line ${clsLeft}">${escapeHtml(left)}</div></div>
      <div class="pane"><div class="line ${clsRight}">${escapeHtml(right)}</div></div>
    </div>`;
}

html += `
  </div>
</body>
</html>`;

// Save file
fs.writeFileSync('json_diff_all_combinations.html', html, 'utf8');
console.log('✅ Diff written to json_diff_all_combinations.html');