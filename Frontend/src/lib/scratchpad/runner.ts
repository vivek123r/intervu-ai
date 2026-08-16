"use client";

export interface ExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  executionTimeMs: number;
}

export interface SqlQueryResult {
  success: boolean;
  columns: string[];
  rows: Array<Record<string, unknown>>;
  rowCount: number;
  executionTimeMs: number;
  error?: string;
}

/**
 * Pre-populated in-memory relational database tables for SQL practice.
 */
export const MOCK_DATABASE_SCHEMA: Record<string, Array<Record<string, unknown>>> = {
  users: [
    { id: "usr_1", name: "Alex Morgan", email: "alex@example.com", role: "admin", department: "Engineering", created_at: "2024-01-15" },
    { id: "usr_2", name: "Sarah Chen", email: "sarah@example.com", role: "engineer", department: "Engineering", created_at: "2024-02-01" },
    { id: "usr_3", name: "Marcus Vance", email: "marcus@example.com", role: "lead", department: "Product", created_at: "2024-02-18" },
    { id: "usr_4", name: "Elena Rostova", email: "elena@example.com", role: "engineer", department: "Infrastructure", created_at: "2024-03-05" },
    { id: "usr_5", name: "David Kim", email: "david@example.com", role: "analyst", department: "Data", created_at: "2024-03-22" },
  ],
  orders: [
    { id: "ord_101", user_id: "usr_1", amount: 450.0, status: "completed", created_at: "2024-04-01" },
    { id: "ord_102", user_id: "usr_2", amount: 120.5, status: "completed", created_at: "2024-04-02" },
    { id: "ord_103", user_id: "usr_1", amount: 890.0, status: "completed", created_at: "2024-04-03" },
    { id: "ord_104", user_id: "usr_4", amount: 310.0, status: "pending", created_at: "2024-04-04" },
    { id: "ord_105", user_id: "usr_3", amount: 75.0, status: "refunded", created_at: "2024-04-05" },
    { id: "ord_106", user_id: "usr_2", amount: 620.0, status: "completed", created_at: "2024-04-06" },
  ],
  services: [
    { name: "auth-service", instances: 4, memory_mb: 512, cpu_percent: 24, status: "healthy" },
    { name: "api-gateway", instances: 6, memory_mb: 1024, cpu_percent: 48, status: "healthy" },
    { name: "payment-worker", instances: 2, memory_mb: 2048, cpu_percent: 82, status: "warning" },
    { name: "notification-queue", instances: 3, memory_mb: 512, cpu_percent: 15, status: "healthy" },
  ],
};

/**
 * Runs JavaScript/TypeScript code safely in client sandbox, capturing console output.
 */
export function runCodeSandbox(code: string): ExecutionResult {
  const start = performance.now();
  const logs: string[] = [];

  const mockConsole = {
    log: (...args: unknown[]) => {
      logs.push(args.map((a) => (typeof a === "object" ? JSON.stringify(a, null, 2) : String(a))).join(" "));
    },
    error: (...args: unknown[]) => {
      logs.push("[ERROR] " + args.map((a) => (typeof a === "object" ? JSON.stringify(a, null, 2) : String(a))).join(" "));
    },
    warn: (...args: unknown[]) => {
      logs.push("[WARN] " + args.map((a) => (typeof a === "object" ? JSON.stringify(a, null, 2) : String(a))).join(" "));
    },
    info: (...args: unknown[]) => {
      logs.push("[INFO] " + args.map((a) => (typeof a === "object" ? JSON.stringify(a, null, 2) : String(a))).join(" "));
    },
  };

  try {
    // Strip TypeScript type annotations for basic JS evaluation if needed
    const cleanCode = code
      .replace(/:\s*(string|number|boolean|any|void|unknown|never|Record<[^>]+>|Array<[^>]+>|[A-Z][a-zA-Z0-9_<>]*)/g, "")
      .replace(/interface\s+[A-Z][a-zA-Z0-9_]*\s*\{[^}]*\}/g, "");

    // Create execution scope with isolated console
    const executor = new Function("console", cleanCode);
    const result = executor(mockConsole);

    if (result !== undefined) {
      logs.push("=> Return: " + (typeof result === "object" ? JSON.stringify(result, null, 2) : String(result)));
    }

    const elapsed = Math.round((performance.now() - start) * 10) / 10;
    return {
      success: true,
      output: logs.length ? logs.join("\n") : "Code executed successfully with no output.",
      executionTimeMs: elapsed,
    };
  } catch (err) {
    const elapsed = Math.round((performance.now() - start) * 10) / 10;
    return {
      success: false,
      output: logs.join("\n"),
      error: err instanceof Error ? `${err.name}: ${err.message}` : "Execution error occurred.",
      executionTimeMs: elapsed,
    };
  }
}

