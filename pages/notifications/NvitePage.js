const { expect } = require('@playwright/test');
const { nviteLocators } = require('../../locators/notifications/nvite.locators');

class NvitePage {
  constructor(page) {
    this.page = page;
    this.locators = nviteLocators;
  }

  get invitationCards() {
    return this.page.locator(this.locators.invitationCards);
  }

  get selectedInvitationCard() {
    return this.page.locator(this.locators.selectedInvitationCard);
  }

  get detailContainer() {
    return this.page.locator(this.locators.detailContainer);
  }

  get detailDescriptionContainer() {
    return this.page.locator(this.locators.detailDescriptionContainer);
  }

  get notInterestedButton() {
    return this.page.getByRole('button', {
      name: this.locators.notInterestedButtonText,
      exact: true
    });
  }

  get allTab() {
    return this.page.getByText(this.locators.allTabPattern);
  }

  get confirmNotInterestedButton() {
    return this.page.getByRole('button', {
      name: this.locators.confirmNotInterestedButtonText,
      exact: true
    });
  }

  get defaultNotInterestedReason() {
    return this.page.getByText(this.locators.defaultNotInterestedReasonText, {
      exact: true
    });
  }

  async waitForPageReady() {
    await expect(this.page.getByText(this.locators.headingText)).toBeVisible({ timeout: 30000 });
    await this.invitationCards.first().waitFor({ state: 'visible', timeout: 30000 });
  }

  async activateAllInvitations() {
    const hasAllTab = await this.allTab.isVisible().catch(() => false);

    if (!hasAllTab) {
      return;
    }

    await this.allTab.click().catch(() => {});
    await this.page.waitForTimeout(1000);
  }

  async getVisibleInvitationCards() {
    return this.invitationCards.evaluateAll((cards) =>
      cards.map((card, index) => {
        const lines = card.innerText
          .split(/\n+/)
          .map((line) => line.trim())
          .filter(Boolean);

        return {
          index,
          title: lines[0] || '',
          signature: lines.join(' | '),
          isApplied: lines.some((line) => /^applied$/i.test(line))
        };
      })
    );
  }

  async openInvitationAt(index) {
    const targetCard = this.invitationCards.nth(index);
    const cardText = await targetCard.innerText();
    const expectedTitle = String(cardText || '')
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean)[0];

    await targetCard.click();
    await expect(this.selectedInvitationCard).toBeVisible({ timeout: 15000 });

    if (expectedTitle) {
      await expect
        .poll(async () => this.selectedInvitationCard.innerText().catch(() => ''), {
          timeout: 15000
        })
        .toContain(expectedTitle);
    }
  }

  async getSelectedInvitationDetails() {
    await expect(this.detailContainer).toBeVisible({ timeout: 15000 });

    const headings = await this.detailContainer.locator('h1, h2, h3, h4').allTextContents();
    const normalizedHeadings = headings.map((text) => text.trim()).filter(Boolean);
    const detailText = await this.detailContainer.innerText();
    const normalizedLines = String(detailText || '')
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean);
    const descriptionText = await this.detailDescriptionContainer
      .innerText()
      .catch(() => detailText);

    return {
      title: normalizedHeadings[0] || normalizedLines[0] || '',
      company: normalizedHeadings[1] || normalizedLines[1] || '',
      description: String(descriptionText || '').replace(/\s+/g, ' ').trim(),
      fullText: String(detailText || '').replace(/\s+/g, ' ').trim()
    };
  }

  async markCurrentInvitationNotInterested() {
    const selectedCardTextBefore = await this.selectedInvitationCard.textContent().catch(() => '');
    const cardsBefore = await this.invitationCards.count();

    await expect(this.notInterestedButton).toBeVisible({ timeout: 10000 });
    await this.notInterestedButton.click();
    await this.page.waitForTimeout(1500);

    const hasConfirmButton = await this.confirmNotInterestedButton.isVisible().catch(() => false);

    if (hasConfirmButton) {
      const hasDefaultReason = await this.defaultNotInterestedReason.isVisible().catch(() => false);

      if (hasDefaultReason) {
        await this.defaultNotInterestedReason.click();
        await this.page.waitForTimeout(500);
      }

      await this.confirmNotInterestedButton.click();
      await this.page.waitForTimeout(1500);
    }

    await expect
      .poll(
        async () => {
          const cardsAfter = await this.invitationCards.count();
          const selectedCardTextAfter = await this.selectedInvitationCard.textContent().catch(() => '');
          const hasVisibleNotInterestedButton = await this.notInterestedButton
            .isVisible()
            .catch(() => false);

          return (
            cardsAfter < cardsBefore ||
            String(selectedCardTextAfter || '').trim() !== String(selectedCardTextBefore || '').trim() ||
            !hasVisibleNotInterestedButton
          );
        },
        { timeout: 15000 }
      )
      .toBeTruthy();
  }
}

module.exports = { NvitePage };
