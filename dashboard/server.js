const http = require('http');
const fs = require('fs');
const path = require('path');
const { startAutomationRun, stopAutomationRun } = require('./services/automationController');
const { readText } = require('./services/fileStore');
const { PUBLIC_DIR, getRunLogPath } = require('./services/paths');
const { startScheduler } = require('./services/scheduler');
const {
  getDashboardState,
  initializeDashboardState,
  listRunSummaries,
  readRunSummary,
  updateDashboardState
} = require('./services/stateStore');

const PORT = Number(process.env.DASHBOARD_PORT || 8826);

initializeDashboardState();

const scheduler = startScheduler({
  onAutoRun: async () => {
    startAutomationRun({ trigger: 'auto' });
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
    writeJson(response, 500, {
      error: error.message
    });
  }
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(
      `Dashboard could not start because port ${PORT} is already in use. ` +
      `Close the existing process or run with a different port, for example: ` +
      `\$env:DASHBOARD_PORT=3001; npm run dashboard`
    );
    process.exit(1);
  }

  console.error(`Dashboard server failed: ${error.message}`);
  process.exit(1);
});

server.listen(PORT, () => {
  console.log(`Dashboard available at http://localhost:${PORT}`);
});

process.on('SIGINT', () => {
  scheduler.stop();
  server.close(() => process.exit(0));
});

async function handleApiRequest(request, response, requestUrl) {
  if (request.method === 'GET' && requestUrl.pathname === '/api/status') {
    const state = getDashboardState();
    const latestRuns = listRunSummaries(10);
    const currentRun = state.currentRunId ? readRunSummary(state.currentRunId) : null;

    writeJson(response, 200, {
      state,
      currentRun,
      latestRun: latestRuns[0] || null,
      recentRuns: latestRuns
    });
    return;
  }

  if (request.method === 'POST' && requestUrl.pathname === '/api/run') {
    const result = startAutomationRun({ trigger: 'manual' });
    writeJson(response, result.started ? 202 : 409, result);
    return;
  }

  if (request.method === 'POST' && requestUrl.pathname === '/api/stop') {
    const result = stopAutomationRun();
    writeJson(response, result.stopped ? 202 : 409, result);
    return;
  }

  if (request.method === 'POST' && requestUrl.pathname === '/api/auto-run') {
    const body = await readRequestBody(request);
    const nextState = updateDashboardState((state) => ({
      ...state,
      autoRunEnabled: Boolean(body.enabled)
    }));

    writeJson(response, 200, {
      autoRunEnabled: nextState.autoRunEnabled
    });
    return;
  }

  if (request.method === 'GET' && requestUrl.pathname.startsWith('/api/runs/')) {
    const [, , , runId, resource] = requestUrl.pathname.split('/');

    if (!runId) {
      writeJson(response, 400, { error: 'runId is required.' });
      return;
    }

    if (resource === 'logs') {
      const logs = readText(getRunLogPath(runId), '');
      response.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end(logs);
      return;
    }

    const summary = readRunSummary(runId);

    if (!summary) {
      writeJson(response, 404, { error: `Run ${runId} was not found.` });
      return;
    }

    writeJson(response, 200, summary);
    return;
  }

  writeJson(response, 404, {
    error: 'Route not found.'
  });
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
    'Content-Type': getContentType(assetPath)
  });
  response.end(fileBuffer);
}

function getContentType(filePath) {
  if (filePath.endsWith('.html')) {
    return 'text/html; charset=utf-8';
  }

  if (filePath.endsWith('.css')) {
    return 'text/css; charset=utf-8';
  }

  if (filePath.endsWith('.js')) {
    return 'application/javascript; charset=utf-8';
  }

  if (filePath.endsWith('.json')) {
    return 'application/json; charset=utf-8';
  }

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
