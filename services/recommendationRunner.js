const recommendationCriteria = require('../test-data/recommendations/recommendationCriteria.json');
const { getNumberEnv } = require('../utils/env');
const { getCandidateProfileView } = require('../utils/candidateProfile');
const { matchesCandidatePreferences } = require('../utils/jobMatcher');
const { logger } = require('../utils/logger');
const { buildRecommendationSummary } = require('../utils/reportPrinter');

async function runRecommendationFlow({
  homePage,
  recommendationPage,
  jobApplyPage
}) {
  const candidateProfile = getCandidateProfileView();
  const maxRecommendationsToCheck = getNumberEnv(
    'MAX_RECOMMENDATIONS_TO_CHECK',
    recommendationCriteria.maxRecommendationsToCheck
  );
  const maxMatchingJobsToProcess = getNumberEnv(
    'MAX_MATCHING_RECOMMENDATIONS_TO_PROCESS',
    recommendationCriteria.maxMatchingJobsToProcess
  );

  await homePage.navigateToRecommendedJobs();
  await recommendationPage.waitForPageReady();
  await recommendationPage.ensureProfileTabSelected();

  const recommendations = await recommendationPage.getTopRecommendationCards({
    limit: maxRecommendationsToCheck
  });
  const reviewResults = [];
  let matchingJobsFound = 0;
  let matchingJobsProcessed = 0;

  for (const recommendation of recommendations) {
    const matchResult = matchesCandidatePreferences({
      title: recommendation.title,
      description: recommendation.previewText,
      keywords: candidateProfile.jobPreferences.jobKeywords
    });

    if (!matchResult.isMatch) {
      reviewResults.push(
        createRecommendationResult(recommendation, 'skipped-not-matching', {
          isMatch: false,
          matchingKeywords: '',
          unknownQuestionsLogged: 0
        })
      );
      continue;
    }

    matchingJobsFound += 1;

    if (matchingJobsProcessed >= maxMatchingJobsToProcess) {
      reviewResults.push(
        createRecommendationResult(recommendation, 'skipped-match-limit-reached', {
          isMatch: true,
          matchingKeywords: matchResult.matchingKeywords.join(', '),
          unknownQuestionsLogged: 0
        })
      );
      continue;
    }

    logger.info(`Reviewing recommended job "${recommendation.title}"`);

    await homePage.navigateToRecommendedJobs();
    await recommendationPage.waitForPageReady();
    await recommendationPage.ensureProfileTabSelected();

    const wasSelected = await recommendationPage.selectRecommendation(
      recommendation.title,
      maxRecommendationsToCheck
    );

    if (!wasSelected) {
      reviewResults.push(
        createRecommendationResult(recommendation, 'skipped-not-selectable', {
          isMatch: true,
          matchingKeywords: matchResult.matchingKeywords.join(', '),
          unknownQuestionsLogged: 0
        })
      );
      continue;
    }

    await recommendationPage.clickApplyForSelectedJobs();

    const applicationResult = await jobApplyPage.applyToCurrentJob({
      title: recommendation.title,
      url: `recommendation:${recommendation.title}`
    }, {
      triggerApply: false
    });

    matchingJobsProcessed += 1;

    reviewResults.push(
      createRecommendationResult(recommendation, applicationResult.status, {
        isMatch: true,
        matchingKeywords: matchResult.matchingKeywords.join(', '),
        unknownQuestionsLogged: applicationResult.unknownQuestionsLogged || 0
      })
    );
  }

  return {
    recommendationCriteria: {
      ...recommendationCriteria,
      maxRecommendationsToCheck,
      maxMatchingJobsToProcess
    },
    reviewResults,
    summary: buildRecommendationSummary(reviewResults, {
      totalRecommendationsChecked: recommendations.length,
      matchingJobsFound
    })
  };
}

function createRecommendationResult(recommendation, status, extra = {}) {
  return {
    recommendationTitle: recommendation.title,
    recommendationUrl: recommendation.url || '',
    status,
    ...extra
  };
}

module.exports = {
  runRecommendationFlow
};
