const screeningProfile = Object.freeze({
  currentLocation: 'Noida',
  preferredLocations: 'Noida, Greater Noida, Gurugram, New Delhi',
  noticePeriod: '15 Days or less',
  totalExperience: '1 year',
  expectedCompensation: 'Negotiable based on the role, responsibilities, and total compensation.',
  genericProfessionalSummary:
    'I bring a positive attitude, strong learning agility, attention to detail, and a quality-first approach to testing and delivery.',
  manualTestingSummary:
    'I am comfortable with manual testing, test case execution, bug reporting, regression validation, and clear communication with stakeholders.',
  automationTestingSummary:
    'I have a solid foundation in automation testing concepts and I am confident working with structured test scenarios, validation flows, and defect tracking.'
});

function normalizeQuestion(questionText) {
  return String(questionText || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function getTextAnswer(questionText) {
  const normalizedQuestion = normalizeQuestion(questionText);

  if (!normalizedQuestion) {
    return null;
  }

  if (/notice|join|availability|available to join|immediate join/.test(normalizedQuestion)) {
    return screeningProfile.noticePeriod;
  }

  if (/current location|present location|where are you based/.test(normalizedQuestion)) {
    return screeningProfile.currentLocation;
  }

  if (/preferred location|relocate|location preference/.test(normalizedQuestion)) {
    return screeningProfile.preferredLocations;
  }

  if (/experience|years of experience/.test(normalizedQuestion)) {
    return screeningProfile.totalExperience;
  }

  if (/current ctc|expected ctc|salary|compensation|package/.test(normalizedQuestion)) {
    return screeningProfile.expectedCompensation;
  }

  if (/manual testing/.test(normalizedQuestion)) {
    return screeningProfile.manualTestingSummary;
  }

  if (/automation testing|selenium|api testing/.test(normalizedQuestion)) {
    return screeningProfile.automationTestingSummary;
  }

  if (/why should we hire|why are you suitable|tell us about yourself|why do you want/.test(normalizedQuestion)) {
    return screeningProfile.genericProfessionalSummary;
  }

  return null;
}

function choosePositiveOption(questionText, optionTexts = []) {
  const normalizedQuestion = normalizeQuestion(questionText);
  const normalizedOptions = optionTexts.map((optionText) => ({
    raw: optionText,
    normalized: normalizeQuestion(optionText)
  }));

  if (normalizedOptions.length === 0) {
    return null;
  }

  const preferredChoices = [];

  if (/notice|join|availability/.test(normalizedQuestion)) {
    preferredChoices.push('15 days', 'immediate', 'yes');
  }

  if (/location|relocate/.test(normalizedQuestion)) {
    preferredChoices.push('noida', 'greater noida', 'gurugram', 'new delhi', 'yes');
  }

  if (/work mode|work from office|hybrid|office/.test(normalizedQuestion)) {
    preferredChoices.push('work from office', 'hybrid', 'yes');
  }

  if (/manual|automation|testing|shift|weekend|full time/.test(normalizedQuestion)) {
    preferredChoices.push('yes', 'full time', 'manual', 'automation');
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
  screeningProfile
};
