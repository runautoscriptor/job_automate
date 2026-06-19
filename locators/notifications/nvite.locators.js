const nviteLocators = Object.freeze({
  headingText: /NVites: Your invitation to apply/i,
  invitationCards: '.inbox-card-wrapper',
  selectedInvitationCard: '.card.inbox-company-card.selected',
  detailContainer: '.card-details-container',
  detailDescriptionContainer: '.job-details-component',
  allTabPattern: /^All \(\d+\)$/,
  notInterestedButtonText: 'Not interested',
  confirmNotInterestedButtonText: 'Mark not interested',
  defaultNotInterestedReasonText: 'Job role',
  deleteButton: '.delete-button'
});

module.exports = { nviteLocators };
