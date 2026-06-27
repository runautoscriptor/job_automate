const { getCandidateProfileView } = require('./candidateProfile');
const {
  findManualChoiceAnswer,
  getTextAnswer,
  logUnknownQuestion,
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

function choosePositiveOption(questionText, optionTexts = [], options = {}) {
  const resolution = resolveChoiceAnswer(questionText, optionTexts, options);
  return resolution.status === 'known' ? resolution.answer : null;
}

function resolveChoiceAnswer(questionText, optionTexts = [], options = {}) {
  const { logUnknown = true } = options;
  const normalizedQuestion = normalizeQuestion(questionText);
  const candidateProfile = getCandidateProfileView();
  const normalizedOptions = optionTexts.map((optionText) => ({
    raw: optionText,
    normalized: normalizeQuestion(optionText)
  }));

  if (normalizedOptions.length === 0) {
    return buildUnknownChoiceResolution(questionText, normalizedQuestion, logUnknown);
  }

  const manualChoiceAnswer = findManualChoiceAnswer(questionText, optionTexts);

  if (manualChoiceAnswer) {
    return {
      status: 'known',
      questionText,
      normalizedQuestion,
      source: 'profile/screeningAnswers.json',
      route: 'manual-answer-bank',
      answer: manualChoiceAnswer.raw
    };
  }

  const preferredChoices = getProfileBackedChoiceCandidates(normalizedQuestion, candidateProfile);

  for (const preferredChoice of preferredChoices) {
    const match = normalizedOptions.find((option) => option.normalized.includes(preferredChoice));

    if (match) {
      return {
        status: 'known',
        questionText,
        normalizedQuestion,
        source: 'profile/profile.json',
        route: 'profile-config',
        answer: match.raw
      };
    }

    const reverseMatch = normalizedOptions.find((option) => preferredChoice.includes(option.normalized));

    if (reverseMatch) {
      return {
        status: 'known',
        questionText,
        normalizedQuestion,
        source: 'profile/profile.json',
        route: 'profile-config',
        answer: reverseMatch.raw
      };
    }
  }

  return buildUnknownChoiceResolution(questionText, normalizedQuestion, logUnknown);
}

function getProfileBackedChoiceCandidates(normalizedQuestion, candidateProfile) {
  const candidates = [];

  if (/notice|join|availability/.test(normalizedQuestion)) {
    candidates.push(
      normalizeQuestion(candidateProfile.noticePeriod),
      ...getNoticePeriodSynonyms(candidateProfile.noticePeriod)
    );
  }

  if (/location|relocate|city/.test(normalizedQuestion)) {
    candidates.push(
      normalizeQuestion(candidateProfile.locations.current),
      ...candidateProfile.locations.preferred.map((location) => normalizeQuestion(location))
    );
  }

  if (/experience|years/.test(normalizedQuestion)) {
    candidates.push(...buildExperienceCandidates(candidateProfile.experience.totalExperience));
  }

  if (/skill|technology|tool|manual|automation|testing|playwright|cypress|postman|jira/.test(normalizedQuestion)) {
    candidates.push(
      ...candidateProfile.skills.primary.map((skill) => normalizeQuestion(skill)),
      ...candidateProfile.skills.all.map((skill) => normalizeQuestion(skill))
    );
  }

  if (/role|designation/.test(normalizedQuestion)) {
    candidates.push(normalizeQuestion(candidateProfile.personalDetails.role));
  }

  if (/salary|ctc|compensation|package/.test(normalizedQuestion)) {
    candidates.push(
      normalizeQuestion(candidateProfile.salaryDetails.currentCTC),
      normalizeQuestion(candidateProfile.salaryDetails.expectedCTC)
    );
  }

  return [...new Set(candidates.filter(Boolean))];
}

function getNoticePeriodSynonyms(noticePeriod) {
  const normalizedNoticePeriod = normalizeQuestion(noticePeriod);

  if (!/immediate/.test(normalizedNoticePeriod)) {
    return [];
  }

  return ['immediate', 'immediately', '0 days', 'less than 15 days', '15 days or less'];
}

function buildExperienceCandidates(totalExperience) {
  const normalizedExperience = normalizeQuestion(totalExperience);
  const numericTokens = String(totalExperience || '').match(/\d+/g) || [];
  const derivedCandidates = numericTokens.flatMap((token) => [
    token,
    `${token} year`,
    `${token} years`,
    `${token}+ year`,
    `${token}+ years`
  ]);

  return [...new Set([normalizedExperience, ...derivedCandidates].filter(Boolean))];
}

function buildUnknownChoiceResolution(questionText, normalizedQuestion, logUnknown) {
  const result = {
    status: 'unknown',
    questionText,
    normalizedQuestion,
    source: 'profile/profile.json',
    route: 'future-ai-answer-generator',
    label: 'Unknown Question'
  };

  if (logUnknown) {
    logUnknownQuestion(result);
  }

  return result;
}

module.exports = {
  choosePositiveOption,
  getTextAnswer,
  resolveChoiceAnswer,
  resolveScreeningQuestion,
  screeningProfile
};
