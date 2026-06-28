const fs = require('fs');
const path = require('path');

const QUESTIONS_PATH = path.resolve(process.cwd(), 'profile', 'questions.json');
const LEGACY_SCREENING_ANSWERS_PATH = path.resolve(
  process.cwd(),
  'profile',
  'screeningAnswers.json'
);

let cachedAnswers = null;

function loadManualScreeningAnswers(options = {}) {
  const { fresh = false } = options;

  if (!fresh && cachedAnswers) {
    return cachedAnswers;
  }

  const questionBank = readAnswerFile(QUESTIONS_PATH);
  const legacyBank = readAnswerFile(LEGACY_SCREENING_ANSWERS_PATH);

  cachedAnswers = Object.freeze({
    textQuestions: mergeArrays(questionBank.textQuestions, legacyBank.textAnswers),
    choiceQuestions: mergeArrays(questionBank.choiceQuestions, legacyBank.choiceAnswers),
    textAnswers: mergeArrays(questionBank.textQuestions, legacyBank.textAnswers),
    choiceAnswers: mergeArrays(questionBank.choiceQuestions, legacyBank.choiceAnswers)
  });

  return cachedAnswers;
}

function readAnswerFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {
      textQuestions: [],
      choiceQuestions: [],
      textAnswers: [],
      choiceAnswers: []
    };
  }

  const parsedFile = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  return {
    textQuestions: Array.isArray(parsedFile.textQuestions) ? parsedFile.textQuestions : [],
    choiceQuestions: Array.isArray(parsedFile.choiceQuestions) ? parsedFile.choiceQuestions : [],
    textAnswers: Array.isArray(parsedFile.textAnswers) ? parsedFile.textAnswers : [],
    choiceAnswers: Array.isArray(parsedFile.choiceAnswers) ? parsedFile.choiceAnswers : []
  };
}

function mergeArrays(primaryEntries = [], fallbackEntries = []) {
  const mergedEntries = [...primaryEntries];
  const existingIds = new Set(primaryEntries.map((entry) => entry.id).filter(Boolean));

  for (const entry of fallbackEntries) {
    if (entry.id && existingIds.has(entry.id)) {
      continue;
    }

    mergedEntries.push(entry);
  }

  return Object.freeze(mergedEntries);
}

function getManualScreeningAnswersPath() {
  return QUESTIONS_PATH;
}

module.exports = {
  getManualScreeningAnswersPath,
  loadManualScreeningAnswers
};
