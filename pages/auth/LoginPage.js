const { loginLocators } = require('../../locators/auth/login.locators');
const { expect } = require('@playwright/test');
const { getEnv } = require('../../utils/env');
const { getAuthStatePath } = require('../../utils/authState');

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

  get authenticatedHomeUrl() {
    return new URL(
      this.locators.authenticatedHomePath,
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

    await this.submitLoginButton.click();
    await this.page.waitForLoadState('domcontentloaded');

    await expect
      .poll(
        async () =>
          new URL(this.page.url()).pathname.includes(this.locators.postLoginUrlFragment) &&
          !(await this.emailInput.isVisible().catch(() => false)),
        {
        timeout: 45000
        }
      )
      .toBeTruthy();
    await this.saveAuthenticatedSession();
  }

  async ensureAuthenticatedSession() {
    if (await this.isAuthenticated()) {
      return;
    }

    await this.openLoginModal();
    await this.loginWithCredentials();
  }

  async isAuthenticated() {
    await this.page.goto(this.authenticatedHomeUrl, { waitUntil: 'domcontentloaded' });
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(2000);

    const currentUrl = new URL(this.page.url());
    const hasVisibleLoginForm = await this.emailInput.isVisible().catch(() => false);
    const hasVisibleLoginLink = await this.page
      .getByRole('link', { name: 'Login', exact: true })
      .isVisible()
      .catch(() => false);
    const hasProfileShortcut = await this.page
      .getByRole('link', { name: 'Complete profile', exact: true })
      .isVisible()
      .catch(() => false);

    return (
      currentUrl.pathname.includes(this.locators.postLoginUrlFragment) &&
      !hasVisibleLoginForm &&
      !hasVisibleLoginLink &&
      hasProfileShortcut
    );
  }

  async saveAuthenticatedSession() {
    await this.page.context().storageState({ path: getAuthStatePath() });
  }
}

module.exports = { LoginPage };
