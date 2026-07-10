const { getDashboardProfiles } = require('./profileRegistry');
const { getProfileState } = require('./stateStore');

const AUTO_RUN_TIME_ZONE = 'Asia/Kolkata';
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const AUTO_RUN_SLOT_HOUR_UTC = 3;
const AUTO_RUN_SLOT_MINUTE_UTC = 30;
const SCHEDULER_POLL_INTERVAL_MS = 30 * 1000;

function startScheduler({ onAutoRun, getState }) {
  const tick = async () => {
    const state = getState();
    const profiles = getDashboardProfiles();

    for (const profile of profiles) {
      if (!profile.configured) {
        continue;
      }

      const profileState = getProfileState(profile.id, state);

      if (!profileState.autoRunEnabled || profileState.currentRunId) {
        continue;
      }

      if (!shouldStartAutoRun(profileState, new Date())) {
        continue;
      }

      await onAutoRun(profile.id);
    }
  };

  const timer = setInterval(() => {
    tick().catch(() => {});
  }, SCHEDULER_POLL_INTERVAL_MS);

  tick().catch(() => {});

  return {
    stop() {
      clearInterval(timer);
    }
  };
}

function shouldStartAutoRun(profileState, now = new Date()) {
  const currentSlot = getCurrentIstSlot(now);
  const enabledAt = profileState.autoRunEnabledAt ? new Date(profileState.autoRunEnabledAt) : null;

  if (enabledAt && enabledAt.getTime() > currentSlot.slotAt.getTime()) {
    return false;
  }

  if (!profileState.lastAutoRunAt) {
    return now.getTime() >= currentSlot.slotAt.getTime();
  }

  return now.getTime() >= currentSlot.slotAt.getTime()
    && new Date(profileState.lastAutoRunAt).getTime() < currentSlot.slotAt.getTime();
}

function getNextAutoRunAt(profileState, now = new Date()) {
  if (!profileState.autoRunEnabled) {
    return null;
  }

  const currentSlot = getCurrentIstSlot(now);
  const enabledAt = profileState.autoRunEnabledAt ? new Date(profileState.autoRunEnabledAt) : null;

  if (now.getTime() < currentSlot.slotAt.getTime()) {
    if (enabledAt && enabledAt.getTime() > currentSlot.slotAt.getTime()) {
      return new Date(currentSlot.slotAt.getTime() + 24 * 60 * 60 * 1000).toISOString();
    }

    return currentSlot.slotAt.toISOString();
  }

  if (enabledAt && enabledAt.getTime() > currentSlot.slotAt.getTime()) {
    return new Date(currentSlot.slotAt.getTime() + 24 * 60 * 60 * 1000).toISOString();
  }

  if (!profileState.lastAutoRunAt || new Date(profileState.lastAutoRunAt).getTime() < currentSlot.slotAt.getTime()) {
    return currentSlot.slotAt.toISOString();
  }

  return new Date(currentSlot.slotAt.getTime() + 24 * 60 * 60 * 1000).toISOString();
}

function getCurrentIstSlot(date) {
  const istNow = new Date(date.getTime() + IST_OFFSET_MS);
  const slotAt = new Date(Date.UTC(
    istNow.getUTCFullYear(),
    istNow.getUTCMonth(),
    istNow.getUTCDate(),
    AUTO_RUN_SLOT_HOUR_UTC,
    AUTO_RUN_SLOT_MINUTE_UTC,
    0,
    0
  ));

  return {
    slotAt
  };
}

module.exports = {
  AUTO_RUN_TIME_ZONE,
  getNextAutoRunAt,
  shouldStartAutoRun,
  startScheduler
};
