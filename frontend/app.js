// ✅ Global Variables
let sourceData = {};
let targetData = {};
let rowsPerPage = 20;
const excludeTables = ['audit_log', 'tracking_history'];
const excludeKeys = ['lastUpdated', 'timestamp', 'id'];
const tableFilteredRows = {};

const tablePrimaryKeys = {
  key: 'key',
  // fallback handled if missing
};

// ✅ Utility Functions
function capitalizeFirstLetter(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function hasDifferences(sourceRow, targetRow) {
  for (const key in sourceRow) {
    if (excludeKeys.includes(key)) continue;
    if ((sourceRow[key] || '') !== (targetRow[key] || '')) {
      return true;
    }
  }
  return false;
}

function showLoading(show) {
  document.getElementById('loading').style.display = show ? 'flex' : 'none';
}

function clearAllSelections() {
  document.querySelectorAll('.tableCheckbox, .columnCheckbox').forEach(cb => cb.checked = false);
}

function bindAccordionHandlers() {
  document.querySelectorAll('.accordion-header').forEach(header => {
    header.onclick = () => {
      const content = header.nextElementSibling;
      if (content.style.display === 'block') {
        content.style.display = 'none';
        header.innerHTML = header.innerHTML.replace('▼', '▶');
      } else {
        content.style.display = 'block';
        header.innerHTML = header.innerHTML.replace('▶', '▼');
      }
    };
  });
}

function toggleAllTables(expand) {
  document.querySelectorAll('.accordion-content').forEach(content => {
    const header = content.previousElementSibling;
    if (expand) {
      content.style.display = 'block';
      header.innerHTML = header.innerHTML.replace('▶', '▼');
    } else {
      content.style.display = 'none';
      header.innerHTML = header.innerHTML.replace('▼', '▶');
    }
  });
}

function bindSelectionGuards() {
  document.querySelectorAll('.columnCheckbox').forEach(rowCb => {
    rowCb.addEventListener('change', () => {
      const table = rowCb.dataset.table;
      const key = rowCb.dataset.key;
      const cellCbs = document.querySelectorAll(`.cellCheckbox[data-table='${table}'][data-key='${key}']`);
      if (rowCb.checked && [...cellCbs].some(cb => cb.checked)) {
        alert('⚠️ Cannot select full row and individual columns in the same row.');
        rowCb.checked = false;
      }
    });
  });

  document.querySelectorAll('.cellCheckbox').forEach(cellCb => {
    cellCb.addEventListener('change', () => {
      const table = cellCb.dataset.table;
      const key = cellCb.dataset.key;
      const rowCb = document.querySelector(`.columnCheckbox[data-table='${table}'][data-key='${key}']`);
      if (cellCb.checked && rowCb?.checked) {
        alert('⚠️ Cannot select individual column when full row is selected.');
        cellCb.checked = false;
      }
    });
  });
}

// ✅ Load Data
async function loadTables() {
  showLoading(true);
  console.log('inside loadTables');

  const sourceEnv = document.getElementById('sourceEnv').value;
  const targetEnv = document.getElementById('targetEnv').value;

  console.log(sourceEnv);
  console.log(targetEnv);

  const [sourceRes, targetRes] = await Promise.all([
    fetch(`/env-data?env=${sourceEnv}`),
    fetch(`/env-data?env=${targetEnv}`)
  ]);

  sourceData = await sourceRes.json();
  targetData = await targetRes.json();

  showLoading(false);

  document.getElementById('tables').innerHTML = '';

  addSearchBox();
  filterAndRenderTables();
}

// ✅ Search Box
function addSearchBox() {
  const tablesDiv = document.getElementById('tables');
  const searchBox = document.createElement('input');
  searchBox.type = 'text';
  searchBox.id = 'searchBox';
  searchBox.placeholder = 'Search tables...';
  searchBox.style.marginBottom = '10px';
  searchBox.style.width = '100%';
  searchBox.addEventListener('input', filterAndRenderTables);
  tablesDiv.appendChild(searchBox);
}

// ✅ Full Source Table Filtering + Rendering
function filterAndRenderTables() {
  const tablesDiv = document.getElementById('tables');
  const searchValue = document.getElementById('searchBox')?.value?.toLowerCase() || '';
  const filterValue = document.getElementById('filterSelect')?.value || 'all';

  tablesDiv.querySelectorAll('.table-container').forEach(c => c.remove());
  Object.keys(tableFilteredRows).forEach(key => delete tableFilteredRows[key]);

  const allTableNames = new Set([...Object.keys(sourceData), ...Object.keys(targetData)]);

  for (const tableName of allTableNames) {
    if (searchValue && !tableName.toLowerCase().includes(searchValue)) continue;

    const sourceRows = sourceData[tableName] || [];
    const targetRows = targetData[tableName] || [];

    const sourceMap = new Map(sourceRows.map(r => [r.key, r]));
    const targetMap = new Map(targetRows.map(r => [r.key, r]));

    const allKeys = new Set([...sourceMap.keys(), ...targetMap.keys()]);

    const filteredRows = [];

    for (const key of allKeys) {
      const sourceRow = sourceMap.get(key);
      const targetRow = targetMap.get(key);

      const isMissingInTarget = sourceRow && !targetRow;
      const isMissingInSource = targetRow && !sourceRow;
      const isDiff = sourceRow && targetRow && hasDifferences(sourceRow, targetRow);
      const isSame = sourceRow && targetRow && !isDiff;

      if (filterValue === 'all') filteredRows.push({ sourceRow, targetRow });
      else if (filterValue === 'diff' && isDiff) filteredRows.push({ sourceRow, targetRow });
      else if (filterValue === 'missing' && (isMissingInTarget || isMissingInSource)) filteredRows.push({ sourceRow, targetRow });
      else if (filterValue === 'diff-missing' && (isDiff || isMissingInTarget || isMissingInSource)) filteredRows.push({ sourceRow, targetRow });
      else if (filterValue === 'same' && isSame) filteredRows.push({ sourceRow, targetRow });
    }

    if (filteredRows.length > 0) {
      tableFilteredRows[tableName] = filteredRows;
      createTableContainer(tableName, filteredRows);
    }
  }
}



// ✅ Create Table Section
function createTableContainer(tableName, filteredRows) {
  const tablesDiv = document.getElementById('tables');

  const tableContainer = document.createElement('div');
  tableContainer.classList.add('table-container');
  tableContainer.dataset.tableName = tableName.toLowerCase();

  const header = document.createElement('div');
  header.classList.add('accordion-header');
  header.innerHTML = `▶ <strong>${tableName}</strong>`;

  const content = document.createElement('div');
  content.classList.add('accordion-content');
  content.style.display = 'none';

  // 🆕 Add Select Entire Table Checkbox
const selectAllWrapper = document.createElement('div');
selectAllWrapper.classList.add('select-all-wrapper'); // ← helpful for styling
selectAllWrapper.innerHTML = `
  <label><input type="checkbox" class="tableCheckbox" data-table="${tableName}"> Select Entire Table</label>
`;

const tableContentDiv = document.createElement('div');
tableContentDiv.classList.add('table-content');
tableContentDiv.id = `table-content-${tableName}`; // ← needed for update

content.appendChild(selectAllWrapper);  // static checkbox
content.appendChild(tableContentDiv);   // dynamic content

  // ✅ Append in correct order
  tableContainer.appendChild(header);
  tableContainer.appendChild(content);
  tablesDiv.appendChild(tableContainer);

  // ✅ Render rows inside table-content div
  renderRows(tableContentDiv, tableName, filteredRows, 1);

  // ✅ Expand/Collapse
  header.onclick = () => {
    if (content.style.display === 'block') {
      content.style.display = 'none';
      header.innerHTML = header.innerHTML.replace('▼', '▶');
    } else {
      content.style.display = 'block';
      header.innerHTML = header.innerHTML.replace('▶', '▼');
    }
  };
}


// ✅ Render Paginated Rows
function renderRows(container, tableName, rows, page = 1) {
  const start = (page - 1) * rowsPerPage;
  const paginatedRows = rows.slice(start, start + rowsPerPage);

  const allKeysSet = new Set();
  rows.forEach(({ sourceRow, targetRow }) => {
    const row = sourceRow || targetRow;
    if (row) Object.keys(row).forEach(k => {
      if (k !== 'key') allKeysSet.add(k);
    });
  });
  const allKeys = Array.from(allKeysSet);

  let html = `<table><tr><th class="select-column">Select</th><th>Key</th>`;
  allKeys.forEach(k => html += `<th>${capitalizeFirstLetter(k)}</th>`);
  html += `</tr>`;

  paginatedRows.forEach(({ sourceRow, targetRow }) => {
    const rowKey = (sourceRow || targetRow)?.key;
    let rowClass = '';

    const isMissingInTarget = sourceRow && !targetRow;
    const isMissingInSource = targetRow && !sourceRow;
    const isDiff = sourceRow && targetRow && hasDifferences(sourceRow, targetRow);
    const isSame = sourceRow && targetRow && !isDiff;

    if (isMissingInTarget || isMissingInSource) {
      rowClass = 'missing-row';
    } else if (isDiff) {
      rowClass = 'diff-row';
    } else {
      rowClass = 'same-row';
    }

    // ✅ Render main source row
    html += `<tr class="${rowClass}">`;

    // ✅ Handle checkbox visibility
    if (isSame) {
      html += `<td></td>`; // No checkbox if identical
    } else {
      html += `<td class="select-column"><input type="checkbox" class="columnCheckbox" data-table="${tableName}" data-key="${rowKey}"></td>`;
    }

    if (isMissingInSource) {
      html += `<td></td>`;
      allKeys.forEach(() => html += `<td></td>`);
    } else {
      html += `<td onclick="showCellModal(\`${rowKey}\`)">${rowKey || ''}</td>`;
      allKeys.forEach(k => {
        const val = sourceRow?.[k] || '';
        const className = (rowClass === 'diff-row' && sourceRow && targetRow && val !== targetRow[k] && !excludeKeys.includes(k))
          ? 'child-diff-highlight'
          : '';

        if (isSame) {
          html += `<td onclick="showCellModal(\`${val.replace(/`/g, '\\`')}\`)">${val}</td>`;
        } else {
          html += `<td class="${className}">
            <input type="checkbox" class="cellCheckbox"
                   data-table="${tableName}"
                   data-key="${rowKey}"
                   data-column="${k}"
                   style="margin-right:4px; vertical-align:middle;">
            <span onclick="showCellModal(\`${val.replace(/`/g, '\\`')}\`)">${val}</span>
          </td>`;
        }
      });
    }

    html += `</tr>`;

    // ✅ Child destination row (if needed)
    if (isDiff || isMissingInSource) {
      const childClass = isMissingInSource ? 'missing-row' : 'child-diff-row';

      html += `<tr class="${childClass}">`;
      html += `<td><em>Destination</em></td>`;
      html += `<td>${targetRow?.key || ''}</td>`;
      allKeys.forEach(k => {
        const sourceVal = sourceRow?.[k] || '';
        const targetVal = targetRow?.[k] || '';
        const isDiffField = sourceVal !== targetVal && !excludeKeys.includes(k);
        const cellClass = isDiffField ? 'child-diff-highlight' : '';
        html += `<td class="${cellClass}" onclick="showCellModal(\`${targetVal.replace(/`/g, '\\`')}\`)">${targetVal}</td>`;
      });
      html += `</tr>`;
    }
  });

  html += `</table>`;

  const totalPages = Math.ceil(rows.length / rowsPerPage);
  if (totalPages > 1) {
    html += `<div class="pagination">`;
    for (let p = 1; p <= totalPages; p++) {
      html += `<button class="${p === page ? 'current-page' : ''}" onclick="changeFilteredPage('${tableName}', ${p})">${p}</button>`;
    }
    html += `</div>`;
  }

  const contentDiv = document.getElementById(`table-content-${tableName}`);
  if (contentDiv) contentDiv.innerHTML = html;
  
  // ✅ Rebind guards after rendering
  bindSelectionGuards();
}





