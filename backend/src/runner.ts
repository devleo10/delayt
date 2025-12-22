import axios, { AxiosRequestConfig, AxiosError } from 'axios';
import { EndpointConfig, RequestResult } from './types';
import { insertRequestResult } from './db/schema';

const REQUEST_TIMEOUT_MS = parseInt(process.env.REQUEST_TIMEOUT_MS || '30000', 10);

async function makeRequest(
  endpoint: EndpointConfig,
  requestNumber: number
): Promise<RequestResult> {
  const startTime = process.hrtime.bigint();
  let latency_ms = 0;
  let request_size_bytes = 0;
  let response_size_bytes = 0;
  let status_code = 0;

  try {
    // Calculate request size
    if (endpoint.method === 'POST' && endpoint.payload) {
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

    if (endpoint.method === 'POST' && endpoint.payload) {
      config.data = endpoint.payload;
      config.headers = {
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
      `[${requestNumber}/50] ${endpoint.method} ${endpoint.url} - ` +
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
        console.error(
          `[${requestNumber}/50] ${endpoint.method} ${endpoint.url} - ` +
          `Request timeout or network error: ${error.message}`
        );
      } else {
        // Error setting up request
        status_code = 0;
        console.error(
          `[${requestNumber}/50] ${endpoint.method} ${endpoint.url} - ` +
          `Request setup error: ${error.message}`
        );
      }
    } else {
      // Unknown error
      status_code = 0;
      console.error(
        `[${requestNumber}/50] ${endpoint.method} ${endpoint.url} - ` +
        `Unknown error: ${error instanceof Error ? error.message : String(error)}`
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
  };
}

export async function runEndpointTests(endpoints: EndpointConfig[]): Promise<void> {
  console.log(`Starting tests for ${endpoints.length} endpoint(s)`);

  for (const endpoint of endpoints) {
    console.log(`\nTesting endpoint: ${endpoint.method} ${endpoint.url}`);

    for (let i = 1; i <= 50; i++) {
      const result = await makeRequest(endpoint, i);
      
      // Store result in database immediately
      try {
        await insertRequestResult(result);
      } catch (dbError) {
        console.error(`Failed to store result in database:`, dbError);
        // Continue execution even if DB write fails
      }
    }

    console.log(`Completed 50 requests for ${endpoint.method} ${endpoint.url}`);
  }

  console.log('\nAll endpoint tests completed');
}


