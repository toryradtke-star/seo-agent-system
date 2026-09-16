module.exports = {
  maxResults: Number(process.env.SERP_MAX_RESULTS || 10),
  cacheTTLHours: Number(process.env.SERP_CACHE_TTL_HOURS || 24),
  requestTimeoutMs: Number(process.env.SERP_REQUEST_TIMEOUT_MS || 15000),
};
