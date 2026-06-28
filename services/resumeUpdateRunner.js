const { prepareLatestResume } = require('./resumeManager');
const { captureNamedScreenshot } = require('../utils/screenshot');
const { logger } = require('../utils/logger');

async function runResumeUpdateFlow({
  homePage,
  profilePage,
  stopMonitor
}) {
  logger.info('==============================');
  logger.info('Resume Module Started');
  logger.info('Reading profile.json...');
  logger.info('Downloading Resume...');

  let preparedResume = null;

  try {
    await stopMonitor?.throwIfStopRequested?.();
    await homePage.navigateToProfile();

    preparedResume = await prepareLatestResume();

    logger.info(`Resume Source: ${toDisplaySource(preparedResume.source)}`);
    logger.info('Download Successful');
    logger.info('Temporary File Created');
    logger.info('Uploading Resume...');

    await stopMonitor?.throwIfStopRequested?.();
    const uploadedResumeInfo = await profilePage.uploadResume(preparedResume.localFilePath);

    logger.info('Resume Updated Successfully');

    return {
      module: 'Resume Update',
      status: 'completed',
      source: preparedResume.source,
      uploadedFileName: uploadedResumeInfo.fileName,
      uploadedOn: uploadedResumeInfo.uploadedOn,
      uploaded: true,
      skipped: false
    };
  } catch (error) {
    const isUploadFailure = preparedResume?.localFilePath;

    if (isUploadFailure) {
      const screenshotPath = await captureNamedScreenshot(
        profilePage.page,
        'resume-update-upload-failed'
      ).catch(() => '');

      logger.error(`Resume upload failed: ${error.message}`);

      return {
        module: 'Resume Update',
        status: 'skipped-upload-failed',
        source: preparedResume.source,
        uploaded: false,
        skipped: true,
        error: error.message,
        screenshotPath
      };
    }

    logger.error(`Resume download failed: ${error.message}`);

    return {
      module: 'Resume Update',
      status: 'skipped-download-failed',
      source: 'unknown',
      uploaded: false,
      skipped: true,
      error: error.message
    };
  } finally {
    if (preparedResume?.cleanup) {
      logger.info('Deleting Temporary File...');
      await preparedResume.cleanup().catch(() => {});
      logger.info('Temporary File Deleted');
    }

    logger.info('Resume Module Completed');
    logger.info('==============================');
  }
}

function toDisplaySource(source) {
  if (source === 'google-drive') {
    return 'Google Drive';
  }

  if (source === 'direct-url') {
    return 'Direct URL';
  }

  return String(source || 'Unknown');
}

module.exports = {
  runResumeUpdateFlow
};
