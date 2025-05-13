const fs = require('fs').promises;
const axios = require('axios');
const { JSON_PATHS } = require('./config');
const { normalizeEnv } = require('./envHelper'); // ⬅️ Add this
const path = require('path');

async function getJson(env) {
  console.log('getJson:', env);
  const path = JSON_PATHS[env];
  const data = await fs.readFile(path, 'utf-8');
  return JSON.parse(data);
}

async function uploadJson(env, jsonData) {
  console.log('uploadJson:', env);
  const filePath = JSON_PATHS[env];

  if (!filePath) throw new Error(`❌ No upload path defined for env: ${env}`);

  const dir = path.dirname(filePath); // 🧭 get parent folder

  await fs.mkdir(dir, { recursive: true }); // ✅ ensure folder exists
  await fs.writeFile(filePath, JSON.stringify(jsonData, null, 2), 'utf-8'); // ✍️ write file
}

// ✅ New function: Download JSON from API and save locally
async function downloadAndSaveJson(env, lob) {
  try {
    const targetEnv = normalizeEnv(env);
    const url = `https://raw.githubusercontent.com/rohit11/json-host/main/${lob}/${targetEnv}/en/en.json`; 

    console.log('url:', url);
    // 🔥 Example: Adjust this to match your real API structure

    const response = await axios.get(url);
    const jsonData = response.data;

    let data = 'data';
        if(env.includes('local')) {
          data = 'data/local';
        } else if(env.includes('remote')) {
          data = 'data/remote';
        }
        const backupDir = path.join(__dirname, data, `${lob}/${targetEnv}/en`);  // ✅ Define it
        const backupFilePath = path.join(backupDir, `en.json`);
        
        console.log('backupDir:', backupDir);
        console.log('backupFilePath:', backupFilePath);

        await fs.mkdir(backupDir, { recursive: true });    
        await fs.writeFile(backupFilePath, JSON.stringify(jsonData, null, 2), 'utf-8');

        //return await getJson(env);
        return jsonData;

    console.log(`✅ Downloaded and saved JSON for env: ${targetEnv} at ${backupFilePath}`);
  } catch (error) {
    console.error('❌ Failed to download and save JSON:', error.message);
    throw error;
  }
}

module.exports = { getJson, uploadJson, downloadAndSaveJson };
