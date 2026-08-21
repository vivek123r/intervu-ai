import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProblemDescription } from "@/features/coding/components/problem-description";
import { EditorialPanel } from "@/features/coding/components/editorial-panel";
import { ResultPanel } from "@/features/coding/components/result-panel";
import { TestCasePanel } from "@/features/coding/components/testcase-panel";
import type { ProblemDetail, CodingSubmission, RunCodeResponse } from "@/types/contracts/coding";

const mockProblem: ProblemDetail = {
  id: "coding-easy-1",
  slug: "two-sum",
  number: 1,
  title: "Two Sum",
  difficulty: "easy",
  topics: ["Array", "Hash Table"],
  descriptionMd: "Given an array of integers `nums` and an integer `target`, return indices of the two numbers.",
  examples: [
    {
      input: "nums = [2,7,11,15], target = 9",
      output: "[0,1]",
      explanation: "Because nums[0] + nums[1] == 9, we return [0, 1].",
    },
  ],
  constraintsMd: "- `2 <= nums.length <= 10^4`",
  functionName: "twoSum",
  params: [
    { name: "nums", type: "list_int" },
    { name: "target", type: "int" },
  ],
  returnType: "list_int",
  starterCode: {
    python: "class Solution:\n    def twoSum(self, nums, target):\n        pass",
    javascript: "var twoSum = function(nums, target) {};",
  },
  testCases: [
    { inputArgs: [[2, 7, 11, 15], 9], expected: [0, 1], isExample: true },
  ],
  timeLimitMs: 2000,
  editorialMd: "### Approach: One-Pass Hash Table\n\nUse hash map to store complements.",
  userStatus: "solved",
};

describe("Coding Practice Components", () => {
  it("renders problem title, difficulty, and description correctly", () => {
    render(<ProblemDescription problem={mockProblem} />);

    expect(screen.getByText("Two Sum")).toBeInTheDocument();
    expect(screen.getByText("easy")).toBeInTheDocument();
    expect(screen.getByText("Solved")).toBeInTheDocument();
    expect(screen.getByText("Array")).toBeInTheDocument();
    expect(screen.getByText("Hash Table")).toBeInTheDocument();
    expect(screen.getByText("Example 1:")).toBeInTheDocument();
  });

  it("renders editorial markdown correctly", () => {
    render(<EditorialPanel editorialMd={mockProblem.editorialMd} />);

    expect(screen.getByText(/Official Editorial & Approaches/i)).toBeInTheDocument();
    expect(screen.getByText(/Approach: One-Pass Hash Table/i)).toBeInTheDocument();
  });

  it("renders testcase panel and allows editing input args", () => {
    const handleCasesChange = vi.fn();
    render(
      <TestCasePanel
        params={mockProblem.params}
        testCases={[{ inputArgs: [[2, 7, 11, 15], 9] }]}
        onChangeTestCases={handleCasesChange}
      />
    );

    expect(screen.getByText("Case 1")).toBeInTheDocument();
    expect(screen.getByText("nums =")).toBeInTheDocument();
    expect(screen.getByText("target =")).toBeInTheDocument();
  });

  it("renders result panel for run code output", () => {
    const runResponse: RunCodeResponse = {
      results: [
        {
          index: 0,
          inputArgs: [[2, 7, 11, 15], 9],
          expected: [0, 1],
          actual: [0, 1],
          passed: true,
          debugOutput: "testing twoSum",
          runtimeMs: 4,
        },
      ],
    };

    render(<ResultPanel runResponse={runResponse} submission={null} isExecuting={false} />);

    expect(screen.getByText(/All Tests Passed/i)).toBeInTheDocument();
    expect(screen.getByText("testing twoSum")).toBeInTheDocument();
  });

  it("renders result panel for submission verdict", () => {
    const submission: CodingSubmission = {
      id: "sub-123",
      userId: "user-1",
      problemSlug: "two-sum",
      language: "python",
      code: "class Solution:\n    def twoSum(self, nums, target):\n        return [0, 1]",
      status: "accepted",
      passedCount: 8,
      totalCount: 8,
      runtimeMs: 12,
      createdAt: new Date().toISOString(),
    };

    render(<ResultPanel runResponse={null} submission={submission} isExecuting={false} />);

    expect(screen.getByText("Accepted")).toBeInTheDocument();
    expect(screen.getByText("8 / 8 testcases passed")).toBeInTheDocument();
    expect(screen.getByText("12 ms")).toBeInTheDocument();
  });
});
