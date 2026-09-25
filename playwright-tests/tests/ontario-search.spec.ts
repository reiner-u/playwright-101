import { test, expect } from '@playwright/test';

test.describe('Ontario.ca Search', () => { 
  //test that clicking on a search result link navigates to the correct page

  test.beforeEach(async ({ context }) => {
    // Skip language splash page by setting English cookie
    await context.addCookies([{
      name: 'lang',
      value: 'en',
      domain: '.ontario.ca',
      path: '/'
    }]);
  });

  test('navigate to Ontario.ca search page', async ({ page }) => {
    // Scenario 1: Basic Navigation — page.goto(), toHaveTitle()
    console.log('CI pipeline verification');
    await page.goto('/search/search-results/?query=driver+licence');
    await expect(page).toHaveTitle(/ontario/i);
  });

  test('search for health card returns results', async ({ page }) => {
    // Scenario 2: Search and Verify — fill(), click(), text assertions
    await page.goto('/search?query=health+card');
    await page.waitForSelector('h4 a');
    await expect(page.locator('h3').filter({ hasText: /results/ })).toBeVisible();
    await expect(page.locator('h4 a').first()).toBeVisible();
    await expect(page.locator('h4 a').first()).toContainText('health');
  });

  test('filter by topic narrows results', async ({ page }) => {
    // Scenario 3: Filter by Topic — checkbox interaction, Apply button
    await page.goto('/search/search-results/?query=driver+licence');
    await page.waitForSelector('h4 a');
    await page.getByRole('checkbox', { name: 'Driving and road safety' }).check();
    await page.getByRole('button', { name: 'Apply', exact: true }).click();
    await expect(page.locator('h4 a').first()).toBeVisible();
  });

  test('topic filter decreases result count', async ({ page }) => {
    await page.goto('/search/search-results/?query=driver+licence');
    await page.waitForLoadState('networkidle');

    const resultsHeader = page.locator('h2.results-summary-title');
    await expect(resultsHeader).toBeVisible({ timeout: 30000 });
    const beforeCount = Number.parseInt(
      (await resultsHeader.locator('.results-number').textContent())?.replace(/,/g, '') ?? '0',
      10
    );

    await page.getByRole('checkbox', { name: 'Driving and road safety' }).check();
    await page.getByRole('button', { name: 'Apply', exact: true }).click();

    const resultCount = resultsHeader.locator('.results-number');
    await expect.poll(async () => Number.parseInt(
      (await resultCount.textContent())?.replace(/,/g, '') ?? '0',
      10
    )).toBeLessThan(beforeCount);
  });

  test('sort results by updated date', async ({ page }) => {
    // Scenario 4: Sort Results — radio button, dynamic content
    await page.goto('/search/search-results/?query=driver+licence');
    await page.waitForSelector('h4 a');
    await page.getByLabel('Updated date (new to old)').check();
    await page.locator('#filterSortApply').click();
    await expect(page.locator('h4 a').first()).toBeVisible();
  });

  test('pagination navigates to next page', async ({ page }) => {
    // Scenario 6: Pagination — click navigation, URL assertions
    await page.goto('/search/search-results/?query=driver+licence');
    await page.waitForSelector('.rc-pagination');
    await page.locator('.rc-pagination li a', { hasText: '2' }).click();
    await expect(
      page.locator('li.rc-pagination-item-active a')
    ).toContainText('2');
  });

  test('search with no results shows empty state', async ({ page }) => {
    // Scenario 7: No Results Edge Case — negative testing
    await page.goto('/search/search-results/?query=xyznonexistentquery12345');
    await expect(
      page.locator('h3').filter({ hasText: /0 results/ })
    ).toBeVisible({ timeout: 10000 });
  });

  test('intentional failure: expects the wrong government page title @failure-demo', async ({ page }) => {
    await page.goto('/search/search-results/?query=driver+licence');
    await expect(page).toHaveTitle(/ontario/i);

    await expect(
      page,
      'Intentional demo error: Ontario.ca is not the Government of Canada website'
    ).toHaveTitle(/Government of Canada/i);
  });

  test('intentional failure: expects the old query after editing search @failure-demo', async ({ page }) => {
    await page.goto('/search/search-results/?query=driver+licence');
    const searchInput = page.locator('#search-input-field');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('health card');

    await expect(
      searchInput,
      'Intentional demo error: the search value changed to health card, but the test expects the old query'
    ).toHaveValue('driver licence');
  });

  test('search input field is visible and functional', async ({ page }) => {
    // Bonus: Verify search input field presence and interaction
    await page.goto('/search/search-results/?query=driver+licence');
    const searchInput = page.locator('#search-input-field');
    await expect(searchInput).toBeVisible();
    await searchInput.clear();
    await searchInput.fill('health card');
    await searchInput.press('Enter');
    await page.waitForSelector('h4 a');
    await expect(page.locator('h4 a').first()).toBeVisible();
  });
  test('test', async ({ page }) => {
  await page.goto('https://www.ontario.ca/search?query=driver+licence');
  await page.getByRole('combobox', { name: 'Search' }).click();
  await page.getByRole('button', { name: 'Clear field' }).click();
  await page.getByRole('combobox', { name: 'Search' }).fill('birth certificate');
  await page.getByRole('combobox', { name: 'Search' }).press('Enter');
  await page.getByRole('link', { name: 'Get or replace an Ontario' }).click();
});
});
