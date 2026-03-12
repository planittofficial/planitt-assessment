import { test, expect } from '@playwright/test';

test.describe('Internship Management', () => {
  test.beforeEach(async ({ page }) => {
    // 1. Login as Admin
    await page.goto('https://planitt-assessment.onrender.com/login');
    await page.fill('input[type="email"]', 'admin@example.com');
    await page.click('button[type="submit"]');
    
    // Wait for redirect to dashboard
    await expect(page).toHaveURL(/.*admin/);
    
    // 2. Navigate to Internships page
    await page.click('text=Internships');
    await expect(page).toHaveURL(/.*admin\/internships/);
  });

  test('should display the internship management page correctly', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Internship Applications');
    await expect(page.locator('text=Upload Form CSV')).toBeVisible();
    await expect(page.locator('text=Sync from URL')).toBeVisible();
  });

  test('should handle CSV file upload and display data', async ({ page }) => {
    // Create a mock CSV
    const csvContent = `Timestamp,Email Address,Full Name,College,Degree,Year of Study
2024-03-09 10:00:00,student1@example.com,John Doe,Stanford University,Computer Science,3rd Year
2024-03-09 11:00:00,student2@example.com,Jane Smith,MIT,Electrical Engineering,4th Year`;

    // Upload the file
    await page.setInputFiles('input[type="file"]', {
      name: 'applications.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent)
    });

    // Verify notifications and data
    await expect(page.locator('text=CSV uploaded and parsed successfully!')).toBeVisible();
    
    // Check summary cards
    await expect(page.locator('text=Total Applications >> xpath=.. >> p.text-4xl')).toHaveText('2');
    
    // Check table content
    await expect(page.locator('text=student1@example.com')).toBeVisible();
    await expect(page.locator('text=Stanford University')).toBeVisible();
    await expect(page.locator('text=Jane Smith')).toBeVisible();
    
    // Check distribution analysis (College)
    await expect(page.locator('text=Distribution: College')).toBeVisible();
    await expect(page.locator('text=Stanford University >> xpath=.. >> span.text-emerald-600')).toHaveText('1');
  });

  test('should filter applications based on search term', async ({ page }) => {
    // Upload mock data first
    const csvContent = `Email,Name,College
a@test.com,Alice,Harvard
b@test.com,Bob,Yale`;

    await page.setInputFiles('input[type="file"]', {
      name: 'filter_test.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent)
    });

    // Search for "Alice"
    await page.fill('input[placeholder="Search applications..."]', 'Alice');
    
    // Alice should be visible, Bob should not
    await expect(page.locator('text=Alice')).toBeVisible();
    await expect(page.locator('text=Bob')).not.toBeVisible();
    
    // Verify Filtered Results card
    await expect(page.locator('text=Filtered Results >> xpath=.. >> p.text-4xl')).toHaveText('1');
  });

  test('should open and handle Sync from URL modal', async ({ page }) => {
    await page.click('text=Sync from URL');
    
    // Modal should be visible
    await expect(page.locator('h3:has-text("Synchronize Data")')).toBeVisible();
    
    // Fill URL and close
    await page.fill('input[type="url"]', 'https://docs.google.com/spreadsheets/d/test/pub?output=csv');
    await page.click('button:has-text("Cancel")');
    
    // Modal should be closed
    await expect(page.locator('h3:has-text("Synchronize Data")')).not.toBeVisible();
  });
});
