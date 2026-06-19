const homeLocators = Object.freeze({
  jobsMenuLink: {
    role: 'link',
    name: /Jobs/
  },
  nvitesLink: {
    role: 'link',
    name: /NVites/i
  },
  completeProfileLink: {
    role: 'link',
    name: 'Complete profile'
  },
  profilePath: '/mnjuser/profile',
  nvitesPath: '/mnjuser/inbox'
});

module.exports = { homeLocators };
