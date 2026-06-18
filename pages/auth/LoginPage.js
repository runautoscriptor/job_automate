const { loginLocators } = require('../../locators/auth/login.locators');
const { expect } = require('@playwright/test');
const { getEnv } = require('../../utils/env');

class LoginPage {
  constructor(page) {
    this.page = page;
    this.locators = loginLocators;
  }

  get emailInput() {
    return this.page.getByPlaceholder(this.locators.emailInput.placeholder, { exact: true });
  }

  get passwordInput() {
    return this.page.getByPlaceholder(this.locators.passwordInput.placeholder, { exact: true });
  }

  get submitLoginButton() {
    return this.page.getByRole(this.locators.submitLoginButton.role, {
      name: this.locators.submitLoginButton.name,
      exact: true
    });
  }

  get loginUrl() {
    return new URL(
      this.locators.loginPath,
      getEnv('NAUKRI_BASE_URL', 'https://www.naukri.com')
    ).toString();
  }

  async goto() {
    await this.page.goto(this.loginUrl, { waitUntil: 'domcontentloaded' });
    await expect(this.emailInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
  }

  async openLoginModal() {
    await this.goto();
  }

  async loginWithCredentials(
    email = getEnv('NAUKRI_EMAIL'),
    password = getEnv('NAUKRI_PASSWORD')
  ) {
    if (!email || !password) {
      throw new Error('Naukri credentials are missing. Please configure NAUKRI_EMAIL and NAUKRI_PASSWORD.');
    }

    if (!this.page.url().includes(this.locators.loginPath)) {
      await this.goto();
    }

    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);

    await Promise.all([
      this.page.waitForURL(new RegExp(this.locators.postLoginUrlFragment), {
        timeout: 45000,
        waitUntil: 'domcontentloaded'
      }),
      this.submitLoginButton.click()
    ]);

    await expect(this.page).toHaveURL(new RegExp(this.locators.postLoginUrlFragment));
  }
}

module.exports = { LoginPage };
