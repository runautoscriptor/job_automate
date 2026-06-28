const path = require('path');
const { spawn } = require('child_process');
const {
  createRunSummary,
  getDashboardState,
  readRunSummary,
  updateDashboardState
} = require('./stateStore');
const { appendText, ensureDirectory, readText } = require('./fileStore');
const { getRunDirectory, getRunLogPath } = require('./paths');
const { requestStop } = require('./runControl');

let activeChildProcess = null;

function startAutomationRun(options = {}) {
  const currentState = getDashboardState();

  if (currentState.currentRunId && activeChildProcess) {
    return {
      started: false,
      reason: 'already-running',
      runId: currentState.currentRunId
    };
  }

  const runId = options.runId || buildRunId();
  const runDirectory = getRunDirectory(runId);
  const logPath = getRunLogPath(runId);

  ensureDirectory(runDirectory);
  createRunSummary(runId, createInitialRunSummary(runId, options.trigger || 'manual'));

  updateDashboardState((state) => ({
    ...state,
    currentRunId: runId,
    lastRunId: runId
  }));

  const child = spawn(
    process.execPath,
    [path.resolve(process.cwd(), 'scripts', 'runDashboardAutomation.js')],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        DASHBOARD_RUN_ID: runId,
        DASHBOARD_TRIGGER: options.trigger || 'manual'
      },
      stdio: ['ignore', 'pipe', 'pipe']
    }
  );

  activeChildProcess = child;

  child.stdout.on('data', (chunk) => {
    appendText(logPath, chunk.toString());
  });

  child.stderr.on('data', (chunk) => {
    appendText(logPath, chunk.toString());
  });

  child.on('exit', () => {
    activeChildProcess = null;
    const finalSummary = readRunSummary(runId);

    updateDashboardState((state) => ({
      ...state,
      currentRunId: state.currentRunId === runId ? null : state.currentRunId,
      lastRunId: runId,
      lastCompletedRunId: finalSummary?.status === 'completed' ? runId : state.lastCompletedRunId,
      lastAutoRunAt:
        options.trigger === 'auto' ? new Date().toISOString() : state.lastAutoRunAt
    }));
  });

  return {
    started: true,
    runId
  };
}

function stopAutomationRun() {
  const state = getDashboardState();

  if (!state.currentRunId) {
    return {
      stopped: false,
      reason: 'not-running'
    };
  }

  requestStop(state.currentRunId);

  return {
    stopped: true,
    runId: state.currentRunId
  };
}

function getCurrentRunLogs() {
  const state = getDashboardState();

  if (!state.currentRunId) {
    return '';
  }

  return readText(getRunLogPath(state.currentRunId), '');
}

function buildRunId() {
  const now = new Date();
  const datePart = now.toISOString().replace(/[-:TZ.]/g, '').slice(0, 17);
  return `run-${datePart}`;
}

function createInitialRunSummary(runId, trigger) {
  return {
    runId,
    trigger,
    status: 'running',
    startedAt: new Date().toISOString(),
    finishedAt: null,
    modules: {},
    error: null
  };
}

module.exports = {
  getCurrentRunLogs,
  startAutomationRun,
  stopAutomationRun
};
