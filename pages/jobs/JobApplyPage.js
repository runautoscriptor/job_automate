const { expect } = require('@playwright/test');
const { jobApplyLocators } = require('../../locators/jobs/jobApply.locators');
const { captureNamedScreenshot } = require('../../utils/screenshot');
const { choosePositiveOption, getTextAnswer } = require('../../utils/jobScreeningAnswers');
const { logger } = require('../../utils/logger');

class JobApplyPage {
  constructor(page) {
    this.page = page;
    this.locators = jobApplyLocators;
  }

  get applyButton() {
    return this.getApplyButtonLocator();
  }

  get appliedStateIndicator() {
    return this.getAppliedStateIndicatorLocator();
  }

  get resumeLaterButton() {
    return this.page.getByText(this.locators.resumeLaterButtonText, { exact: true });
  }

  async applyToJob(job) {
    logger.info(`Opening job "${job.title}"`);

    await this.page.goto(job.url, { waitUntil: 'domcontentloaded' });
    await this.page.waitForLoadState('domcontentloaded');

    return this.applyToCurrentJob(job);
  }

  getApplyButtonLocator(root = this.page) {
    return root.getByRole(this.locators.applyButton.role, {
      name: this.locators.applyButton.name,
      exact: true
    });
  }

  getAppliedStateIndicatorLocator(root = this.page) {
    return root.getByText(this.locators.appliedStateText, { exact: true });
  }

  async applyToCurrentJob(job, options = {}) {
    const { root = this.page } = options;
    const normalizedJob = {
      title: job.title || 'Unknown job',
      url: job.url || this.page.url()
    };

    if (await this.isAlreadyApplied({ root })) {
      return this.createResult(normalizedJob, 'already-applied');
    }

    const hasApplyButton = await this.hasApplyButton({ root });

    if (!hasApplyButton) {
      await captureNamedScreenshot(this.page, `${normalizedJob.title}-missing-apply-button`);
      return this.createResult(normalizedJob, 'skipped-no-apply-button');
    }

    await this.getApplyButtonLocator(root).click();
    await this.page.waitForTimeout(1500);

    await this.handleResumePromptIfVisible();

    if (await this.isApplicationSuccessful()) {
      return this.createResult(normalizedJob, 'applied');
    }

    if (await this.isAlreadyApplied({ root })) {
      return this.createResult(normalizedJob, 'already-applied');
    }

    const screeningSummary = await this.answerVisibleScreeningQuestions();

    if (screeningSummary.attempted) {
      await this.submitVisibleApplicationStep();
      await this.page.waitForTimeout(2500);
      await this.handleResumePromptIfVisible();
    }

    if (await this.isApplicationSuccessful()) {
      return this.createResult(normalizedJob, 'applied');
    }

    if (await this.isAlreadyApplied({ root })) {
      return this.createResult(normalizedJob, 'already-applied');
    }

    await captureNamedScreenshot(this.page, `${normalizedJob.title}-needs-review`);
    await this.dismissOpenModalIfPresent();

    return this.createResult(
      normalizedJob,
      screeningSummary.unsupportedCount > 0
        ? 'skipped-unsupported-screening'
        : 'skipped-needs-review'
    );
  }

  async hasApplyButton(options = {}) {
    const { root = this.page } = options;
    return this.getApplyButtonLocator(root).isVisible().catch(() => false);
  }

  async handleResumePromptIfVisible() {
    const hasResumeLaterButton = await this.resumeLaterButton.isVisible().catch(() => false);

    if (!hasResumeLaterButton) {
      return false;
    }

    const resumeSaveButton = this.page.getByText(this.locators.resumeSaveButtonText, { exact: true }).last();

    await this.resumeLaterButton.click();
    await this.page.waitForTimeout(300);

    if (await resumeSaveButton.isVisible().catch(() => false)) {
      await resumeSaveButton.click();
      await this.page.waitForTimeout(1500);
    }

    return true;
  }

