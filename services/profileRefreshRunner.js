async function runProfileRefreshFlow({
  homePage,
  profilePage,
  stopMonitor
}) {
  await stopMonitor?.throwIfStopRequested?.();
  await homePage.navigateToProfile();

  try {
    await profilePage.waitForProfilePageReady();
  } catch (error) {
    return {
      module: 'Profile Refresh',
      status: 'skipped-profile-not-ready',
      profileUpdated: false,
      error: error.message
    };
  }

  if (await profilePage.isProfileUpdatedToday()) {
    return {
      module: 'Profile Refresh',
      status: 'already-updated-today',
      profileUpdated: true
    };
  }

  try {
    await profilePage.clickEditProfile();
  } catch (error) {
    if (await profilePage.isProfileUpdatedToday()) {
      return {
        module: 'Profile Refresh',
        status: 'already-updated-today',
        profileUpdated: true
      };
    }

    return {
      module: 'Profile Refresh',
      status: 'skipped-edit-not-available',
      profileUpdated: false,
      error: error.message
    };
  }

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
