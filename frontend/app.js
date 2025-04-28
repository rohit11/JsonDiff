let sourceData = {};
let targetData = {};
let rowsPerPage = 20; // ✅ Change here if you want 10, 20, 50, 100 per page
let filteredSourceData = {};
let filteredTargetData = {};
const tableFilteredRows = {};

async function loadTables() {
  showLoading(true);

  const env = document.getElementById('sourceEnv').value;
  const res = await fetch(`/env-data?env=${env}`);
  sourceData = await res.json();

  const targetEnv = document.getElementById('targetEnv').value;
  const targetRes = await fetch(`/env-data?env=${targetEnv}`);
  targetData = await targetRes.json();

  showLoading(false);

  const tablesDiv = document.getElementById('tables');
  tablesDiv.innerHTML = '';




  // Add Search Box
  const searchBox = document.createElement('input');
  searchBox.type = 'text';
  searchBox.placeholder = 'Search tables...';
  searchBox.id = 'searchBox';
  searchBox.style.marginBottom = '10px';
  searchBox.style.width = '100%';
  searchBox.addEventListener('input', filterTables);
  tablesDiv.appendChild(searchBox);

  for (const [tableName, sourceRows] of Object.entries(sourceData)) {
    const tableContainer = document.createElement('div');
    tableContainer.classList.add('table-container');
    tableContainer.dataset.tableName = tableName.toLowerCase();

    const header = document.createElement('div');
    header.classList.add('accordion-header');
    header.innerHTML = `▶ <strong>${tableName}</strong>`;

    const content = document.createElement('div');
    content.classList.add('accordion-content');

    tableContainer.appendChild(header);
    tableContainer.appendChild(content);
    tablesDiv.appendChild(tableContainer);

    renderSourceTable(content, tableName, 1);

    header.onclick = () => {
      if (content.style.display === 'block') {
        content.style.display = 'none';
        header.innerHTML = `▶ <strong>${tableName}</strong>`;
      } else {
        content.style.display = 'block';
        header.innerHTML = `▼ <strong>${tableName}</strong>`;
      }
    };
  }
}

function renderSourceTable(container, tableName, page = 1) {
  const sourceRows = sourceData[tableName] || [];
  container.innerHTML = `
    <label><input type="checkbox" class="tableCheckbox" data-table="${tableName}"> Select Entire Table</label>
    ${generateTableHTML(sourceRows, page, 'source', tableName)}
  `;
}

function renderTargetTable(container, tableName, page = 1) {
  const targetRows = targetData[tableName] || [];
  container.innerHTML = generateTableHTML(targetRows, page, 'target', tableName);
}

// Globally define this once
const excludeTables = ['audit_log', 'tracking_history']; // sample: tables to exclude completely from diff
const excludeKeys = ['lastUpdated', 'timestamp', 'id']; // sample: fields to ignore in compare