/**
 * Lightweight SQL query parser & executor over in-memory tables.
 */
export function runSqlQuery(query: string): SqlQueryResult {
  const start = performance.now();
  const trimmed = query.trim().replace(/;+$/, "");

  if (!trimmed) {
    return {
      success: false,
      columns: [],
      rows: [],
      rowCount: 0,
      executionTimeMs: 0,
      error: "Query is empty.",
    };
  }

  // Detect simple SELECT ... FROM <table>
  const selectMatch = trimmed.match(/^SELECT\s+(.+?)\s+FROM\s+([a-zA-Z0-9_]+)(?:\s+WHERE\s+(.+?))?(?:\s+ORDER BY\s+(.+?))?(?:\s+LIMIT\s+(\d+))?$/i);

  if (!selectMatch) {
    // Handle SHOW TABLES / DESCRIBE
    if (/^SHOW\s+TABLES/i.test(trimmed)) {
      const tables = Object.keys(MOCK_DATABASE_SCHEMA).map((name) => ({ table_name: name, rows: MOCK_DATABASE_SCHEMA[name]?.length ?? 0 }));
      return {
        success: true,
        columns: ["table_name", "rows"],
        rows: tables,
        rowCount: tables.length,
        executionTimeMs: Math.round((performance.now() - start) * 10) / 10,
      };
    }

    return {
      success: false,
      columns: [],
      rows: [],
      rowCount: 0,
      executionTimeMs: Math.round((performance.now() - start) * 10) / 10,
      error: "Syntax error or unsupported SQL clause. Supports: SELECT [cols|*] FROM [table] WHERE [col = 'val'] ORDER BY [col] LIMIT [N]",
    };
  }

  const selectClause = selectMatch[1] ?? "*";
  const tableName = selectMatch[2] ?? "";
  const whereClause = selectMatch[3];
  const orderByClause = selectMatch[4];
  const limitClause = selectMatch[5];

  const table = MOCK_DATABASE_SCHEMA[tableName.toLowerCase()];

  if (!table) {
    return {
      success: false,
      columns: [],
      rows: [],
      rowCount: 0,
      executionTimeMs: Math.round((performance.now() - start) * 10) / 10,
      error: `Table '${tableName}' does not exist. Available tables: ${Object.keys(MOCK_DATABASE_SCHEMA).join(", ")}`,
    };
  }

  let resultRows = [...table];

  // Apply basic WHERE clause: `col = 'val'` or `col > num`
  if (whereClause) {
    const conditionMatch = whereClause.match(/([a-zA-Z0-9_]+)\s*(=|!=|>|<|>=|<=|LIKE)\s*['"]?([^'"]+)['"]?/i);
    if (conditionMatch) {
      const col = conditionMatch[1];
      const op = conditionMatch[2] ?? "=";
      const val = conditionMatch[3] ?? "";
      if (col) {
        resultRows = resultRows.filter((row) => {
          const cellValue = row[col];
          if (cellValue === undefined) return false;

          const targetValue = isNaN(Number(val)) ? val : Number(val);
          const actualValue = isNaN(Number(cellValue)) ? cellValue : Number(cellValue);

          switch (op.toUpperCase()) {
            case "=":
              return String(actualValue).toLowerCase() === String(targetValue).toLowerCase();
            case "!=":
              return String(actualValue).toLowerCase() !== String(targetValue).toLowerCase();
            case ">":
              return Number(actualValue) > Number(targetValue);
            case "<":
              return Number(actualValue) < Number(targetValue);
            case ">=":
              return Number(actualValue) >= Number(targetValue);
            case "<=":
              return Number(actualValue) <= Number(targetValue);
            case "LIKE":
              return String(actualValue).toLowerCase().includes(String(targetValue).toLowerCase().replace(/%/g, ""));
            default:
              return true;
          }
        });
      }
    }
  }

  // Apply ORDER BY
  if (orderByClause) {
    const [orderCol, orderDir] = orderByClause.trim().split(/\s+/);
    if (orderCol) {
      const isDesc = orderDir?.toUpperCase() === "DESC";
      resultRows.sort((a, b) => {
        const valA = (a[orderCol] as string | number) ?? "";
        const valB = (b[orderCol] as string | number) ?? "";
        if (valA < valB) return isDesc ? 1 : -1;
        if (valA > valB) return isDesc ? -1 : 1;
        return 0;
      });
    }
  }

  // Apply LIMIT
  if (limitClause) {
    const limit = parseInt(limitClause, 10);
    if (!isNaN(limit)) {
      resultRows = resultRows.slice(0, limit);
    }
  }

  // Select columns
  let columns: string[] = [];
  if (selectClause.trim() === "*") {
    columns = Object.keys(table[0] || {});
  } else {
    columns = selectClause.split(",").map((c) => c.trim().replace(/^`|`$/g, ""));
    resultRows = resultRows.map((row) => {
      const filtered: Record<string, unknown> = {};
      for (const col of columns) {
        filtered[col] = row[col];
      }
      return filtered;
    });
  }

  const elapsed = Math.round((performance.now() - start) * 10) / 10;
  return {
    success: true,
    columns,
    rows: resultRows,
    rowCount: resultRows.length,
    executionTimeMs: elapsed,
  };
}

