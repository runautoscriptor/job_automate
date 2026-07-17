const { loginLocators } = require('../../locators/auth/login.locators');
const { expect } = require('@playwright/test');
const { getEnv } = require('../../utils/env');
const {
  getAuthStatePath,
  hasCompatibleAuthState,
  saveAuthMetadata
} = require('../../utils/authState');
const { logger } = require('../../utils/logger');

class LoginPage {
  constructor(page, options = {}) {
    this.page = page;
    this.locators = loginLocators;
    this.profileKey = options.profileKey || 'default';
    this.credentials = {
      email: options.email,
      password: options.password
    };
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

  get loginLink() {
    return this.page.getByRole('link', { name: 'Login', exact: true });
  }

  get viewProfileLink() {
    return this.page.getByRole('link', {
      name: this.locators.viewProfileLinkName,
      exact: true
    });
  }

  get signedInUserAvatar() {
    return this.page.getByAltText(this.locators.signedInUserAvatarAlt, { exact: true });
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

  getEffectiveEmail() {
    return this.credentials.email || getEnv('NAUKRI_EMAIL');
  }

  getEffectivePassword() {
    return this.credentials.password || getEnv('NAUKRI_PASSWORD');
  }

  async goto() {
    await this.page.goto(this.loginUrl, { waitUntil: 'domcontentloaded' });

    if (await this.hasSignedInIndicators()) {
      return;
    }

    if (!(await this.emailInput.isVisible().catch(() => false))) {
      const hasVisibleLoginLink = await this.loginLink.isVisible().catch(() => false);

      if (hasVisibleLoginLink) {
        await this.loginLink.click();
      }
    }

    await expect(this.emailInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
  }

  async openLoginModal() {
    await this.goto();
  }

  async loginWithCredentials(
    email = this.getEffectiveEmail(),
    password = this.getEffectivePassword()
  ) {
    if (!email || !password) {
      throw new Error('Naukri credentials are missing. Please configure NAUKRI_EMAIL and NAUKRI_PASSWORD.');
    }

    logger.info(`Logging in with profile "${this.profileKey}" using email "${email}".`);

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
    await this.saveAuthenticatedSession(email, password);
  }

  async ensureAuthenticatedSession() {
    const email = this.getEffectiveEmail();
    const password = this.getEffectivePassword();

    if (!hasCompatibleAuthState(email, password, this.profileKey)) {
      logger.info(
        'Stored auth state does not match the current .env credentials. A fresh login will be performed.'
      );
    }

    logger.info(`Preparing authenticated session for profile "${this.profileKey}" with email "${email}".`);

    if (await this.isAuthenticated()) {
      logger.info(`Authenticated session is already active for email "${email}".`);
      return;
    }

    await this.openLoginModal();
    await this.loginWithCredentials(email, password);
    logger.info(`Login completed successfully for email "${email}".`);
  }

  async isAuthenticated() {
    await this.page.goto(this.authenticatedHomeUrl, { waitUntil: 'domcontentloaded' });
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(2000);

    return this.hasSignedInIndicators();
  }

  async saveAuthenticatedSession(
    email = this.getEffectiveEmail(),
    password = this.getEffectivePassword()
  ) {
    await this.page.context().storageState({ path: getAuthStatePath(this.profileKey) });
    saveAuthMetadata({ email, password, profileKey: this.profileKey });
  }

  async hasSignedInIndicators() {
    const currentUrl = new URL(this.page.url());
    const hasVisibleLoginForm = await this.emailInput.isVisible().catch(() => false);
    const hasVisibleLoginLink = await this.loginLink.isVisible().catch(() => false);
    const hasViewProfileLink = await this.viewProfileLink.isVisible().catch(() => false);
    const hasSignedInAvatar = await this.signedInUserAvatar.isVisible().catch(() => false);

    return (
      currentUrl.pathname.includes(this.locators.postLoginUrlFragment) &&
      !hasVisibleLoginLink &&
      (hasViewProfileLink || hasSignedInAvatar || !hasVisibleLoginForm)
    );
  }
}

module.exports = { LoginPage };
