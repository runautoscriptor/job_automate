const fs = require('fs');
const path = require('path');

loadEnvFile(path.resolve(process.cwd(), '.env'));

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const fileContents = fs.readFileSync(filePath, 'utf8');
  const lines = fileContents.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');

    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = normalizeValue(line.slice(separatorIndex + 1).trim());

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function normalizeValue(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function getEnv(name, fallback) {
  return process.env[name] ?? fallback;
}

function getNumberEnv(name, fallback) {
  const value = process.env[name];

  if (!value) {
    return fallback;
  }

  const parsedValue = Number(value);

  if (Number.isNaN(parsedValue)) {
    throw new Error(`Environment variable ${name} must be a number.`);
  }

  return parsedValue;
}

function validateRequiredEnv(requiredNames) {
  const missingValues = requiredNames.filter((name) => !getEnv(name));

  if (missingValues.length > 0) {
    throw new Error(`Missing required environment variables: ${missingValues.join(', ')}`);
  }
}

module.exports = {
  getEnv,
  getNumberEnv,
  validateRequiredEnv
};
