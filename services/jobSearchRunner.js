const searchCriteria = require('../test-data/jobs/searchCriteria.json');
const { getNumberEnv } = require('../utils/env');
const { logger } = require('../utils/logger');

async function runJobSearchAndApplyFlow({
  jobSearchPage,
  jobApplyPage
}) {
  const maxApplicationsPerKeyword = Math.min(
    1,
    getNumberEnv('MAX_JOB_APPLICATIONS_PER_KEYWORD', searchCriteria.maxApplicationsPerKeyword)
  );
  const maxJobsToScanPerKeyword = getNumberEnv(
    'MAX_JOBS_TO_SCAN_PER_KEYWORD',
    searchCriteria.maxJobsToScanPerKeyword
  );
  const minJobsToAttemptPerKeyword = getNumberEnv(
    'MIN_JOBS_TO_ATTEMPT_PER_KEYWORD',
    searchCriteria.minJobsToAttemptPerKeyword
  );
  const effectiveMaxJobsToScanPerKeyword = Math.max(
    maxJobsToScanPerKeyword,
    minJobsToAttemptPerKeyword
  );

  const searchResults = [];
  const applicationResults = [];

  for (const keyword of searchCriteria.keywords) {
    logger.info(`Starting Phase 2 search flow for keyword "${keyword}"`);

    await jobSearchPage.gotoKeywordResults(keyword, searchCriteria.experienceYears);
    await jobSearchPage.applyLocationFilters(searchCriteria.locations);
    await jobSearchPage.applyFreshnessLastOneDay();

    const matchingJobs = await jobSearchPage.getVisibleJobLinks({
      keyword,
      maxJobs: effectiveMaxJobsToScanPerKeyword,
      minJobsToAttempt: minJobsToAttemptPerKeyword
    });

    searchResults.push({
      keyword,
      jobsConsidered: matchingJobs.length,
      minimumAttemptsTarget: Math.min(minJobsToAttemptPerKeyword, matchingJobs.length),
      freshness: searchCriteria.freshness
    });

    logger.info(
      `Scanning up to ${matchingJobs.length} jobs for keyword "${keyword}" with a minimum target of ${minJobsToAttemptPerKeyword} attempts and at most ${maxApplicationsPerKeyword} successful application.`
    );

    const keywordSummary = await applyToSingleJobForKeyword({
      keyword,
      matchingJobs,
      maxApplicationsPerKeyword,
      jobApplyPage
    });

    applicationResults.push(keywordSummary);
  }

  return {
    searchCriteria,
    searchResults,
    applicationResults
  };
}

async function applyToSingleJobForKeyword({
  keyword,
  matchingJobs,
  maxApplicationsPerKeyword,
  jobApplyPage
}) {
  const attemptedJobs = [];
  let applicationsSubmitted = 0;

  for (const job of matchingJobs) {
    if (applicationsSubmitted >= maxApplicationsPerKeyword) {
      break;
    }

    const result = await jobApplyPage.applyToJob(job);
    attemptedJobs.push(result);

    if (result.status === 'applied') {
      applicationsSubmitted += 1;
      break;
    }

    if (result.status === 'already-applied') {
      logger.info(
        `Job "${job.title}" was already applied for keyword "${keyword}". Looking for the next suitable job.`
      );
    }
  }

  return buildKeywordSummary({
    keyword,
    matchingJobs,
    attemptedJobs,
    applicationsSubmitted
  });
}

function buildKeywordSummary({
  keyword,
  matchingJobs,
  attemptedJobs,
  applicationsSubmitted
}) {
  if (applicationsSubmitted > 0) {
    return {
      keyword,
      status: 'applied',
      applicationsSubmitted,
      jobsConsidered: matchingJobs.length,
      jobsAttempted: attemptedJobs.length
    };
  }

  if (matchingJobs.length === 0) {
    return {
      keyword,
      status: 'no-suitable-job-found',
      applicationsSubmitted: 0,
      jobsConsidered: 0,
      jobsAttempted: 0
    };
  }

  const attemptedStatuses = attemptedJobs.map((job) => job.status);
  const allAlreadyApplied =
    attemptedStatuses.length > 0 &&
    attemptedStatuses.every((status) => status === 'already-applied');

  return {
    keyword,
    status: allAlreadyApplied ? 'all-suitable-jobs-already-applied' : 'no-new-application-submitted',
    applicationsSubmitted: 0,
    jobsConsidered: matchingJobs.length,
    jobsAttempted: attemptedJobs.length
  };
}

module.exports = {
  runJobSearchAndApplyFlow
};
