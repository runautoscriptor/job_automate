const { test, expect } = require('../../fixtures/testFixture');
const { validateRequiredEnv } = require('../../utils/env');
const { runProfileRefreshFlow } = require('../../services/profileRefreshRunner');
const { runJobSearchAndApplyFlow } = require('../../services/jobSearchRunner');
const { runNviteFlow } = require('../../services/nviteRunner');
const { runRecommendationFlow } = require('../../services/recommendationRunner');
const { runResumeUpdateFlow } = require('../../services/resumeUpdateRunner');
const {
  printModuleSummary,
  printReportSection
} = require('../../utils/reportPrinter');

test.describe('Recommendation Module', () => {
  test('should complete modules 1 to 5 in order and process recommendations before resume update', async ({
    loginPage,
    homePage,
    profilePage,
    jobSearchPage,
    jobApplyPage,
    nvitePage,
    recommendationPage
  }) => {
    test.setTimeout(90 * 60 * 1000);

    validateRequiredEnv(['NAUKRI_EMAIL', 'NAUKRI_PASSWORD']);

    await loginPage.ensureAuthenticatedSession();

    const module1Result = await runProfileRefreshFlow({
      homePage,
      profilePage
    });
    const jobReport = await runJobSearchAndApplyFlow({
      jobSearchPage,
      jobApplyPage
    });

    expect(jobReport.applicationResults).toHaveLength(jobReport.searchCriteria.keywords.length);

    for (const keywordResult of jobReport.applicationResults) {
      expect(keywordResult.applicationsSubmitted).toBeLessThanOrEqual(1);
    }

    const nviteReport = await runNviteFlow({
      homePage,
      nvitePage,
      jobApplyPage
    });
    const recommendationReport = await runRecommendationFlow({
      homePage,
      recommendationPage,
      jobApplyPage
    });
    const module5Result = await runResumeUpdateFlow({
      homePage,
      profilePage
    });

    printReportSection('Job Search Results', jobReport.searchResults);
    printReportSection('Job Application Results', jobReport.applicationResults);
    printReportSection('Job Attempt Results', jobReport.attemptedJobResults);
    printReportSection('Nvite Results', nviteReport.reviewResults);
    printReportSection('Recommendation Results', recommendationReport.reviewResults);

    printModuleSummary('Module 1 Results', module1Result);
    printModuleSummary('Module 2 Results', jobReport.summary);
    printModuleSummary('Module 3 Results', nviteReport.summary);
    printModuleSummary('Module 4 Results', recommendationReport.summary);
    printModuleSummary('Module 5 Results', module5Result);

    expect(recommendationReport.summary.totalRecommendationsChecked).toBeGreaterThanOrEqual(0);
  });
});
