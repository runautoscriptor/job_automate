const homeLocators = Object.freeze({
  jobsMenuLink: {
    role: 'link',
    name: /Jobs/
  },
  nvitesLink: {
    role: 'link',
    name: /NVites/i
  },
  recommendedJobsLink: {
    role: 'link',
    name: /Recommended jobs/i
  },
  completeProfileLink: {
    role: 'link',
    name: 'Complete profile'
  },
  profilePath: '/mnjuser/profile',
  nvitesPath: '/mnjuser/inbox',
  signedInHomePath: '/mnjuser/homepage'
});

module.exports = { homeLocators };