window.changeTargetPage = (tableName, page) => {
  const container = [...document.querySelectorAll('#targetData .table-container')]
    .find(c => c.dataset.tableName === tableName.toLowerCase())
    ?.querySelector('.table-content'); // ✅ Correct selector

  if (!container) return;

  const rows = targetData[tableName] || [];
  renderSimpleTargetTable(container, tableName, rows, page);
};


// ✅ Handle Pagination
window.changeFilteredPage = (tableName, page) => {
  const container = [...document.querySelectorAll('.table-container')]
    .find(c => c.dataset.tableName === tableName.toLowerCase())
    ?.querySelector('.accordion-content');

  if (!container) return;
  const rows = tableFilteredRows[tableName] || [];
  renderRows(container, tableName, rows, page);
};

function showMigrationPreview() {
  const selectedTables = [...document.querySelectorAll('.tableCheckbox:checked')].map(cb => cb.getAttribute('data-table'));
  const selectedRowCheckboxes = [...document.querySelectorAll('.columnCheckbox:checked')];
  const selectedCellCheckboxes = [...document.querySelectorAll('.cellCheckbox:checked')];

  const rowKeys = selectedRowCheckboxes.map(cb => ({
    table: cb.dataset.table,
    key: cb.dataset.key,
    row: sourceData[cb.dataset.table]?.find(r => r.key === cb.dataset.key)
  }));

  const cellMap = new Map();
  selectedCellCheckboxes.forEach(cb => {
    const table = cb.dataset.table;
    const key = cb.dataset.key;
    const column = cb.dataset.column;
    const mapKey = `${table}__${key}`;
    if (!cellMap.has(mapKey)) {
      cellMap.set(mapKey, {
        table,
        key,
        row: sourceData[table]?.find(r => r.key === key),
        columns: [column]
      });
    } else {
      cellMap.get(mapKey).columns.push(column);
    }
  });

  let fullTableRowCount = selectedTables.reduce((acc, table) => acc + (sourceData[table]?.length || 0), 0);
  let html = `
    <p><strong>Tables:</strong> ${selectedTables.length}</p>
    <p><strong>Rows:</strong> ${fullTableRowCount + rowKeys.length}</p>
    <p><strong>Cells:</strong> ${selectedCellCheckboxes.length}</p>
  `;


  if (selectedTables.length > 0) {
    html += `<h3>📁 Full Tables</h3>`;
    selectedTables.forEach(table => {
      const rows = sourceData[table] || [];
      if (rows.length === 0) return;
  
      const allKeys = Object.keys(rows[0] || {});
      html += `<details open><summary>${table} (${rows.length} rows)</summary>
        <div style="overflow-x:auto; max-height:300px; overflow-y:auto;">
          <table style="border-collapse: collapse; width: 100%;">
            <tr>${allKeys.map(k => `<th style="border:1px solid #ccc; padding:4px;">${k}</th>`).join('')}</tr>
            ${rows.map(row => `
                <tr>${allKeys.map(k => `<td style="border:1px solid #ccc; padding:4px;" onclick="showEditableCellModal('${table}', '${row.key}', '${k}', \`${(row[k] || '').toString().replace(/`/g, '\\`')}\`)">${row[k]}</td>
`).join('')}</tr>
            `).join('')}
          </table>
        </div>
      </details>`;
    });
  }
  

  if (rowKeys.length > 0) {
    html += `<h3>🔹 Selected Rows</h3>`;
    rowKeys.forEach(({ table, key, row }) => {
      if (!row) return;
      html += `<details open><summary>${table} → key: ${key}</summary>
        <div style="overflow-x:auto;">
          <table style="border-collapse: collapse; width: 100%;">
            <tr>${Object.keys(row).map(k => `<th style="border:1px solid #ccc; padding:4px;">${k}</th>`).join('')}</tr>
            <tr>${Object.keys(row).map(k => `
              <td style="border:1px solid #ccc; padding:4px;" onclick="showEditableCellModal('${table}', '${key}', '${k}', \`${(row[k] || '').toString().replace(/`/g, '\\`')}\`)">${row[k]}</td>
            `).join('')}</tr>
          </table>
        </div>
      </details>`;
    });
  }

  if (cellMap.size > 0) {
    html += `<h3>🔸 Selected Cells</h3>`;
    for (const { table, key, row, columns } of cellMap.values()) {
      if (!row) continue;
      html += `<details open><summary>${table} → key: ${key}</summary>
        <div style="overflow-x:auto;">
          <table style="border-collapse: collapse; width: 100%;">
            <tr>${columns.map(c => `<th style="border:1px solid #ccc; padding:4px;">${c}</th>`).join('')}</tr>
            <tr>${columns.map(c => `<td style="border:1px solid #ccc; padding:4px;" onclick="showEditableCellModal('${table}', '${key}', '${c}', '${(row[c] || '').toString().replace(/'/g, "\\'")}')">${row[c]}</td>
`).join('')}</tr>
          </table>
        </div>
      </details>`;
    }
  }

  document.getElementById('previewDetails').innerHTML = html;
  document.getElementById('previewModal').style.display = 'block';
}



