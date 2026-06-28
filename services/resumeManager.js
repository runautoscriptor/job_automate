const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const { loadCandidateProfile } = require('../utils/candidateProfile');

const TEMP_DIRECTORY_PATH = path.resolve(process.cwd(), 'temp');
const DEFAULT_RESUME_FILE_BASENAME = 'VikasKumarSingh_Resume';
const SUPPORTED_RESUME_EXTENSIONS = new Set(['.pdf', '.doc', '.docx', '.rtf']);

async function prepareLatestResume() {
  const profile = loadCandidateProfile({ fresh: true });
  const resumeConfig = profile.resume || {};
  const source = normalizeSource(resumeConfig.source);
  const downloadUrl = String(resumeConfig.downloadUrl || '').trim();

  if (!source) {
    throw new Error('Resume source is missing in profile/profile.json.');
  }

  if (!downloadUrl) {
    throw new Error('Resume downloadUrl is missing in profile/profile.json.');
  }

  if (!isSupportedResumeSource(source)) {
    throw new Error(`Resume source "${source}" is not supported yet.`);
  }

  fs.mkdirSync(TEMP_DIRECTORY_PATH, { recursive: true });

  const extension = detectResumeExtension(downloadUrl);
  const localFilePath = path.join(
    TEMP_DIRECTORY_PATH,
    buildTempResumeFileName(extension, resumeConfig.fileName)
  );

  removeFileIfExists(localFilePath);

  await downloadFile(downloadUrl, localFilePath);
  validateDownloadedResume(localFilePath);

  return {
    source,
    downloadUrl,
    localFilePath,
    cleanup: async () => {
      removeFileIfExists(localFilePath);
    }
  };
}

function buildTempResumeFileName(extension, configuredFileName) {
  const normalizedBaseName = sanitizeResumeBaseName(configuredFileName) || DEFAULT_RESUME_FILE_BASENAME;
  return `${normalizedBaseName}${extension}`;
}

function sanitizeResumeBaseName(value) {
  const normalizedValue = String(value || '').trim();

  if (!normalizedValue) {
    return '';
  }

  return normalizedValue.replace(/[<>:"/\\|?*\x00-\x1F]+/g, '_');
}

function getTempDirectoryPath() {
  return TEMP_DIRECTORY_PATH;
}

function isSupportedResumeSource(source) {
  return ['google-drive', 'https', 'direct-url'].includes(source);
}

function normalizeSource(source) {
  return String(source || '').trim().toLowerCase();
}

function detectResumeExtension(downloadUrl) {
  try {
    const parsedUrl = new URL(downloadUrl);
    const fileName = path.basename(parsedUrl.pathname);
    const extension = path.extname(fileName).toLowerCase();

    if (SUPPORTED_RESUME_EXTENSIONS.has(extension)) {
      return extension;
    }
  } catch (error) {
    // Ignore parsing issues here and fall back to pdf below.
  }

  return '.pdf';
}

function removeFileIfExists(filePath) {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

async function downloadFile(url, destinationPath, redirectCount = 0) {
  if (redirectCount > 5) {
    throw new Error('Resume download failed because too many redirects were encountered.');
  }

  const client = url.startsWith('http://') ? http : https;

  await new Promise((resolve, reject) => {
    const request = client.get(url, (response) => {
      if ([301, 302, 303, 307, 308].includes(response.statusCode) && response.headers.location) {
        const redirectedUrl = new URL(response.headers.location, url).toString();
        response.resume();
        downloadFile(redirectedUrl, destinationPath, redirectCount + 1).then(resolve).catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        response.resume();
        reject(
          new Error(`Resume download failed with status code ${response.statusCode}.`)
        );
        return;
      }

      const fileStream = fs.createWriteStream(destinationPath);
      response.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close(resolve);
      });

      fileStream.on('error', (error) => {
        fileStream.close(() => reject(error));
      });
    });

    request.on('error', reject);
  });
}

function validateDownloadedResume(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error('Resume download did not create a local file.');
  }

  const stats = fs.statSync(filePath);

  if (stats.size === 0) {
    throw new Error('Downloaded resume file is empty.');
  }

  const fileBuffer = fs.readFileSync(filePath);
  const fileStart = fileBuffer.subarray(0, 512).toString('utf8').toLowerCase();

  if (fileStart.includes('<html') || fileStart.includes('<!doctype html')) {
    throw new Error(
      'Resume download returned an HTML page instead of a resume file. Please verify the direct download URL in profile/profile.json.'
    );
  }
}

module.exports = {
  getTempDirectoryPath,
  prepareLatestResume
};
