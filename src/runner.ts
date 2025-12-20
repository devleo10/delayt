import axios, { AxiosRequestConfig } from 'axios';
import { ApiEndpoint, RequestResult } from './types';

const REQUEST_TIMEOUT_MS = 30000; // 30 seconds

export class ApiRunner {
  /**
   * Sends exactly 50 sequential requests to an endpoint and measures latency.
   * Uses high-resolution timers (process.hrtime.bigint()) for accurate measurements.
   * Disables retries and sets timeouts as per requirements.
   */
  async runEndpoint(endpoint: ApiEndpoint): Promise<RequestResult[]> {
    const results: RequestResult[] = [];
    
    console.log(`Running 50 requests for ${endpoint.method} ${endpoint.url}`);

    for (let i = 0; i < 50; i++) {
      try {
        const result = await this.sendRequest(endpoint);
        results.push(result);
      } catch (error: any) {
        // Log failures instead of hiding them
        console.error(`Request ${i + 1}/50 failed for ${endpoint.url}:`, error.message);
        
        // Record failure as a result with error status
        results.push({
          endpoint: endpoint.url,
          method: endpoint.method,
          latency_ms: REQUEST_TIMEOUT_MS, // Use timeout as latency for failed requests
          request_size_bytes: this.calculateSize(endpoint.payload),
          response_size_bytes: 0,
          status_code: error.response?.status || 0,
        });
      }
    }

    return results;
  }

  /**
   * Sends a single request and measures latency using high-resolution timers.
   */
  private async sendRequest(endpoint: ApiEndpoint): Promise<RequestResult> {
    const config: AxiosRequestConfig = {
      method: endpoint.method,
      url: endpoint.url,
      timeout: REQUEST_TIMEOUT_MS,
      validateStatus: () => true, // Don't throw on any status code
      maxRedirects: 0, // Disable redirects
    };

    // Add payload for POST requests
    if (endpoint.method === 'POST' && endpoint.payload) {
      config.data = endpoint.payload;
    }

    // Calculate request size before sending
    const requestSize = this.calculateSize(endpoint.payload);

    // Use high-resolution timer (Node.js)
    const startTime = process.hrtime.bigint();
    
    const response = await axios(config);
    
    const endTime = process.hrtime.bigint();
    const latencyMs = Number(endTime - startTime) / 1_000_000; // Convert nanoseconds to milliseconds

    // Calculate response size
    const responseSize = this.calculateSize(response.data);

    return {
      endpoint: endpoint.url,
      method: endpoint.method,
      latency_ms: Math.round(latencyMs * 100) / 100, // Round to 2 decimal places
      request_size_bytes: requestSize,
      response_size_bytes: responseSize,
      status_code: response.status,
    };
  }

  /**
   * Calculates the size of a payload in bytes.
   */
  private calculateSize(data: any): number {
    if (!data) return 0;
    try {
      const jsonString = JSON.stringify(data);
      return Buffer.byteLength(jsonString, 'utf8');
    } catch {
      // Fallback: estimate based on string length
      return JSON.stringify(data).length;
    }
  }
}

