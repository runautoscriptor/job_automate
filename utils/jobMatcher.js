function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getKeywordTerms(keyword) {
  const normalizedKeyword = normalizeText(keyword);

  const keywordTermMap = {
    'qa engineer': ['qa engineer', 'qa', 'quality assurance', 'software tester', 'test engineer'],
    'manual tester': ['manual tester', 'manual testing', 'manual qa', 'tester', 'software tester'],
    'automation tester': [
      'automation tester',
      'automation testing',
      'automation',
      'qa automation',
      'tester'
    ],
    'software test engineer': [
      'software test engineer',
      'test engineer',
      'software tester',
      'qa engineer',
      'quality assurance engineer'
    ],
    'qa analyst': ['qa analyst', 'quality analyst', 'quality assurance analyst', 'qa', 'analyst']
  };

  return keywordTermMap[normalizedKeyword] || normalizedKeyword.split(' ');
}

function matchesSearchKeyword(jobTitle, keyword) {
  const normalizedTitle = normalizeText(jobTitle);
  const keywordTerms = getKeywordTerms(keyword);

  return keywordTerms.some((term) => normalizedTitle.includes(term));
}

module.exports = {
  matchesSearchKeyword,
  normalizeText
};
