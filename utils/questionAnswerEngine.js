const { loadCandidateProfile } = require('./candidateProfile');
const { loadManualScreeningAnswers } = require('./manualScreeningAnswers');

const STOP_WORDS = new Set([
  'a',
  'an',
  'are',
  'at',
  'be',
  'can',
  'could',
  'do',
  'does',
  'for',
  'have',
  'how',
  'i',
  'in',
  'is',
  'many',
  'of',
  'on',
  'the',
  'to',
  'what',
  'when',
  'with',
  'would',
  'you',
  'your'
]);

function normalizeQuestion(questionText) {
  return String(questionText || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s+./()-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function resolveQuestionAnswer(questionText) {
  const normalizedQuestion = normalizeQuestion(questionText);
  const { textQuestions } = loadManualScreeningAnswers();

  const matchedEntry = findBestQuestionMatch(normalizedQuestion, textQuestions);

  if (!matchedEntry) {
    return null;
  }

  const answer = resolveAnswerSource(matchedEntry.answerSource);

  if (!answer) {
    return null;
  }

  return {
    matchedEntry,
    answer
  };
}

function resolveChoiceOption(questionText, optionTexts = []) {
  const normalizedQuestion = normalizeQuestion(questionText);
  const { choiceQuestions } = loadManualScreeningAnswers();
  const matchedEntry = findBestQuestionMatch(normalizedQuestion, choiceQuestions);

  if (!matchedEntry) {
    return null;
  }

  const normalizedOptions = optionTexts.map((optionText) => ({
    raw: optionText,
    normalized: normalizeQuestion(optionText)
  }));

  for (const preferredPattern of matchedEntry.preferredOptionPatterns || []) {
    const normalizedPattern = normalizeQuestion(preferredPattern);

    const exactMatch =
      normalizedOptions.find((option) => option.normalized === normalizedPattern) ||
      normalizedOptions.find((option) => option.normalized.includes(normalizedPattern)) ||
      normalizedOptions.find((option) => normalizedPattern.includes(option.normalized));

    if (exactMatch) {
      return {
        matchedEntry,
        answer: exactMatch.raw
      };
    }
  }

  return null;
}

function findBestQuestionMatch(normalizedQuestion, entries = []) {
  let bestMatch = null;

  for (const entry of entries) {
    const score = getQuestionMatchScore(normalizedQuestion, entry.questionPatterns || []);

    if (score <= 0) {
      continue;
    }

    if (!bestMatch || score > bestMatch.score) {
      bestMatch = {
        entry,
        score
      };
    }
  }

  return bestMatch ? bestMatch.entry : null;
}

function getQuestionMatchScore(normalizedQuestion, questionPatterns = []) {
  let highestScore = 0;

  for (const pattern of questionPatterns) {
    const normalizedPattern = normalizeQuestion(pattern);

    if (!normalizedPattern) {
      continue;
    }

    if (normalizedQuestion.includes(normalizedPattern)) {
      highestScore = Math.max(highestScore, 100 + normalizedPattern.length);
      continue;
    }

    const patternTokens = extractMeaningfulTokens(normalizedPattern);

    if (patternTokens.length === 0) {
      continue;
    }

    const matchedTokens = patternTokens.filter((token) => normalizedQuestion.includes(token));
    const score = Math.round((matchedTokens.length / patternTokens.length) * 100);

    if (matchedTokens.length === patternTokens.length) {
      highestScore = Math.max(highestScore, 80 + score);
      continue;
    }

    if (matchedTokens.length >= Math.max(2, Math.ceil(patternTokens.length * 0.7))) {
      highestScore = Math.max(highestScore, score);
    }
  }

  return highestScore;
}

function extractMeaningfulTokens(value) {
  return normalizeQuestion(value)
    .split(' ')
    .map((token) => token.trim())
    .filter((token) => token && !STOP_WORDS.has(token));
}

function resolveAnswerSource(answerSource = {}) {
  if (!answerSource || typeof answerSource !== 'object') {
    return null;
  }

  if (answerSource.type === 'static') {
    return answerSource.value || null;
  }

  if (answerSource.type === 'profile') {
    const profile = loadCandidateProfile();
    const value = getByPath(profile, answerSource.path);

    if (Array.isArray(value)) {
      return value.join(', ');
    }

    return value ?? null;
  }

  return null;
}

function getByPath(source, pathExpression = '') {
  return String(pathExpression || '')
    .split('.')
    .filter(Boolean)
    .reduce((currentValue, segment) => currentValue?.[segment], source);
}

module.exports = {
  normalizeQuestion,
  resolveChoiceOption,
  resolveQuestionAnswer
};
