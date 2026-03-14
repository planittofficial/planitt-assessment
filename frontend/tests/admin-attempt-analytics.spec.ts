import { test, expect } from "@playwright/test";

function makeJson(body: unknown, status = 200) {
  return {
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  };
}

test.describe("Admin Attempt Analytics", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test.beforeEach(async ({ page }) => {
    await page.route("**/api/auth/me**", async (route) => {
      await route.fulfill(
        makeJson({
          id: "admin-1",
          email: "admin@example.com",
          full_name: "Admin",
          role: "ADMIN",
        })
      );
    });

    await page.route("**/api/admin/attempts/attempt-1/details**", async (route) => {
      await route.fulfill(
        makeJson({
          attempt: {
            assessment_title: "Sample Assessment",
            email: "candidate@example.com",
            full_name: "Candidate Name",
            final_score: 6,
            total_marks: 10,
            result: "PASS",
            started_at: new Date().toISOString(),
            submitted_at: new Date().toISOString(),
          },
          analytics: {
            total_questions: 5,
            attempted_questions: 4,
            unattempted_questions: 1,
            mcq_total: 3,
            mcq_attempted: 3,
            mcq_correct: 2,
            mcq_incorrect: 1,
            descriptive_total: 2,
            descriptive_attempted: 1,
            descriptive_pending_grading: 1,
            marks_obtained: 6,
            max_marks: 10,
            sections: [
              {
                section: "Quantitative",
                total_questions: 2,
                attempted_questions: 2,
                mcq_total: 2,
                mcq_attempted: 2,
                mcq_correct: 1,
                mcq_incorrect: 1,
                descriptive_total: 0,
                descriptive_attempted: 0,
                descriptive_pending_grading: 0,
                marks_obtained: 2,
                max_marks: 4,
              },
              {
                section: "Coding",
                total_questions: 3,
                attempted_questions: 2,
                mcq_total: 1,
                mcq_attempted: 1,
                mcq_correct: 1,
                mcq_incorrect: 0,
                descriptive_total: 2,
                descriptive_attempted: 1,
                descriptive_pending_grading: 1,
                marks_obtained: 4,
                max_marks: 6,
              },
            ],
          },
          answers: [
            {
              answer_id: "1",
              question_text: "Q1",
              marks_obtained: 1,
              max_marks: 2,
              question_type: "MCQ",
              section: "Quantitative",
              user_answer: "A",
              correct_answer: "A",
              is_graded: true,
            },
          ],
        })
      );
    });
  });

  test("shows overall and section analytics", async ({ page }) => {
    await page.goto("/admin/attempts/attempt-1/results");

    await expect(page.getByRole("heading", { name: "Attempt Analytics" })).toBeVisible();
    await expect(page.getByText("Total Questions")).toBeVisible();
    await expect(page.getByText("Solved (Attempted)")).toBeVisible();
    await expect(page.getByText("Unattempted")).toBeVisible();
    await expect(page.getByText("MCQ Correct")).toBeVisible();
    await expect(page.getByText("MCQ Incorrect")).toBeVisible();
    await expect(page.getByText("Pending Grading", { exact: true })).toBeVisible();

    await expect(page.getByText("Section Breakdown")).toBeVisible();
    await expect(page.getByText("Quantitative")).toBeVisible();
    await expect(page.getByText("Coding")).toBeVisible();
    await expect(page.getByText("Attempted 2/2")).toBeVisible();
  });
});