function generateTableHTML(rows, page, type, tableName = '') {
  const start = (page - 1) * rowsPerPage;
  const end = start + rowsPerPage;
  const paginatedRows = rows.slice(start, end);

  // Collect all unique keys from both source and target data
  const allKeysSet = new Set();
  const sourceRows = sourceData[tableName] || [];
  const targetRows = targetData[tableName] || [];

  [...sourceRows, ...targetRows].forEach(row => {
    Object.keys(row || {}).forEach(k => {
      if (k !== 'key') allKeysSet.add(k);
    });
  });

  const allKeys = Array.from(allKeysSet);

  let html = '<table><tr>';

  if (type === 'source') {
    html += `<th>Select</th>`;
  }

  html += `<th>Key</th>`;
  allKeys.forEach(k => {
    html += `<th>${capitalizeFirstLetter(k)}</th>`;
  });
  html += '</tr>';

  const isExcludedTable = excludeTables.includes(tableName.toLowerCase());

  for (const row of paginatedRows) {
    if (type === 'source') {
      const matchingTargetRow = Array.isArray(targetData[tableName]) ? targetData[tableName].find(r => r.key === row.key) : null;
      let rowClass = '';
      let fieldClasses = {}; // mark field differences dynamically

      if (!matchingTargetRow) {
        rowClass = 'missing-row';
      } else if (isExcludedTable) {
        rowClass = 'same-row'; // ignore diff check for excluded tables
      } else {
        let allSame = true;
        for (const key of allKeys) {
          const skipField = excludeKeys.includes(key);
          const sourceValue = row[key];
          const targetValue = matchingTargetRow[key];

          // Skip comparison if both values are empty or field is excluded
          if (skipField || (sourceValue === '' && targetValue === '')) continue;

          if (sourceValue !== targetValue) {
            allSame = false;
            fieldClasses[key] = 'child-diff-highlight'; // mark this field as diff
          }
        }
        rowClass = allSame ? 'same-row' : 'diff-row';
      }

      html += `<tr class="${rowClass}">
        <td><input type="checkbox" class="columnCheckbox" data-table="${tableName}" data-key="${row.key}"></td>
        <td>${row.key}</td>
      `;

      allKeys.forEach(k => {
        html += `<td class="${fieldClasses[k] || ''}">${row[k] || ''}</td>`;
      });

      html += `</tr>`;

      // 🛠️ Add child row to show destination if diff
      if (rowClass === 'diff-row' && matchingTargetRow) {
        html += `<tr class="child-diff-row">
          <td style="text-align:center; font-size: 12px; font-weight: bold; color: #555;">Destination (Different)</td>
          <td>${matchingTargetRow.key || ''}</td>
        `;

        allKeys.forEach(k => {
          const highlight = !excludeKeys.includes(k) && row[k] !== matchingTargetRow[k];
          html += `<td class="${highlight ? 'child-diff-highlight' : ''}">${matchingTargetRow[k] || ''}</td>`;
        });

        html += `</tr>`;
      }

    } else {
      html += `<tr><td>${row.key}</td>`;
      allKeys.forEach(k => {
        html += `<td>${row[k] || ''}</td>`;
      });
      html += `</tr>`;
    }
  }

  html += '</table>';

  const totalPages = Math.ceil(rows.length / rowsPerPage);
  if (totalPages > 1) {
    html += `<div class="pagination">`;
    for (let p = 1; p <= totalPages; p++) {
      html += `<button class="${p === page ? 'current-page' : ''}" onclick="${type === 'source' ? `changePage('${tableName}', ${p})` : `changeTargetPage('${tableName}', ${p})`}">${p}</button>`;
    }
    html += `</div>`;
  }

  return html;
}

function capitalizeFirstLetter(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

window.changePage = (tableName, page) => {
  document.querySelectorAll(`[data-table-name]`).forEach(tc => {
    if (tc.dataset.tableName === tableName.toLowerCase()) {
      const container = tc.querySelector('.accordion-content');
      renderSourceTable(container, tableName, page);
    }
  });
};

window.changeTargetPage = (tableName, page) => {
  document.querySelectorAll(`#targetData [data-table-name]`).forEach(tc => {
    if (tc.dataset.tableName === tableName.toLowerCase()) {
      const container = tc.querySelector('.accordion-content');
      renderTargetTable(container, tableName, page);
    }
  });
};

async function migrate() {
  document.activeElement.blur();
  const selectedTables = Array.from(document.querySelectorAll('.tableCheckbox:checked')).map(cb => cb.getAttribute('data-table'));
  const selectedRows = Array.from(document.querySelectorAll('.columnCheckbox:checked')).map(cb => ({
    table: cb.getAttribute('data-table'),
    key: cb.getAttribute('data-key')
  }));

  const sourceEnv = document.getElementById('sourceEnv').value;
  const targetEnv = document.getElementById('targetEnv').value;

  if (selectedTables.length === 0 && selectedRows.length === 0) {
    alert('⚠️ Please select at least one table or row to migrate.');
    return;
  }

  if (!confirm(`Are you sure you want to migrate ${selectedTables.length} tables and ${selectedRows.length} rows to ${targetEnv}?`)) {
    return;
  }

  showLoading(true);
  const response = await fetch('/migrate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sourceEnv, targetEnv, selectedTables, selectedRows })
  });

  const result = await response.json();
  showLoading(false);

  if (response.ok && result.status === 'success') {
    alert(`✅ Migration Complete!`);

    const targetRes = await fetch(`/env-data?env=${targetEnv}`);
    targetData = await targetRes.json();

    refreshTableUI();
    bindAccordionHandlers();
    clearAllSelections();
    refreshTargetDataView();
  } else {
    alert(`❌ Migration Failed: ${result.error || 'Unknown error'}`);
  }
}

