import axios, { AxiosRequestConfig, AxiosError } from 'axios';
import { EndpointConfig, RequestResult, generateSlug } from '@delayt/shared';
import {
  insertRequestResult,
  createTestRun,
  updateTestRunStatus,
  isRunCancelled,
  markRunCancelled,
} from '@/lib/db/schema';

let waitUntilFn: ((promise: Promise<unknown>) => void) | null = null;

async function getWaitUntil(): Promise<((promise: Promise<unknown>) => void) | null> {
  if (waitUntilFn !== null) return waitUntilFn;
  try {
    const mod = await import('@vercel/functions');
    waitUntilFn = mod.waitUntil;
  } catch {
    waitUntilFn = null;
  }
  return waitUntilFn;
}

const REQUEST_TIMEOUT_MS = parseInt(
  process.env.REQUEST_TIMEOUT_MS || '30000',
  10
);
const DEFAULT_REQUEST_COUNT = parseInt(
  process.env.DEFAULT_REQUEST_COUNT || '15',
  10
);

const cancelledRuns = new Set<string>();

export function cancelRun(runId: string): void {
  cancelledRuns.add(runId);
  markRunCancelled(runId).catch(console.error);
}

interface RunOptions {
  runId?: string;
  requestCount?: number;
}

async function makeRequest(
  endpoint: EndpointConfig,
  requestNumber: number,
  totalRequests: number,
  runId?: string
): Promise<RequestResult> {
  const startTime = process.hrtime.bigint();
  let latency_ms = 0;
  let request_size_bytes = 0;
  let response_size_bytes = 0;
  let status_code = 0;
  let error_message: string | undefined;

  try {
    if (
      ['POST', 'PUT', 'PATCH'].includes(endpoint.method) &&
      endpoint.payload
    ) {
      request_size_bytes = Buffer.byteLength(
        JSON.stringify(endpoint.payload),
        'utf8'
      );
    } else {
      request_size_bytes = 0;
    }

    const config: AxiosRequestConfig = {
      method: endpoint.method,
      url: endpoint.url,
      timeout: REQUEST_TIMEOUT_MS,
      validateStatus: () => true,
    };

    if (endpoint.headers && Object.keys(endpoint.headers).length > 0) {
      config.headers = { ...endpoint.headers };
    }

    if (
      ['POST', 'PUT', 'PATCH'].includes(endpoint.method) &&
      endpoint.payload
    ) {
      config.data = endpoint.payload;
      config.headers = {
        ...(config.headers || {}),
        'Content-Type': 'application/json',
      };
    }

    const response = await axios(config);

    const endTime = process.hrtime.bigint();
    latency_ms = Number(endTime - startTime) / 1_000_000;

    if (response.data) {
      if (typeof response.data === 'string') {
        response_size_bytes = Buffer.byteLength(response.data, 'utf8');
      } else {
        response_size_bytes = Buffer.byteLength(
          JSON.stringify(response.data),
          'utf8'
        );
      }
    } else {
      response_size_bytes = 0;
    }

    status_code = response.status;

    console.log(
      `[${requestNumber}/${totalRequests}] ${endpoint.method} ${endpoint.url} - ` +
        `${status_code} - ${latency_ms.toFixed(2)}ms`
    );
  } catch (error) {
    const endTime = process.hrtime.bigint();
    latency_ms = Number(endTime - startTime) / 1_000_000;

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;

      if (axiosError.response) {
        status_code = axiosError.response.status;
        if (axiosError.response.data) {
          if (typeof axiosError.response.data === 'string') {
            response_size_bytes = Buffer.byteLength(
              axiosError.response.data,
              'utf8'
            );
          } else {
            response_size_bytes = Buffer.byteLength(
              JSON.stringify(axiosError.response.data),
              'utf8'
            );
          }
        }
      } else if (axiosError.request) {
        status_code = 0;
        error_message = `Request timeout or network error: ${error.message}`;
        console.error(
          `[${requestNumber}/${totalRequests}] ${endpoint.method} ${endpoint.url} - ${error_message}`
        );
      } else {
        status_code = 0;
        error_message = `Request setup error: ${error.message}`;
        console.error(
          `[${requestNumber}/${totalRequests}] ${endpoint.method} ${endpoint.url} - ${error_message}`
        );
      }
    } else {
      status_code = 0;
      error_message = `Unknown error: ${error instanceof Error ? error.message : String(error)}`;
      console.error(
        `[${requestNumber}/${totalRequests}] ${endpoint.method} ${endpoint.url} - ${error_message}`
      );
    }
  }

  return {
    endpoint: endpoint.url,
    method: endpoint.method,
    latency_ms,
    request_size_bytes,
    response_size_bytes,
    status_code,
    error_message,
    run_id: runId,
  };
}

export async function createAndStartRun(
  endpoints: EndpointConfig[],
  requestCount: number = DEFAULT_REQUEST_COUNT
): Promise<{ runId: string; slug: string }> {
  const runId = `run_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const slug = generateSlug(8);

  await createTestRun(runId, slug, endpoints, requestCount);

  const runPromise = runEndpointTests(endpoints, { runId, requestCount }).catch(
    (error) => {
      console.error('Error running endpoint tests:', error);
      updateTestRunStatus(runId, 'failed').catch(console.error);
    }
  );

  const waitUntil = await getWaitUntil();
  if (waitUntil) {
    waitUntil(runPromise);
  } else {
    runPromise.catch(console.error);
  }

  return { runId, slug };
}

export async function runEndpointTests(
  endpoints: EndpointConfig[],
  options: RunOptions = {}
): Promise<void> {
  const { runId, requestCount = DEFAULT_REQUEST_COUNT } = options;

  console.log(
    `Starting tests for ${endpoints.length} endpoint(s) - ${requestCount} requests each`
  );

  if (runId) {
    await updateTestRunStatus(runId, 'running');
  }

  try {
    for (const endpoint of endpoints) {
      console.log(`\nTesting endpoint: ${endpoint.method} ${endpoint.url}`);

      for (let i = 1; i <= requestCount; i++) {
        if (
          runId &&
          (cancelledRuns.has(runId) || (await isRunCancelled(runId)))
        ) {
          console.log(`Run ${runId} was cancelled. Stopping.`);
          cancelledRuns.delete(runId);
          await updateTestRunStatus(runId, 'failed');
          return;
        }

        const result = await makeRequest(endpoint, i, requestCount, runId);

        try {
          await insertRequestResult(result);
        } catch (dbError) {
          console.error(`Failed to store result in database:`, dbError);
        }
      }

      console.log(
        `Completed ${requestCount} requests for ${endpoint.method} ${endpoint.url}`
      );
    }

    console.log('\nAll endpoint tests completed');

    if (runId) {
      await updateTestRunStatus(runId, 'completed');
    }
  } catch (error) {
    console.error('Test run failed:', error);
    if (runId) {
      await updateTestRunStatus(runId, 'failed');
    }
    throw error;
  }
}