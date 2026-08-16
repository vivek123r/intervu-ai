import { describe, expect, it } from "vitest";
import { runCodeSandbox, runSqlQuery } from "@/lib/scratchpad/runner";

describe("sandbox-runner", () => {
  it("executes valid JavaScript and captures console.log output", () => {
    const code = `
      const numbers = [1, 2, 3, 4];
      const sum = numbers.reduce((a, b) => a + b, 0);
      console.log("Sum:", sum);
    `;
    const result = runCodeSandbox(code);

    expect(result.success).toBe(true);
    expect(result.output).toContain("Sum: 10");
    expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
  });

  it("handles runtime errors and returns error messages gracefully", () => {
    const code = `
      const obj = null;
      console.log(obj.nonExistentMethod());
    `;
    const result = runCodeSandbox(code);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error).toContain("TypeError");
  });

  it("evaluates SQL queries against in-memory mock tables with WHERE and LIMIT", () => {
    const query = "SELECT id, name, department FROM users WHERE department = 'Engineering' LIMIT 2";
    const result = runSqlQuery(query);

    expect(result.success).toBe(true);
    expect(result.columns).toEqual(["id", "name", "department"]);
    expect(result.rowCount).toBe(2);
    expect(result.rows[0]?.department).toBe("Engineering");
  });

  it("returns appropriate error when querying a non-existent SQL table", () => {
    const query = "SELECT * FROM non_existent_table";
    const result = runSqlQuery(query);

    expect(result.success).toBe(false);
    expect(result.error).toContain("does not exist");
  });
});
