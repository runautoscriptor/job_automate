const runButton = document.getElementById('runButton');
const stopButton = document.getElementById('stopButton');
const autoRunButton = document.getElementById('autoRunButton');
const refreshButton = document.getElementById('refreshButton');
const runStatusPill = document.getElementById('runStatusPill');
const currentRunLabel = document.getElementById('currentRunLabel');
const latestRunMeta = document.getElementById('latestRunMeta');
const profileTabs = document.getElementById('profileTabs');
const profileMeta = document.getElementById('profileMeta');
const overviewGrid = document.getElementById('overviewGrid');
const moduleGrid = document.getElementById('moduleGrid');
const latestExecutionCard = document.getElementById('latestExecutionCard');
const logsViewer = document.getElementById('logsViewer');

let selectedProfileId = null;
let isRequestInFlight = false;

runButton.addEventListener('click', async () => {
  await runAction(() => postJson('/api/run', { profileId: selectedProfileId }));
});

stopButton.addEventListener('click', async () => {
  await runAction(() => postJson('/api/stop', { profileId: selectedProfileId }));
});

autoRunButton.addEventListener('click', async () => {
  const status = await getStatus();
  await runAction(() =>
    postJson('/api/auto-run', {
      profileId: selectedProfileId,
      enabled: !status.state.autoRunEnabled
    })
  );
});

refreshButton.addEventListener('click', refreshDashboard);

async function refreshDashboard() {
  const status = await getStatus();
  renderStatus(status);
  await loadLogs();
}

async function getStatus() {
  const query = selectedProfileId ? `?profileId=${encodeURIComponent(selectedProfileId)}` : '';
  const status = await getJson(`/api/status${query}`);

  if (!selectedProfileId) {
    selectedProfileId = status.selectedProfileId;
  }

  return status;
}

function renderStatus(status) {
  const currentRunSummary = status.currentRun || null;
  const latestSummary = status.latestRun || null;
  const activeSummary = latestSummary;
  const activeState = status.state || {};
  const selectedProfile = status.profile;
  const headerStatus = currentRunSummary?.status || 'idle';

  renderProfileTabs(status.profiles || [], status.selectedProfileId);

  runStatusPill.textContent = formatStatus(headerStatus);
  runStatusPill.className = `status-pill ${normalizeStatusClass(headerStatus)}`;
  currentRunLabel.textContent = activeState.currentRunId
    ? `Running ${activeState.currentRunId}`
    : 'No run in progress';

  runButton.disabled = isRequestInFlight || Boolean(activeState.currentRunId) || !selectedProfile?.configured;
  stopButton.disabled = isRequestInFlight || !activeState.currentRunId;
  refreshButton.disabled = isRequestInFlight;
  autoRunButton.disabled = isRequestInFlight || !selectedProfile?.configured;

  const autoRunTimeLabel = status.scheduler?.autoRunTimeLabel || '9:00 AM IST';
  autoRunButton.textContent = selectedProfile?.configured
    ? `Auto Run ${autoRunTimeLabel}: ${activeState.autoRunEnabled ? 'On' : 'Off'}`
    : 'Auto Run Unavailable';

  latestRunMeta.textContent = activeSummary
    ? `${activeSummary.runId} - ${formatStatus(activeSummary.status)} - ${formatDate(activeSummary.finishedAt || activeSummary.startedAt)}`
    : 'No run data yet.';

  renderProfileMeta(selectedProfile, activeState, status);
  renderOverview(activeSummary);
  renderModules(activeSummary?.modules || {});
  renderLatestExecution(activeSummary);
}

function renderProfileTabs(profiles, activeProfileId) {
  profileTabs.innerHTML = profiles
    .map((profile) => `
      <button
        class="profile-tab ${profile.id === activeProfileId ? 'active' : ''}"
        data-profile-id="${escapeHtml(profile.id)}"
      >
        <span class="profile-chip">
          <strong>${escapeHtml(profile.label)}</strong>
          <small>${profile.configured ? 'Configured' : 'Credentials missing'}</small>
        </span>
      </button>
    `)
    .join('');

  for (const button of profileTabs.querySelectorAll('[data-profile-id]')) {
    button.addEventListener('click', async () => {
      const nextProfileId = button.dataset.profileId;
      if (!nextProfileId || nextProfileId === selectedProfileId || isRequestInFlight) {
        return;
      }

      selectedProfileId = nextProfileId;
      await postJson('/api/profile/select', { profileId: nextProfileId });
      await refreshDashboard();
    });
  }
}