function closePreviewModal() {
  document.getElementById('previewModal').style.display = 'none';
}

function confirmMigration() {
  document.getElementById('previewModal').style.display = 'none';
  migrate(); // Call original migration function
}

// ✅ Migrate Selected Rows or Tables
async function migrate() {
  document.activeElement.blur();

  const selectedTables = Array.from(document.querySelectorAll('.tableCheckbox:checked')).map(cb => cb.getAttribute('data-table'));
  const selectedRowCheckboxes = Array.from(document.querySelectorAll('.columnCheckbox:checked'));
  const selectedCellCheckboxes = Array.from(document.querySelectorAll('.cellCheckbox:checked'));

  const cellSelectionMap = new Map(); // key: `${table}_${key}` → grouped columns

for (const cb of selectedCellCheckboxes) {

  const table = cb.getAttribute('data-table');
  const key = cb.getAttribute('data-key');
  const column = cb.getAttribute('data-column');
  const mapKey = `${table}_${key}`;

  if (!cellSelectionMap.has(mapKey)) {
    const sourceRow = sourceData[table]?.find(r => r.key === key);
    const targetRow = targetData[table]?.find(r => r.key === key);
    cellSelectionMap.set(mapKey, {
      table,
      key,
      columns: [column],
      sourceRow,
      targetRow
    });
  } else {
    cellSelectionMap.get(mapKey).columns.push(column);
  }
}

const selectedCells = Array.from(cellSelectionMap.values());
  const sourceEnv = document.getElementById('sourceEnv').value;
  const targetEnv = document.getElementById('targetEnv').value;

  if (
    selectedTables.length === 0 &&
    selectedRowCheckboxes.length === 0 &&
    document.querySelectorAll('.cellCheckbox:checked').length === 0
  ) {
    alert('⚠️ Please select at least one table, row, or column to migrate.');
    return;
  }
  

  // ✅ Build full selected row payload with source/target row reference
  const selectedRows = selectedRowCheckboxes.map(cb => {
    const table = cb.getAttribute('data-table');
    const key = cb.getAttribute('data-key');
    const sourceRow = sourceData[table]?.find(r => r.key === key);
    const targetRow = targetData[table]?.find(r => r.key === key);

    console.log(`[ROW SELECTED] table=${table}, key=${key}`);
    console.log("→ Found sourceRow:", sourceRow);

    return {
      table,
      key,
      sourceRow: sourceRow || null,   // Explicit null for backend logic
      targetRow: targetRow || null
    };
  });

  let totalRows = selectedRows.length + selectedCells.length;

  for (const table of selectedTables) {
    totalRows += (sourceData[table]?.length || 0);
  }

  console.log(`[MIGRATION] Tables: ${selectedTables.length}, Rows: ${selectedRows.length}, Cells: ${selectedCells.length}`);

  showLoading(true);

  const response = await fetch('/migrate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sourceEnv,
      targetEnv,
      selectedTables,
      selectedRows,
      selectedCells  // ✅ NEW
    })    
  });

  const result = await response.json();
  showLoading(false);

  if (response.ok && result.status === 'success') {

    const targetRes = await fetch(`/env-data?env=${targetEnv}`);
    targetData = await targetRes.json();

    clearAllSelections();
    filterAndRenderTables();
    //refreshTargetDataView(); // ✅ Important: refresh target after migrate

    // After migration is completed
const match = targetEnv.match(/^remote_([a-z]+)(_migrated)?_([a-z]+)$/);
if (match) {
  const lob = match[1];
  const env = match[3];
  const migratedKey = `remote_${lob}_migrated_${env}`;
  const originalKey = `remote_${lob}_${env}`;

  const compare = confirm(`✅ Migration to ${targetEnv} completed.\n\n🎯 Do you want to compare:\n\n${migratedKey} → ${originalKey}?`);

  if (compare) {
    document.getElementById('sourceEnv').value = migratedKey;
    document.getElementById('targetEnv').value = originalKey;
    loadTables(); // Trigger comparison
  }
}

  } else {
    alert(`❌ Migration Failed: ${result.error || 'Unknown error'}`);
  }
}


