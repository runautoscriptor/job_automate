const runButton = document.getElementById('runButton');
const stopButton = document.getElementById('stopButton');
const autoRunButton = document.getElementById('autoRunButton');
const refreshButton = document.getElementById('refreshButton');
const runStatusPill = document.getElementById('runStatusPill');
const currentRunLabel = document.getElementById('currentRunLabel');
const latestRunMeta = document.getElementById('latestRunMeta');
const moduleGrid = document.getElementById('moduleGrid');
const recentRuns = document.getElementById('recentRuns');
const logsViewer = document.getElementById('logsViewer');

let selectedRunId = null;

runButton.addEventListener('click', async () => {
  await postJson('/api/run');
  await refreshDashboard();
});

stopButton.addEventListener('click', async () => {
  await postJson('/api/stop');
  await refreshDashboard();
});

autoRunButton.addEventListener('click', async () => {
  const status = await getJson('/api/status');
  await postJson('/api/auto-run', {
    enabled: !status.state.autoRunEnabled
  });
  await refreshDashboard();
});

refreshButton.addEventListener('click', refreshDashboard);

async function refreshDashboard() {
  const status = await getJson('/api/status');
  renderStatus(status);

  const activeRunId = status.state.currentRunId;
  const runIdToLoad = selectedRunId || activeRunId || status.latestRun?.runId;

  if (runIdToLoad) {
    await loadRunLogs(runIdToLoad);
  } else {
    logsViewer.textContent = 'Logs will appear here.';
  }
}

function renderStatus(status) {
  const { state, currentRun, latestRun, recentRuns: runs } = status;
  const activeSummary = currentRun || latestRun;

  runStatusPill.textContent = formatStatus(activeSummary?.status || 'idle');
  runStatusPill.className = `status-pill ${String(activeSummary?.status || 'idle').toLowerCase()}`;
  currentRunLabel.textContent = state.currentRunId
    ? `Running: ${state.currentRunId}`
    : 'No run in progress';

  autoRunButton.textContent = `Auto Run: ${state.autoRunEnabled ? 'On' : 'Off'}`;
  runButton.disabled = Boolean(state.currentRunId);
  stopButton.disabled = !state.currentRunId;

  latestRunMeta.textContent = activeSummary
    ? `${activeSummary.runId} • ${formatStatus(activeSummary.status)} • ${formatDate(activeSummary.finishedAt || activeSummary.startedAt)}`
    : 'No run data yet.';

  renderModules(activeSummary?.modules || {});
  renderRecentRuns(runs || []);
}

function renderModules(modules) {
  const moduleEntries = [
    ['Profile Refresh', modules.profileRefresh],
    ['Job Search & Application', modules.jobSearch?.summary || modules.jobSearch],
    ['Nvite Summary', modules.nvites?.summary || modules.nvites],
    ['Recommendation Summary', modules.recommendations?.summary || modules.recommendations],
    ['Resume Update', modules.resumeUpdate]
  ];

  moduleGrid.innerHTML = moduleEntries
    .map(([title, data]) => {
      const body = data ? JSON.stringify(data, null, 2) : 'Waiting for data...';
      return `
        <article class="module-card">
          <h3>${escapeHtml(title)}</h3>
          <pre>${escapeHtml(body)}</pre>
        </article>
      `;
    })
    .join('');
}

function renderRecentRuns(runs) {
  recentRuns.innerHTML = runs
    .map((run) => {
      const summary = {
        status: run.status,
        startedAt: run.startedAt,
        finishedAt: run.finishedAt,
        error: run.error
      };

      return `
        <article class="run-card">
          <h3>${escapeHtml(run.runId)}</h3>
          <pre>${escapeHtml(JSON.stringify(summary, null, 2))}</pre>
          <button data-run-id="${escapeHtml(run.runId)}" class="secondary-action">View This Run</button>
        </article>
      `;
    })
    .join('');

  for (const button of recentRuns.querySelectorAll('button[data-run-id]')) {
    button.addEventListener('click', async () => {
      selectedRunId = button.dataset.runId;
      await loadRunLogs(selectedRunId);
    });
  }
}

async function loadRunLogs(runId) {
  const response = await fetch(`/api/runs/${encodeURIComponent(runId)}/logs`);
  const logs = await response.text();
  logsViewer.textContent = logs || 'No logs available for this run yet.';
}

async function getJson(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Request failed for ${url}`);
  }

  return response.json();
}

async function postJson(url, payload = {}) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  return response.json().catch(() => ({}));
}

function formatStatus(status) {
  return String(status || 'idle')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDate(value) {
  if (!value) {
    return 'n/a';
  }

  return new Date(value).toLocaleString();
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

refreshDashboard().catch((error) => {
  logsViewer.textContent = error.message;
});

setInterval(() => {
  refreshDashboard().catch(() => {});
}, 10000);
