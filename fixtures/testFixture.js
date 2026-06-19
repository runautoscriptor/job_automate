const base = require('@playwright/test');
const { LoginPage } = require('../pages/auth/LoginPage');
const { HomePage } = require('../pages/common/HomePage');
const { JobApplyPage } = require('../pages/jobs/JobApplyPage');
const { JobSearchPage } = require('../pages/jobs/JobSearchPage');
const { NvitePage } = require('../pages/notifications/NvitePage');
const { ProfilePage } = require('../pages/profile/ProfilePage');

const test = base.test.extend({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  homePage: async ({ page }, use) => {
    await use(new HomePage(page));
  },
  jobSearchPage: async ({ page }, use) => {
    await use(new JobSearchPage(page));
  },
  jobApplyPage: async ({ page }, use) => {
    await use(new JobApplyPage(page));
  },
  nvitePage: async ({ page }, use) => {
    await use(new NvitePage(page));
  },
  profilePage: async ({ page }, use) => {
    await use(new ProfilePage(page));
  }
});

module.exports = {
  test,
  expect: base.expect
};