// ✅ Refresh Target Environment Data
function refreshTargetDataView() {
  const targetDiv = document.getElementById('targetData');
  targetDiv.innerHTML = '';

  for (const [tableName, rows] of Object.entries(targetData)) {
    const tableContainer = document.createElement('div');
    tableContainer.classList.add('table-container');
    tableContainer.dataset.tableName = tableName.toLowerCase();

    const header = document.createElement('div');
    header.classList.add('accordion-header');
    header.innerHTML = `▶ <strong>${tableName}</strong>`;

    const content = document.createElement('div');
    content.classList.add('accordion-content');
    content.style.display = 'none';

    // ✅ Add separate div only for table content (important for pagination)
    const tableContentDiv = document.createElement('div');
    tableContentDiv.classList.add('table-content');
    content.appendChild(tableContentDiv);

    tableContainer.appendChild(header);
    tableContainer.appendChild(content);
    targetDiv.appendChild(tableContainer);

    // ✅ Render first page into tableContentDiv
    renderSimpleTargetTable(tableContentDiv, tableName, rows, 1);

    // ✅ Expand/Collapse behavior
    header.onclick = () => {
      if (content.style.display === 'block') {
        content.style.display = 'none';
        header.innerHTML = header.innerHTML.replace('▼', '▶');
      } else {
        content.style.display = 'block';
        header.innerHTML = header.innerHTML.replace('▶', '▼');
      }
    };
  }
}


