const { getDashboardProfiles } = require('./profileRegistry');
const { getProfileState } = require('./stateStore');
const { getEnv, getNumberEnv } = require('../../utils/env');

const AUTO_RUN_TIME_ZONE = 'Asia/Kolkata';
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const DEFAULT_AUTO_RUN_HOUR_IST = 9;
const DEFAULT_AUTO_RUN_MINUTE_IST = 0;
const SCHEDULER_POLL_INTERVAL_MS = getNumberEnv('DASHBOARD_SCHEDULER_POLL_INTERVAL_MS', 30 * 1000);

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
  const schedule = getAutoRunSchedule();
  const istNow = new Date(date.getTime() + IST_OFFSET_MS);
  const slotAt = new Date(
    Date.UTC(
      istNow.getUTCFullYear(),
      istNow.getUTCMonth(),
      istNow.getUTCDate(),
      schedule.hour,
      schedule.minute,
      0,
      0
    ) - IST_OFFSET_MS
  );

  return {
    slotAt
  };
}

function getAutoRunSchedule() {
  const timeValue = getEnv('DASHBOARD_AUTO_RUN_TIME_IST', '');
  const timeMatch = /^(\d{1,2}):(\d{2})$/.exec(timeValue.trim());

  if (timeMatch) {
    return normalizeSchedule(Number(timeMatch[1]), Number(timeMatch[2]));
  }

  return normalizeSchedule(
    getNumberEnv('DASHBOARD_AUTO_RUN_HOUR_IST', DEFAULT_AUTO_RUN_HOUR_IST),
    getNumberEnv('DASHBOARD_AUTO_RUN_MINUTE_IST', DEFAULT_AUTO_RUN_MINUTE_IST)
  );
}

function normalizeSchedule(hour, minute) {
  return {
    hour: Math.min(Math.max(Number(hour) || 0, 0), 23),
    minute: Math.min(Math.max(Number(minute) || 0, 0), 59)
  };
}

function getAutoRunTimeLabel() {
  const schedule = getAutoRunSchedule();
  const hour12 = schedule.hour % 12 || 12;
  const suffix = schedule.hour >= 12 ? 'PM' : 'AM';
  return `${hour12}:${String(schedule.minute).padStart(2, '0')} ${suffix} IST`;
}

module.exports = {
  AUTO_RUN_TIME_ZONE,
  getAutoRunTimeLabel,
  getNextAutoRunAt,
  shouldStartAutoRun,
  startScheduler
};
