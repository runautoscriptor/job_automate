const base = require('@playwright/test');
const { LoginPage } = require('../pages/auth/LoginPage');
const { HomePage } = require('../pages/common/HomePage');
const { ProfilePage } = require('../pages/profile/ProfilePage');

const test = base.test.extend({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  homePage: async ({ page }, use) => {
    await use(new HomePage(page));
  },
  profilePage: async ({ page }, use) => {
    await use(new ProfilePage(page));
  }
});

module.exports = {
  test,
  expect: base.expect
};
