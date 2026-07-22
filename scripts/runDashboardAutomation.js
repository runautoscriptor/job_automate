const { chromium, firefox, webkit } = require('playwright');
const { devices } = require('@playwright/test');
const { LoginPage } = require('../pages/auth/LoginPage');
const { HomePage } = require('../pages/common/HomePage');
const { JobApplyPage } = require('../pages/jobs/JobApplyPage');
const { JobSearchPage } = require('../pages/jobs/JobSearchPage');
const { NvitePage } = require('../pages/notifications/NvitePage');
const { ProfilePage } = require('../pages/profile/ProfilePage');
const { RecommendationPage } = require('../pages/recommendations/RecommendationPage');
const { runProfileRefreshFlow } = require('../services/profileRefreshRunner');
const { runJobSearchAndApplyFlow } = require('../services/jobSearchRunner');
const { runNviteFlow } = require('../services/nviteRunner');
const { runRecommendationFlow } = require('../services/recommendationRunner');
const { runResumeUpdateFlow } = require('../services/resumeUpdateRunner');
const { getAuthStatePath, hasCompatibleAuthState } = require('../utils/authState');
const { getEnv, getNumberEnv, validateRequiredEnv } = require('../utils/env');
const { logger } = require('../utils/logger');
const { allowNaukriLocationAccess } = require('../utils/locationAccess');
const { replaceLatestRun } = require('../dashboard/services/stateStore');
const { getProfileById } = require('../dashboard/services/profileRegistry');
const { clearStopRequest, createStopMonitor, StopRequestedError } = require('../dashboard/services/runControl');

async function main() {
  const runId = process.env.DASHBOARD_RUN_ID;
  const trigger = process.env.DASHBOARD_TRIGGER || 'manual';
  const profileId = process.env.DASHBOARD_PROFILE_ID || 'profile-1';
  const profile = getProfileById(profileId);

  if (!runId) {
    throw new Error('DASHBOARD_RUN_ID is required to run the dashboard automation workflow.');
  }

  if (!profile?.configured) {
    throw new Error(`Dashboard profile "${profileId}" is not configured.`);
  }

  validateRequiredEnv(['NAUKRI_EMAIL', 'NAUKRI_PASSWORD']);
  clearStopRequest(profileId, runId);

  const stopMonitor = createStopMonitor(profileId, runId);
  const runtime = await createRuntime(profile);
  const summary = {
    runId,
    profileId,
    profileLabel: profile.label,
    trigger,
    status: 'running',
    startedAt: new Date().toISOString(),
    finishedAt: null,
    modules: {},
    error: null
  };

  try {
    const {
      loginPage,
      homePage,
      profilePage,
      jobSearchPage,
      jobApplyPage,
      nvitePage,
      recommendationPage
    } = runtime;

    await loginPage.ensureAuthenticatedSession();
    await stopMonitor.throwIfStopRequested();

    await runDashboardModule(summary, profileId, 'profileRefresh', 'Profile Refresh', () =>
      runProfileRefreshFlow({
        homePage,
        profilePage,
        stopMonitor
      })
    );

    await runDashboardModule(summary, profileId, 'jobSearch', 'Job Search', () =>
      runJobSearchAndApplyFlow({
        jobSearchPage,
        jobApplyPage,
        stopMonitor
      })
    );

    await runDashboardModule(summary, profileId, 'nvites', 'Nvite', () =>
      runNviteFlow({
        homePage,
        nvitePage,
        jobApplyPage,
        stopMonitor
      })
    );

    await runDashboardModule(summary, profileId, 'recommendations', 'Recommendations', () =>
      runRecommendationFlow({
        homePage,
        recommendationPage,
        jobApplyPage,
        stopMonitor
      })
    );

    await runDashboardModule(summary, profileId, 'resumeUpdate', 'Resume Update', () =>
      runResumeUpdateFlow({
        homePage,
        profilePage,
        stopMonitor
      })
    );

    summary.status = deriveOverallRunStatus(summary.modules);
    summary.finishedAt = new Date().toISOString();
    persistRunSummary(profileId, summary);
  } catch (error) {
    summary.finishedAt = new Date().toISOString();

    if (error instanceof StopRequestedError) {
      summary.status = 'stopped';
      summary.error = error.message;
      logger.warn('Dashboard automation was stopped gracefully.');
    } else {
      summary.status = 'failed';
      summary.error = error.message;
      logger.error(`Dashboard automation failed: ${error.stack || error.message}`);
    }

    persistRunSummary(profileId, summary);

    if (!(error instanceof StopRequestedError)) {
      process.exitCode = 1;
    }
  } finally {
    clearStopRequest(profileId, runId);
    await runtime?.browser?.close().catch(() => {});
  }
}

