const { expect } = require('@playwright/test');
const { jobSearchLocators } = require('../../locators/jobs/jobSearch.locators');
const { matchesSearchKeyword } = require('../../utils/jobMatcher');
const { getEnv } = require('../../utils/env');
const { logger } = require('../../utils/logger');

class JobSearchPage {
  constructor(page) {
    this.page = page;
    this.locators = jobSearchLocators;
  }

  buildKeywordResultsUrl(keyword, experienceYears) {
    const keywordSlug = keyword
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const resultsUrl = new URL(
      `${keywordSlug}${this.locators.resultsPathSuffix}`,
      getEnv('NAUKRI_BASE_URL', 'https://www.naukri.com')
    );

    resultsUrl.searchParams.set('experience', String(experienceYears));

    return resultsUrl.toString();
  }

  async gotoKeywordResults(keyword, experienceYears) {
    const resultsUrl = this.buildKeywordResultsUrl(keyword, experienceYears);

    logger.info(`Opening results for keyword "${keyword}" at ${resultsUrl}`);

    await this.page.goto(resultsUrl, { waitUntil: 'domcontentloaded' });
    await this.waitForResultsToRender();
  }

  async applyLocationFilters(locations) {
    if (!Array.isArray(locations) || locations.length === 0) {
      return;
    }

    const lastLocation = locations[locations.length - 1];
    await this.expandLocationFilter(lastLocation);

    for (const location of locations) {
      const locationLabel = await this.getLocationLabel(location);

      await expect(locationLabel).toBeVisible();
      await locationLabel.click();
      await this.page.waitForTimeout(300);
    }

    await Promise.all([
      this.page.waitForLoadState('domcontentloaded'),
      this.page.getByText(this.locators.filterApplyText, { exact: true }).click()
    ]);

    await this.waitForResultsToRender();
  }

  async applyFreshnessLastOneDay() {
    const freshnessDropdown = this.page.getByRole(this.locators.freshnessDropdown.role, {
      name: this.locators.freshnessDropdown.name
    });

    await expect(freshnessDropdown).toBeVisible();
    await freshnessDropdown.click();

    const lastOneDayOption = this.page.locator(this.locators.freshnessLastOneDayOption);

    await expect(lastOneDayOption).toBeVisible();

    await Promise.all([
      this.page.waitForLoadState('domcontentloaded'),
      lastOneDayOption.click()
    ]);

    await expect(this.page).toHaveURL(/jobAge=1/);
    await this.waitForResultsToRender();
  }

  async getVisibleJobLinks({ keyword, maxJobs }) {
    const jobs = await this.page.evaluate((selector) => {
      const uniqueJobs = new Map();

      for (const link of document.querySelectorAll(selector)) {
        const title = link.textContent.replace(/\s+/g, ' ').trim();
        const url = link.href;

        if (!title || !url || uniqueJobs.has(url)) {
          continue;
        }

        uniqueJobs.set(url, {
          title,
          url
        });
      }

      return [...uniqueJobs.values()];
    }, this.locators.jobLinksSelector);

    const matchedJobs = jobs.filter((job) => matchesSearchKeyword(job.title, keyword));

    logger.info(
      `Collected ${matchedJobs.length} keyword-matched jobs for "${keyword}" from the current results page.`
    );

    return matchedJobs.slice(0, maxJobs);
  }

  async expandLocationFilter(targetLocation) {
    await this.waitForResultsToRender();

    const expandedLocationLabel = this.page.locator(
      this.locators.expandedLocationLabel(targetLocation)
    );

    if (await expandedLocationLabel.isVisible().catch(() => false)) {
      return;
    }

    const locationViewMoreLink = this.page.locator(this.locators.locationFilterViewMore);

    await expect(locationViewMoreLink).toBeVisible();
    await locationViewMoreLink.click();
    await this.page.waitForTimeout(300);

    if (await expandedLocationLabel.isVisible().catch(() => false)) {
      return;
    }

    throw new Error(`Unable to expand the location filter for "${targetLocation}".`);
  }

  async getLocationLabel(location) {
    const expandedLocationLabel = this.page.locator(this.locators.expandedLocationLabel(location));

    if (await expandedLocationLabel.isVisible().catch(() => false)) {
      return expandedLocationLabel;
    }

    return this.page.locator(this.locators.collapsedLocationLabel(location));
  }

  async waitForResultsToRender() {
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.locator(this.locators.jobLinksSelector).first().waitFor({
      state: 'visible',
      timeout: 60000
    });
  }
}

module.exports = { JobSearchPage };
