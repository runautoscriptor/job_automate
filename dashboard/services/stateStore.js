const fs = require('fs');
const {
  DASHBOARD_DIR,
  RUNS_DIR,
  CONTROL_DIR,
  STATE_PATH,
  getRunDirectory,
  getRunSummaryPath
} = require('./paths');
const { ensureDirectory, readJson, writeJson } = require('./fileStore');

function initializeDashboardState() {
  ensureDirectory(DASHBOARD_DIR);
  ensureDirectory(RUNS_DIR);
  ensureDirectory(CONTROL_DIR);

  if (!fs.existsSync(STATE_PATH)) {
    writeJson(STATE_PATH, createDefaultState());
  }

  return readJson(STATE_PATH, createDefaultState());
}

function createDefaultState() {
  return {
    autoRunEnabled: false,
    currentRunId: null,
    lastRunId: null,
    lastCompletedRunId: null,
    lastAutoRunAt: null,
    updatedAt: new Date().toISOString()
  };
}

function getDashboardState() {
  initializeDashboardState();
  return readJson(STATE_PATH, createDefaultState());
}

function updateDashboardState(updater) {
  const currentState = getDashboardState();
  const nextState = typeof updater === 'function' ? updater(currentState) : updater;
  const stateToPersist = {
    ...currentState,
    ...nextState,
    updatedAt: new Date().toISOString()
  };

  writeJson(STATE_PATH, stateToPersist);

  return stateToPersist;
}

function createRunSummary(runId, summary) {
  ensureDirectory(getRunDirectory(runId));
  writeJson(getRunSummaryPath(runId), summary);
}

function readRunSummary(runId) {
  return readJson(getRunSummaryPath(runId), null);
}

function listRunSummaries(limit = 10) {
  initializeDashboardState();

  const runDirectories = fs.existsSync(RUNS_DIR)
    ? fs.readdirSync(RUNS_DIR, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort((left, right) => right.localeCompare(left))
    : [];

  return runDirectories
    .slice(0, limit)
    .map((runId) => readRunSummary(runId))
    .filter(Boolean);
}

module.exports = {
  createRunSummary,
  getDashboardState,
  initializeDashboardState,
  listRunSummaries,
  readRunSummary,
  updateDashboardState
};
