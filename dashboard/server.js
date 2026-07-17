const http = require('http');
const fs = require('fs');
const path = require('path');
const {
  getDashboardSnapshot,
  startAutomationRun,
  stopAutomationRun
} = require('./services/automationController');
const { readLatestRunLogs, getDashboardState, initializeDashboardState, setSelectedProfileId, updateProfileState } = require('./services/stateStore');
const { PUBLIC_DIR } = require('./services/paths');
const { AUTO_RUN_TIME_ZONE, getNextAutoRunAt, startScheduler } = require('./services/scheduler');

const PORT = Number(process.env.DASHBOARD_PORT || 8826);

initializeDashboardState();

const scheduler = startScheduler({
  getState: getDashboardState,
  onAutoRun: async (profileId) => {
    startAutomationRun({ trigger: 'auto', profileId });
  }
});

const server = http.createServer(async (request, response) => {
  try {
    const requestUrl = new URL(request.url, `http://${request.headers.host}`);

    if (requestUrl.pathname.startsWith('/api/')) {
      await handleApiRequest(request, response, requestUrl);
      return;
    }

    await serveStaticAsset(response, requestUrl.pathname);
  } catch (error) {
    writeJson(response, 500, { error: error.message });
  }
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(
      `Dashboard could not start because port ${PORT} is already in use. ` +
      `Close the existing process or use another port, for example: ` +
      `$env:DASHBOARD_PORT=8827; npm run dashboard`
    );
    process.exit(1);
  }

  console.error(`Dashboard server failed: ${error.message}`);
  process.exit(1);
});

server.listen(PORT, () => {
  console.log(`Dashboard available at http://localhost:${PORT}`);
  console.log(`Dashboard server started at ${new Date().toISOString()}`);
});

process.on('SIGINT', () => {
  scheduler.stop();
  server.close(() => process.exit(0));
});

async function handleApiRequest(request, response, requestUrl) {
  if (request.method === 'GET' && requestUrl.pathname === '/api/status') {
    const selectedProfileId = requestUrl.searchParams.get('profileId') || getDashboardState().selectedProfileId;
    const snapshot = getDashboardSnapshot(selectedProfileId);
    const selectedProfile = snapshot.selectedProfile;
    const latestRun = selectedProfile?.latestRun || null;
    const profileState = selectedProfile?.state || {};

    writeJson(response, 200, {
      selectedProfileId: snapshot.selectedProfileId,
      profiles: snapshot.profiles.map((profile) => ({
        id: profile.id,
        label: profile.label,
        email: profile.displayEmail || '',
        configured: profile.configured,
        state: profile.state,
        nextAutoRunAt: getNextAutoRunAt(profile.state)
      })),
      scheduler: {
        timeZone: AUTO_RUN_TIME_ZONE
      },
      profile: selectedProfile
        ? {
            id: selectedProfile.id,
            label: selectedProfile.label,
            email: selectedProfile.displayEmail || '',
            configured: selectedProfile.configured
          }
        : null,
      state: profileState,
      currentRun: profileState.currentRunId ? latestRun : null,
      latestRun,
      recentRun: latestRun
    });
    return;
  }

  if (request.method === 'POST' && requestUrl.pathname === '/api/profile/select') {
    const body = await readRequestBody(request);
    const nextState = setSelectedProfileId(body.profileId);

    writeJson(response, 200, {
      selectedProfileId: nextState.selectedProfileId
    });
    return;
  }

  if (request.method === 'POST' && requestUrl.pathname === '/api/run') {
    const body = await readRequestBody(request);
    const profileId = body.profileId || getDashboardState().selectedProfileId;
    const result = startAutomationRun({ trigger: 'manual', profileId });
    writeJson(response, result.started ? 202 : 409, result);
    return;
  }

  if (request.method === 'POST' && requestUrl.pathname === '/api/stop') {
    const body = await readRequestBody(request);
    const profileId = body.profileId || getDashboardState().selectedProfileId;
    const result = stopAutomationRun(profileId);
    writeJson(response, result.stopped ? 202 : 409, result);
    return;
  }

  if (request.method === 'POST' && requestUrl.pathname === '/api/auto-run') {
    const body = await readRequestBody(request);
    const profileId = body.profileId || getDashboardState().selectedProfileId;
    const nextState = updateProfileState(profileId, {
      autoRunEnabled: Boolean(body.enabled),
      autoRunEnabledAt: body.enabled ? new Date().toISOString() : null
    });
    const profileState = nextState.profiles[profileId];

    writeJson(response, 200, {
      autoRunEnabled: profileState.autoRunEnabled,
      nextAutoRunAt: getNextAutoRunAt(profileState)
    });
    return;
  }

  if (request.method === 'GET' && requestUrl.pathname === '/api/logs') {
    const profileId = requestUrl.searchParams.get('profileId') || getDashboardState().selectedProfileId;
    response.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end(readLatestRunLogs(profileId));
    return;
  }

  writeJson(response, 404, { error: 'Route not found.' });
}

async function serveStaticAsset(response, pathname) {
  const normalizedPath = pathname === '/' ? '/index.html' : pathname;
  const assetPath = path.join(PUBLIC_DIR, normalizedPath);

  if (!assetPath.startsWith(PUBLIC_DIR) || !fs.existsSync(assetPath)) {
    writeJson(response, 404, { error: 'Page not found.' });
    return;
  }

  const fileBuffer = fs.readFileSync(assetPath);
  response.writeHead(200, {
    'Content-Type': getContentType(assetPath),
    'Cache-Control': 'no-store, max-age=0'
  });
  response.end(fileBuffer);
}

function getContentType(filePath) {
  if (filePath.endsWith('.html')) return 'text/html; charset=utf-8';
  if (filePath.endsWith('.css')) return 'text/css; charset=utf-8';
  if (filePath.endsWith('.js')) return 'application/javascript; charset=utf-8';
  if (filePath.endsWith('.json')) return 'application/json; charset=utf-8';
  return 'text/plain; charset=utf-8';
}

async function readRequestBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    return {};
  }

  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function writeJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8'
  });
  response.end(JSON.stringify(payload, null, 2));
}
