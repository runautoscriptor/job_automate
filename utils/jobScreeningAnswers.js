const {
  getTextAnswer,
  normalizeQuestion,
  resolveChoiceQuestion,
  resolveScreeningQuestion
} = require('./screeningQuestionResolver');

function choosePositiveOption(questionText, optionTexts = [], options = {}) {
  const resolution = resolveChoiceAnswer(questionText, optionTexts, options);
  return resolution.status === 'known' ? resolution.answer : null;
}

function resolveChoiceAnswer(questionText, optionTexts = [], options = {}) {
  return resolveChoiceQuestion(questionText, optionTexts, options);
}

module.exports = {
  choosePositiveOption,
  getTextAnswer,
  resolveChoiceAnswer,
  resolveScreeningQuestion,
  normalizeQuestion
};
