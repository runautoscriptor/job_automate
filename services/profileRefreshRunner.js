async function runProfileRefreshFlow({
  homePage,
  profilePage,
  stopMonitor
}) {
  await stopMonitor?.throwIfStopRequested?.();
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
