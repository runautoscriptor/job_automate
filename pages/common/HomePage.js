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

  get profileUrl() {
    return new URL(
      this.locators.profilePath,
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
}

module.exports = { HomePage };