/**
 * Pre-built starter templates for live interview questions.
 */
export const STARTER_TEMPLATES = {
  lru_cache: {
    name: "LRU Cache Implementation",
    language: "typescript",
    type: "code" as const,
    code: `class LRUCache<K, V> {
  private capacity: number;
  private cache: Map<K, V>;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.cache = new Map();
  }

  get(key: K): V | null {
    if (!this.cache.has(key)) return null;
    const value = this.cache.get(key)!;
    // Re-insert to refresh recency
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  put(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.capacity) {
      // Evict oldest (first item in Map iterator)
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) this.cache.delete(oldestKey);
    }
    this.cache.set(key, value);
  }
}

// Test validation
const lru = new LRUCache(2);
lru.put("a", 100);
lru.put("b", 200);
console.log("Get 'a':", lru.get("a")); // 100
lru.put("c", 300); // evicts 'b'
console.log("Get 'b' (evicted):", lru.get("b")); // null
console.log("Get 'c':", lru.get("c")); // 300
`,
  },
  rate_limiter: {
    name: "Token Bucket Rate Limiter",
    language: "typescript",
    type: "code" as const,
    code: `class TokenBucketRateLimiter {
  private capacity: number;
  private refillRatePerSec: number;
  private tokens: number;
  private lastRefill: number;

  constructor(capacity: number, refillRatePerSec: number) {
    this.capacity = capacity;
    this.refillRatePerSec = refillRatePerSec;
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  private refill(): void {
    const now = Date.now();
    const elapsedSeconds = (now - this.lastRefill) / 1000;
    const addedTokens = elapsedSeconds * this.refillRatePerSec;
    this.tokens = Math.min(this.capacity, this.tokens + addedTokens);
    this.lastRefill = now;
  }

  allowRequest(tokensRequired = 1): boolean {
    this.refill();
    if (this.tokens >= tokensRequired) {
      this.tokens -= tokensRequired;
      return true;
    }
    return false;
  }
}

const limiter = new TokenBucketRateLimiter(5, 1);
console.log("Request 1:", limiter.allowRequest());
console.log("Request 2:", limiter.allowRequest());
console.log("Request 3:", limiter.allowRequest());
console.log("Tokens remaining allows burst of 5 requests.");
`,
  },
  sql_top_users: {
    name: "SQL - Active Users Query",
    language: "sql",
    type: "sql" as const,
    code: `-- Query users with their roles and order counts
SELECT id, name, role, department 
FROM users 
WHERE department = 'Engineering' 
ORDER BY name ASC 
LIMIT 5;
`,
  },
  system_architecture: {
    name: "Resilient Cache Topology",
    language: "markdown",
    type: "architecture" as const,
    code: `graph TD
    Client[Client / Web Browser] -->|HTTPS Requests| LB[AWS ALB / Load Balancer]
    LB --> Gateway[API Gateway Service]
    Gateway -->|Read Path| Redis[Redis Cluster / Read Cache]
    Redis -.->|Cache Miss| DB[(PostgreSQL Primary DB)]
    Gateway -->|Write Path| DB
    DB -->|CDC Debezium Stream| Kafka[Kafka Event Bus]
    Kafka --> CacheInvalidator[Cache Invalidator Worker]
    CacheInvalidator -->|Evict Stale Key| Redis
`,
  },
  star_notes: {
    name: "STAR Decision & Trade-offs",
    language: "markdown",
    type: "notes" as const,
    code: `### [Situation / Constraints]
- High read traffic: 50,000 requests/sec with 99th percentile latency exceeding 400ms on PostgreSQL.

### [Architecture Decision]
- Implemented read-through caching using Redis Cluster with a 5-minute jittered TTL.
- Write path invalidates cache keys explicitly on mutation.

### [Trade-offs & Edge Cases]
- Cache Stampede: Added singleflight mutex request coalescing during cache warmup.
- Stale Reads: Bounded stale-while-revalidate window (max 3 seconds).

### [Outcome & Metrics]
- p99 Latency dropped from 420ms to 18ms.
- Database CPU load reduced from 88% to 14%.
`,
  },
};
