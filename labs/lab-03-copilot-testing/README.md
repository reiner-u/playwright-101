---
layout: default
title: "Lab 03: GitHub Copilot for Testing"
nav_order: 5
description: "Use GitHub Copilot to accelerate Playwright test authoring"
permalink: /labs/lab-03-copilot-testing/
---

| | |
|---|---|
| **Duration** | 15 minutes |
| **Level** | Intermediate |
| **Type** | Hands-on |

## Learning Objectives

After completing this lab, you will be able to:

* Use GitHub Copilot inline suggestions for test code
* Use Copilot Chat to generate complete test scenarios
* Apply the two-prompt technique: provide context first, then make your request
* Validate and refine AI-generated test code

## Prerequisites

* Lab 02 completed with passing tests
* GitHub Copilot extension installed and active in VS Code

> [!NOTE]
> **No Copilot subscription?** Every exercise includes manual code snippets as a
> fallback. You can complete this entire lab by typing the provided code directly.

## Exercises

### Exercise 1: Comment-Driven Generation

Open `playwright-tests/tests/ontario-search.spec.ts` and add a new test block at the
end of the `describe` block. Start by typing a descriptive comment:

```typescript
// Test that clicking a search result navigates to the correct page
```

If Copilot is active, a ghost suggestion appears after the comment. Review the
suggestion before accepting it. Check whether the suggested selectors match the
actual page elements (such as `h4 a` for result links).

> [!NOTE]
> **Without Copilot:** Type the following test manually after the comment:
>
> ```typescript
> test('clicking a search result navigates to the correct page', async ({ page }) => {
>   await page.goto('/search?query=driver+licence');
>   await page.waitForSelector('h4 a');
>   const firstResult = page.locator('h4 a').first();
>   const resultText = await firstResult.textContent();
>   await firstResult.click();
>   await expect(page).not.toHaveURL(/\/search/);
>   await expect(page.locator('h1, h2').first()).toBeVisible();
> });
> ```

### Exercise 2: Copilot Chat Context Prompt

Open Copilot Chat (`Ctrl+Shift+I`) and paste the following context prompt. This
teaches Copilot about the page structure before you ask it to generate code:

```text
This test file tests ontario.ca/search using Playwright. The page is a React SPA
with search input (#search-input-field), topic filter checkboxes, sort radio buttons,
and pagination (.rc-pagination).
```

Copilot acknowledges the context and is ready for a follow-up request.

> [!NOTE]
> **Without Copilot:** Read the context description above and use it as a reference
> when writing the test in the next exercise.

### Exercise 3: Copilot Chat Generation Prompt

In the same Copilot Chat session, send this generation prompt:

```text
Generate a Playwright test that verifies the search result count decreases after
applying a topic filter
```

Copilot produces a test that uses the selectors from your context prompt. Copy the
generated code into `ontario-search.spec.ts` inside the `describe` block.

> [!NOTE]
> **Without Copilot:** Add this test manually:
>
> ```typescript
> test('topic filter decreases result count', async ({ page }) => {
>   await page.goto('/search/search-results/?query=driver+licence');
>   await page.waitForLoadState('networkidle');
>
>   const resultsHeader = page.locator('h2.results-summary-title');
>   await expect(resultsHeader).toBeVisible({ timeout: 30000 });
>   const beforeCount = Number.parseInt(
>     (await resultsHeader.locator('.results-number').textContent())?.replace(/,/g, '') ?? '0',
>     10
>   );
>
>   await page.getByRole('checkbox', { name: 'Driving and road safety' }).check();
>   await page.getByRole('button', { name: 'Apply', exact: true }).click();
> 
>   const resultCount = resultsHeader.locator('.results-number');
>   await expect.poll(async () => Number.parseInt(
>     (await resultCount.textContent())?.replace(/,/g, '') ?? '0',
>     10
>   )).toBeLessThan(beforeCount);
> });
> ```

### Exercise 4: Validate Output

Run the generated test to check whether it passes:

```bash
cd playwright-tests
npx playwright test
```

Common issues with AI-generated test code:

* Wrong selectors that do not match the actual page DOM
* Missing `waitForSelector` calls before interacting with dynamic content
* Incorrect assertions that check the wrong element or property
* Hardcoded values that break when page content changes

### Exercise 5: Refine

If the test fails, apply targeted fixes:

1. Compare selectors against the actual page elements. Open Ontario.ca/search in a
   browser and inspect the DOM with DevTools (`F12`).
2. Add explicit waits where Copilot assumed instant rendering.
3. Adjust assertions to match actual page behavior.

Rerun the tests after each fix:

```bash
npx playwright test
```

Continue until all tests pass.

### Exercise 6: Discussion

Consider these questions with your team:

* When can you trust Copilot output without modification?
* Which parts of a test require the most scrutiny? Selectors, waits, and assertions
  are the most common failure points.
* How does providing context (Exercise 2) improve the quality of generated code
  compared to asking without context?

## Verification Checkpoint

At least one new Copilot-generated (or manually written) test passes alongside the
existing test suite. Run `npx playwright test` and confirm all tests complete with
green checkmarks.

## Summary

GitHub Copilot accelerates test authoring by generating boilerplate and suggesting
complete test scenarios. The two-prompt technique (context, then request) produces
higher-quality output. Every generated test still requires validation: selectors must
match the real DOM, waits must account for dynamic rendering, and assertions must
verify meaningful behavior.

## Next Steps

Proceed to [Lab 04: CI/CD Pipeline (GitHub Actions)](../lab-04-ci-pipeline/) or
[Lab 04: CI/CD Pipeline (Azure DevOps)](../lab-04-ci-pipeline-ado/), depending on where
your repository lives.
