const { getEnv } = require('../../utils/env');

const PROFILE_DEFINITIONS = Object.freeze([
  {
    id: 'profile-1',
    labelEnv: 'NAUKRI_PROFILE_1_NAME',
    emailEnv: 'NAUKRI_PROFILE_1_EMAIL',
    passwordEnv: 'NAUKRI_PROFILE_1_PASSWORD'
  },
  {
    id: 'profile-2',
    labelEnv: 'NAUKRI_PROFILE_2_NAME',
    emailEnv: 'NAUKRI_PROFILE_2_EMAIL',
    passwordEnv: 'NAUKRI_PROFILE_2_PASSWORD'
  }
]);

function getDashboardProfiles() {
  return PROFILE_DEFINITIONS.map((definition, index) => {
    const fallbackEmail = index === 0 ? getEnv('NAUKRI_EMAIL', '') : '';
    const fallbackPassword = index === 0 ? getEnv('NAUKRI_PASSWORD', '') : '';

    const email = getEnv(definition.emailEnv, fallbackEmail);
    const password = getEnv(definition.passwordEnv, fallbackPassword);

    return {
      id: definition.id,
      label: getEnv(definition.labelEnv, `Profile ${index + 1}`),
      email,
      password,
      displayEmail: email,
      configured: Boolean(email && password)
    };
  });
}

function getProfileById(profileId) {
  return getDashboardProfiles().find((profile) => profile.id === profileId) || getDashboardProfiles()[0];
}

module.exports = {
  getDashboardProfiles,
  getProfileById
};
