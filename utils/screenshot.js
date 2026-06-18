const path = require('path');

function toSafeFileName(name) {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

async function captureNamedScreenshot(page, name) {
  const fileName = `${Date.now()}-${toSafeFileName(name)}.png`;
  const filePath = path.join('screenshots', fileName);

  await page.screenshot({
    path: filePath,
    fullPage: true
  });

  return filePath;
}

module.exports = {
  captureNamedScreenshot
};
