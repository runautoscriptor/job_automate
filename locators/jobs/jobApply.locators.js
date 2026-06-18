const jobApplyLocators = Object.freeze({
  applyButton: {
    role: 'button',
    name: 'Apply'
  },
  resumeLaterButtonText: "I'll do it later",
  resumeSaveButtonText: 'Save',
  applicationSuccessPattern: /Applied to/i,
  alreadyAppliedPattern: /already applied/i,
  appliedStateText: 'Applied',
  modalSubmitTexts: ['Save', 'Submit', 'Continue', 'Apply'],
  modalCloseSelectors: [
    '[aria-label="Close"]',
    '[class*="close"]',
    '[class*="cross"]',
    '[class*="dismiss"]'
  ]
});

module.exports = { jobApplyLocators };
