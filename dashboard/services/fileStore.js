const fs = require('fs');
const path = require('path');

function ensureDirectory(directoryPath) {
  fs.mkdirSync(directoryPath, { recursive: true });
}

function readJson(filePath, fallbackValue = null) {
  try {
    if (!fs.existsSync(filePath)) {
      return fallbackValue;
    }

    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    return fallbackValue;
  }
}

function writeJson(filePath, value) {
  ensureDirectory(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

function appendText(filePath, text) {
  ensureDirectory(path.dirname(filePath));
  fs.appendFileSync(filePath, text);
}

function readText(filePath, fallbackValue = '') {
  try {
    if (!fs.existsSync(filePath)) {
      return fallbackValue;
    }

    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    return fallbackValue;
  }
}

module.exports = {
  appendText,
  ensureDirectory,
  readJson,
  readText,
  writeJson
};
