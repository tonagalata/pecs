// Extends app.json. The Docker build sets EXPO_BASE_URL=/app so the web board is exported to be
// served under /app/ on Tona Deploy. Native builds and `expo start` are unaffected.
module.exports = ({ config }) => ({
  ...config,
  experiments: {
    ...config.experiments,
    ...(process.env.EXPO_BASE_URL ? { baseUrl: process.env.EXPO_BASE_URL } : {}),
  },
});
