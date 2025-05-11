// ✅ Updated `server.js` to handle selectedCells for column-level migration
// ✅ All previous logic preserved

const express = require('express');
const cors = require('cors');
const { getJson, uploadJson, downloadAndSaveJson } = require('./jsonService');
const { normalizeEnv } = require('./envHelper'); // ⬅️ Add this
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

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

app.get('/env-data', async (req, res) => {
  try {
    const { env } = req.query;
    let jsonData = {};
    console.log('env:', env);
    if(env.includes('local')) {
       jsonData = await getJson(env);
    } else if(env.includes('remote')) {
      jsonData = await getJson(env);
    }
    res.json(jsonData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch environment data' });
  }
});

app.post('/migrate', async (req, res) => {
  try {
    const {
      sourceEnv,
      targetEnv,
      selectedTables = [],
      selectedRows = [],
      selectedCells = []
    } = req.body;

    const sourceJson = await getJson(sourceEnv) || {};
    let targetJson = await getJson(targetEnv) || {};
    if (!targetJson || typeof targetJson !== 'object') targetJson = {};

    // ✅ Backup target before changes
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const normalizedTargetEnv = normalizeEnv(targetEnv);
    let data = 'data';
    if(targetEnv.includes('local')) {
      data = 'data/local';
    } else if(targetEnv.includes('remote')) {
      data = 'data/remote';
    }
    const backupDir = path.join(__dirname, data, `${normalizedTargetEnv}/en`);  // ✅ Define it
    const backupFilePath = path.join(backupDir, `backup-${timestamp}.json`);
    
    console.log('normalizedTargetEnv', normalizedTargetEnv);
    console.log('backupFilePath', backupFilePath);
    
    await fs.promises.mkdir(backupDir, { recursive: true });    
    await fs.promises.writeFile(backupFilePath, JSON.stringify(targetJson, null, 2));

    let tablesCopied = 0, rowsCopied = 0, tablesDeleted = 0, rowsDeleted = 0;

    // ✅ Full table replacements
    for (const table of selectedTables) {
      if (sourceJson[table]) {
        targetJson[table] = JSON.parse(JSON.stringify(sourceJson[table]));
        tablesCopied++;
        rowsCopied += sourceJson[table].length;
      } else {
        // ✅ Table only in destination → delete
        if (targetJson[table]) {
          delete targetJson[table];
          tablesDeleted++;
        }
      }
    }

    // ✅ Row-level insert/update/delete
    for (const { table, key, sourceRow, targetRow } of selectedRows) {
      if (!targetJson[table]) targetJson[table] = [];

      const index = targetJson[table].findIndex(row => row.key === key);

      if (sourceRow && targetRow) {
        // ✅ Update existing
        if (index !== -1) {
          targetJson[table][index] = sourceRow;
        } else {
          targetJson[table].push(sourceRow);
        }
        rowsCopied++;
      } else if (sourceRow && !targetRow) {
        // ✅ New row
        targetJson[table].push(sourceRow);
        rowsCopied++;
      } else if (!sourceRow && targetRow) {
        // ✅ Delete row
        if (index !== -1) {
          targetJson[table].splice(index, 1);
          rowsDeleted++;
        }

        // ✅ Delete table if empty
        if (targetJson[table].length === 0) {
          delete targetJson[table];
          tablesDeleted++;
        }
      }
    }

    // ✅ Column-level updates
    for (const { table, key, columns, sourceRow } of selectedCells) {
      if (!sourceRow || !columns?.length) continue;

      if (!targetJson[table]) targetJson[table] = [];

      let row = targetJson[table].find(r => r.key === key);
      if (!row) {
        row = { key };
        targetJson[table].push(row);
      }

      for (const col of columns) {
        if (col in sourceRow) {
          row[col] = sourceRow[col];
        }
      }
    }

    await uploadJson(normalizedTargetEnv, targetJson);

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

app.get('/download-remote', async (req, res) => {
  try {
    const { env, lob } = req.query;
    if (!env || !lob) return res.status(400).json({ error: 'Missing env or lob' });

    await downloadAndSaveJson(env, lob);
    res.json({ status: 'success' });
  } catch (error) {
    console.error('Download failed:', error.message);
    res.status(500).json({ error: 'Failed to download remote JSON' });
  }
});


app.listen(3000, () => console.log('Server running at http://localhost:3000'));