// ✅ Simple Target Table Renderer
function renderSimpleTargetTable(container, tableName, rows, page = 1) {
  if (!rows.length) {
    container.innerHTML = '<p>No data</p>';
    return;
  }

  const allKeysSet = new Set();
  rows.forEach(row => Object.keys(row || {}).forEach(k => {
    if (k !== 'key') allKeysSet.add(k);
  }));
  const allKeys = Array.from(allKeysSet);

  const start = (page - 1) * rowsPerPage;
  const paginatedRows = rows.slice(start, start + rowsPerPage);

  let html = `<table><tr><th>Key</th>`;
  allKeys.forEach(k => html += `<th>${capitalizeFirstLetter(k)}</th>`);
  html += `</tr>`;

  paginatedRows.forEach(row => {
    html += `<tr><td>${row.key || ''}</td>`;
    allKeys.forEach(k => {
      const val = row[k] || '';
      html += `<td onclick="showCellModal(\`${val.replace(/`/g, '\\`')}\`)">${val}</td>`;
    });
    html += `</tr>`;
  });

  html += `</table>`;

  const totalPages = Math.ceil(rows.length / rowsPerPage);
  if (totalPages > 1) {
    html += `<div class="pagination">`;
    for (let p = 1; p <= totalPages; p++) {
      html += `<button class="${p === page ? 'current-page' : ''}" onclick="changeTargetPage('${tableName}', ${p})">${p}</button>`;
    }
    html += `</div>`;
  }

  container.innerHTML = html;
}



