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

  await ensureNviteContext({ homePage, nvitePage });

  while (true) {
    await ensureNviteContext({ homePage, nvitePage });

    const visibleInvitations = await nvitePage.getVisibleInvitationCards();
    const nextInvitation = visibleInvitations.find(
      (invitation) => !processedInvitations.has(invitation.signature)
    );

    if (!nextInvitation) {
      break;
    }

    processedInvitations.add(nextInvitation.signature);
    logger.info(`Reviewing NVite "${nextInvitation.title}"`);

    try {
      await nvitePage.openInvitation(nextInvitation);
    } catch (error) {
      logger.warn(
        `Skipping NVite "${nextInvitation.title}" because it could not be reopened reliably.`
      );
      reviewResults.push(
        createNviteResult(nextInvitation, 'skipped-not-openable', {
          matchingKeywords: '',
          unknownQuestionsLogged: 0
        })
      );
      continue;
    }

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
          matchingKeywords: '',
          unknownQuestionsLogged: 0
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
        matchingKeywords: matchResult.matchingKeywords.join(', '),
        questionsAnswered: applicationResult.questionsAnswered || 0,
        questionsSkipped: applicationResult.questionsSkipped || 0,
        unknownQuestionsLogged: applicationResult.unknownQuestionsLogged || 0
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

async function ensureNviteContext({
  homePage,
  nvitePage
}) {
  const isOnInboxPage = /\/mnjuser\/inbox/.test(nvitePage.page.url());
  const hasVisibleInvitationCards = await nvitePage.invitationCards
    .first()
    .isVisible()
    .catch(() => false);

  if (isOnInboxPage && hasVisibleInvitationCards) {
    return;
  }

  await homePage.navigateToNvites();
  await nvitePage.waitForPageReady();
  await nvitePage.activateAllInvitations();
}

module.exports = {
  runNviteFlow
};
