const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { getEnv } = require('./env');

const AUTH_STATE_PATH = path.resolve(process.cwd(), 'auth', 'naukri-user.json');
const AUTH_METADATA_PATH = path.resolve(process.cwd(), 'auth', 'naukri-user.meta.json');

function getAuthStatePath() {
  return AUTH_STATE_PATH;
}

function getAuthMetadataPath() {
  return AUTH_METADATA_PATH;
}

function hasAuthState() {
  return fs.existsSync(AUTH_STATE_PATH);
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function buildCredentialFingerprint(
  email = getEnv('NAUKRI_EMAIL'),
  password = getEnv('NAUKRI_PASSWORD')
) {
  if (!email || !password) {
    return null;
  }

  return crypto
    .createHash('sha256')
    .update(`${normalizeEmail(email)}::${password}`)
    .digest('hex');
}

function readAuthMetadata() {
  if (!fs.existsSync(AUTH_METADATA_PATH)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(AUTH_METADATA_PATH, 'utf8'));
  } catch (error) {
    return null;
  }
}

function hasCompatibleAuthState(
  email = getEnv('NAUKRI_EMAIL'),
  password = getEnv('NAUKRI_PASSWORD')
) {
  if (!hasAuthState()) {
    return false;
  }

  const expectedFingerprint = buildCredentialFingerprint(email, password);
  const authMetadata = readAuthMetadata();

  if (!expectedFingerprint || !authMetadata?.credentialFingerprint) {
    return false;
  }

  return authMetadata.credentialFingerprint === expectedFingerprint;
}

function saveAuthMetadata({
  email = getEnv('NAUKRI_EMAIL'),
  password = getEnv('NAUKRI_PASSWORD')
} = {}) {
  const credentialFingerprint = buildCredentialFingerprint(email, password);

  if (!credentialFingerprint) {
    throw new Error('Cannot save auth metadata without both NAUKRI_EMAIL and NAUKRI_PASSWORD.');
  }

  const metadata = {
    email: normalizeEmail(email),
    credentialFingerprint,
    updatedAt: new Date().toISOString()
  };

  fs.writeFileSync(AUTH_METADATA_PATH, JSON.stringify(metadata, null, 2));

  return metadata;
}

module.exports = {
  getAuthStatePath,
  getAuthMetadataPath,
  hasAuthState,
  hasCompatibleAuthState,
  readAuthMetadata,
  saveAuthMetadata
};
