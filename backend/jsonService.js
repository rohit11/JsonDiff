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

module.exports = { getJson, uploadJson };
