const fs = require('fs');
const path = require('path');

const SCREENING_ANSWERS_PATH = path.resolve(
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

  if (!fs.existsSync(SCREENING_ANSWERS_PATH)) {
    cachedAnswers = Object.freeze({
      textAnswers: [],
      choiceAnswers: []
    });

    return cachedAnswers;
  }

  const rawAnswers = JSON.parse(fs.readFileSync(SCREENING_ANSWERS_PATH, 'utf8'));
  const normalizedAnswers = {
    textAnswers: Array.isArray(rawAnswers.textAnswers) ? rawAnswers.textAnswers : [],
    choiceAnswers: Array.isArray(rawAnswers.choiceAnswers) ? rawAnswers.choiceAnswers : []
  };

  cachedAnswers = Object.freeze(normalizedAnswers);

  return cachedAnswers;
}

function getManualScreeningAnswersPath() {
  return SCREENING_ANSWERS_PATH;
}

module.exports = {
  getManualScreeningAnswersPath,
  loadManualScreeningAnswers
};
