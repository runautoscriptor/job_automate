const fs = require('fs');
const path = require('path');
const { getCandidateProfileView } = require('./candidateProfile');
const { loadManualScreeningAnswers } = require('./manualScreeningAnswers');
const { logger } = require('./logger');

const UNKNOWN_QUESTION_LOG_PATH = path.resolve(
  process.cwd(),
  'reports',
  'unknown-screening-questions.log'
);

const TEXT_QUESTION_RULES = [
  {
    field: 'noticePeriod',
    pattern: /notice|join|availability|available to join|immediate join/,
    getAnswer: (profile) => profile.noticePeriod
  },
  {
    field: 'totalExperience',
    pattern: /total experience|years of experience|experience/,
    getAnswer: (profile) => profile.experience.totalExperience
  },
  {
    field: 'location',
    pattern: /current location|present location|where are you based|current city|present city/,
    getAnswer: (profile) => profile.locations.current
  },
  {
    field: 'preferredLocations',
    pattern: /preferred location|relocate|location preference|preferred city/,
    getAnswer: (profile) => profile.locations.preferred.join(', ')
  },
  {
    field: 'expectedCTC',
    pattern: /expected ctc|expected salary|expected compensation|salary expectation/,
    getAnswer: (profile) => profile.salaryDetails.expectedCTC
  },
  {
    field: 'currentCTC',
    pattern: /current ctc|current salary|current compensation|current package/,
    getAnswer: (profile) => profile.salaryDetails.currentCTC
  },
  {
    field: 'primarySkills',
    pattern: /primary skill|key skill|core skill/,
    getAnswer: (profile) => profile.skills.primary.join(', ')
  },
  {
    field: 'skills',
    pattern: /skills|technical skill|tool|technology|stack/,
    getAnswer: (profile) => profile.skills.all.join(', ')
  },
  {
    field: 'role',
    pattern: /current role|current designation|designation|role/,
    getAnswer: (profile) => profile.personalDetails.role
  },
  {
    field: 'professionalSummary',
    pattern: /professional summary|profile summary|experience summary|summary|tell us about yourself/,
    getAnswer: (profile) => profile.experience.professionalSummary
  }
];

function normalizeQuestion(questionText) {
  return String(questionText || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function resolveScreeningQuestion(questionText, options = {}) {
  const { logUnknown = true } = options;
  const normalizedQuestion = normalizeQuestion(questionText);

  if (!normalizedQuestion) {
    return {
      status: 'unknown',
      questionText,
      normalizedQuestion,
      source: 'profile/profile.json',
      route: 'future-ai-answer-generator'
    };
  }

  const manualAnswer = findManualTextAnswer(normalizedQuestion);

  if (manualAnswer) {
    return {
      status: 'known',
      questionText,
      normalizedQuestion,
      source: 'profile/screeningAnswers.json',
      route: 'manual-answer-bank',
      answer: manualAnswer.answer,
      answerId: manualAnswer.id || ''
    };
  }

  const profile = getCandidateProfileView();
  const matchedRule = TEXT_QUESTION_RULES.find((rule) => rule.pattern.test(normalizedQuestion));

  if (!matchedRule) {
    return buildUnknownQuestionResult(questionText, normalizedQuestion, logUnknown);
  }

  const answer = matchedRule.getAnswer(profile);

  if (!answer) {
    return buildUnknownQuestionResult(questionText, normalizedQuestion, logUnknown);
  }

  return {
    status: 'known',
    questionText,
    normalizedQuestion,
    source: 'profile/profile.json',
    route: 'profile-config',
    profileField: matchedRule.field,
    answer
  };
}

function buildUnknownQuestionResult(questionText, normalizedQuestion, logUnknown) {
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

function logUnknownQuestion(result) {
  const logLine = JSON.stringify({
    timestamp: new Date().toISOString(),
    label: result.label,
    questionText: result.questionText,
    normalizedQuestion: result.normalizedQuestion,
    route: result.route
  });

  fs.mkdirSync(path.dirname(UNKNOWN_QUESTION_LOG_PATH), { recursive: true });
  fs.appendFileSync(UNKNOWN_QUESTION_LOG_PATH, `${logLine}\n`, 'utf8');
  logger.warn(`[Unknown Question] ${result.questionText}`);
}

function getTextAnswer(questionText, options = {}) {
  const resolution = resolveScreeningQuestion(questionText, options);
  return resolution.status === 'known' ? resolution.answer : null;
}

function findManualTextAnswer(normalizedQuestion) {
  const { textAnswers } = loadManualScreeningAnswers();

  return textAnswers.find((entry) => matchesQuestionEntry(normalizedQuestion, entry)) || null;
}

function findManualChoiceAnswer(normalizedQuestion, optionTexts = []) {
  const { choiceAnswers } = loadManualScreeningAnswers();

  const matchedEntry =
    choiceAnswers.find((entry) => matchesQuestionEntry(normalizedQuestion, entry)) || null;

  if (!matchedEntry) {
    return null;
  }

  const normalizedOptions = optionTexts.map((optionText) => ({
    raw: optionText,
    normalized: normalizeQuestion(optionText)
  }));
  const preferredOption = normalizeQuestion(matchedEntry.preferredOption);

  return (
    normalizedOptions.find((option) => option.normalized === preferredOption) ||
    normalizedOptions.find((option) => option.normalized.includes(preferredOption)) ||
    normalizedOptions.find((option) => preferredOption.includes(option.normalized)) ||
    null
  );
}

function matchesQuestionEntry(normalizedQuestion, entry = {}) {
  const matchType = entry.matchType || 'includes';
  const normalizedPattern = normalizeQuestion(entry.questionPattern || entry.questionText);

  if (!normalizedPattern) {
    return false;
  }

  if (matchType === 'exact') {
    return normalizedQuestion === normalizedPattern;
  }

  return normalizedQuestion.includes(normalizedPattern);
}

module.exports = {
  findManualChoiceAnswer,
  findManualTextAnswer,
  getTextAnswer,
  logUnknownQuestion,
  normalizeQuestion,
  resolveScreeningQuestion,
  UNKNOWN_QUESTION_LOG_PATH
};
