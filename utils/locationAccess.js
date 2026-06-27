const { getNumberEnv } = require('./env');

async function allowNaukriLocationAccess(context, baseURL = 'https://www.naukri.com') {
  const naukriOrigin = new URL(baseURL).origin;

  await context.grantPermissions(['geolocation'], {
    origin: naukriOrigin
  });

  await context.setGeolocation({
    latitude: getNumberEnv('NAUKRI_GEO_LAT', 28.5355),
    longitude: getNumberEnv('NAUKRI_GEO_LON', 77.391)
  });
}

module.exports = {
  allowNaukriLocationAccess
};
