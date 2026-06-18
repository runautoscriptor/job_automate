const loginLocators = Object.freeze({
  loginPath: '/nlogin/login',
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
  postLoginUrlFragment: '/mnjuser/'
});

module.exports = { loginLocators };