async function loadTargetData() {
  showLoading(true);

  const env = document.getElementById('targetEnv').value;
  const res = await fetch(`/env-data?env=${env}`);
  targetData = await res.json();

  showLoading(false);

  refreshTargetDataView();
}

function refreshTableUI(filteredSource = sourceData, filteredTarget = targetData) {
  const tablesDiv = document.getElementById('tables');
  tablesDiv.innerHTML = '';

  for (const [tableName, sourceRows] of Object.entries(filteredSource)) {
    const tableContainer = document.createElement('div');
    tableContainer.classList.add('table-container');
    tableContainer.dataset.tableName = tableName.toLowerCase();

    const header = document.createElement('div');
    header.classList.add('accordion-header');
    header.innerHTML = `▶ <strong>${tableName}</strong>`;

    const content = document.createElement('div');
    content.classList.add('accordion-content');

    tableContainer.appendChild(header);
    tableContainer.appendChild(content);
    tablesDiv.appendChild(tableContainer);

    renderSourceTable(content, tableName, 1, filteredSource, filteredTarget);

    header.onclick = () => {
      if (content.style.display === 'block') {
        content.style.display = 'none';
        header.innerHTML = `▶ <strong>${tableName}</strong>`;
      } else {
        content.style.display = 'block';
        header.innerHTML = `▼ <strong>${tableName}</strong>`;
      }
    };
  }
}


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

    tableContainer.appendChild(header);
    tableContainer.appendChild(content);
    targetDiv.appendChild(tableContainer);

    renderTargetTable(content, tableName, 1);

    header.onclick = () => {
      if (content.style.display === 'block') {
        content.style.display = 'none';
        header.innerHTML = `▶ <strong>${tableName}</strong>`;
      } else {
        content.style.display = 'block';
        header.innerHTML = `▼ <strong>${tableName}</strong>`;
      }
    };
  }
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

