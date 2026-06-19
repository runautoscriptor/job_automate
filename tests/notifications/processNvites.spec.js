const { test, expect } = require('../../fixtures/testFixture');
const { validateRequiredEnv } = require('../../utils/env');
const { runJobSearchAndApplyFlow } = require('../../services/jobSearchRunner');
const { runNviteFlow } = require('../../services/nviteRunner');
const {
  printNviteSummary,
  printReportSection
} = require('../../utils/reportPrinter');

test.describe('NVites Module', () => {
  test('should complete job search and application first, then process NVites', async ({
    loginPage,
    homePage,
    jobSearchPage,
    jobApplyPage,
    nvitePage
  }) => {
    test.setTimeout(60 * 60 * 1000);

    validateRequiredEnv(['NAUKRI_EMAIL', 'NAUKRI_PASSWORD']);

    await loginPage.ensureAuthenticatedSession();

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

    printReportSection('Job Search Results', jobReport.searchResults);
    printReportSection('Job Application Results', jobReport.applicationResults);
    printReportSection('Nvite Results', nviteReport.reviewResults);
    printNviteSummary(nviteReport.summary);

    expect(nviteReport.summary.totalNvitesReviewed).toBeGreaterThanOrEqual(0);
  });
});
