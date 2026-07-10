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
    if (await this.hasNoResultsState()) {
      logger.info('Skipping location filters because the search results page shows no results.');
      return;
    }

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
    if (await this.hasNoResultsState()) {
      logger.info('Skipping freshness filter because the search results page shows no results.');
      return;
    }

    try {
      const freshnessDropdown = this.page.getByRole(this.locators.freshnessDropdown.role, {
        name: this.locators.freshnessDropdown.name
      });

      await expect(freshnessDropdown).toBeVisible();
      await freshnessDropdown.click();

      const lastOneDayOption = this.page.locator(this.locators.freshnessLastOneDayOption);

      await expect(lastOneDayOption).toBeVisible();
      await lastOneDayOption.click({ timeout: 5000 });
    } catch (error) {
      logger.warn(
        'Freshness dropdown interaction was unstable. Falling back to URL-based Last 1 Day filter.'
      );

      const filteredUrl = new URL(this.page.url());
      filteredUrl.searchParams.set('jobAge', '1');

      await this.page.goto(filteredUrl.toString(), { waitUntil: 'domcontentloaded' });
    }

    await expect(this.page).toHaveURL(/jobAge=1/);
    await this.waitForResultsToRender();
  }

  async getVisibleJobLinks({ keyword, maxJobs, minJobsToAttempt = 0 }) {
    if (await this.hasNoResultsState()) {
      logger.info(`No results were found for keyword "${keyword}". Moving to the next workflow step.`);
      return [];
    }

    const jobs = await this.page.evaluate((selector) => {
      const uniqueJobs = new Map();

      for (const link of document.querySelectorAll(selector)) {
        const title = link.textContent.replace(/\s+/g, ' ').trim();
        const rawUrl = link.href;

        if (!title || !rawUrl) {
          continue;
        }

        const normalizedUrl = new URL(rawUrl);
        const canonicalUrl = `${normalizedUrl.origin}${normalizedUrl.pathname}`;

        if (uniqueJobs.has(canonicalUrl)) {
          continue;
        }

        uniqueJobs.set(canonicalUrl, {
          title,
          url: canonicalUrl
        });
      }

      return [...uniqueJobs.values()];
    }, this.locators.jobLinksSelector);

    const matchedJobs = jobs.filter((job) => matchesSearchKeyword(job.title, keyword));
    const fallbackJobs = jobs.filter(
      (job) => !matchedJobs.some((matchedJob) => matchedJob.url === job.url)
    );
    const minimumPrioritizedJobs = Math.min(
      jobs.length,
      Math.max(minJobsToAttempt, matchedJobs.length)
    );
    const prioritizedJobs = matchedJobs.concat(
      fallbackJobs.slice(0, Math.max(0, minimumPrioritizedJobs - matchedJobs.length))
    );

    logger.info(
      `Collected ${matchedJobs.length} keyword-matched jobs for "${keyword}" and prepared ${prioritizedJobs.length} same-search fallback jobs from the current results page.`
    );

    return prioritizedJobs.slice(0, maxJobs);
  }

  async expandLocationFilter(targetLocation) {
    await this.waitForResultsToRender();

    if (await this.hasNoResultsState()) {
      return;
    }

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
    const hasVisibleJobResults = await this.page.locator(this.locators.jobLinksSelector).first()
      .waitFor({ state: 'visible', timeout: 15000 })
      .then(() => true)
      .catch(() => false);

    if (hasVisibleJobResults) {
      return;
    }

    const hasNoResults = await this.hasNoResultsState();

    if (hasNoResults) {
      logger.info('Detected "No results found" state on the job search page.');
      return;
    }

    throw new Error('Job search results did not render and the page did not show a no-results state.');
  }

  async hasNoResultsState() {
    return this.page
      .getByText(this.locators.noResultsHeadingText, { exact: true })
      .isVisible()
      .catch(() => false);
  }
}

module.exports = { JobSearchPage };
