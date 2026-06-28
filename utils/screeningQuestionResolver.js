const fs = require('fs');
const path = require('path');
const { resolveChoiceOption, resolveQuestionAnswer, normalizeQuestion } = require('./questionAnswerEngine');
const { logger } = require('./logger');

const UNKNOWN_QUESTION_LOG_PATH = path.resolve(
  process.cwd(),
  'reports',
  'unknown-screening-questions.log'
);

function resolveScreeningQuestion(questionText, options = {}) {
  const { logUnknown = true, context = {} } = options;
  const normalizedText = normalizeQuestion(questionText);

  if (!normalizedText) {
    return buildUnknownQuestionResult(questionText, normalizedText, logUnknown, context);
  }

  const resolution = resolveQuestionAnswer(questionText);

  if (!resolution) {
    return buildUnknownQuestionResult(questionText, normalizedText, logUnknown, context);
  }

  return {
    status: 'known',
    questionText,
    normalizedQuestion: normalizedText,
    source: 'profile/questions.json',
    route: 'question-answer-engine',
    answerId: resolution.matchedEntry.id || '',
    answer: resolution.answer
  };
}

function resolveChoiceQuestion(questionText, optionTexts = [], options = {}) {
  const { logUnknown = true, context = {} } = options;
  const normalizedText = normalizeQuestion(questionText);
  const resolution = resolveChoiceOption(questionText, optionTexts);

  if (!resolution) {
    return buildUnknownQuestionResult(questionText, normalizedText, logUnknown, context);
  }

  return {
    status: 'known',
    questionText,
    normalizedQuestion: normalizedText,
    source: 'profile/questions.json',
    route: 'question-answer-engine',
    answerId: resolution.matchedEntry.id || '',
    answer: resolution.answer
  };
}

function buildUnknownQuestionResult(questionText, normalizedQuestion, logUnknown, context = {}) {
  const result = {
    status: 'unknown',
    questionText,
    normalizedQuestion,
    source: 'profile/questions.json',
    route: 'future-ai-answer-generator',
    label: 'Unknown Question',
    ...context
  };

  if (logUnknown) {
    logUnknownQuestion(result);
  }

  return result;
}

function logUnknownQuestion(result) {
  const logLine = JSON.stringify({
    timestamp: new Date().toISOString(),
    date: new Date().toISOString().slice(0, 10),
    label: result.label,
    questionText: result.questionText,
    normalizedQuestion: result.normalizedQuestion,
    jobTitle: result.jobTitle || '',
    jobUrl: result.jobUrl || '',
    route: result.route
  });

  fs.mkdirSync(path.dirname(UNKNOWN_QUESTION_LOG_PATH), { recursive: true });
  fs.appendFileSync(UNKNOWN_QUESTION_LOG_PATH, `${logLine}\n`, 'utf8');
  logger.warn(
    `[Unknown Question] ${result.questionText}${result.jobTitle ? ` | Job: ${result.jobTitle}` : ''}`
  );
}

function getTextAnswer(questionText, options = {}) {
  const resolution = resolveScreeningQuestion(questionText, options);
  return resolution.status === 'known' ? resolution.answer : null;
}

module.exports = {
  getTextAnswer,
  logUnknownQuestion,
  normalizeQuestion,
  resolveChoiceQuestion,
  resolveScreeningQuestion,
  UNKNOWN_QUESTION_LOG_PATH
};
