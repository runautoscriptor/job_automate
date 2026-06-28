function printReportSection(title, rows = []) {
  console.log(`\n=== ${title} ===`);

  if (!Array.isArray(rows) || rows.length === 0) {
    console.log('No records.');
    return;
  }

  console.table(rows);
}

function buildJobModuleSummary({
  searchResults = [],
  applicationResults = [],
  attemptedJobResults = []
} = {}) {
  return {
    totalKeywordsProcessed: applicationResults.length,
    totalJobsReviewed: sumBy(searchResults, 'jobsConsidered'),
    totalApplicationsSubmitted: sumBy(applicationResults, 'applicationsSubmitted'),
    questionsAnswered: sumBy(attemptedJobResults, 'questionsAnswered'),
    questionsSkipped: sumBy(attemptedJobResults, 'questionsSkipped'),
    alreadyAppliedCount: countByStatus(attemptedJobResults, 'already-applied'),
    skippedCount: countSkippedStatuses(attemptedJobResults),
    unknownQuestionsLogged: sumBy(attemptedJobResults, 'unknownQuestionsLogged'),
    applicationsFailed: countSkippedStatuses(attemptedJobResults)
  };
}

function buildNviteSummary(reviewResults = []) {
  const summary = {
    totalNvitesReviewed: reviewResults.length,
    applied: 0,
    alreadyApplied: 0,
    notInterested: 0,
    skipped: 0,
    questionsAnswered: sumBy(reviewResults, 'questionsAnswered'),
    questionsSkipped: sumBy(reviewResults, 'questionsSkipped'),
    unknownQuestionsLogged: sumBy(reviewResults, 'unknownQuestionsLogged'),
    applicationsFailed: countSkippedStatuses(reviewResults)
  };

  for (const result of reviewResults) {
    if (result.status === 'applied') {
      summary.applied += 1;
      continue;
    }

    if (result.status === 'already-applied') {
      summary.alreadyApplied += 1;
      continue;
    }

    if (result.status === 'not-interested') {
      summary.notInterested += 1;
      continue;
    }

    summary.skipped += 1;
  }

  return summary;
}

function buildRecommendationSummary(reviewResults = [], options = {}) {
  const summary = {
    totalRecommendationsChecked: options.totalRecommendationsChecked ?? reviewResults.length,
    matchingJobsFound:
      options.matchingJobsFound ?? reviewResults.filter((result) => result.isMatch).length,
    appliedSuccessfully: 0,
    alreadyApplied: 0,
    skipped: 0,
    questionsAnswered: sumBy(reviewResults, 'questionsAnswered'),
    questionsSkipped: sumBy(reviewResults, 'questionsSkipped'),
    unknownQuestionsLogged: sumBy(reviewResults, 'unknownQuestionsLogged'),
    applicationsFailed: countSkippedStatuses(reviewResults)
  };

  for (const result of reviewResults) {
    if (result.status === 'applied') {
      summary.appliedSuccessfully += 1;
      continue;
    }

    if (result.status === 'already-applied') {
      summary.alreadyApplied += 1;
      continue;
    }

    summary.skipped += 1;
  }

  return summary;
}

function printModuleSummary(title, summary) {
  printReportSection(title, [summary]);
}

function printNviteSummary(summary) {
  printReportSection('Nvite Summary', [summary]);
}

function countByStatus(results = [], status) {
  return results.filter((result) => result.status === status).length;
}

function countSkippedStatuses(results = []) {
  return results.filter((result) => String(result.status || '').startsWith('skipped')).length;
}

function sumBy(rows = [], fieldName) {
  return rows.reduce((total, row) => total + Number(row?.[fieldName] || 0), 0);
}

module.exports = {
  buildJobModuleSummary,
  buildRecommendationSummary,
  buildNviteSummary,
  printModuleSummary,
  printNviteSummary,
  printReportSection
};
