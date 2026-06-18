const searchCriteria = require('../../test-data/jobs/searchCriteria.json');
const { test, expect } = require('../../fixtures/testFixture');
const { getNumberEnv, validateRequiredEnv } = require('../../utils/env');
const { logger } = require('../../utils/logger');

test.describe('Job Search And Apply', () => {
  test('should reuse the authenticated session, search jobs, and apply on filtered results', async ({
    loginPage,
    jobSearchPage,
    jobApplyPage
  }) => {
    test.setTimeout(30 * 60 * 1000);

    validateRequiredEnv(['NAUKRI_EMAIL', 'NAUKRI_PASSWORD']);

    const maxJobsToApplyPerKeyword = getNumberEnv(
      'MAX_JOB_APPLICATIONS_PER_KEYWORD',
      searchCriteria.maxJobsToApplyPerKeyword
    );

    await loginPage.ensureAuthenticatedSession();

    const applicationSummary = [];

    for (const keyword of searchCriteria.keywords) {
      logger.info(`Starting Phase 2 search flow for keyword "${keyword}"`);

      await jobSearchPage.gotoKeywordResults(keyword, searchCriteria.experienceYears);
      await jobSearchPage.applyLocationFilters(searchCriteria.locations);
      await jobSearchPage.applyFreshnessLastOneDay();

      const matchingJobs = await jobSearchPage.getVisibleJobLinks({
        keyword,
        maxJobs: maxJobsToApplyPerKeyword
      });

      logger.info(
        `Proceeding with ${matchingJobs.length} jobs for keyword "${keyword}" after page-level filtering.`
      );

      for (const job of matchingJobs) {
        const result = await jobApplyPage.applyToJob(job);

        applicationSummary.push({
          keyword,
          ...result
        });
      }
    }

    console.table(applicationSummary);

    expect(
      applicationSummary.some((result) =>
        ['applied', 'already-applied'].includes(result.status)
      )
    ).toBeTruthy();
  });
});
