const { getCandidateProfileView } = require('./candidateProfile');
const {
  getTextAnswer,
  normalizeQuestion,
  resolveScreeningQuestion
} = require('./screeningQuestionResolver');

function buildScreeningProfile() {
  const candidateProfile = getCandidateProfileView();

  return Object.freeze({
    currentLocation: candidateProfile.locations.current,
    preferredLocations: candidateProfile.locations.preferred.join(', '),
    noticePeriod: candidateProfile.noticePeriod,
    totalExperience: candidateProfile.experience.totalExperience,
    currentCTC: candidateProfile.salaryDetails.currentCTC,
    expectedCTC: candidateProfile.salaryDetails.expectedCTC,
    genericProfessionalSummary: candidateProfile.experience.professionalSummary,
    manualTestingSummary: candidateProfile.experience.professionalSummary,
    automationTestingSummary: candidateProfile.experience.professionalSummary
  });
}

const screeningProfile = buildScreeningProfile();

function choosePositiveOption(questionText, optionTexts = []) {
  const normalizedQuestion = normalizeQuestion(questionText);
  const candidateProfile = getCandidateProfileView();
  const normalizedOptions = optionTexts.map((optionText) => ({
    raw: optionText,
    normalized: normalizeQuestion(optionText)
  }));

  if (normalizedOptions.length === 0) {
    return null;
  }

  const preferredChoices = [];

  if (/notice|join|availability/.test(normalizedQuestion)) {
    preferredChoices.push(normalizeQuestion(candidateProfile.noticePeriod), 'immediate', 'yes');
  }

  if (/location|relocate/.test(normalizedQuestion)) {
    preferredChoices.push(
      normalizeQuestion(candidateProfile.locations.current),
      ...candidateProfile.locations.preferred.map((location) => normalizeQuestion(location)),
      'yes'
    );
  }

  if (/work mode|work from office|hybrid|office/.test(normalizedQuestion)) {
    preferredChoices.push('work from office', 'hybrid', 'yes');
  }

  if (/manual|automation|testing|shift|weekend|full time/.test(normalizedQuestion)) {
    preferredChoices.push(
      ...candidateProfile.skills.primary.map((skill) => normalizeQuestion(skill)),
      'yes',
      'full time',
      'manual',
      'automation'
    );
  }

  preferredChoices.push('yes');

  for (const preferredChoice of preferredChoices) {
    const match = normalizedOptions.find((option) => option.normalized.includes(preferredChoice));

    if (match) {
      return match.raw;
    }
  }

  const nonNegativeOption = normalizedOptions.find(
    (option) => !/(no|not interested|later|decline)/.test(option.normalized)
  );

  return nonNegativeOption ? nonNegativeOption.raw : normalizedOptions[0].raw;
}

module.exports = {
  choosePositiveOption,
  getTextAnswer,
  resolveScreeningQuestion,
  screeningProfile
};
