const { expect } = require('@playwright/test');
const { recommendationLocators } = require('../../locators/recommendations/recommendation.locators');

class RecommendationPage {
  constructor(page) {
    this.page = page;
    this.locators = recommendationLocators;
  }

  get heading() {
    return this.page.getByText(this.locators.headingText);
  }

  get profileTab() {
    return this.page.getByText(this.locators.profileTabPattern).first();
  }

  get recommendationCards() {
    return this.page.locator(this.locators.recommendationCardsSelector);
  }

  get applySelectedButton() {
    return this.page.getByRole('button', {
      name: this.locators.applySelectedButtonName
    }).first();
  }

  async waitForPageReady() {
    await expect(this.heading).toBeVisible({ timeout: 30000 });
    await this.recommendationCards.first().waitFor({
      state: 'visible',
      timeout: 30000
    });
  }

  async ensureProfileTabSelected() {
    const hasProfileTab = await this.profileTab.isVisible().catch(() => false);

    if (!hasProfileTab) {
      return;
    }

    await this.profileTab.click().catch(() => {});
    await this.page.waitForTimeout(1000);
  }

  async getTopRecommendationCards({ limit = 10 } = {}) {
    return this.recommendationCards.evaluateAll((cards, limit) => {
      const jobs = [];

      function normalizeText(value) {
        return String(value || '')
          .replace(/\s+/g, ' ')
          .trim();
      }

      for (const [domIndex, card] of cards.entries()) {
        const title = normalizeText(card.querySelector('p')?.textContent || '');
        const previewText = normalizeText(card.innerText || '');

        if (!title || !previewText) {
          continue;
        }

        jobs.push({
          domIndex,
          index: jobs.length,
          title,
          previewText
        });

        if (jobs.length >= limit) {
          break;
        }
      }

      return jobs;
    }, limit);
  }

  async selectRecommendation(title, maxCardsToSearch = 10) {
    const recommendationCards = await this.getTopRecommendationCards({
      limit: maxCardsToSearch
    });
    const targetRecommendation = recommendationCards.find((card) => card.title === title);

    if (!targetRecommendation) {
      return false;
    }

    const targetCard = this.recommendationCards.nth(targetRecommendation.domIndex);
    await targetCard.scrollIntoViewIfNeeded().catch(() => {});

    const checkboxInput = targetCard.locator('input[type="checkbox"]');
    const hasCheckboxInput = await checkboxInput.count();

    if (hasCheckboxInput > 0) {
      await checkboxInput.first().check({ force: true }).catch(() => {});
    }

    if (!(await this.isApplySelectedButtonEnabled())) {
      await targetCard.click().catch(() => {});
    }

    if (!(await this.isApplySelectedButtonEnabled())) {
      const checkboxRole = targetCard.locator('[role="checkbox"]');
      const hasCheckboxRole = await checkboxRole.count();

      if (hasCheckboxRole > 0) {
        await checkboxRole.first().click().catch(() => {});
      }
    }

    await this.page.waitForTimeout(500);

    return this.isApplySelectedButtonEnabled();
  }

  async clickApplyForSelectedJobs() {
    await expect(this.applySelectedButton).toBeEnabled({ timeout: 15000 });
    await this.applySelectedButton.click();
  }

  async isApplySelectedButtonEnabled() {
    return this.applySelectedButton.isEnabled().catch(() => false);
  }
}

module.exports = { RecommendationPage };