// ✅ Binding Filter Dropdown on Page Load
function bindStaticListeners() {
  document.getElementById('filterSelect').addEventListener('change', filterAndRenderTables);
}

function showCellModal(content) {
  const modal = document.getElementById('cellModal');
  const contentEl = document.getElementById('cellContent');
  contentEl.textContent = content;
  modal.style.display = 'block';
}

function closeCellModal() {
  document.getElementById('cellModal').style.display = 'none';
}

window.onclick = function(event) {
  const modal = document.getElementById('cellModal');
  if (event.target === modal) {
    modal.style.display = 'none';
  }
};

async function downloadRemoteJson() {
  const sourceEnv = document.getElementById('sourceEnv').value;
  const targetEnv = document.getElementById('targetEnv').value;
  const lob = 'lob'; // Update if needed

  const environments = [
    { env: sourceEnv, label: 'Source' },
    { env: targetEnv, label: 'Target' }
  ];

  showLoading(true);
  try {
    for (const { env, label } of environments) {
      if (!env.startsWith('remote_') && !env.startsWith('local_')) {
        console.warn(`⚠️ Skipping ${label} (${env}) — only remote/local allowed.`);
        continue;
      }

      const response = await fetch(`/download-remote?env=${env}&lob=${lob}`);
      const result = await response.json();

      if (response.ok && result.status === 'success') {
        console.log(`✅ ${label} JSON downloaded and saved.`);
      } else {
        console.warn(`❌ Failed to download ${label}: ${result.error}`);
      }
    }

    alert('✅ Download completed for Source and Target (if valid).');
  } catch (error) {
    console.error('❌ Error downloading JSONs:', error);
    alert('❌ Error during download. See console for details.');
  } finally {
    showLoading(false);
  }
}

