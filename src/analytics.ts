import { RequestResult, PercentileStats, PayloadBucket } from './types';

export class Analytics {
  /**
   * Computes p50, p95, p99 percentiles per endpoint.
   * Percentiles are more meaningful than averages because they show
   * the distribution of latency, especially tail latency (p95, p99).
   */
  computePercentiles(results: RequestResult[]): PercentileStats[] {
    // Group results by endpoint and method
    const grouped = new Map<string, RequestResult[]>();
    
    for (const result of results) {
      const key = `${result.endpoint}|${result.method}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(result);
    }

    const stats: PercentileStats[] = [];

    for (const [key, endpointResults] of grouped.entries()) {
      const [endpoint, method] = key.split('|');
      
      // Sort latencies for percentile calculation
      const latencies = endpointResults
        .map(r => r.latency_ms)
        .sort((a, b) => a - b);

      const p50 = this.percentile(latencies, 50);
      const p95 = this.percentile(latencies, 95);
      const p99 = this.percentile(latencies, 99);

      // Calculate average payload size
      const avgPayloadSize = endpointResults.reduce(
        (sum, r) => sum + r.request_size_bytes,
        0
      ) / endpointResults.length;

      stats.push({
        endpoint,
        method,
        p50,
        p95,
        p99,
        avg_payload_size: Math.round(avgPayloadSize),
      });
    }

    // Rank by p95 descending (slowest first)
    return stats.sort((a, b) => b.p95 - a.p95);
  }

  /**
   * For POST requests, bucket payload sizes and compute p95 per bucket.
   */
  computePayloadBuckets(results: RequestResult[]): PayloadBucket[] {
    // Filter only POST requests
    const postResults = results.filter(r => r.method === 'POST');
    
    if (postResults.length === 0) {
      return [];
    }

    // Define buckets: 0-100, 100-500, 500-1000, 1000-5000, 5000+
    const bucketRanges = [
      [0, 100],
      [100, 500],
      [500, 1000],
      [1000, 5000],
      [5000, Infinity],
    ];

    const buckets: PayloadBucket[] = [];

    for (const [min, max] of bucketRanges) {
      const bucketResults = postResults.filter(
        r => r.request_size_bytes >= min && r.request_size_bytes < max
      );

      if (bucketResults.length > 0) {
        const latencies = bucketResults
          .map(r => r.latency_ms)
          .sort((a, b) => a - b);

        const p95 = this.percentile(latencies, 95);

        buckets.push({
          bucket_min: min,
          bucket_max: max === Infinity ? -1 : max, // Use -1 to represent infinity
          p95,
          count: bucketResults.length,
        });
      }
    }

    return buckets;
  }

  /**
   * Calculates the nth percentile from a sorted array.
   * Uses linear interpolation for more accurate results.
   */
  private percentile(sortedArray: number[], percentile: number): number {
    if (sortedArray.length === 0) return 0;
    if (sortedArray.length === 1) return sortedArray[0];

    const index = (percentile / 100) * (sortedArray.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;

    if (upper >= sortedArray.length) {
      return sortedArray[sortedArray.length - 1];
    }

    return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
  }
}

