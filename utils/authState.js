const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { getEnv } = require('./env');

function normalizeProfileKey(profileKey = 'default') {
  return String(profileKey || 'default')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-');
}

function getAuthStatePath(profileKey = 'default') {
  const normalizedProfileKey = normalizeProfileKey(profileKey);
  const fileName =
    normalizedProfileKey === 'default'
      ? 'naukri-user.json'
      : `naukri-user-${normalizedProfileKey}.json`;

  return path.resolve(process.cwd(), 'auth', fileName);
}

function getAuthMetadataPath(profileKey = 'default') {
  const normalizedProfileKey = normalizeProfileKey(profileKey);
  const fileName =
    normalizedProfileKey === 'default'
      ? 'naukri-user.meta.json'
      : `naukri-user-${normalizedProfileKey}.meta.json`;

  return path.resolve(process.cwd(), 'auth', fileName);
}

function hasAuthState(profileKey = 'default') {
  return fs.existsSync(getAuthStatePath(profileKey));
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

function readAuthMetadata(profileKey = 'default') {
  const metadataPath = getAuthMetadataPath(profileKey);

  if (!fs.existsSync(metadataPath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
  } catch (error) {
    return null;
  }
}

function hasCompatibleAuthState(
  email = getEnv('NAUKRI_EMAIL'),
  password = getEnv('NAUKRI_PASSWORD'),
  profileKey = 'default'
) {
  if (!hasAuthState(profileKey)) {
    return false;
  }

  const expectedFingerprint = buildCredentialFingerprint(email, password);
  const authMetadata = readAuthMetadata(profileKey);

  if (!expectedFingerprint || !authMetadata?.credentialFingerprint) {
    return false;
  }

  return authMetadata.credentialFingerprint === expectedFingerprint;
}

function saveAuthMetadata({
  email = getEnv('NAUKRI_EMAIL'),
  password = getEnv('NAUKRI_PASSWORD'),
  profileKey = 'default'
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

  fs.writeFileSync(getAuthMetadataPath(profileKey), JSON.stringify(metadata, null, 2));

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
