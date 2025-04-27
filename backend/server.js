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
    const { sourceEnv, targetEnv } = req.body;
    const selectedTables = req.body.selectedTables || [];
    const selectedRows = req.body.selectedRows || [];

    const sourceJson = await getJson(sourceEnv) || {};
    let targetJson = await getJson(targetEnv);
    if (!targetJson || typeof targetJson !== 'object') {
      targetJson = {}; // ensure targetJson is at least empty object
    }

    // Backup first
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `backup-${targetEnv}-${timestamp}.json`;
    const backupFilePath = path.join(__dirname, 'data', backupFileName);
    await fs.promises.writeFile(backupFilePath, JSON.stringify(targetJson, null, 2));

    let tablesCopied = 0;
    let rowsCopied = 0;

    // Handle full table selection
    if (selectedTables.length > 0) {
      selectedTables.forEach(table => {
        const sourceRows = sourceJson[table];
        if (Array.isArray(sourceRows)) {
          targetJson[table] = JSON.parse(JSON.stringify(sourceRows)); // Deep copy
          tablesCopied += 1;
          rowsCopied += sourceRows.length;
        }
      });
    }

    // Handle specific rows selection
    if (selectedRows.length > 0) {
      selectedRows.forEach(({ table, key }) => {
        const sourceRows = sourceJson[table];
        if (!Array.isArray(sourceRows)) return; // skip if source table missing

        const sourceRow = sourceRows.find(row => row.key === key);
        if (!sourceRow) return; // skip if source row missing

        if (!Array.isArray(targetJson[table])) {
          targetJson[table] = []; // create target table if missing
          tablesCopied += 1; // since creating table
        }
        const targetRows = targetJson[table];
        const existingIndex = targetRows.findIndex(row => row.key === key);
        if (existingIndex !== -1) {
          targetRows[existingIndex] = JSON.parse(JSON.stringify(sourceRow)); // overwrite
        } else {
          targetRows.push(JSON.parse(JSON.stringify(sourceRow))); // insert
        }
        rowsCopied += 1;
      });
    }

    await uploadJson(targetEnv, targetJson);

    res.json({ status: 'success', tablesCopied, rowsCopied });
  } catch (error) {
    console.error('Migration Failed:', error);
    res.status(500).json({ error: 'Failed to migrate data' });
  }
});

// Start server
app.listen(3000, () => console.log('Server running at http://localhost:3000'));
