const loginLocators = Object.freeze({
  loginPath: '/nlogin/login',
  authenticatedHomePath: '/mnjuser/homepage',
  emailInput: {
    placeholder: 'Enter Email ID / Username'
  },
  passwordInput: {
    placeholder: 'Enter Password'
  },
  submitLoginButton: {
    role: 'button',
    name: 'Login'
  },
  viewProfileLinkName: 'View profile',
  signedInUserAvatarAlt: 'naukri user profile img',
  postLoginUrlFragment: '/mnjuser/'
});

module.exports = { loginLocators };
