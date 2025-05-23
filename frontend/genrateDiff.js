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

  let html = `
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
  </style></head><body><div class="container">`;

  html += `<div class="pane left">`;
  for (let key of allKeys) {
    const left = leftFlags.find(f => f.key === key);
    const right = rightFlags.find(f => f.key === key);
    const allProps = new Set([...Object.keys(left || {}), ...Object.keys(right || {})]);

    for (let k of allProps) {
      if (k === 'key') continue;
      const cls = compareValues(left?.[k], right?.[k]);
      html += `<div class="line ${cls}">${k}: ${left ? JSON.stringify(left[k]) : ''}</div>`;
    }
  }
  html += `</div><div class="pane right">`;

  for (let key of allKeys) {
    const left = leftFlags.find(f => f.key === key);
    const right = rightFlags.find(f => f.key === key);
    const allProps = new Set([...Object.keys(left || {}), ...Object.keys(right || {})]);

    for (let k of allProps) {
      if (k === 'key') continue;
      const cls = compareValues(left?.[k], right?.[k]);
      html += `<div class="line ${cls}">${k}: ${right ? JSON.stringify(right[k]) : ''}</div>`;
    }
  }

  html += `</div></div></body></html>`;
  fs.writeFileSync(outputPath, html, 'utf-8');
  console.log(`✅ HTML diff generated: ${outputPath}`);
}

const fs = require('fs');
const path = require('path');

function isObject(obj) {
  return obj && typeof obj === 'object' && !Array.isArray(obj);
}

function compareJson(left, right, indent = '') {
  const keys = new Set([...Object.keys(left || {}), ...Object.keys(right || {})]);
  let rows = [];

  for (let key of keys) {
    const leftVal = left ? left[key] : undefined;
    const rightVal = right ? right[key] : undefined;

    const fullKey = `${indent}${key}`;
    const keyType = isObject(leftVal) || isObject(rightVal) ? 'object' : 'primitive';

    if (keyType === 'object') {
      const children = compareJson(leftVal || {}, rightVal || {}, `${fullKey}.`);
      rows = rows.concat(children);
    } else {
      const leftDisplay = leftVal !== undefined ? JSON.stringify(leftVal) : '';
      const rightDisplay = rightVal !== undefined ? JSON.stringify(rightVal) : '';
      let cls = 'same';
      if (leftVal !== rightVal) {
        if (leftVal === undefined) cls = 'added';
        else if (rightVal === undefined) cls = 'removed';
        else cls = 'changed';
      }

      rows.push({
        key: fullKey,
        left: leftDisplay,
        right: rightDisplay,
        cls
      });
    }
  }

  return rows;
}

function generateHtmlDiff(rows, outputPath) {
  let html = `
  <html><head><meta charset="UTF-8">
  <style>
    body { font-family: monospace; background: #1e1e1e; color: #d4d4d4; margin: 0; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 6px; border: 1px solid #333; vertical-align: top; }
    .added { background-color: #144212; color: #b5f1b5; }
    .removed { background-color: #600; color: #fbb; }
    .changed { background-color: #604000; color: #ffe5b4; }
    .same { background-color: #1e1e1e; }
    th { background-color: #444; }
  </style></head><body>
  <h2 style="padding:10px;">Full JSON Diff Report</h2>
  <table>
    <tr><th>Key</th><th>Left (Source)</th><th>Right (Target)</th></tr>
  `;

  for (let row of rows) {
    html += `<tr class="${row.cls}"><td>${row.key}</td><td>${row.left}</td><td>${row.right}</td></tr>`;
  }

  html += '</table></body></html>';
  fs.writeFileSync(outputPath, html, 'utf-8');
  console.log(`✅ Diff HTML written to: ${outputPath}`);
}

// --- ENTRY POINT ---
const leftJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../backend/data/remote/umr/prod/en/en.json')));
const rightJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../backend/data/remote/umr/prod/en/migrated/en.json')));

const diffRows = compareJson(leftJson, rightJson);
generateHtmlDiff(diffRows, 'json_diff.html');

const leftJson = readJSON('left.json');
const rightJson = readJSON('right.json');
buildHTMLDiff(leftJson, rightJson, 'json_diff.html');