function renderFilteredRows(container, tableName, rows, page = 1) {
  const start = (page - 1) * rowsPerPage;
  const end = start + rowsPerPage;
  const paginatedRows = rows.slice(start, end);

  const allKeysSet = new Set();
  rows.forEach(row => Object.keys(row).forEach(k => {
    if (k !== 'key') allKeysSet.add(k);
  }));
  const allKeys = Array.from(allKeysSet);

  let html = `<table><tr><th>Select</th><th>Key</th>`;
  allKeys.forEach(k => html += `<th>${capitalizeFirstLetter(k)}</th>`);
  html += `</tr>`;

  const targetRows = targetData[tableName] || [];
  const targetMap = new Map(targetRows.map(r => [r.key, r]));

  paginatedRows.forEach(row => {
    const matchingTargetRow = targetMap.get(row.key);
    let rowClass = '';
    let fieldClasses = {};

    if (!matchingTargetRow) {
      rowClass = 'missing-row';
    } else {
      let allSame = true;
      for (const key of allKeys) {
        if (excludeKeys.includes(key)) continue;
        if ((row[key] || '') !== (matchingTargetRow[key] || '')) {
          allSame = false;
          fieldClasses[key] = 'child-diff-highlight';
        }
      }
      rowClass = allSame ? 'same-row' : 'diff-row';
    }

    html += `<tr class="${rowClass}">
      <td><input type="checkbox" class="columnCheckbox" data-table="${tableName}" data-key="${row.key}"></td>
      <td>${row.key}</td>`;

    allKeys.forEach(k => {
      html += `<td class="${fieldClasses[k] || ''}">${row[k] || ''}</td>`;
    });

    html += `</tr>`;

    if (rowClass === 'diff-row' && matchingTargetRow) {
      html += `<tr class="child-diff-row">
        <td style="text-align:center; font-size: 12px; font-weight: bold;">Dest Row</td>
        <td>${matchingTargetRow.key || ''}</td>`;

      allKeys.forEach(k => {
        const highlight = !excludeKeys.includes(k) && (row[k] || '') !== (matchingTargetRow[k] || '');
        html += `<td class="${highlight ? 'child-diff-highlight' : ''}">${matchingTargetRow[k] || ''}</td>`;
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



function hasDifferences(sourceRow, targetRow) {
  for (const key in sourceRow) {
    if (excludeKeys.includes(key)) continue;
    if ((sourceRow[key] || '') !== (targetRow[key] || '')) {
      return true;
    }
  }
  return false;
}

function filterTables() {
  const tablesDiv = document.getElementById('tables');
  tablesDiv.innerHTML = '';

  const searchValue = document.getElementById('searchBox')?.value?.toLowerCase() || '';
  const filterValue = document.getElementById('filterSelect')?.value || 'all';

  Object.keys(tableFilteredRows).forEach(key => delete tableFilteredRows[key]); // clear previous

  for (const [tableName, sourceRows] of Object.entries(sourceData)) {
    if (searchValue && !tableName.toLowerCase().includes(searchValue)) continue;

    const targetRows = targetData[tableName] || [];
    const targetMap = new Map(targetRows.map(r => [r.key, r]));

    const filteredRows = sourceRows.filter(sourceRow => {
      const matchingTargetRow = targetMap.get(sourceRow.key);
      const isMissing = !matchingTargetRow;
      const isDiff = matchingTargetRow && hasDifferences(sourceRow, matchingTargetRow);
      const isSame = matchingTargetRow && !isDiff;

      if (filterValue === 'all') return true;
      if (filterValue === 'diff' && isDiff) return true;
      if (filterValue === 'missing' && isMissing) return true;
      if (filterValue === 'diff-missing' && (isDiff || isMissing)) return true;
      if (filterValue === 'same' && isSame) return true;

      return false;
    });

    if (filteredRows.length === 0) continue;

    tableFilteredRows[tableName] = filteredRows; // 🔥 Save for pagination use

    // Render table
    const tableContainer = document.createElement('div');
    tableContainer.classList.add('table-container');
    tableContainer.dataset.tableName = tableName.toLowerCase();

    const header = document.createElement('div');
    header.classList.add('accordion-header');
    header.innerHTML = `▶ <strong>${tableName}</strong>`;

    const content = document.createElement('div');
    content.classList.add('accordion-content');
    content.style.display = 'none';

    tableContainer.appendChild(header);
    tableContainer.appendChild(content);
    tablesDiv.appendChild(tableContainer);

    renderFilteredRows(content, tableName, filteredRows, 1); // first page

    header.onclick = () => {
      if (content.style.display === 'block') {
        content.style.display = 'none';
        header.innerHTML = `▶ <strong>${tableName}</strong>`;
      } else {
        content.style.display = 'block';
        header.innerHTML = `▼ <strong>${tableName}</strong>`;
      }
    };
  }
}



function bindStaticListeners() {
  document.getElementById('filterSelect').addEventListener('change', filterTables);
  document.getElementById('searchBox').addEventListener('input', filterTables);
}
window.onload = bindStaticListeners;

window.changeFilteredPage = (tableName, page) => {
  const targetContainer = [...document.querySelectorAll('.table-container')]
    .find(c => c.dataset.tableName === tableName.toLowerCase())
    ?.querySelector('.accordion-content');

  if (!targetContainer) return;

  const rows = tableFilteredRows[tableName] || [];
  renderFilteredRows(targetContainer, tableName, rows, page);
};

