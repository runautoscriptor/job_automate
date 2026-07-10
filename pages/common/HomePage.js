const { homeLocators } = require('../../locators/common/home.locators');
const { expect } = require('@playwright/test');
const { getEnv } = require('../../utils/env');

class HomePage {
  constructor(page) {
    this.page = page;
    this.locators = homeLocators;
  }

  get completeProfileLink() {
    return this.page.getByRole(this.locators.completeProfileLink.role, {
      name: this.locators.completeProfileLink.name,
      exact: true
    });
  }

  get jobsMenuLink() {
    return this.page.getByRole(this.locators.jobsMenuLink.role, {
      name: this.locators.jobsMenuLink.name
    }).first();
  }

  get nvitesLink() {
    return this.page.getByRole(this.locators.nvitesLink.role, {
      name: this.locators.nvitesLink.name
    }).first();
  }

  get recommendedJobsLink() {
    return this.page.getByRole(this.locators.recommendedJobsLink.role, {
      name: this.locators.recommendedJobsLink.name
    }).first();
  }

  get signedInHomeUrl() {
    return new URL(
      this.locators.signedInHomePath,
      getEnv('NAUKRI_BASE_URL', 'https://www.naukri.com')
    ).toString();
  }

  get profileUrl() {
    return new URL(
      this.locators.profilePath,
      getEnv('NAUKRI_BASE_URL', 'https://www.naukri.com')
    ).toString();
  }

  get nvitesUrl() {
    return new URL(
      this.locators.nvitesPath,
      getEnv('NAUKRI_BASE_URL', 'https://www.naukri.com')
    ).toString();
  }

  async navigateToProfile() {
    const hasProfileShortcut = await this.completeProfileLink.isVisible().catch(() => false);

    if (hasProfileShortcut) {
      await Promise.all([
        this.page.waitForURL(/\/mnjuser\/profile/, {
          timeout: 45000,
          waitUntil: 'domcontentloaded'
        }),
        this.completeProfileLink.click()
      ]);
    } else {
      await this.page.goto(this.profileUrl, { waitUntil: 'domcontentloaded' });
    }

    await expect(this.page).toHaveURL(/\/mnjuser\/profile/);
  }

  async navigateToNvites() {
    await this.navigateFromJobsMenu(this.nvitesLink, /\/mnjuser\/inbox/, this.nvitesUrl);
  }

  async navigateToRecommendedJobs() {
    await this.navigateFromJobsMenu(this.recommendedJobsLink, /recommend/i);
  }

  async navigateFromJobsMenu(targetLink, expectedUrlPattern, fallbackUrl = null) {
    await this.page.goto(this.signedInHomeUrl, { waitUntil: 'domcontentloaded' });
    await this.page.waitForTimeout(1500);
    await this.jobsMenuLink.hover().catch(() => {});
    const isTargetVisible = await targetLink.isVisible().catch(() => false);
    const targetHref = await targetLink.getAttribute('href').catch(() => null);

    if (targetHref) {
      const destinationUrl = new URL(
        targetHref,
        getEnv('NAUKRI_BASE_URL', 'https://www.naukri.com')
      ).toString();
      await this.page.goto(destinationUrl, { waitUntil: 'domcontentloaded' });
    } else if (isTargetVisible) {
      await targetLink.click();
      await this.page.waitForLoadState('domcontentloaded');
    } else if (fallbackUrl) {
      await this.page.goto(fallbackUrl, { waitUntil: 'domcontentloaded' });
    } else {
      throw new Error('Unable to resolve the destination from the Jobs menu.');
    }

    if (expectedUrlPattern) {
      await expect(this.page).toHaveURL(expectedUrlPattern, { timeout: 45000 });
    }
  }
}

module.exports = { HomePage };
