const profileLocators = Object.freeze({
  editProfileButton: '.dashboard .txt-wrapper .icon.edit',
  basicDetailsHeading: 'Basic details',
  saveProfileButton: {
    role: 'button',
    name: 'Save'
  },
  profileResumeHeading: 'Resume',
  quickLinksResumeUpdateLink: {
    role: 'link',
    name: 'Update'
  },
  resumeFileInput: '#attachCV',
  resumeUpdateButton: {
    selector: 'input.dummyUpload[value="Update resume"]'
  },
  uploadedResumeFileNamePattern: /\.(pdf|doc|docx|rtf)$/i,
  uploadedResumeDatePattern: /Uploaded on/i,
  updateSuccessIndicator: '.success-message-container .success-text',
  lastUpdatedLabel: '.subhdn'
});

module.exports = { profileLocators };
