const { profileLocators } = require('../../locators/profile/profile.locators');
const { expect } = require('@playwright/test');
const path = require('path');

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

  get resumeHeading() {
    return this.page.getByText(this.locators.profileResumeHeading, { exact: true }).last();
  }

  get quickLinksResumeUpdateLink() {
    return this.page.getByRole(this.locators.quickLinksResumeUpdateLink.role, {
      name: this.locators.quickLinksResumeUpdateLink.name,
      exact: true
    });
  }

  get resumeFileInput() {
    return this.page.locator(this.locators.resumeFileInput);
  }

  get updateResumeButton() {
    return this.page.locator(this.locators.resumeUpdateButton.selector);
  }

  get uploadedResumeFileName() {
    return this.page.getByText(this.locators.uploadedResumeFileNamePattern).first();
  }

  get uploadedResumeDate() {
    return this.page.getByText(this.locators.uploadedResumeDatePattern).first();
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

  async uploadResume(localFilePath) {
    const uploadedFileName = path.basename(localFilePath);
    const previousResumeInfo = await this.getCurrentResumeInfo();

    await this.resumeHeading.scrollIntoViewIfNeeded().catch(() => {});
    await this.quickLinksResumeUpdateLink.click().catch(() => {});

    const resumeFileInputCount = await this.resumeFileInput.count();

    if (resumeFileInputCount !== 1) {
      throw new Error(
        `Expected exactly one resume file input, but found ${resumeFileInputCount}.`
      );
    }

    await this.resumeFileInput.setInputFiles(localFilePath);

    const updateResumeButtonCount = await this.updateResumeButton.count();

    if (updateResumeButtonCount !== 1) {
      throw new Error(
        `Expected exactly one resume Update resume button, but found ${updateResumeButtonCount}.`
      );
    }

    await this.updateResumeButton.click({ force: true });

    await expect
      .poll(
        async () => {
          const currentResumeInfo = await this.getCurrentResumeInfo();
          const hasExpectedFileName = currentResumeInfo.fileName.includes(uploadedFileName);
          const fileNameChanged = currentResumeInfo.fileName !== previousResumeInfo.fileName;
          const dateChanged =
            Boolean(currentResumeInfo.uploadedOn) &&
            currentResumeInfo.uploadedOn !== previousResumeInfo.uploadedOn;

          return hasExpectedFileName && (fileNameChanged || dateChanged);
        },
        {
          timeout: 60000
        }
      )
      .toBeTruthy();

    return this.getCurrentResumeInfo();
  }

  async getCurrentResumeInfo() {
    const fileName = await this.uploadedResumeFileName.textContent().catch(() => '');
    const uploadedOn = await this.uploadedResumeDate.textContent().catch(() => '');

    return {
      fileName: String(fileName || '').trim(),
      uploadedOn: String(uploadedOn || '').trim()
    };
  }
}

module.exports = { ProfilePage };
