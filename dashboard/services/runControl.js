const fs = require('fs');
const { getRunStopRequestPath } = require('./paths');
const { ensureDirectory, writeJson } = require('./fileStore');

class StopRequestedError extends Error {
  constructor(message = 'Automation stop was requested.') {
    super(message);
    this.name = 'StopRequestedError';
  }
}

function requestStop(profileId, runId) {
  const stopRequestPath = getRunStopRequestPath(profileId, runId);
  ensureDirectory(require('path').dirname(stopRequestPath));
  writeJson(stopRequestPath, {
    profileId,
    runId,
    requestedAt: new Date().toISOString()
  });

  return stopRequestPath;
}

function clearStopRequest(profileId, runId) {
  const stopRequestPath = getRunStopRequestPath(profileId, runId);

  if (fs.existsSync(stopRequestPath)) {
    fs.unlinkSync(stopRequestPath);
  }
}

function hasStopRequest(profileId, runId) {
  return fs.existsSync(getRunStopRequestPath(profileId, runId));
}

function createStopMonitor(profileId, runId) {
  return {
    profileId,
    runId,
    isStopRequested() {
      return hasStopRequest(profileId, runId);
    },
    async throwIfStopRequested() {
      if (hasStopRequest(profileId, runId)) {
        throw new StopRequestedError();
      }
    }
  };
}

module.exports = {
  StopRequestedError,
  clearStopRequest,
  createStopMonitor,
  hasStopRequest,
  requestStop
};
