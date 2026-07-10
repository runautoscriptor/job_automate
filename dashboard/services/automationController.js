const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const {
  cleanupPreviousRun,
  getDashboardState,
  getProfileState,
  readLatestRunSummary,
  readRunSummary,
  replaceLatestRun,
  updateProfileState
} = require('./stateStore');
const { appendText, ensureDirectory, removePath } = require('./fileStore');
const { getProfileDirectory, getProfileLogPath, getRunDirectory, getRunLogPath } = require('./paths');
const { getDashboardProfiles, getProfileById } = require('./profileRegistry');
const { requestStop } = require('./runControl');

const activeChildProcesses = new Map();

function startAutomationRun(options = {}) {
  const profileId = options.profileId || getDashboardState().selectedProfileId;
  const profile = getProfileById(profileId);

  if (!profile?.configured) {
    return {
      started: false,
      reason: 'profile-not-configured',
      profileId
    };
  }

  reconcileProfileRuntime(profileId);
  const currentProfileState = getProfileState(profileId);

  if (currentProfileState.currentRunId && isRunProcessAlive(currentProfileState.currentRunPid)) {
    return {
      started: false,
      reason: 'already-running',
      runId: currentProfileState.currentRunId,
      profileId
    };
  }

  const runId = options.runId || buildRunId(profileId);
  const runDirectory = getRunDirectory(profileId, runId);
  const logPath = getRunLogPath(profileId, runId);
  const profileLogPath = getProfileLogPath(profileId);

  cleanupPreviousRun(profileId);
  ensureDirectory(runDirectory);
  removePath(profileLogPath);

  const initialSummary = createInitialRunSummary(runId, options.trigger || 'manual', profileId);
  replaceLatestRun(profileId, runId, initialSummary);

  const child = spawn(
    process.execPath,
    [path.resolve(process.cwd(), 'scripts', 'runDashboardAutomation.js')],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        DASHBOARD_RUN_ID: runId,
        DASHBOARD_TRIGGER: options.trigger || 'manual',
        DASHBOARD_PROFILE_ID: profileId,
        NAUKRI_EMAIL: profile.email,
        NAUKRI_PASSWORD: profile.password,
        DASHBOARD_HEADLESS: 'true'
      },
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false
    }
  );

  activeChildProcesses.set(profileId, child);

  updateProfileState(profileId, {
    currentRunId: runId,
    currentRunPid: child.pid,
    lastRunId: runId
  });

  child.stdout.on('data', (chunk) => {
    appendText(logPath, chunk.toString());
    appendText(profileLogPath, chunk.toString());
  });

  child.stderr.on('data', (chunk) => {
    appendText(logPath, chunk.toString());
    appendText(profileLogPath, chunk.toString());
  });

  child.on('exit', () => {
    activeChildProcesses.delete(profileId);
    const finalSummary = readLatestRunSummary(profileId);

    updateProfileState(profileId, (state) => ({
      ...state,
      currentRunId: null,
      currentRunPid: null,
      lastRunId: runId,
      lastCompletedRunId: finalSummary?.status === 'completed' ? runId : state.lastCompletedRunId,
      lastAutoRunAt: options.trigger === 'auto' ? new Date().toISOString() : state.lastAutoRunAt
    }));
  });

  return {
    started: true,
    profileId,
    runId
  };
}

function stopAutomationRun(profileId) {
  const targetProfileId = profileId || getDashboardState().selectedProfileId;
  reconcileProfileRuntime(targetProfileId);
  const profileState = getProfileState(targetProfileId);

  if (!profileState.currentRunId) {
    return {
      stopped: false,
      reason: 'not-running',
      profileId: targetProfileId
    };
  }

  requestStop(targetProfileId, profileState.currentRunId);

  if (!isRunProcessAlive(profileState.currentRunPid)) {
    markLatestRunInterrupted(targetProfileId, profileState.currentRunId);
    updateProfileState(targetProfileId, {
      currentRunId: null,
      currentRunPid: null
    });
  }

  return {
    stopped: true,
    profileId: targetProfileId,
    runId: profileState.currentRunId
  };
}

function getDashboardSnapshot(selectedProfileId) {
  const profiles = getDashboardProfiles().map((profile) => {
    reconcileProfileRuntime(profile.id);
    const state = getProfileState(profile.id);
    const latestRun = readLatestRunSummary(profile.id);

    return {
      ...profile,
      state,
      latestRun
    };
  });

  const resolvedProfileId = profiles.some((profile) => profile.id === selectedProfileId)
    ? selectedProfileId
    : profiles[0]?.id;
  const selectedProfile = profiles.find((profile) => profile.id === resolvedProfileId) || profiles[0];

  return {
    selectedProfileId: resolvedProfileId,
    selectedProfile,
    profiles
  };
}

function reconcileProfileRuntime(profileId) {
  const profileState = getProfileState(profileId);
  const child = activeChildProcesses.get(profileId);

  if (child && child.exitCode === null) {
    if (profileState.currentRunPid !== child.pid) {
      updateProfileState(profileId, {
        currentRunPid: child.pid,
        currentRunId: profileState.currentRunId || readLatestRunSummary(profileId)?.runId || null
      });
    }
    return;
  }

  if (!profileState.currentRunId) {
    return;
  }

  if (isRunProcessAlive(profileState.currentRunPid)) {
    return;
  }

  markLatestRunInterrupted(profileId, profileState.currentRunId);
  updateProfileState(profileId, {
    currentRunId: null,
    currentRunPid: null
  });
}

function markLatestRunInterrupted(profileId, runId) {
  const summary = readRunSummary(profileId, runId);

  if (!summary || summary.status !== 'running') {
    return;
  }

  replaceLatestRun(profileId, runId, {
    ...summary,
    status: 'interrupted',
    finishedAt: new Date().toISOString(),
    error: summary.error || 'Dashboard server restarted before this run completed.'
  });
}

function isRunProcessAlive(pid) {
  if (!pid) {
    return false;
  }

  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return false;
  }
}

function buildRunId(profileId) {
  const now = new Date();
  const datePart = now.toISOString().replace(/[-:TZ.]/g, '').slice(0, 17);
  return `${profileId}-${datePart}`;
}

function createInitialRunSummary(runId, trigger, profileId) {
  return {
    runId,
    profileId,
    trigger,
    status: 'running',
    startedAt: new Date().toISOString(),
    finishedAt: null,
    modules: {},
    error: null
  };
}

module.exports = {
  getDashboardSnapshot,
  startAutomationRun,
  stopAutomationRun
};
