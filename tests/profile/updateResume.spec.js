const { test, expect } = require('../../fixtures/testFixture');
const { validateRequiredEnv } = require('../../utils/env');
const { runResumeUpdateFlow } = require('../../services/resumeUpdateRunner');
const { printModuleSummary } = require('../../utils/reportPrinter');

test.describe('Resume Update', () => {
  test('should login, navigate to profile, download latest resume, and verify real resume upload', async ({
    loginPage,
    homePage,
    profilePage
  }) => {
    test.setTimeout(10 * 60 * 1000);

    validateRequiredEnv(['NAUKRI_EMAIL', 'NAUKRI_PASSWORD']);

    await loginPage.ensureAuthenticatedSession();

    const module5Result = await runResumeUpdateFlow({
      homePage,
      profilePage
    });

    printModuleSummary('Module 5 Results', module5Result);

    expect(module5Result.uploaded).toBeTruthy();
    expect(module5Result.skipped).toBeFalsy();
  });
});
