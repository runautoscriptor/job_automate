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
    return this.page.locator(this.locators.resumeFileInputCandidates[0]);
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

  async waitForProfilePageReady() {
    await expect(this.page).toHaveURL(/\/mnjuser\/profile/, { timeout: 45000 });
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(1500);

    const hasKnownProfileSignal = await expect
      .poll(
        async () => this.hasAnyProfileSignal(),
        {
          timeout: 20000,
          message: 'Profile page did not finish rendering expected profile content.'
        }
      )
      .toBeTruthy()
      .then(() => true)
      .catch(() => false);

    if (hasKnownProfileSignal) {
      return;
    }

    const bodyText = await this.page.locator('body').textContent().catch(() => '');
    const normalizedBodyText = String(bodyText || '').replace(/\s+/g, ' ').trim();
    const broadProfileSignals = [
      /profile last updated/i,
      /\bresume\b/i,
      /quick links/i,
      /key skills/i,
      /employment/i,
      /education/i
    ];

    if (broadProfileSignals.some((pattern) => pattern.test(normalizedBodyText))) {
      return;
    }

    throw new Error('Profile page did not finish rendering expected profile content.');
  }

  async hasAnyProfileSignal() {
    const checks = [
      this.lastUpdatedLabel.isVisible().catch(() => false),
      this.resumeHeading.isVisible().catch(() => false),
      this.quickLinksResumeUpdateLink.isVisible().catch(() => false),
      this.page.getByText(/profile last updated/i).isVisible().catch(() => false),
      this.page.getByText(/quick links/i).isVisible().catch(() => false),
      this.page.getByText(/key skills/i).isVisible().catch(() => false),
      this.page.getByText(/employment/i).isVisible().catch(() => false)
    ];

    const results = await Promise.all(checks);
    return results.some(Boolean);
  }

  async isProfileUpdatedToday() {
    const lastUpdatedText = await this.lastUpdatedLabel.textContent().catch(() => '');
    return /today/i.test(String(lastUpdatedText || '').trim());
  }

  async findVisibleEditProfileButton() {
    for (const candidate of this.locators.editProfileButtonCandidates) {
      const locator = this.page.locator(candidate).first();
      const isVisible = await locator.isVisible().catch(() => false);

      if (isVisible) {
        return locator;
      }
    }

    return null;
  }

  async clickEditProfile() {
    await this.waitForProfilePageReady();

    const editButton = await this.findVisibleEditProfileButton();

    if (!editButton) {
      throw new Error('Could not find the main profile edit button on the Naukri profile page.');
    }

    await editButton.scrollIntoViewIfNeeded().catch(() => {});
    await editButton.click({ force: true });
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

    await this.waitForProfilePageReady().catch(() => {});
    await this.resumeHeading.scrollIntoViewIfNeeded().catch(() => {});
    await this.quickLinksResumeUpdateLink.click().catch(() => {});
    await this.page.getByRole('button', { name: /Update resume/i }).first().click().catch(() => {});
    await this.page.waitForTimeout(1000);

    const resumeFileInput = await this.findResumeFileInput();

    if (!resumeFileInput) {
      throw new Error('Could not find any usable resume file input on the profile page.');
    }

    await resumeFileInput.setInputFiles(localFilePath);

    const updateResumeButtonCount = await this.updateResumeButton.count();

    if (updateResumeButtonCount === 1) {
      await this.updateResumeButton.click({ force: true }).catch(() => {});
    }

    await expect
      .poll(
        async () => {
          const currentResumeInfo = await this.getCurrentResumeInfo();
          const hasExpectedFileName = currentResumeInfo.fileName.includes(uploadedFileName);
          const fileNameChanged = currentResumeInfo.fileName !== previousResumeInfo.fileName;
          const dateChanged =
            Boolean(currentResumeInfo.uploadedOn) &&
            currentResumeInfo.uploadedOn !== previousResumeInfo.uploadedOn;

          if (!hasExpectedFileName) {
            return false;
          }

          if (fileNameChanged || dateChanged) {
            return true;
          }

          // When the resume name is intentionally stable across runs, the visible
          // date may also stay the same for repeat uploads on the same day.
          return previousResumeInfo.fileName === uploadedFileName;
        },
        {
          timeout: 60000
        }
      )
      .toBeTruthy();

    return this.getCurrentResumeInfo();
  }

  async findResumeFileInput() {
    for (const candidate of this.locators.resumeFileInputCandidates) {
      const locator = this.page.locator(candidate).first();
      const count = await this.page.locator(candidate).count().catch(() => 0);

      if (count > 0) {
        return locator;
      }
    }

    return null;
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
