const jobSearchLocators = Object.freeze({
  resultsPathSuffix: '-jobs',
  freshnessDropdown: {
    role: 'button',
    name: /Select/
  },
  freshnessLastOneDayOption: 'a[data-id="filter-freshness-1"]',
  filterApplyText: 'Apply',
  jobLinksSelector: '.cust-job-tuple h2 a[href*="/job-listings-"]',
  noResultsHeadingText: 'No results found',
  locationFilterViewMore: '#cityTypeGid',
  expandedLocationLabel: (location) => `label[for="chk-${location}-cityTypeGid-expanded"]`,
  collapsedLocationLabel: (location) => `label[for="chk-${location}-cityTypeGid-"]`
});

module.exports = { jobSearchLocators };
