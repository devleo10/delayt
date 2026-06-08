'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const {
  computePercentiles,
  buildAnalyticsResult,
  validateRunRequest,
  checkTargetUrl,
  normalizeTargetUrl,
} = require('../dist/index.js');

describe('computePercentiles', () => {
  it('returns median for odd-length data', () => {
    const p = computePercentiles([10, 20, 30, 40, 50], [50]);
    assert.equal(p[50], 30);
  });

  it('interpolates p95', () => {
    const data = Array.from({ length: 20 }, (_, i) => (i + 1) * 10);
    const p = computePercentiles(data, [95]);
    assert.ok(p[95] >= 180 && p[95] <= 200);
  });
});

describe('buildAnalyticsResult', () => {
  it('computes success rate from status codes', () => {
    const result = buildAnalyticsResult('https://example.com', 'GET', [
      { latencyMs: 50, statusCode: 200 },
      { latencyMs: 60, statusCode: 200 },
      { latencyMs: 100, statusCode: 500 },
    ]);
    assert.equal(result.request_count, 3);
    assert.equal(result.error_count, 1);
    assert.ok(result.success_rate < 100);
    assert.ok(result.p95 >= 60);
  });
});

describe('validateRunRequest', () => {
  it('rejects empty endpoints', () => {
    const v = validateRunRequest({ endpoints: [] });
    assert.equal(v.valid, false);
  });

  it('rejects count above max', () => {
    const v = validateRunRequest(
      {
        endpoints: [{ url: 'https://example.com', method: 'GET' }],
        requestCount: 500,
      },
      { maxRequestCount: 200 }
    );
    assert.equal(v.valid, false);
  });

  it('accepts valid payload', () => {
    const v = validateRunRequest(
      {
        endpoints: [{ url: 'https://example.com/health', method: 'GET' }],
        requestCount: 15,
      },
      { maxRequestCount: 20, defaultRequestCount: 15 }
    );
    assert.equal(v.valid, true);
    assert.equal(v.count, 15);
  });

  it('rejects localhost when blockPrivateTargets is enabled', () => {
    const v = validateRunRequest(
      {
        endpoints: [{ url: 'http://localhost:5000', method: 'GET' }],
        requestCount: 15,
      },
      { maxRequestCount: 20, blockPrivateTargets: true }
    );
    assert.equal(v.valid, false);
    assert.match(v.message, /localhost/i);
  });
});

describe('checkTargetUrl', () => {
  it('normalizes bare hostnames', () => {
    assert.equal(normalizeTargetUrl('api.example.com/health'), 'https://api.example.com/health');
    assert.equal(normalizeTargetUrl('localhost:5000'), 'http://localhost:5000');
  });

  it('blocks private targets when configured', () => {
    const check = checkTargetUrl('http://127.0.0.1:5000', { blockPrivateTargets: true });
    assert.equal(check.allowed, false);
  });

  it('allows public URLs when blocking is enabled', () => {
    const check = checkTargetUrl('https://api.example.com/health', {
      blockPrivateTargets: true,
    });
    assert.equal(check.allowed, true);
  });
});