async function downloadJsonsForLobsAndEnvs(/*allLobs = [], allEnvs = []*/) {
  const allLobs = ['eni', 'cns', 'umr', 'mnr', 'ifp'];
  const allEnvs = ['remote_dev', 'remote_stage', 'remote_prod'];

  if (!Array.isArray(allLobs) || !Array.isArray(allEnvs)) {
    alert('❌ Invalid LOB or ENV list.');
    return;
  }

  showLoading(true);
  try {
    for (const lob of allLobs) {
      for (const env of allEnvs) {
        const response = await fetch(`/download-remote?env=${env}&lob=${lob}`);
        const result = await response.json();

        if (response.ok && result.status === 'success') {
          console.log(`✅ Downloaded: ${lob} / ${env}`);
        } else {
          console.warn(`❌ Failed: ${lob} / ${env} → ${result.error}`);
        }
      }
    }

    alert('✅ Download completed for all combinations.');
  } catch (error) {
    console.error('❌ Error in bulk download:', error);
    alert('❌ Download failed. See console for details.');
  } finally {
    showLoading(false);
  }
}



async function loadEnvOptions() {
  try {
    const res = await fetch('/env-options');       // 🔁 Fetch from backend
    const options = await res.json();              // 📥 Parse JSON array

    const sourceEnv = document.getElementById('sourceEnv');  // 🎯 Find <select> #sourceEnv
    const targetEnv = document.getElementById('targetEnv');  // 🎯 Find <select> #targetEnv

    const html = options.map(opt =>
      `<option value="${opt.key}">${opt.label}</option>`
    ).join('');                                     // 🔧 Generate <option> list

    sourceEnv.innerHTML = html;                    // 🧩 Inject into dropdown
    targetEnv.innerHTML = html;
  } catch (err) {
    console.error('Failed to load environment options:', err); // ❗ Debug errors
  }
}

function showEditableCellModal(table, key, column, value) {
  const modal = document.getElementById('cellModal');
  const contentEl = document.getElementById('cellContent');
  const primaryKey = tablePrimaryKeys[table] || 'key';

  if (column === primaryKey) {
    contentEl.innerHTML = `<p><strong>${column}</strong> is a primary key and cannot be edited.</p>`;
  } else {
    const input = document.createElement('input');
    input.type = 'text';
    input.value = value;
    input.style.width = '100%';

    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save';
    saveBtn.onclick = () => {
      const row = sourceData[table]?.find(r => r.key === key);
      if (row) {
        row[column] = input.value;
        showMigrationPreview(); // re-render updated preview
      }
      closeCellModal();
    };

    contentEl.innerHTML = `<p><strong>Edit ${column}</strong></p>`;
    contentEl.appendChild(input);
    contentEl.appendChild(document.createElement('br'));
    contentEl.appendChild(saveBtn);
  }

  modal.style.display = 'block';
}


window.onload = function() {
  console.log('✅ DOM loaded. Running loadEnvOptions...');
  loadEnvOptions();       // 🚀 Load env options after DOM is ready
  bindStaticListeners();  // 📦 Attach change listeners to dropdowns
};

const selectedRowKeysMap = new Map();   // key: `${table}_${key}`
const selectedCellKeysMap = new Map();  // key: `${table}_${key}_${column}`

function bindSelectionGuards() {
  document.querySelectorAll('.columnCheckbox').forEach(rowCb => {
    rowCb.addEventListener('change', () => {
      const table = rowCb.dataset.table;
      const key = rowCb.dataset.key;
      const compositeKey = `${table}_${key}`;
      const checked = rowCb.checked;

      if (checked) {
        // Uncheck cell checkboxes for same row
        document.querySelectorAll(`.cellCheckbox[data-table='${table}'][data-key='${key}']`)
          .forEach(cb => {
            cb.checked = false;
            const cKey = `${table}_${key}_${cb.dataset.column}`;
            selectedCellKeysMap.delete(cKey);
          });
        selectedRowKeysMap.set(compositeKey, true);
      } else {
        selectedRowKeysMap.delete(compositeKey);
      }
    });
  });

  document.querySelectorAll('.cellCheckbox').forEach(cellCb => {
    cellCb.addEventListener('change', () => {
      const table = cellCb.dataset.table;
      const key = cellCb.dataset.key;
      const column = cellCb.dataset.column;
      const rowCb = document.querySelector(`.columnCheckbox[data-table='${table}'][data-key='${key}']`);
      const cKey = `${table}_${key}_${column}`;
      const checked = cellCb.checked;

      if (checked && rowCb?.checked) {
        alert('⚠️ Cannot select individual column when full row is selected.');
        cellCb.checked = false;
        return;
      }

      if (checked) {
        selectedCellKeysMap.set(cKey, true);
      } else {
        selectedCellKeysMap.delete(cKey);
      }
    });
  });
}