function renderProfileMeta(profile, state, status) {
  if (!profile) {
    profileMeta.innerHTML = '';
    return;
  }

  const nextAutoRun = status.profiles.find((item) => item.id === profile.id)?.nextAutoRunAt;
  profileMeta.innerHTML = [
    buildMetaCard('Profile', profile.label),
    buildMetaCard('Logged In Email', profile.email || 'n/a'),
    buildMetaCard('Credentials', profile.configured ? 'Ready' : 'Missing'),
    buildMetaCard('Current Status', formatStatus(status.currentRun?.status || 'idle')),
    buildMetaCard('Next Auto Run', state.autoRunEnabled && nextAutoRun ? formatDateIst(nextAutoRun) : 'Disabled')
  ].join('');
}

function renderOverview(summary) {
  const overviewItems = [
    {
      label: 'Overall Result',
      value: formatStatus(summary?.status || 'idle')
    },
    {
      label: 'Execution Time',
      value: getExecutionDuration(summary)
    },
    {
      label: 'Applications',
      value: summary?.modules?.jobSearch?.summary?.totalApplicationsSubmitted ?? 0
    },
    {
      label: 'Resume Update',
      value: summary?.modules?.resumeUpdate?.uploaded
        ? 'Updated'
        : formatStatus(summary?.modules?.resumeUpdate?.status || 'not-updated')
    }
  ];

  overviewGrid.innerHTML = overviewItems
    .map((item) => `
      <article class="stat-card">
        <span class="stat-label">${escapeHtml(item.label)}</span>
        <strong class="stat-value">${escapeHtml(String(item.value))}</strong>
      </article>
    `)
    .join('');
}

function renderModules(modules) {
  const moduleCards = [
    buildModuleCard('Profile Status', modules.profileRefresh, [
      ['Status', formatStatus(modules.profileRefresh?.status || 'idle')],
      ['Updated', booleanLabel(modules.profileRefresh?.profileUpdated)]
    ]),
    buildModuleCard('Job Search', modules.jobSearch, [
      ['Keywords', modules.jobSearch?.summary?.totalKeywordsProcessed ?? 0],
      ['Jobs Reviewed', modules.jobSearch?.summary?.totalJobsReviewed ?? 0],
      ['Applications', modules.jobSearch?.summary?.totalApplicationsSubmitted ?? 0],
      ['Skipped', modules.jobSearch?.summary?.skippedCount ?? 0]
    ]),
    buildModuleCard('Nvite', modules.nvites, [
      ['Reviewed', modules.nvites?.summary?.totalNvitesReviewed ?? 0],
      ['Applied', modules.nvites?.summary?.applied ?? 0],
      ['Already Applied', modules.nvites?.summary?.alreadyApplied ?? 0],
      ['Skipped', modules.nvites?.summary?.skipped ?? 0]
    ]),
    buildModuleCard('Recommendations', modules.recommendations, [
      ['Checked', modules.recommendations?.summary?.totalRecommendationsChecked ?? 0],
      ['Matching Jobs', modules.recommendations?.summary?.matchingJobsFound ?? 0],
      ['Applied', modules.recommendations?.summary?.appliedSuccessfully ?? 0],
      ['Skipped', modules.recommendations?.summary?.skipped ?? 0]
    ]),
    buildModuleCard('Resume Update', modules.resumeUpdate, [
      ['Status', formatStatus(modules.resumeUpdate?.status || 'idle')],
      ['File', modules.resumeUpdate?.uploadedFileName || 'Pending'],
      ['Uploaded On', modules.resumeUpdate?.uploadedOn || 'Pending']
    ])
  ];

  moduleGrid.innerHTML = moduleCards.join('');
}

