const path = require('path');

const ROOT_DIR = process.cwd();
const DATA_DIR = path.resolve(ROOT_DIR, 'data');
const DASHBOARD_DIR = path.join(DATA_DIR, 'dashboard');
const PROFILES_DIR = path.join(DASHBOARD_DIR, 'profiles');
const CONTROL_DIR = path.join(DASHBOARD_DIR, 'control');
const STATE_PATH = path.join(DASHBOARD_DIR, 'state.json');
const PUBLIC_DIR = path.resolve(ROOT_DIR, 'dashboard', 'public');

function normalizeProfileId(profileId = 'profile-1') {
  return String(profileId || 'profile-1')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-');
}

function getProfileDirectory(profileId) {
  return path.join(PROFILES_DIR, normalizeProfileId(profileId));
}

function getProfileRunsDirectory(profileId) {
  return path.join(getProfileDirectory(profileId), 'run');
}

function getRunDirectory(profileId, runId) {
  return path.join(getProfileRunsDirectory(profileId), runId);
}

function getProfileSummaryPath(profileId) {
  return path.join(getProfileDirectory(profileId), 'latest-summary.json');
}

function getProfileLogPath(profileId) {
  return path.join(getProfileDirectory(profileId), 'latest-logs.txt');
}

function getRunSummaryPath(profileId, runId) {
  return path.join(getRunDirectory(profileId, runId), 'summary.json');
}

function getRunLogPath(profileId, runId) {
  return path.join(getRunDirectory(profileId, runId), 'logs.txt');
}

function getRunStopRequestPath(profileId, runId) {
  return path.join(CONTROL_DIR, `${normalizeProfileId(profileId)}-${runId}.stop.json`);
}

module.exports = {
  CONTROL_DIR,
  DASHBOARD_DIR,
  DATA_DIR,
  PROFILES_DIR,
  PUBLIC_DIR,
  STATE_PATH,
  getProfileDirectory,
  getProfileLogPath,
  getProfileRunsDirectory,
  getProfileSummaryPath,
  getRunDirectory,
  getRunLogPath,
  getRunStopRequestPath,
  getRunSummaryPath
};