async function createRuntime(profile) {
  const browserType = getBrowserType(getEnv('BROWSER', 'chromium'));
  const headless = getEnv('DASHBOARD_HEADLESS', getEnv('HEADLESS', 'false')) === 'true';
  const slowMo = getNumberEnv('SLOW_MO', 0);
  const browser = await browserType.launch({
    headless,
    slowMo
  });

  const desktopChrome = devices['Desktop Chrome'];
  const context = await browser.newContext({
    ...desktopChrome,
    baseURL: getEnv('NAUKRI_BASE_URL', 'https://www.naukri.com'),
    storageState: hasCompatibleAuthState(profile.email, profile.password, profile.id)
      ? getAuthStatePath(profile.id)
      : undefined
  });

  await allowNaukriLocationAccess(
    context,
    getEnv('NAUKRI_BASE_URL', 'https://www.naukri.com')
  );

  const page = await context.newPage();
  page.setDefaultTimeout(getNumberEnv('ACTION_TIMEOUT', 15000));
  page.setDefaultNavigationTimeout(getNumberEnv('NAVIGATION_TIMEOUT', 45000));

  logger.info(
    `Dashboard runtime started for profile "${profile.id}" using email "${profile.email}" with headless=${headless}.`
  );

  return {
    browser,
    context,
    page,
    loginPage: new LoginPage(page, {
      profileKey: profile.id,
      email: profile.email,
      password: profile.password
    }),
    homePage: new HomePage(page),
    jobSearchPage: new JobSearchPage(page),
    jobApplyPage: new JobApplyPage(page),
    nvitePage: new NvitePage(page),
    recommendationPage: new RecommendationPage(page),
    profilePage: new ProfilePage(page)
  };
}

function getBrowserType(browserName) {
  if (browserName === 'firefox') {
    return firefox;
  }

  if (browserName === 'webkit') {
    return webkit;
  }

  return chromium;
}

function persistRunSummary(profileId, summary) {
  replaceLatestRun(profileId, summary.runId, summary);
}

async function runDashboardModule(summary, profileId, key, label, action) {
  try {
    summary.modules[key] = await action();
  } catch (error) {
    if (error instanceof StopRequestedError) {
      throw error;
    }

    logger.error(`${label} module failed, continuing dashboard workflow: ${error.stack || error.message}`);
    summary.modules[key] = {
      module: label,
      status: 'failed',
      error: error.message,
      skipped: true
    };
  }

  persistRunSummary(profileId, summary);
}

function deriveOverallRunStatus(modules = {}) {
  const moduleStatuses = Object.values(modules)
    .map((moduleResult) => getModuleStatus(moduleResult))
    .filter(Boolean);

  if (moduleStatuses.length === 0) {
    return 'completed-with-warnings';
  }

  const hasWarnings = moduleStatuses.some((status) =>
    String(status).startsWith('skipped')
    || String(status).includes('failed')
    || String(status).includes('warning')
    || String(status).includes('no-application')
  );

  const hasVerifiedChange = hasActualSiteChange(modules);

  if (!hasVerifiedChange || hasWarnings) {
    return 'completed-with-warnings';
  }

  return 'completed';
}

function getModuleStatus(moduleResult) {
  if (!moduleResult) {
    return null;
  }

  if (moduleResult.status) {
    return moduleResult.status;
  }

  if (moduleResult.summary?.status) {
    return moduleResult.summary.status;
  }

  return null;
}

function hasActualSiteChange(modules = {}) {
  const profileUpdated = modules.profileRefresh?.profileUpdated === true
    && modules.profileRefresh?.status === 'completed';
  const jobApplied = Number(modules.jobSearch?.summary?.totalApplicationsSubmitted || 0) > 0;
  const nviteApplied = Number(modules.nvites?.summary?.applied || 0) > 0;
  const recommendationApplied = Number(modules.recommendations?.summary?.appliedSuccessfully || 0) > 0;
  const resumeUploaded = modules.resumeUpdate?.uploaded === true;

  return profileUpdated || jobApplied || nviteApplied || recommendationApplied || resumeUploaded;
}

main().catch((error) => {
  logger.error(`Unexpected dashboard runner failure: ${error.stack || error.message}`);
  process.exitCode = 1;
});
