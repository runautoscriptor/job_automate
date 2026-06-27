async function runProfileRefreshFlow({
  homePage,
  profilePage
}) {
  await homePage.navigateToProfile();
  await profilePage.clickEditProfile();
  await profilePage.clickSaveProfile();
  await profilePage.verifyUpdateSuccess();

  return {
    module: 'Profile Refresh',
    status: 'completed',
    profileUpdated: true
  };
}

module.exports = {
  runProfileRefreshFlow
};