  async answerVisibleScreeningQuestions() {
    const questionFields = await this.page.evaluate(() => {
      function isVisible(element) {
        if (!element) {
          return false;
        }

        const style = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();

        return (
          style.visibility !== 'hidden' &&
          style.display !== 'none' &&
          rect.width > 0 &&
          rect.height > 0
        );
      }

      function shouldIgnoreElement(element) {
        const placeholder = (element.getAttribute('placeholder') || '').toLowerCase();
        const containerText = element.closest('section, div, form, label')?.textContent || '';
        const normalizedContainerText = containerText.replace(/\s+/g, ' ').trim().toLowerCase();

        return (
          element.closest('header, nav, footer, [role="banner"], [role="contentinfo"]') ||
          placeholder.includes('enter keyword') ||
          placeholder.includes('enter location') ||
          placeholder.includes('select experience') ||
          placeholder.includes('search jobs here') ||
          normalizedContainerText.includes('send me download link')
        );
      }

      function buildSelector(element) {
        if (element.id) {
          return `#${CSS.escape(element.id)}`;
        }

        if (element.name) {
          return `${element.tagName.toLowerCase()}[name=\"${CSS.escape(element.name)}\"]`;
        }

        return null;
      }

      function getQuestionText(element) {
        const labelByFor = element.id ? document.querySelector(`label[for=\"${CSS.escape(element.id)}\"]`) : null;
        const labelledById = element.getAttribute('aria-labelledby');
        const labelledBy = labelledById ? document.getElementById(labelledById) : null;
        const container = element.closest('label, fieldset, div, form');
        const textSource = labelByFor || labelledBy || container;

        return textSource ? textSource.textContent.replace(/\s+/g, ' ').trim() : '';
      }

      function getPreferredRoot() {
        const candidateRoots = [
          ...document.querySelectorAll(
            'form, [role="dialog"], [class*="modal"], [class*="drawer"], [class*="lightbox"]'
          )
        ].filter((root) => {
          if (!isVisible(root)) {
            return false;
          }

          const hasInteractiveFields = root.querySelector('textarea, input, select');
          const hasActionButton = [...root.querySelectorAll('button')]
            .map((button) => button.textContent.replace(/\s+/g, ' ').trim().toLowerCase())
            .some((text) => ['save', 'submit', 'continue', 'apply'].includes(text));

          return hasInteractiveFields && hasActionButton;
        });

        return candidateRoots[0] || document.body;
      }

      const root = getPreferredRoot();

      const descriptors = [];
      const seenSelectors = new Set();

      for (const element of root.querySelectorAll('textarea, input, select')) {
        if (!isVisible(element) || shouldIgnoreElement(element)) {
          continue;
        }

        const tagName = element.tagName.toLowerCase();
        const inputType = tagName === 'input' ? (element.getAttribute('type') || 'text').toLowerCase() : null;

        if (tagName === 'input' && ['hidden', 'submit', 'button', 'file'].includes(inputType)) {
          continue;
        }

        if (tagName === 'input' && ['checkbox', 'radio'].includes(inputType)) {
          continue;
        }

        const selector = buildSelector(element);

        if (!selector || seenSelectors.has(selector)) {
          continue;
        }

        seenSelectors.add(selector);

        descriptors.push({
          selector,
          type: tagName === 'textarea' ? 'textarea' : tagName === 'select' ? 'select' : inputType,
          questionText: getQuestionText(element),
          placeholder: element.getAttribute('placeholder') || '',
          options:
            tagName === 'select'
              ? [...element.options].map((option) => option.textContent.replace(/\s+/g, ' ').trim())
              : []
        });
      }

      const radioGroups = new Map();

      for (const radioInput of root.querySelectorAll('input[type=\"radio\"]')) {
        if (!isVisible(radioInput) || !radioInput.name || shouldIgnoreElement(radioInput)) {
          continue;
        }

        const selector = buildSelector(radioInput);
        const label = radioInput.id
          ? document.querySelector(`label[for=\"${CSS.escape(radioInput.id)}\"]`)
          : radioInput.closest('label');
        const labelText = label ? label.textContent.replace(/\s+/g, ' ').trim() : '';
        const questionText = getQuestionText(radioInput);

        if (!radioGroups.has(radioInput.name)) {
          radioGroups.set(radioInput.name, {
            name: radioInput.name,
            type: 'radio-group',
            questionText,
            options: []
          });
        }

        if (selector) {
          radioGroups.get(radioInput.name).options.push({
            label: labelText,
            selector
          });
        }
      }

      return descriptors.concat([...radioGroups.values()]);
    });

    if (questionFields.length === 0) {
      return {
        attempted: false,
        unsupportedCount: 0
      };
    }

    let answeredCount = 0;
    let unsupportedCount = 0;

    for (const field of questionFields) {
      const questionText = field.questionText || field.placeholder;

      if (field.type === 'select') {
        const optionToSelect = choosePositiveOption(questionText, field.options);

        if (!optionToSelect) {
          unsupportedCount += 1;
          continue;
        }

        await this.page.locator(field.selector).selectOption({ label: optionToSelect });
        answeredCount += 1;
        continue;
      }

      if (field.type === 'radio-group') {
        const optionLabels = field.options.map((option) => option.label);
        const preferredOption = choosePositiveOption(questionText, optionLabels);
        const matchingOption = field.options.find((option) => option.label === preferredOption);

        if (!matchingOption) {
          unsupportedCount += 1;
          continue;
        }

        await this.page.locator(matchingOption.selector).check();
        answeredCount += 1;
        continue;
      }

      const answerText = getTextAnswer(questionText);

      if (!answerText) {
        unsupportedCount += 1;
        continue;
      }

      const fieldLocator = this.page.locator(field.selector);

      if (field.type === 'number') {
        const numericAnswer = answerText.replace(/[^0-9.]/g, '');

        if (!numericAnswer) {
          unsupportedCount += 1;
          continue;
        }

        await fieldLocator.fill(numericAnswer);
      } else {
        await fieldLocator.fill(answerText);
      }

      answeredCount += 1;
    }

    logger.info(
      `Screening questions processed. Answered: ${answeredCount}, unsupported: ${unsupportedCount}.`
    );

    return {
      attempted: answeredCount > 0 || unsupportedCount > 0,
      answeredCount,
      unsupportedCount
    };
  }

