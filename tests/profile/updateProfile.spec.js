const { test } = require('../../fixtures/testFixture');
const { validateRequiredEnv } = require('../../utils/env');

test.describe('Profile Update', () => {
  test('should login, open profile, save details, and verify success', async ({
    loginPage,
    homePage,
    profilePage
  }) => {
    test.setTimeout(120000);
    validateRequiredEnv(['NAUKRI_EMAIL', 'NAUKRI_PASSWORD']);

    await loginPage.ensureAuthenticatedSession();
    await homePage.navigateToProfile();
    await profilePage.clickEditProfile();
    await profilePage.clickSaveProfile();
    await profilePage.verifyUpdateSuccess();
  });
});
