const { test, expect } = require('../../fixtures/testFixture');
const { validateRequiredEnv } = require('../../utils/env');
const { runJobSearchAndApplyFlow } = require('../../services/jobSearchRunner');
const { printReportSection } = require('../../utils/reportPrinter');

test.describe('Job Search And Apply', () => {
  test('should reuse the authenticated session, search jobs, and apply on filtered results', async ({
    loginPage,
    jobSearchPage,
    jobApplyPage
  }) => {
    test.setTimeout(30 * 60 * 1000);

    validateRequiredEnv(['NAUKRI_EMAIL', 'NAUKRI_PASSWORD']);

    await loginPage.ensureAuthenticatedSession();
    const report = await runJobSearchAndApplyFlow({
      jobSearchPage,
      jobApplyPage
    });

    printReportSection('Job Search Results', report.searchResults);
    printReportSection('Job Application Results', report.applicationResults);

    expect(report.applicationResults).toHaveLength(report.searchCriteria.keywords.length);

    for (const keywordResult of report.applicationResults) {
      expect(keywordResult.applicationsSubmitted).toBeLessThanOrEqual(1);
    }
  });
});
