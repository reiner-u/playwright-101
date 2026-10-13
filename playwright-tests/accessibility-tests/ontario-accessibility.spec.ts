import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '@playwright/test';

test.describe('Ontario.ca WCAG 2.1 A/AA automated checks', () => {
  test.beforeEach(async ({ context }) => {
    await context.addCookies([{
      name: 'lang',
      value: 'en',
      domain: '.ontario.ca',
      path: '/',
    }]);
  });

  const scenarios = [
    { name: 'English home page', path: '/page/government-ontario', state: 'home' },
    { name: 'populated search results', path: '/search/search-results/?query=driver+licence', state: 'results' },
    { name: 'empty search results', path: '/search/search-results/?query=xyznonexistentquery12345', state: 'empty' },
  ];

  for (const scenario of scenarios) {
    test(`${scenario.name} has no automated WCAG 2.1 A/AA violations`, async ({ page }, testInfo) => {
      await page.goto(scenario.path);
      await expect(page).toHaveTitle(/ontario/i);

      if (scenario.state === 'results') {
        await expect(page.locator('.result-title a').first()).toBeVisible();
      } else if (scenario.state === 'empty') {
        await expect(page.locator('h2.results-summary-title').filter({ hasText: /0 results/ })).toBeVisible();
      } else {
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      }

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      await testInfo.attach('axe-results', {
        body: JSON.stringify(results, null, 2),
        contentType: 'application/json',
      });

      const violations = results.violations.map(violation => ({
        rule: violation.id,
        impact: violation.impact,
        help: violation.helpUrl,
        nodes: violation.nodes.map(node => ({
          target: node.target,
          failureSummary: node.failureSummary,
        })),
      }));

      expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
    });
  }
});