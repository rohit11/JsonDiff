const fs = require('fs').promises;
const { JSON_PATHS } = require('./config');

async function getJson(env) {
  const path = JSON_PATHS[env];
  const data = await fs.readFile(path, 'utf-8');
  return JSON.parse(data);
}

async function uploadJson(env, jsonData) {
  const path = JSON_PATHS[env];
  await fs.writeFile(path, JSON.stringify(jsonData, null, 2), 'utf-8');
}

// ✅ New function: Download JSON from API and save locally
async function downloadAndSaveJson(env, lob) {
  try {
    const url = `https://your-api-domain.com/api/json/${lob}/${env}`; 
    // 🔥 Example: Adjust this to match your real API structure

    const response = await axios.get(url);
    const jsonData = response.data;

    const localPath = JSON_PATHS[env]; // Example: ./data/dev.json
    await fs.writeFile(localPath, JSON.stringify(jsonData, null, 2), 'utf-8');

    console.log(`✅ Downloaded and saved JSON for env: ${env} at ${localPath}`);
  } catch (error) {
    console.error('❌ Failed to download and save JSON:', error.message);
    throw error;
  }
}

module.exports = { getJson, uploadJson, downloadAndSaveJson };
