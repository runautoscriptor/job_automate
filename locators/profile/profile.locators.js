const profileLocators = Object.freeze({
  editProfileButton: '.dashboard .txt-wrapper .icon.edit',
  editProfileButtonCandidates: [
    '.dashboard .txt-wrapper .icon.edit',
    '.dashboard [class*="edit"]',
    '.icon.edit',
    'span.icon.edit',
    'i.icon.edit'
  ],
  basicDetailsHeading: 'Basic details',
  profileHeaderPatterns: [
    /Profile last updated/i,
    /Resume/i,
    /Quick links/i
  ],
  saveProfileButton: {
    role: 'button',
    name: 'Save'
  },
  profileResumeHeading: 'Resume',
  quickLinksResumeUpdateLink: {
    role: 'link',
    name: 'Update'
  },
  resumeFileInputCandidates: [
    '#attachCV',
    'input[type="file"]',
    'input[accept*=".pdf"]',
    'input[accept*=".doc"]',
    'input[accept*=".docx"]'
  ],
  resumeUpdateButton: {
    selector: 'input.dummyUpload[value="Update resume"]'
  },
  uploadedResumeFileNamePattern: /\.(pdf|doc|docx|rtf)$/i,
  uploadedResumeDatePattern: /Uploaded on/i,
  updateSuccessIndicator: '.success-message-container .success-text',
  lastUpdatedLabel: '.subhdn'
});

module.exports = { profileLocators };
