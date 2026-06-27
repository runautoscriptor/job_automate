const recommendationLocators = Object.freeze({
  headingText: /Recommended jobs for you/i,
  profileTabPattern: /^Profile(?:\s*\(\d+\))?$/i,
  recommendationCardsSelector: 'article',
  applySelectedButtonName: /^Apply(?:\s+\d+\s+Job)?/i
});

module.exports = { recommendationLocators };
