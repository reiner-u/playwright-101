# Fixing `ontario-search.spec.ts`: Ontario.ca changed its search page markup

**Status: resolved.** After the changes below, a full local run on 2026-10-07 passed, apart from the two `@failure-demo` tests, which are designed to fail.

The accessibility suite (`ontario-accessibility.spec.ts`) had two of the same stale selectors. Its before/after is in [section 6](#6-accessibility-suite-ontario-accessibilityspects), together with some real accessibility findings that are not selector problems.

**Symptom:** tests fail on `await page.waitForSelector('h4 a');` with a 30s timeout, even though the failure screenshot shows the correct results page.

**Cause:** this is not an access, network or page-load problem, and it is not caused by anything we changed in the labs. Ontario.ca changed the HTML of its search results page, so several selectors in our spec no longer matched anything. The page loads fine (hence the correct screenshot); Playwright just waits for an element that no longer exists.

**How we confirmed it:** we inspected the live page's DOM (`/search/search-results/?query=driver+licence`), then ran the suite and read the failure snapshots Playwright saves in `test-results/` to see the page as the test browser saw it.

---

## 1. The quick fix, and why it is not enough on its own

In `playwright-tests/tests/ontario-search.spec.ts`, use Find and Replace (`Ctrl+H` in VS Code):

| Find | Replace with |
|---|---|
| `h4 a` | `.result-title a` |

`.result-title` is the class on every result heading (`<h3 class="result-title">`). Matching the class instead of the tag should survive another heading-level change.

This removes the `waitForSelector` failure, but it only fixed some tests. On the next full run, **five tests still failed** (plus the two intentional ones), each on a different stale selector further down the test:

| Test | Failed on | Error |
|---|---|---|
| search for health card returns results | `h3` containing "results" | element(s) not found (5s) |
| sort results by updated date | `#filterSortApply` | click timed out (30s) |
| pagination navigates to next page | `.rc-pagination` | `waitForSelector` timed out (30s) |
| search with no results shows empty state | `h3` containing "0 results" | element(s) not found (10s) |
| search input field is visible and functional | `#search-input-field` | element(s) not found (5s) |

The second `@failure-demo` test was also failing on `#search-input-field`, which is the wrong reason. It is meant to fail on its `toHaveValue` assertion.

Sort and pagination each showed about 60s in the report because the config retries once (`retries: 1`) and each attempt waited out the 30s test timeout.

---

## 2. What changed on the page

| Element | Old selector (in our spec) | Now on ontario.ca | Why it matters |
|---|---|---|---|
| Result links | `h4 a` | `h3.result-title a` (we use `.result-title a`) | The result headings went from `<h4>` to `<h3>`. There are **0** `h4` elements on the page now. |
| "N results" heading | `h3` containing "results" | `h2.results-summary-title`, e.g. "10,000 results for driver licence" | It is now an `<h2>`, so the `h3` filter finds nothing. An empty search reads "0 results for ...", also in the `h2`. |
| Pagination container | `.rc-pagination` | `.search-pagination` (a `nav` named "Search results pagination") | The pagination component was replaced; the old `rc-pagination` class is gone. |
| Pagination page links | `.rc-pagination li a` | Buttons named "Go to page 2", "Go to page 3", ... | Page numbers are now buttons, not links. |
| Active page | `li.rc-pagination-item-active a` | `aria-current="page"` on the active button (class `search-pagination-link--active`) | New class name; the ARIA attribute is the more stable check. |
| Search box | `#search-input-field` | A combobox named "Search" (`#autosuggest-input`) | The input has a new id. The role-based locator is also what Playwright's codegen records. |
| Sort "Apply" button | `#filterSortApply` | `getByRole('button', { name: 'Apply', exact: true })` | The id no longer exists. The topic filter test already used this locator. |

**Why one test passed before any fix:** `topic filter decreases result count` already used `h2.results-summary-title` and `.results-number`, which still exist, and it never used `h4 a`. That one test passing was the clue that the page was fine and the markup had changed.

---

## 3. Test-by-test: before and after

Tests not listed here (`navigate to Ontario.ca search page`, `topic filter decreases result count`) needed no changes. The "After" blocks are the code now in the spec, and they passed in a full run.

### 3.1 `search for health card returns results`

**Before**
```typescript
await page.goto('/search?query=health+card');
await page.waitForSelector('h4 a');
await expect(page.locator('h3').filter({ hasText: /results/ })).toBeVisible();
await expect(page.locator('h4 a').first()).toBeVisible();
await expect(page.locator('h4 a').first()).toContainText('health');
```

**After**
```typescript
await page.goto('/search?query=health+card');
await page.waitForSelector('.result-title a');
await expect(page.locator('h2.results-summary-title')).toBeVisible();
await expect(page.locator('.result-title a').first()).toBeVisible();
await expect(page.locator('.result-title a').first()).toContainText('health');
```

### 3.2 `filter by topic narrows results`

**Before**
```typescript
await page.goto('/search/search-results/?query=driver+licence');
await page.waitForSelector('h4 a');
await page.getByRole('checkbox', { name: 'Driving and road safety' }).check();
await page.getByRole('button', { name: 'Apply', exact: true }).click();
await expect(page.locator('h4 a').first()).toBeVisible();
```

**After**
```typescript
await page.goto('/search/search-results/?query=driver+licence');
await page.waitForSelector('.result-title a');
await page.getByRole('checkbox', { name: 'Driving and road safety' }).check();
await page.getByRole('button', { name: 'Apply', exact: true }).click();
await expect(page.locator('.result-title a').first()).toBeVisible();
```

### 3.3 `sort results by updated date`

**Before**
```typescript
await page.goto('/search/search-results/?query=driver+licence');
await page.waitForSelector('h4 a');
await page.getByLabel('Updated date (new to old)').check();
await page.locator('#filterSortApply').click();
await expect(page.locator('h4 a').first()).toBeVisible();
```

**After**
```typescript
await page.goto('/search/search-results/?query=driver+licence');
await page.waitForSelector('.result-title a');
await page.getByLabel('Updated date (new to old)').check();
await page.getByRole('button', { name: 'Apply', exact: true }).click();
await expect(page.locator('.result-title a').first()).toBeVisible();
```

### 3.4 `pagination navigates to next page`

**Before**
```typescript
await page.goto('/search/search-results/?query=driver+licence');
await page.waitForSelector('.rc-pagination');
await page.locator('.rc-pagination li a', { hasText: '2' }).click();
await expect(
  page.locator('li.rc-pagination-item-active a')
).toContainText('2');
```

**After**
```typescript
await page.goto('/search/search-results/?query=driver+licence');
await page.waitForSelector('.search-pagination');
await page.getByRole('button', { name: 'Go to page 2' }).click();
await expect(page.getByRole('button', { name: 'Go to page 2' })).toHaveAttribute('aria-current', 'page');
```

### 3.5 `search with no results shows empty state`

**Before**
```typescript
await page.goto('/search/search-results/?query=xyznonexistentquery12345');
await expect(
  page.locator('h3').filter({ hasText: /0 results/ })
).toBeVisible({ timeout: 10000 });
```

**After**
```typescript
await page.goto('/search/search-results/?query=xyznonexistentquery12345');
await expect(
  page.locator('h2.results-summary-title').filter({ hasText: /0 results/ })
).toBeVisible({ timeout: 10000 });
```

### 3.6 `search input field is visible and functional`

**Before**
```typescript
await page.goto('/search/search-results/?query=driver+licence');
const searchInput = page.locator('#search-input-field');
await expect(searchInput).toBeVisible();
await searchInput.clear();
await searchInput.fill('health card');
await searchInput.press('Enter');
await page.waitForSelector('h4 a');
await expect(page.locator('h4 a').first()).toBeVisible();
```

**After**
```typescript
await page.goto('/search/search-results/?query=driver+licence');
const searchInput = page.getByRole('combobox', { name: 'Search' });
await expect(searchInput).toBeVisible();
await searchInput.clear();
await searchInput.fill('health card');
await searchInput.press('Enter');
await page.waitForSelector('.result-title a');
await expect(page.locator('.result-title a').first()).toBeVisible();
```

### 3.7 `intentional failure: expects the old query after editing search @failure-demo`

This test is **supposed to fail** (it demonstrates a failing assertion). Only the input selector needed updating so that it reaches its intended `toHaveValue` assertion instead of failing earlier on a missing element:

**Before**
```typescript
const searchInput = page.locator('#search-input-field');
```

**After**
```typescript
const searchInput = page.getByRole('combobox', { name: 'Search' });
```

---

## 4. Lab materials and the upstream repo still need updating

The workshop labs still contain the old selectors, so anyone copying snippets from them will hit the same failures. Search the labs (English and `fr/`) for `h4 a`, `.rc-pagination`, `#search-input-field` and `#filterSortApply`. Four files currently contain old selectors: `labs/lab-02-playwright-basics/README.md`, `labs/lab-03-copilot-testing/README.md` and their French copies under `fr/labs/`. `lab-03` has `h4 a` in its "Without Copilot" snippet and in its text about checking selectors.

We also checked the upstream repository (`devopsabcs-engineering/playwright-101`) on 2026-10-07. Its `main` branch (latest commit `411d732`, 2026-09-23) still uses all of the old selectors, so nobody has fixed this upstream yet. Each fork has to apply the fix itself, or the fix has to be contributed upstream.

## 5. Why this will happen again, and how to check quickly

Our tests run against a live public site we don't control, so layout changes will keep breaking selectors. When a locator times out but the screenshot looks right:

1. **Read the failure snapshot.** Each failed test leaves `test-results/<test-name>/error-context.md`, which contains the page's accessibility tree at the moment of failure: the real headings, button names and roles the test browser saw. It is the quickest way to find the new locator. The screenshot only shows that the page loaded.
2. Or open the page in the browser, press `F12`, and inspect the element you expected. `npx playwright codegen https://www.ontario.ca/search?query=driver+licence` also shows the locator Playwright suggests when you click it.
3. Prefer role- and class-based locators (`getByRole`, `.result-title a`) over tag-based ones (`h4 a`) or generated ids. Heading levels and ids are the kind of thing that changes without notice.
4. For faster feedback while debugging, run `npx playwright test --retries=0`. With the default retry, every timeout costs double.
5. If `git diff` shows the whole spec file as changed, that is usually line endings (CRLF vs LF) from the editor. `git diff --ignore-space-at-eol` shows only the real edits.

---

## 6. Accessibility suite (`ontario-accessibility.spec.ts`)

The accessibility tests (`playwright-tests/accessibility-tests/ontario-accessibility.spec.ts`, run with `npm run test:accessibility`) share one loop of three scenarios: home page, populated search results and empty search results. Before running axe, each scenario waits for the page to be ready. Two of those waits used the same stale selectors as the functional suite.

### 6.1 Changes made

**Populated search results (line 26)**

Before
```typescript
await expect(page.locator('h4 a').first()).toBeVisible();
```

After
```typescript
await expect(page.locator('.result-title a').first()).toBeVisible();
```

**Empty search results (line 28)**

Before
```typescript
await expect(page.locator('h3').filter({ hasText: /0 results/ })).toBeVisible();
```

After
```typescript
await expect(page.locator('h2.results-summary-title').filter({ hasText: /0 results/ })).toBeVisible();
```

Nothing else in this spec or in `playwright.accessibility.config.ts` needed to change. The home page check, `page.getByRole('heading', { level: 1 })`, still works: the page has two `h1` elements ("Government of Ontario"), but one is hidden, and role-based locators ignore hidden elements, so only one is matched.

### 6.2 Real accessibility findings (not selector problems)

Beyond the selectors, we ran axe-core against the three live pages in a browser at 1280×720 (Playwright's default viewport), with the same four tags the spec uses (`wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`). We loaded axe 4.10.2 for this check, while the project has 4.13.0 installed, so rule details can differ slightly.

| Scenario | axe violations |
|---|---|
| English home page | none |
| populated search results | `svg-img-alt` (serious), 2 elements |
| empty search results | `svg-img-alt` (serious), 2 elements |

The two elements are icons inside Ontario.ca's own shared header (`ontario-header`): the "Menu" toggle and the "Sign in" toggle. They have no alternative text. This comes from Ontario.ca's site, not our code. At phone width, axe also flags the header's search toggle button (`button-name`, critical), but that doesn't apply to the default desktop viewport.

**Result of the real run (2026-10-08, project's axe 4.13.0, `npm run test:accessibility`):** 3 tests, 1 passed and 2 failed. The home page test passed. The populated and empty search-results tests both got through their readiness checks, ran axe, and failed on the header violation described below, which is what we predicted from the manual scan. These are correct failures: the tests are doing their job. The failure message lists the violation as JSON, which is how to tell a real finding apart from a readiness failure (a readiness failure would instead say it was waiting for a locator or that the test timed out).

**What Lab 5 says to do with this.** [Lab 5](lab-05-accessibility/README.md) (Exercise 3) treats failures like this as findings to report, not something to silence. It says to report problems on Ontario.ca with reproducible steps and evidence, and not to disable rules or exclude elements just to get a green run. So the assertion stays strict, and we are not adding `.exclude(...)` or `.disableRules(...)`. The Lab 5 verification checkpoint asks that all three scenarios execute (or that you name the blocker). The stale `h4 a` and `h3` waits were that blocker: they made two scenarios time out before axe ever ran.

Finding record, in the form Lab 5 asks for:

| Field | Value |
|---|---|
| Rule ID | `svg-img-alt` |
| Impact | serious |
| Where | Ontario.ca's shared header (`ontario-header`): the "Menu" toggle icon and `#ontario-header-sign-in-toggler` icon, on both search-results pages (not on the home page) |
| Problem | `<svg>` elements with an image role have no alternative text |
| Affected elements | `ontario-header` › `.ontario-header__menu-toggle-content > .ontario-header__icon-container--white.ontario-header__icon-container > .svg-icon[role="img"]`, and `ontario-header` › `#ontario-header-sign-in-toggler > .ontario-header__icon-container--white.ontario-header__icon-container > .svg-icon[role="img"]` |
| axe's explanation | The icons have no child `title`, no `aria-label`, no `aria-labelledby` and no `title` attribute |
| Help URL | `https://dequeuniversity.com/rules/axe/4.13/svg-img-alt` |
| To reproduce | Open the results page at desktop width and run axe with the four WCAG tags, or run `npm run test:accessibility -- --grep "populated search results"` and read the `axe-results` attachment for the exact targets and `failureSummary` |

**Running order:** per Lab 5, the accessibility outputs are nested inside the functional output folders (`test-results/accessibility`, `playwright-report/accessibility`). A later functional run (`npx playwright test` or `npm test`) can clear earlier accessibility results, so run the functional suite first and the accessibility suite after it, and open the accessibility report straight away with `npx playwright show-report playwright-report/accessibility`.
