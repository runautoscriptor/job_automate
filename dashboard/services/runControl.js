const fs = require('fs');
const { getRunStopRequestPath } = require('./paths');
const { ensureDirectory, writeJson } = require('./fileStore');

class StopRequestedError extends Error {
  constructor(message = 'Automation stop was requested.') {
    super(message);
    this.name = 'StopRequestedError';
  }
}

function requestStop(runId) {
  const stopRequestPath = getRunStopRequestPath(runId);
  ensureDirectory(require('path').dirname(stopRequestPath));
  writeJson(stopRequestPath, {
    runId,
    requestedAt: new Date().toISOString()
  });

  return stopRequestPath;
}

function clearStopRequest(runId) {
  const stopRequestPath = getRunStopRequestPath(runId);

  if (fs.existsSync(stopRequestPath)) {
    fs.unlinkSync(stopRequestPath);
  }
}

function hasStopRequest(runId) {
  return fs.existsSync(getRunStopRequestPath(runId));
}

function createStopMonitor(runId) {
  return {
    runId,
    isStopRequested() {
      return hasStopRequest(runId);
    },
    async throwIfStopRequested() {
      if (hasStopRequest(runId)) {
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
