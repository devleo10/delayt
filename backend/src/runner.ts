import axios, { AxiosRequestConfig, AxiosError } from 'axios';
import { EndpointConfig, RequestResult, generateSlug } from './types';
import { 
  insertRequestResult, 
  createTestRun, 
  updateTestRunStatus,
  getRequestCountForRun
} from './db/schema';

const REQUEST_TIMEOUT_MS = parseInt(process.env.REQUEST_TIMEOUT_MS || '30000', 10);
const DEFAULT_REQUEST_COUNT = parseInt(process.env.DEFAULT_REQUEST_COUNT || '50', 10);

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
    // Calculate request size
    if (['POST', 'PUT', 'PATCH'].includes(endpoint.method) && endpoint.payload) {
      request_size_bytes = Buffer.byteLength(JSON.stringify(endpoint.payload), 'utf8');
    } else {
      request_size_bytes = 0;
    }

    // Configure axios request
    const config: AxiosRequestConfig = {
      method: endpoint.method,
      url: endpoint.url,
      timeout: REQUEST_TIMEOUT_MS,
      validateStatus: () => true, // Don't throw on any status code
    };

    // Add custom headers if provided
    if (endpoint.headers && Object.keys(endpoint.headers).length > 0) {
      config.headers = { ...endpoint.headers };
    }

    if (['POST', 'PUT', 'PATCH'].includes(endpoint.method) && endpoint.payload) {
      config.data = endpoint.payload;
      config.headers = {
        ...(config.headers || {}),
        'Content-Type': 'application/json',
      };
    }

    // Make the request
    const response = await axios(config);
    
    // Calculate latency
    const endTime = process.hrtime.bigint();
    latency_ms = Number(endTime - startTime) / 1_000_000; // Convert nanoseconds to milliseconds

    // Get response size
    if (response.data) {
      if (typeof response.data === 'string') {
        response_size_bytes = Buffer.byteLength(response.data, 'utf8');
      } else {
        response_size_bytes = Buffer.byteLength(JSON.stringify(response.data), 'utf8');
      }
    } else {
      response_size_bytes = 0;
    }

    status_code = response.status;

    // Log success
    console.log(
      `[${requestNumber}/${totalRequests}] ${endpoint.method} ${endpoint.url} - ` +
      `${status_code} - ${latency_ms.toFixed(2)}ms`
    );
  } catch (error) {
    // Calculate latency even on error
    const endTime = process.hrtime.bigint();
    latency_ms = Number(endTime - startTime) / 1_000_000;

    // Handle different error types
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      
      if (axiosError.response) {
        // Got response with error status
        status_code = axiosError.response.status;
        if (axiosError.response.data) {
          if (typeof axiosError.response.data === 'string') {
            response_size_bytes = Buffer.byteLength(axiosError.response.data, 'utf8');
          } else {
            response_size_bytes = Buffer.byteLength(
              JSON.stringify(axiosError.response.data),
              'utf8'
            );
          }
        }
      } else if (axiosError.request) {
        // Request made but no response (timeout, network error)
        status_code = 0; // Use 0 to indicate network/timeout error
        error_message = `Request timeout or network error: ${error.message}`;
        console.error(
          `[${requestNumber}/${totalRequests}] ${endpoint.method} ${endpoint.url} - ${error_message}`
        );
      } else {
        // Error setting up request
        status_code = 0;
        error_message = `Request setup error: ${error.message}`;
        console.error(
          `[${requestNumber}/${totalRequests}] ${endpoint.method} ${endpoint.url} - ${error_message}`
        );
      }
    } else {
      // Unknown error
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

// ============================================
// Create and start a new test run
// ============================================

export async function createAndStartRun(
  endpoints: EndpointConfig[],
  requestCount: number = DEFAULT_REQUEST_COUNT
): Promise<{ runId: string; slug: string }> {
  const runId = `run_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const slug = generateSlug(8);

  await createTestRun(runId, slug, endpoints, requestCount);
  
  // Start tests asynchronously
  runEndpointTests(endpoints, { runId, requestCount }).catch((error) => {
    console.error('Error running endpoint tests:', error);
    updateTestRunStatus(runId, 'failed').catch(console.error);
  });

  return { runId, slug };
}

// ============================================
// Main test runner
// ============================================

export async function runEndpointTests(
  endpoints: EndpointConfig[],
  options: RunOptions = {}
): Promise<void> {
  const { runId, requestCount = DEFAULT_REQUEST_COUNT } = options;
  
  console.log(`Starting tests for ${endpoints.length} endpoint(s) - ${requestCount} requests each`);
  
  if (runId) {
    await updateTestRunStatus(runId, 'running');
  }

  try {
    for (const endpoint of endpoints) {
      console.log(`\nTesting endpoint: ${endpoint.method} ${endpoint.url}`);

      for (let i = 1; i <= requestCount; i++) {
        const result = await makeRequest(endpoint, i, requestCount, runId);
        
        // Store result in database immediately
        try {
          await insertRequestResult(result);
        } catch (dbError) {
          console.error(`Failed to store result in database:`, dbError);
          // Continue execution even if DB write fails
        }
      }

      console.log(`Completed ${requestCount} requests for ${endpoint.method} ${endpoint.url}`);
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


