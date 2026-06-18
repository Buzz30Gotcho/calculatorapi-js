const { test, expect } = require("@playwright/test");

// Helpers : cliquer sur les boutons via leurs attributs data-*
const digit = (page, d) => page.click(`button[data-digit="${d}"]`);
const op = (page, o) => page.click(`button[data-op="${o}"]`);
const equals = (page) => page.click('button[data-action="equals"]');
const clear = (page) => page.click('button[data-action="clear"]');

const display = (page) => page.locator("#display");
const errorMsg = (page) => page.locator("#error");

test.beforeEach(async ({ page }) => {
  // En E2E on ne dépend pas du vrai Supabase : on mocke la connexion
  // et l'historique. Les calculs (/calculate) tapent bien sur la vraie API.
  await page.route("**/auth/login", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ access_token: "fake-jwt", user: { email: "e2e@test.com" } }),
    })
  );
  await page.route("**/history", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ history: [] }),
    })
  );

  await page.goto("/");

  // L'utilisateur doit se connecter avant d'accéder à la calculatrice
  await page.fill("#email", "e2e@test.com");
  await page.fill("#password", "secret");
  await page.click('button[data-mode="login"]');
  await expect(page.locator("#appScreen")).toBeVisible();
});

test("la page se charge avec 0 à l'écran", async ({ page }) => {
  await expect(display(page)).toHaveText("0");
});

test("addition : 3 + 6 = 9", async ({ page }) => {
  await digit(page, "3");
  await op(page, "add");
  await digit(page, "6");
  await equals(page);
  await expect(display(page)).toHaveText("9");
});

test("multiplication : 6 × 7 = 42", async ({ page }) => {
  await digit(page, "6");
  await op(page, "multiply");
  await digit(page, "7");
  await equals(page);
  await expect(display(page)).toHaveText("42");
});

test("soustraction : 9 - 4 = 5", async ({ page }) => {
  await digit(page, "9");
  await op(page, "subtract");
  await digit(page, "4");
  await equals(page);
  await expect(display(page)).toHaveText("5");
});

test("division : 8 ÷ 2 = 4", async ({ page }) => {
  await digit(page, "8");
  await op(page, "divide");
  await digit(page, "2");
  await equals(page);
  await expect(display(page)).toHaveText("4");
});

test("division par zéro : affiche un message d'erreur", async ({ page }) => {
  await digit(page, "5");
  await op(page, "divide");
  await digit(page, "0");
  await equals(page);
  await expect(errorMsg(page)).toHaveText(/Division par zéro impossible/);
});

test("le bouton C remet l'écran à 0", async ({ page }) => {
  await digit(page, "7");
  await digit(page, "8");
  await expect(display(page)).toHaveText("78");
  await clear(page);
  await expect(display(page)).toHaveText("0");
});

test("statut API affiché comme connectée", async ({ page }) => {
  await expect(page.locator("#apiStatusValue")).toHaveText("connectée");
});
