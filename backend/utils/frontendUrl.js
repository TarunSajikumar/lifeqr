function normalizeUrl(url = '') {
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed.replace(/\/+$/, '');
  }
  return `https://${trimmed}`;
}

function getFrontendUrl() {
  const envUrl = process.env.FRONTEND_URL || process.env.RENDER_EXTERNAL_URL;
  if (envUrl) {
    return normalizeUrl(envUrl);
  }

  if (process.env.NODE_ENV === 'production') {
    return `https://localhost:${process.env.PORT || 5000}`;
  }

  return `http://localhost:${process.env.PORT || 5000}`;
}

function isSecureUrl(url) {
  return /^https:\/\//i.test(url);
}

module.exports = {
  getFrontendUrl,
  isSecureUrl
};
