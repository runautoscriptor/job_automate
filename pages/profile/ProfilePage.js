const { profileLocators } = require('../../locators/profile/profile.locators');
const { expect } = require('@playwright/test');

class ProfilePage {
  constructor(page) {
    this.page = page;
    this.locators = profileLocators;
  }

  get editProfileButton() {
    return this.page.locator(this.locators.editProfileButton);
  }

  get basicDetailsHeading() {
    return this.page.getByText(this.locators.basicDetailsHeading, { exact: true });
  }

  get saveProfileButton() {
    return this.page
      .locator('.profileEditDrawer')
      .getByRole(this.locators.saveProfileButton.role, {
        name: this.locators.saveProfileButton.name,
        exact: true
      });
  }

  get updateSuccessIndicator() {
    return this.page.locator(this.locators.updateSuccessIndicator);
  }

  get lastUpdatedLabel() {
    return this.page.locator(this.locators.lastUpdatedLabel);
  }

  async clickEditProfile() {
    await expect(this.editProfileButton).toBeVisible();
    await this.editProfileButton.click();
    await expect(this.basicDetailsHeading).toBeVisible();
  }

  async clickSaveProfile() {
    await expect(this.saveProfileButton).toBeVisible();
    await this.saveProfileButton.click();
  }

  async verifyUpdateSuccess() {
    await expect(this.updateSuccessIndicator).toContainText('Profile updated successfully', {
      timeout: 20000
    });
    await expect(this.lastUpdatedLabel).toContainText('Profile last updated - Today', {
      timeout: 20000
    });
  }
}

module.exports = { ProfilePage };
