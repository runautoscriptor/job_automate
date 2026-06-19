const { getCandidateProfileView } = require('../utils/candidateProfile');
const { matchesCandidatePreferences } = require('../utils/jobMatcher');
const { buildNviteSummary } = require('../utils/reportPrinter');
const { logger } = require('../utils/logger');

async function runNviteFlow({
  homePage,
  nvitePage,
  jobApplyPage
}) {
  const candidateProfile = getCandidateProfileView();
  const processedInvitations = new Set();
  const reviewResults = [];

  await homePage.navigateToNvites();
  await nvitePage.waitForPageReady();
  await nvitePage.activateAllInvitations();

  while (true) {
    const visibleInvitations = await nvitePage.getVisibleInvitationCards();
    const nextInvitation = visibleInvitations.find(
      (invitation) => !processedInvitations.has(invitation.signature)
    );

    if (!nextInvitation) {
      break;
    }

    processedInvitations.add(nextInvitation.signature);
    logger.info(`Reviewing NVite "${nextInvitation.title}"`);

    await nvitePage.openInvitationAt(nextInvitation.index);
    const details = normalizeNviteDetails(
      await nvitePage.getSelectedInvitationDetails(),
      nextInvitation
    );
    const detailContainer = nvitePage.detailContainer;

    if (await jobApplyPage.isAlreadyApplied({ root: detailContainer })) {
      reviewResults.push(createNviteResult(details, 'already-applied'));
      continue;
    }

    const hasApplyButton = await jobApplyPage.hasApplyButton({ root: detailContainer });

    if (!hasApplyButton) {
      reviewResults.push(createNviteResult(details, 'skipped-no-apply-option'));
      continue;
    }

    const matchResult = matchesCandidatePreferences({
      title: details.title,
      description: details.description,
      keywords: candidateProfile.jobPreferences.jobKeywords
    });

    if (!matchResult.isMatch) {
      await nvitePage.markCurrentInvitationNotInterested();
      reviewResults.push(
        createNviteResult(details, 'not-interested', {
          matchingKeywords: ''
        })
      );
      continue;
    }

    const applicationResult = await jobApplyPage.applyToCurrentJob({
      title: details.title,
      url: `nvite:${details.title}`
    }, {
      root: detailContainer
    });

    reviewResults.push(
      createNviteResult(details, applicationResult.status, {
        matchingKeywords: matchResult.matchingKeywords.join(', ')
      })
    );
  }

  return {
    reviewResults,
    summary: buildNviteSummary(reviewResults)
  };
}

function createNviteResult(details, status, extra = {}) {
  return {
    invitationTitle: details.title,
    company: details.company,
    status,
    ...extra
  };
}

function normalizeNviteDetails(details, invitationCard) {
  return {
    ...details,
    title: details.title || invitationCard.title,
    company: details.company || ''
  };
}

module.exports = {
  runNviteFlow
};