  async submitVisibleApplicationStep() {
    for (const buttonText of this.locators.modalSubmitTexts) {
      const submitButton = this.page.getByRole('button', { name: buttonText, exact: true }).last();
      const isVisible = await submitButton.isVisible().catch(() => false);

      if (!isVisible) {
        continue;
      }

      await submitButton.click();
      return true;
    }

    return false;
  }

  async isAlreadyApplied(options = {}) {
    const { root = this.page } = options;
    const appliedIndicatorVisible = await this.getAppliedStateIndicatorLocator(root)
      .isVisible()
      .catch(() => false);

    if (appliedIndicatorVisible) {
      return true;
    }

    return root.getByText(this.locators.alreadyAppliedPattern).isVisible().catch(() => false);
  }

  async isApplicationSuccessful() {
    return this.page
      .getByText(this.locators.applicationSuccessPattern)
      .isVisible()
      .catch(() => false);
  }

  async dismissOpenModalIfPresent() {
    for (const selector of this.locators.modalCloseSelectors) {
      const closeButton = this.page.locator(selector).first();

      if (await closeButton.isVisible().catch(() => false)) {
        await closeButton.click().catch(() => {});
        return true;
      }
    }

    await this.page.keyboard.press('Escape').catch(() => {});
    return false;
  }

  createResult(job, status) {
    logger.info(`Job "${job.title}" finished with status "${status}".`);

    return {
      jobTitle: job.title,
      jobUrl: job.url,
      status
    };
  }
}

module.exports = { JobApplyPage };
