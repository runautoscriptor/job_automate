function printReportSection(title, rows = []) {
  console.log(`\n=== ${title} ===`);

  if (!Array.isArray(rows) || rows.length === 0) {
    console.log('No records.');
    return;
  }

  console.table(rows);
}

function buildNviteSummary(reviewResults = []) {
  const summary = {
    totalNvitesReviewed: reviewResults.length,
    applied: 0,
    alreadyApplied: 0,
    notInterested: 0,
    skipped: 0
  };

  for (const result of reviewResults) {
    if (result.status === 'applied') {
      summary.applied += 1;
      continue;
    }

    if (result.status === 'already-applied') {
      summary.alreadyApplied += 1;
      continue;
    }

    if (result.status === 'not-interested') {
      summary.notInterested += 1;
      continue;
    }

    summary.skipped += 1;
  }

  return summary;
}

function printNviteSummary(summary) {
  printReportSection('Nvite Summary', [summary]);
}

module.exports = {
  buildNviteSummary,
  printNviteSummary,
  printReportSection
};
