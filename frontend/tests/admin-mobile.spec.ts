import { test, expect } from "@playwright/test";

function makeJson(body: unknown, status = 200) {
  return {
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  };
}

async function mockAdminApi(page: import("@playwright/test").Page) {
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

  await page.route("**/api/admin/dashboard-stats**", async (route) => {
    await route.fulfill(
      makeJson({
        summary: {
          total_pass: 12,
          total_fail: 3,
          total_assessments: 2,
          total_candidates: 42,
        },
        recentResults: [
          {
            id: "r1",
            email: "student1@example.com",
            full_name: "Student One",
            assessment_title: "Frontend Basics",
            final_score: 78,
            result: "PASS",
            submitted_at: new Date().toISOString(),
          },
        ],
        assessmentStats: [
          {
            id: "a1",
            title: "Frontend Basics",
            pass_count: 10,
            fail_count: 2,
            total_attempts: 12,
          },
          {
            id: "a2",
            title: "Backend Basics",
            pass_count: 2,
            fail_count: 1,
            total_attempts: 3,
          },
        ],
      })
    );
  });

  await page.route("**/api/admin/assessments**", async (route) => {
    await route.fulfill(
      makeJson([
        { id: "a1", title: "Frontend Basics", code: "FE01", status: "ACTIVE" },
        { id: "a2", title: "Backend Basics", code: "BE01", status: "INACTIVE" },
      ])
    );
  });

  await page.route("**/api/admin/candidates**", async (route) => {
    await route.fulfill(
      makeJson([
        {
          id: "c1",
          email: "student1@example.com",
          full_name: "Student One",
          created_at: new Date().toISOString(),
        },
        {
          id: "c2",
          email: "student2@example.com",
          full_name: "Student Two",
          created_at: new Date().toISOString(),
        },
      ])
    );
  });

  await page.route("**/api/admin/admins**", async (route) => {
    await route.fulfill(
      makeJson([
        {
          id: "admin-1",
          email: "admin@example.com",
          full_name: "Admin",
          created_at: new Date().toISOString(),
        },
        {
          id: "admin-2",
          email: "admin2@example.com",
          full_name: "Admin Two",
          created_at: new Date().toISOString(),
        },
      ])
    );
  });

  // Fail fast for unexpected admin endpoints so we notice missing mocks.
  await page.route("**/api/admin/**", async (route) => {
    await route.fulfill(makeJson({ message: "Unhandled admin endpoint in test mock" }, 404));
  });
}

async function expectNoGlobalHorizontalScroll(page: import("@playwright/test").Page) {
  const hasOverflow = await page.evaluate(() => {
    const el = document.documentElement;
    return el.scrollWidth > el.clientWidth + 1;
  });
  expect(hasOverflow).toBeFalsy();
}

test.describe("Admin Panel Mobile", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test.beforeEach(async ({ page }) => {
    await mockAdminApi(page);
  });

  test("dashboard renders without horizontal overflow", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByRole("link", { name: "Admin Panel" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Assessment Dashboard" })).toBeVisible();
    await expectNoGlobalHorizontalScroll(page);
  });

  test("assessments list is usable on mobile", async ({ page }) => {
    await page.goto("/admin/assessments");
    await expect(page.getByRole("heading", { name: "Assessments" })).toBeVisible();
    await expect(page.getByRole("link", { name: "+ Create Assessment" })).toBeVisible();
    await expectNoGlobalHorizontalScroll(page);
  });

  test("candidates page renders table without breaking viewport", async ({ page }) => {
    await page.goto("/admin/candidates");
    await expect(page.getByRole("heading", { name: "Manage Candidates" })).toBeVisible();
    await expectNoGlobalHorizontalScroll(page);
  });

  test("admins table scrolls horizontally inside container (not the page)", async ({ page }) => {
    await page.goto("/admin/admins");
    await expect(page.getByRole("table")).toBeVisible();

    const table = page.getByRole("table");
    const scrollContainer = page.locator("div.overflow-x-auto", { has: table }).first();
    await expect(scrollContainer).toBeVisible();

    await expectNoGlobalHorizontalScroll(page);
  });

  test("create assessment form is single-column on mobile", async ({ page }) => {
    await page.goto("/admin/assessments/new");
    await expect(page.getByRole("heading", { name: "Create New Assessment" })).toBeVisible();

    // Two inputs that are side-by-side on desktop should be stacked on mobile.
    const duration = page
      .locator('label:has-text("Duration (Minutes)")')
      .locator("..")
      .locator("input")
      .first();
    const code = page
      .locator('label:has-text("Assessment Code (Optional)")')
      .locator("..")
      .locator("input")
      .first();
    await expect(duration).toBeVisible();
    await expect(code).toBeVisible();

    const [durationBox, codeBox] = await Promise.all([duration.boundingBox(), code.boundingBox()]);
    expect(durationBox && codeBox).toBeTruthy();
    expect(Math.abs((durationBox!.x) - (codeBox!.x))).toBeLessThan(2);
    expect(codeBox!.y).toBeGreaterThan(durationBox!.y + 4);

    await expectNoGlobalHorizontalScroll(page);
  });
});
