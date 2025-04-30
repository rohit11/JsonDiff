// ✅ Global Variables
let sourceData = {};
let targetData = {};
let rowsPerPage = 20;
const excludeTables = ['audit_log', 'tracking_history'];
const excludeKeys = ['lastUpdated', 'timestamp', 'id'];
const tableFilteredRows = {};

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

// ✅ Load Data
async function loadTables() {
  showLoading(true);

  const sourceEnv = document.getElementById('sourceEnv').value;
  const targetEnv = document.getElementById('targetEnv').value;

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
  selectAllWrapper.style.margin = '10px 0';
  selectAllWrapper.innerHTML = `
    <label><input type="checkbox" class="tableCheckbox" data-table="${tableName}"> Select Entire Table</label>
  `;
  content.appendChild(selectAllWrapper);

  // 🆕 Add table-content div for rows
  const tableContentDiv = document.createElement('div');
  tableContentDiv.classList.add('table-content');
  content.appendChild(tableContentDiv);

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

  let html = `<table><tr><th>Select</th><th>Key</th>`;
  allKeys.forEach(k => html += `<th>${capitalizeFirstLetter(k)}</th>`);
  html += `</tr>`;

  paginatedRows.forEach(({ sourceRow, targetRow }) => {
    const rowKey = (sourceRow || targetRow)?.key;
    let rowClass = '';
    let fieldClasses = {};

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

    // ✅ Render the main source row
    html += `<tr class="${rowClass}">`;

    // ✅ Always show the Select checkbox, even if source is missing
    html += `<td><input type="checkbox" class="columnCheckbox" data-table="${tableName}" data-key="${rowKey}"></td>`;

    if (isMissingInSource) {
      // Source missing → empty Key and empty fields
      html += `<td></td>`;
      allKeys.forEach(() => {
        html += `<td></td>`;
      });
    } else {
      // Source available
      html += `<td onclick="showCellModal(\`${rowKey}\`)">${rowKey || ''}</td>`;
      allKeys.forEach(k => {
        const val = sourceRow?.[k] || '';
        const className = (rowClass === 'diff-row' && sourceRow && targetRow && val !== targetRow[k] && !excludeKeys.includes(k))
        ? 'child-diff-highlight'
        : '';      
        html += `<td class="${className}" onclick="showCellModal(\`${val.replace(/`/g, '\\`')}\`)">${val}</td>`;
      });
    }

    html += `</tr>`;

    // ✅ Render child destination row if needed
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

  container.innerHTML = html;
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

// ✅ Migrate Selected Rows or Tables
async function migrate() {
  document.activeElement.blur();

  const selectedTables = Array.from(document.querySelectorAll('.tableCheckbox:checked')).map(cb => cb.getAttribute('data-table'));
  const selectedRowCheckboxes = Array.from(document.querySelectorAll('.columnCheckbox:checked'));

  const sourceEnv = document.getElementById('sourceEnv').value;
  const targetEnv = document.getElementById('targetEnv').value;

  if (selectedTables.length === 0 && selectedRowCheckboxes.length === 0) {
    alert('⚠️ Please select at least one table or row to migrate.');
    return;
  }

  // ✅ Build full selected row payload with source/target row reference
  const selectedRows = selectedRowCheckboxes.map(cb => {
    const table = cb.getAttribute('data-table');
    const key = cb.getAttribute('data-key');
    const sourceRow = sourceData[table]?.find(r => r.key === key);
    const targetRow = targetData[table]?.find(r => r.key === key);

    return {
      table,
      key,
      sourceRow: sourceRow || null,   // Explicit null for backend logic
      targetRow: targetRow || null
    };
  });

  let totalRows = selectedRows.length;

  for (const table of selectedTables) {
    totalRows += (sourceData[table]?.length || 0);
  }

  if (!confirm(`Are you sure you want to migrate ${selectedTables.length} tables and ${totalRows} rows to ${targetEnv}?`)) {
    return;
  }

  showLoading(true);

  const response = await fetch('/migrate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sourceEnv,
      targetEnv,
      selectedTables,
      selectedRows  // contains full row info
    })
  });

  const result = await response.json();
  showLoading(false);

  if (response.ok && result.status === 'success') {
    alert('✅ Migration Complete!');

    const targetRes = await fetch(`/env-data?env=${targetEnv}`);
    targetData = await targetRes.json();

    clearAllSelections();
    filterAndRenderTables();
    refreshTargetDataView(); // ✅ Important: refresh target after migrate
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
      html += `<td>${row[k] || ''}</td>`;
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
window.onload = bindStaticListeners;

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
