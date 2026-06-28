const path = require('path');

const ROOT_DIR = process.cwd();
const DATA_DIR = path.resolve(ROOT_DIR, 'data');
const DASHBOARD_DIR = path.join(DATA_DIR, 'dashboard');
const RUNS_DIR = path.join(DASHBOARD_DIR, 'runs');
const CONTROL_DIR = path.join(DASHBOARD_DIR, 'control');
const STATE_PATH = path.join(DASHBOARD_DIR, 'state.json');
const PUBLIC_DIR = path.resolve(ROOT_DIR, 'dashboard', 'public');

function getRunDirectory(runId) {
  return path.join(RUNS_DIR, runId);
}

function getRunSummaryPath(runId) {
  return path.join(getRunDirectory(runId), 'summary.json');
}

function getRunLogPath(runId) {
  return path.join(getRunDirectory(runId), 'logs.txt');
}

function getRunStopRequestPath(runId) {
  return path.join(CONTROL_DIR, `${runId}.stop.json`);
}

module.exports = {
  CONTROL_DIR,
  DASHBOARD_DIR,
  DATA_DIR,
  PUBLIC_DIR,
  RUNS_DIR,
  STATE_PATH,
  getRunDirectory,
  getRunLogPath,
  getRunStopRequestPath,
  getRunSummaryPath
};
