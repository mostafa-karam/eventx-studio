const crypto = require('crypto');
const request = require('supertest');

const createTestClient = (app, options = {}) => {
  const agent = request.agent(app);
  const rateLimitKey = options.rateLimitKey || crypto.randomUUID();

  const getCsrfToken = async () => {
    const response = await agent
      .get('/api/auth/csrf-token')
      .set('x-test-rate-limit-key', rateLimitKey);

    return response.body.csrfToken;
  };

  const csrfRequest = async (method, url, payload, headers = {}) => {
    const csrfToken = await getCsrfToken();
    let testRequest = agent[method](url)
      .set('x-csrf-token', csrfToken)
      .set('x-test-rate-limit-key', rateLimitKey);

    Object.entries(headers).forEach(([key, value]) => {
      testRequest = testRequest.set(key, value);
    });

    if (payload !== undefined) {
      testRequest = testRequest.send(payload);
    }

    return testRequest;
  };

  const requestWithRateLimitKey = (method, url) =>
    agent[method](url).set('x-test-rate-limit-key', rateLimitKey);

  return {
    agent,
    rateLimitKey,
    getCsrfToken,
    csrfRequest,
    requestWithRateLimitKey,
  };
};

module.exports = {
  createTestClient,
};
