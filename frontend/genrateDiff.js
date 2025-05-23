const fs = require('fs');
const path = require('path');
const jsondiffpatch = require('jsondiffpatch');

const left = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../backend/data/remote/umr/prod/en/en.json')));
const right = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../backend/data/remote/umr/prod/en/migrated/en.json')));

// Configure diff patcher
const diffpatcher = jsondiffpatch.create({
  objectHash: function(obj, index) {
    return obj.id || obj.key || index;
  },
  arrays: { detectMove: false },
});

// Compute diff
const delta = diffpatcher.diff(left, right);

// Generate HTML diff
const html = jsondiffpatch.formatters.html.format(delta, left);

// Save output
const outputPath = 'json_diff_structured.html';
fs.writeFileSync(outputPath, `
<html>
  <head>
    <meta charset="utf-8">
    <style>${jsondiffpatch.formatters.html.css}</style>
  </head>
  <body>
    <h2>Structured JSON Diff (Left vs Right)</h2>
    ${html}
  </body>
</html>
`);

console.log(`✅ Structured diff saved to ${outputPath}`);