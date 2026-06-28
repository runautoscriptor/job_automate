const { getDashboardState } = require('./stateStore');

const AUTO_RUN_INTERVAL_MS = 24 * 60 * 60 * 1000;
const SCHEDULER_POLL_INTERVAL_MS = 60 * 1000;

function startScheduler({ onAutoRun }) {
  const timer = setInterval(async () => {
    const state = getDashboardState();

    if (!state.autoRunEnabled || state.currentRunId) {
      return;
    }

    if (!shouldStartAutoRun(state)) {
      return;
    }

    await onAutoRun();
  }, SCHEDULER_POLL_INTERVAL_MS);

  return {
    stop() {
      clearInterval(timer);
    }
  };
}

function shouldStartAutoRun(state) {
  if (!state.lastAutoRunAt) {
    return true;
  }

  const elapsedTime = Date.now() - new Date(state.lastAutoRunAt).getTime();
  return elapsedTime >= AUTO_RUN_INTERVAL_MS;
}

module.exports = {
  AUTO_RUN_INTERVAL_MS,
  startScheduler
};
