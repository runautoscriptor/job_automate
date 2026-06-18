const fs = require('fs');
const path = require('path');

const AUTH_STATE_PATH = path.resolve(process.cwd(), 'auth', 'naukri-user.json');

function getAuthStatePath() {
  return AUTH_STATE_PATH;
}

function hasAuthState() {
  return fs.existsSync(AUTH_STATE_PATH);
}

module.exports = {
  getAuthStatePath,
  hasAuthState
};