function renderLatestExecution(summary) {
  if (!summary) {
    latestExecutionCard.innerHTML = '<div class="empty-state">No execution has been recorded yet.</div>';
    return;
  }

  latestExecutionCard.innerHTML = `
    <div class="run-summary-grid">
      ${buildSummaryMetric('Run ID', summary.runId)}
      ${buildSummaryMetric('Status', formatStatus(summary.status))}
      ${buildSummaryMetric('Started', formatDate(summary.startedAt))}
      ${buildSummaryMetric('Finished', formatDate(summary.finishedAt))}
    </div>
    <div class="module-hint">${escapeHtml(summary.error || 'Latest execution completed without dashboard-level errors.')}</div>
  `;
}

async function loadLogs() {
  const query = selectedProfileId ? `?profileId=${encodeURIComponent(selectedProfileId)}` : '';
  const response = await fetch(`/api/logs${query}`);
  const logs = await response.text();
  logsViewer.textContent = logs || 'Logs will appear here.';
}

async function runAction(action) {
  if (isRequestInFlight) {
    return;
  }

  try {
    isRequestInFlight = true;
    updateButtonsWhileBusy();
    await action();
  } catch (error) {
    logsViewer.textContent = `Dashboard request failed: ${error.message}`;
  } finally {
    isRequestInFlight = false;
    await refreshDashboard();
  }
}

function updateButtonsWhileBusy() {
  runButton.disabled = true;
  stopButton.disabled = true;
  autoRunButton.disabled = true;
  refreshButton.disabled = true;
}

function buildMetaCard(label, value) {
  return `
    <div class="meta-item">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(String(value || 'n/a'))}</strong>
    </div>
  `;
}

function buildModuleCard(title, data, rows) {
  const moduleStatus = getModuleStatus(data);
  const statusClass = normalizeStatusClass(moduleStatus);
  const cardClass = normalizeStatusClass(title);
  const body = data
    ? rows.map(([label, value]) => `
        <div class="metric-row">
          <span>${escapeHtml(label)}</span>
          <strong>${escapeHtml(String(value ?? 'n/a'))}</strong>
        </div>
      `).join('')
    : '<div class="empty-state">Waiting for data...</div>';

  return `
    <article class="module-card module-card-${cardClass}">
      <header>
        <h3>${escapeHtml(title)}</h3>
        <span class="badge ${statusClass}">${escapeHtml(formatStatus(moduleStatus))}</span>
      </header>
      <div class="module-body">${body}</div>
    </article>
  `;
}

function buildSummaryMetric(label, value) {
  return `
    <div class="meta-item">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(String(value || 'n/a'))}</strong>
    </div>
  `;
}

async function getJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw await buildHttpError(response, url);
  }
  return response.json();
}

async function postJson(url, payload = {}) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw await buildHttpError(response, url);
  }

  return response.json().catch(() => ({}));
}

function formatStatus(status) {
  return String(status || 'idle')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizeStatusClass(status) {
  return String(status || 'idle').toLowerCase().replace(/\s+/g, '-');
}

function getModuleStatus(moduleData) {
  if (!moduleData) {
    return 'idle';
  }

  if (moduleData.status) {
    return moduleData.status;
  }

  if (moduleData.summary?.status) {
    return moduleData.summary.status;
  }

  return 'completed';
}

function booleanLabel(value) {
  return value ? 'Yes' : 'No';
}

function getExecutionDuration(summary) {
  if (!summary?.startedAt || !summary?.finishedAt) {
    return summary?.status === 'running' ? 'Running' : 'n/a';
  }

  const durationMs = new Date(summary.finishedAt).getTime() - new Date(summary.startedAt).getTime();
  const totalSeconds = Math.max(0, Math.round(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
}

function formatDate(value) {
  if (!value) return 'n/a';
  return new Date(value).toLocaleString();
}

function formatDateIst(value) {
  if (!value) return 'n/a';
  return new Date(value).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

async function buildHttpError(response, url) {
  const fallbackMessage = `Request failed for ${url}`;

  try {
    const payload = await response.json();
    return new Error(payload.error || payload.reason || fallbackMessage);
  } catch (error) {
    return new Error(fallbackMessage);
  }
}

refreshDashboard().catch((error) => {
  logsViewer.textContent = error.message;
});

setInterval(() => {
  if (!isRequestInFlight) {
    refreshDashboard().catch(() => {});
  }
}, 5000);
