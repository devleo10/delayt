# API Latency Visualizer

An MVP tool for visualizing API latency using percentile analysis (p50, p95, p99) instead of averages. Built with Node.js, TypeScript, PostgreSQL, and React.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-18%2B-green.svg)
![TypeScript](https://img.shields.io/badge/typescript-5.3-blue.svg)

## 🎯 Why Percentiles Matter

**The Problem with Averages:**
- Averages hide outliers. An API with 99 requests at 10ms and 1 request at 10 seconds has an average of ~200ms, which doesn't reflect the user experience.
- Real-world latency follows a long-tail distribution where a small percentage of requests take much longer.

**Why p95 and p99 Matter:**
- **p50 (median)**: Half of your requests are faster than this. Good baseline, but doesn't show worst-case.
- **p95**: 95% of requests are faster than this. This is what most users experience. Critical for SLA monitoring.
- **p99**: 99% of requests are faster than this. Shows your worst-case performance for almost all users.

**Example:**
If your API has:
- Average: 50ms
- p95: 500ms
- p99: 2000ms

This tells you that while most requests are fast (average 50ms), 5% of users experience 500ms+ latency, and 1% experience 2+ seconds. This is critical information that averages hide.

## 🏗️ Architecture

Clear separation of concerns:
- **Runner** (`src/runner.ts`): Sends 50 sequential requests per endpoint, measures latency using high-resolution timers
- **Storage** (`src/storage.ts`): Saves raw request data to Postgres
- **Analytics** (`src/analytics.ts`): Computes percentiles and payload bucket analysis

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 12+
- npm or yarn

### Installation

1. **Clone the repository:**
```bash
git clone https://github.com/devleo10/delayt.git
cd delayt
```

2. **Install backend dependencies:**
```bash
npm install
```

3. **Install frontend dependencies:**
```bash
cd client
npm install
cd ..
```

4. **Set up PostgreSQL:**
```sql
CREATE DATABASE latency_visualizer;
```

5. **Configure environment variables (optional):**
Create a `.env` file in the root directory:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=latency_visualizer
DB_USER=postgres
DB_PASSWORD=postgres
PORT=3001
```

6. **Run database migration:**
```bash
npm run build
npm run migrate
```

### Running the Application

1. **Start the backend server:**
```bash
npm run dev
```

2. **Start the frontend (in a new terminal):**
```bash
npm run client
# or
cd client && npm start
```

3. **Open your browser:**
Navigate to `http://localhost:3000`

## 📖 Usage

1. **Add API endpoints:**
   - Enter endpoints in the text area, one per line
   - Format: `METHOD URL [PAYLOAD for POST]`
   - Examples:
     ```
     GET https://api.github.com/users/octocat
     POST https://jsonplaceholder.typicode.com/posts {"title": "test"}
     ```

2. **Run tests:**
   - Click "Run Tests" - this sends exactly 50 sequential requests per endpoint
   - Results are stored in Postgres

3. **View analytics:**
   - Table shows: endpoint, method, p50, p95, p99, avg payload size
   - Endpoints are ranked by p95 (slowest first)
   - Slow endpoints (p95 > 1000ms) are highlighted
   - Chart shows payload size vs latency for POST requests

## ✨ Features

- ✅ Exactly 50 sequential requests per endpoint
- ✅ High-resolution latency measurement (nanosecond precision using `process.hrtime.bigint()`)
- ✅ Records: endpoint, method, latency_ms, request_size_bytes, response_size_bytes, status_code
- ✅ Percentile analysis (p50, p95, p99) - no averages as primary metric
- ✅ Payload size bucketing for POST requests
- ✅ Request timeouts (30 seconds)
- ✅ No retries (failures are logged and recorded)
- ✅ Single-page React UI with table and chart visualization
- ✅ Slow endpoint highlighting

## 🔌 API Endpoints

### `POST /api/test`
Submit endpoints to test.

**Request:**
```json
{
  "endpoints": [
    {"url": "https://api.example.com", "method": "GET"},
    {"url": "https://api.example.com/data", "method": "POST", "payload": {"key": "value"}}
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Tests completed"
}
```

### `GET /api/analytics`
Get percentile statistics and payload buckets.

**Response:**
```json
{
  "percentileStats": [
    {
      "endpoint": "https://api.example.com",
      "method": "GET",
      "p50": 45.2,
      "p95": 120.5,
      "p99": 250.8,
      "avg_payload_size": 0
    }
  ],
  "payloadBuckets": [
    {
      "bucket_min": 0,
      "bucket_max": 100,
      "p95": 85.3,
      "count": 150
    }
  ]
}
```

## 📁 Project Structure

```
.
├── src/
│   ├── runner.ts          # Request execution and latency measurement
│   ├── storage.ts         # Postgres data persistence
│   ├── analytics.ts       # Percentile and bucket calculations
│   ├── server.ts          # Express API server
│   ├── types.ts           # TypeScript type definitions
│   └── migrations/
│       └── migrate.ts     # Database schema
├── client/
│   ├── src/
│   │   ├── App.tsx        # React frontend
│   │   ├── App.css        # Styles
│   │   └── types.ts       # Frontend type definitions
│   └── package.json
├── package.json
├── tsconfig.json
├── .gitignore
└── README.md
```

## 🛠️ Development

### Build
```bash
npm run build
```

### Run migrations
```bash
npm run migrate
```

### Development mode
```bash
# Backend (with hot reload)
npm run dev

# Frontend (with hot reload)
npm run client
```

## 📊 Database Schema

```sql
CREATE TABLE api_requests (
  id SERIAL PRIMARY KEY,
  endpoint VARCHAR(500) NOT NULL,
  method VARCHAR(10) NOT NULL,
  latency_ms NUMERIC(10, 2) NOT NULL,
  request_size_bytes INTEGER NOT NULL,
  response_size_bytes INTEGER NOT NULL,
  status_code INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## ⚠️ Limitations (By Design - MVP Scope)

- No authentication
- No live monitoring
- No distributed tracing
- No background agents
- Sequential requests only (not parallel)
- Fixed 50 requests per endpoint
- No historical comparison

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

MIT License - see LICENSE file for details

## 👤 Author

**devleo10**
- GitHub: [@devleo10](https://github.com/devleo10)

## 🙏 Acknowledgments

- Built with [React](https://reactjs.org/)
- Charts powered by [Recharts](https://recharts.org/)
- Backend built with [Express](https://expressjs.com/)
- Database: [PostgreSQL](https://www.postgresql.org/)
