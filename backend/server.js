const express = require('express');
const cors = require('cors');
const { getJson, uploadJson } = require('./jsonService');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// Load all tables
app.get('/tables', async (req, res) => {
  try {
    const { env } = req.query;
    const jsonData = await getJson(env);
    res.json(Object.keys(jsonData));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch tables' });
  }
});

// Load full env data
app.get('/env-data', async (req, res) => {
  try {
    const { env } = req.query;
    const jsonData = await getJson(env);
    res.json(jsonData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch environment data' });
  }
});

// Migrate selected tables or rows
app.post('/migrate', async (req, res) => {
  try {
    const { sourceEnv, targetEnv, selectedTables = [], selectedRows = [] } = req.body;

    const sourceJson = await getJson(sourceEnv) || {};
    let targetJson = await getJson(targetEnv);
    if (!targetJson || typeof targetJson !== 'object') targetJson = {};

    // Backup
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFilePath = path.join(__dirname, 'data', `backup-${targetEnv}-${timestamp}.json`);
    await fs.promises.writeFile(backupFilePath, JSON.stringify(targetJson, null, 2));

    let tablesCopied = 0, rowsCopied = 0, tablesDeleted = 0, rowsDeleted = 0;

    // ✅ Handle full table selection
    for (const table of selectedTables) {
      if (sourceJson[table]) {
        targetJson[table] = JSON.parse(JSON.stringify(sourceJson[table]));
        tablesCopied++;
        rowsCopied += sourceJson[table].length;
      } else {
        if (targetJson[table]) {
          delete targetJson[table];
          tablesDeleted++;
        }
      }
    }

    // ✅ Handle specific row selection
    for (const { table, key, sourceRow, targetRow } of selectedRows) {
      if (!targetJson[table]) targetJson[table] = [];
      const index = targetJson[table].findIndex(row => row.key === key);

      if (sourceRow && targetRow) {
        // Update existing row
        if (index !== -1) {
          targetJson[table][index] = sourceRow;
        } else {
          targetJson[table].push(sourceRow);
        }
        rowsCopied++;
      } else if (!sourceRow && targetRow) {
        // Delete if row only in target
        if (index !== -1) {
          targetJson[table].splice(index, 1);
          rowsDeleted++;
        }
        // Remove table if empty
        if (targetJson[table].length === 0) {
          delete targetJson[table];
          tablesDeleted++;
        }
      }
    }

    await uploadJson(targetEnv, targetJson);

    res.json({
      status: 'success',
      tablesCopied,
      rowsCopied,
      tablesDeleted,
      rowsDeleted
    });
  } catch (error) {
    console.error('Migration Failed:', error);
    res.status(500).json({ error: 'Failed to migrate data' });
  }
});

// Start server
app.listen(3000, () => console.log('Server running at http://localhost:3000'));