function renderRows(container, tableName, rows, page = 1) {
  const start = (page - 1) * rowsPerPage;
  const paginatedRows = rows.slice(start, start + rowsPerPage);

  const allKeysSet = new Set();
  rows.forEach(({ sourceRow, targetRow }) => {
    const row = sourceRow || targetRow;
    if (row) {
      Object.keys(row).forEach(k => {
        if (k !== 'key' && !excludeKeys.includes(k)) {
          allKeysSet.add(k);
        }
      });
    }
  });
  const allKeys = Array.from(allKeysSet);

  let html = `<table><tr><th class="select-column">Select</th><th>Key</th>`;
  allKeys.forEach(k => html += `<th>${capitalizeFirstLetter(k)}</th>`);
  html += `</tr>`;

  paginatedRows.forEach(({ sourceRow, targetRow }) => {
    const rowKey = (sourceRow || targetRow)?.key;
    const compositeKey = `${tableName}_${rowKey}`;
    let rowClass = '';

    const isMissingInTarget = sourceRow && !targetRow;
    const isMissingInSource = targetRow && !sourceRow;
    const isDiff = sourceRow && targetRow && hasDifferences(sourceRow, targetRow);
    const isSame = sourceRow && targetRow && !isDiff;

    if (isMissingInTarget || isMissingInSource) rowClass = 'missing-row';
    else if (isDiff) rowClass = 'diff-row';
    else rowClass = 'same-row';

    html += `<tr class="${rowClass}">`;

    // Checkbox
    if (isSame) {
      html += `<td></td>`;
    } else {
      const checked = selectedRowKeysMap.has(compositeKey) ? 'checked' : '';
      html += `<td class="select-column"><input type="checkbox" class="columnCheckbox" data-table="${tableName}" data-key="${rowKey}" ${checked}></td>`;
    }

    // Key Cell
    html += `<td onclick="showCellModal(\`${rowKey}\`)">${rowKey || ''}</td>`;

    // Data Cells
    allKeys.forEach(k => {
      const val = sourceRow?.[k];
      const safeVal = (val === false || val === 0) ? val : (val || '');
      const className = (rowClass === 'diff-row' && sourceRow && targetRow && val !== targetRow[k] && !excludeKeys.includes(k))
        ? 'child-diff-highlight'
        : '';

      const cKey = `${tableName}_${rowKey}_${k}`;
      const checked = selectedCellKeysMap.has(cKey) ? 'checked' : '';

      if (isSame) {
        html += `<td onclick="showCellModal(\`${String(safeVal).replace(/`/g, '\\`')}\`)">${safeVal}</td>`;
      } else {
        html += `<td class="${className}">
          <input type="checkbox" class="cellCheckbox" data-table="${tableName}" data-key="${rowKey}" data-column="${k}" ${checked}
                 style="margin-right:4px; vertical-align:middle;">
          <span onclick="showCellModal(\`${String(safeVal).replace(/`/g, '\\`')}\`)">${safeVal}</span>
        </td>`;
      }
    });

    html += `</tr>`;

    // Destination Row
    if (isDiff || isMissingInSource) {
      const childClass = isMissingInSource ? 'missing-row' : 'child-diff-row';
      html += `<tr class="${childClass}">`;
      html += `<td><em>Destination</em></td>`;
      html += `<td>${targetRow?.key || ''}</td>`;

      allKeys.forEach(k => {
        const sourceVal = sourceRow?.[k] ?? '';
        const targetVal = targetRow?.[k] ?? '';
        const isDiffField = sourceVal !== targetVal && !excludeKeys.includes(k);
        const cellClass = isDiffField ? 'child-diff-highlight' : '';
        const safeVal = (targetVal === false || targetVal === 0) ? targetVal : (targetVal || '');

        html += `<td class="${cellClass}" onclick="showCellModal(\`${String(safeVal).replace(/`/g, '\\`')}\`)">${safeVal}</td>`;
      });

      html += `</tr>`;
    }
  });

  html += `</table>`;

  const totalPages = Math.ceil(rows.length / rowsPerPage);
  if (totalPages > 1) {
    html += `<div class="pagination">`;
    for (let p = 1; p <= totalPages; p++) {
      html += `<button class="${p === page ? 'current-page' : ''}" onclick="changeFilteredPage('${tableName}', ${p})">${p}</button>`;
    }
    html += `</div>`;
  }

  container.innerHTML = html;

  // Rebind checkbox behavior
  bindSelectionGuards();
}

