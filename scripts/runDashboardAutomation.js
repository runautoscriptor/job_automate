const { chromium, firefox, webkit } = require('playwright');
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
const { createRunSummary } = require('../dashboard/services/stateStore');
const { clearStopRequest, createStopMonitor, StopRequestedError } = require('../dashboard/services/runControl');

async function main() {
  const runId = process.env.DASHBOARD_RUN_ID;
  const trigger = process.env.DASHBOARD_TRIGGER || 'manual';

  if (!runId) {
    throw new Error('DASHBOARD_RUN_ID is required to run the dashboard automation workflow.');
  }

  validateRequiredEnv(['NAUKRI_EMAIL', 'NAUKRI_PASSWORD']);
  clearStopRequest(runId);

  const stopMonitor = createStopMonitor(runId);
  const runtime = await createRuntime();
  const summary = {
    runId,
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

    summary.modules.profileRefresh = await runProfileRefreshFlow({
      homePage,
      profilePage,
      stopMonitor
    });
    persistRunSummary(summary);

    summary.modules.jobSearch = await runJobSearchAndApplyFlow({
      jobSearchPage,
      jobApplyPage,
      stopMonitor
    });
    persistRunSummary(summary);

    summary.modules.nvites = await runNviteFlow({
      homePage,
      nvitePage,
      jobApplyPage,
      stopMonitor
    });
    persistRunSummary(summary);

    summary.modules.recommendations = await runRecommendationFlow({
      homePage,
      recommendationPage,
      jobApplyPage,
      stopMonitor
    });
    persistRunSummary(summary);

    summary.modules.resumeUpdate = await runResumeUpdateFlow({
      homePage,
      profilePage,
      stopMonitor
    });
    persistRunSummary(summary);

    summary.status = 'completed';
    summary.finishedAt = new Date().toISOString();
    persistRunSummary(summary);
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

    persistRunSummary(summary);

    if (!(error instanceof StopRequestedError)) {
      process.exitCode = 1;
    }
  } finally {
    clearStopRequest(runId);
    await runtime?.browser?.close().catch(() => {});
  }
}

async function createRuntime() {
  const browserType = getBrowserType(getEnv('BROWSER', 'chromium'));
  const browser = await browserType.launch({
    headless: getEnv('HEADLESS', 'false') === 'true',
    slowMo: getNumberEnv('SLOW_MO', 0)
  });

  const context = await browser.newContext({
    baseURL: getEnv('NAUKRI_BASE_URL', 'https://www.naukri.com'),
    storageState: hasCompatibleAuthState() ? getAuthStatePath() : undefined
  });

  await allowNaukriLocationAccess(
    context,
    getEnv('NAUKRI_BASE_URL', 'https://www.naukri.com')
  );

  const page = await context.newPage();

  return {
    browser,
    context,
    page,
    loginPage: new LoginPage(page),
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

function persistRunSummary(summary) {
  createRunSummary(summary.runId, summary);
}

main().catch((error) => {
  logger.error(`Unexpected dashboard runner failure: ${error.stack || error.message}`);
  process.exitCode = 1;
});
