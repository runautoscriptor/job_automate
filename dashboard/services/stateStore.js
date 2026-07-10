const fs = require('fs');
const {
  CONTROL_DIR,
  DASHBOARD_DIR,
  PROFILES_DIR,
  STATE_PATH,
  getProfileDirectory,
  getProfileLogPath,
  getProfileRunsDirectory,
  getProfileSummaryPath,
  getRunDirectory,
  getRunSummaryPath
} = require('./paths');
const { ensureDirectory, readJson, readText, removePath, writeJson } = require('./fileStore');
const { getDashboardProfiles } = require('./profileRegistry');

function initializeDashboardState() {
  ensureDirectory(DASHBOARD_DIR);
  ensureDirectory(PROFILES_DIR);
  ensureDirectory(CONTROL_DIR);

  const profiles = getDashboardProfiles();
  const defaultState = createDefaultState(profiles);
  const currentState = readJson(STATE_PATH, null);

  const nextState = currentState
    ? migrateState(currentState, profiles)
    : defaultState;

  writeJson(STATE_PATH, nextState);
  ensureProfileDirectories(profiles);

  return nextState;
}

function createDefaultState(profiles = getDashboardProfiles()) {
  return {
    selectedProfileId: profiles[0]?.id || 'profile-1',
    profiles: Object.fromEntries(
      profiles.map((profile) => [profile.id, createDefaultProfileState()])
    ),
    updatedAt: new Date().toISOString()
  };
}

function createDefaultProfileState() {
  return {
    autoRunEnabled: false,
    autoRunEnabledAt: null,
    currentRunId: null,
    currentRunPid: null,
    lastRunId: null,
    lastCompletedRunId: null,
    lastAutoRunAt: null,
    updatedAt: new Date().toISOString()
  };
}

function migrateState(state, profiles) {
  const baseState = createDefaultState(profiles);
  const nextState = {
    selectedProfileId: profiles.some((profile) => profile.id === state.selectedProfileId)
      ? state.selectedProfileId
      : baseState.selectedProfileId,
    profiles: { ...baseState.profiles },
    updatedAt: new Date().toISOString()
  };

  if (state.profiles) {
    for (const profile of profiles) {
      nextState.profiles[profile.id] = {
        ...baseState.profiles[profile.id],
        ...(state.profiles[profile.id] || {})
      };
    }
  } else {
    const primaryProfileId = profiles[0]?.id || 'profile-1';
    nextState.profiles[primaryProfileId] = {
      ...baseState.profiles[primaryProfileId],
      autoRunEnabled: Boolean(state.autoRunEnabled),
      autoRunEnabledAt: state.autoRunEnabledAt || null,
      currentRunId: state.currentRunId || null,
      currentRunPid: state.currentRunPid || null,
      lastRunId: state.lastRunId || null,
      lastCompletedRunId: state.lastCompletedRunId || null,
      lastAutoRunAt: state.lastAutoRunAt || null,
      updatedAt: new Date().toISOString()
    };
  }

  return nextState;
}

function ensureProfileDirectories(profiles = getDashboardProfiles()) {
  for (const profile of profiles) {
    ensureDirectory(getProfileDirectory(profile.id));
    ensureDirectory(getProfileRunsDirectory(profile.id));
  }
}

function getDashboardState() {
  return initializeDashboardState();
}

function updateDashboardState(updater) {
  const currentState = getDashboardState();
  const nextState = typeof updater === 'function' ? updater(currentState) : updater;
  const stateToPersist = {
    selectedProfileId: nextState.selectedProfileId || currentState.selectedProfileId,
    profiles: {
      ...currentState.profiles,
      ...(nextState.profiles || {})
    },
    updatedAt: new Date().toISOString()
  };

  writeJson(STATE_PATH, stateToPersist);
  return stateToPersist;
}

function getProfileState(profileId, state = getDashboardState()) {
  return state.profiles[profileId] || createDefaultProfileState();
}

function updateProfileState(profileId, updater) {
  return updateDashboardState((state) => {
    const currentProfileState = getProfileState(profileId, state);
    const nextProfileState = typeof updater === 'function'
      ? updater(currentProfileState)
      : updater;

    return {
      ...state,
      profiles: {
        ...state.profiles,
        [profileId]: {
          ...currentProfileState,
          ...nextProfileState,
          updatedAt: new Date().toISOString()
        }
      }
    };
  });
}

function setSelectedProfileId(profileId) {
  return updateDashboardState((state) => ({
    ...state,
    selectedProfileId: profileId
  }));
}

function replaceLatestRun(profileId, runId, summary) {
  ensureDirectory(getRunDirectory(profileId, runId));
  writeJson(getRunSummaryPath(profileId, runId), summary);
  writeJson(getProfileSummaryPath(profileId), summary);
}

function readLatestRunSummary(profileId) {
  return readJson(getProfileSummaryPath(profileId), null);
}

function readRunSummary(profileId, runId) {
  if (!runId) {
    return null;
  }

  return readJson(getRunSummaryPath(profileId, runId), null) || readLatestRunSummary(profileId);
}

function readLatestRunLogs(profileId) {
  return readText(getProfileLogPath(profileId), '');
}

function cleanupPreviousRun(profileId, runIdToKeep = null) {
  const runParentDirectory = getProfileRunsDirectory(profileId);

  if (!fs.existsSync(runParentDirectory)) {
    return;
  }

  for (const entry of fs.readdirSync(runParentDirectory, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }

    if (entry.name === runIdToKeep) {
      continue;
    }

    removePath(getRunDirectory(profileId, entry.name));
  }
}

module.exports = {
  cleanupPreviousRun,
  getDashboardState,
  getProfileState,
  initializeDashboardState,
  readLatestRunLogs,
  readLatestRunSummary,
  readRunSummary,
  replaceLatestRun,
  setSelectedProfileId,
  updateDashboardState,
  updateProfileState
};
