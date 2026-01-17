"use strict";
// ============================================
// DELAYR - Shared Types & Utilities
// ============================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSlug = generateSlug;
exports.formatLatency = formatLatency;
exports.formatBytes = formatBytes;
exports.getLatencyColor = getLatencyColor;
exports.calculatePercentageChange = calculatePercentageChange;
// ============================================
// Utility Functions
// ============================================
function generateSlug(length = 8) {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}
function formatLatency(ms) {
    if (ms < 1)
        return `${ms.toFixed(3)}ms`;
    if (ms < 1000)
        return `${ms.toFixed(2)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
}
function formatBytes(bytes) {
    if (bytes < 1024)
        return `${bytes}B`;
    if (bytes < 1024 * 1024)
        return `${(bytes / 1024).toFixed(2)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
}
function getLatencyColor(p95) {
    if (p95 < 100)
        return 'green';
    if (p95 < 500)
        return 'yellow';
    return 'red';
}
function calculatePercentageChange(baseline, current) {
    if (baseline === 0)
        return current === 0 ? 0 : 100;
    return ((current - baseline) / baseline) * 100;
}
