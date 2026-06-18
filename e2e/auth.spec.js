const { test, expect } = require("@playwright/test");

// Mocks de l'auth-service (pas de Supabase réel en E2E)
async function mockAuth(page, { loginOk = true, signupOk = true } = {}) {
  await page.route("**/auth/login", (route) =>
    loginOk
      ? route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ access_token: "fake-jwt", user: { email: "e2e@test.com" } }),
        })
      : route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({ error: "Invalid login credentials" }),
        })
  );
  await page.route("**/auth/signup", (route) =>
    route.fulfill({
      status: signupOk ? 200 : 400,
      contentType: "application/json",
      body: JSON.stringify(
        signupOk
          ? { access_token: "fake-jwt", user: { email: "new@test.com" } }
          : { error: "User already registered" }
      ),
    })
  );
  await page.route("**/history", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ history: [] }),
    })
  );
}

test("au chargement, l'écran de connexion est affiché et la calculatrice masquée", async ({ page }) => {
  await mockAuth(page);
  await page.goto("/");
  await expect(page.locator("#authScreen")).toBeVisible();
  await expect(page.locator("#appScreen")).toBeHidden();
});

test("connexion réussie : la calculatrice apparaît avec l'email de l'utilisateur", async ({ page }) => {
  await mockAuth(page);
  await page.goto("/");
  await page.fill("#email", "e2e@test.com");
  await page.fill("#password", "secret");
  await page.click('button[data-mode="login"]');

  await expect(page.locator("#appScreen")).toBeVisible();
  await expect(page.locator("#userEmail")).toHaveText("e2e@test.com");
});

test("connexion échouée : message d'erreur, calculatrice toujours masquée", async ({ page }) => {
  await mockAuth(page, { loginOk: false });
  await page.goto("/");
  await page.fill("#email", "e2e@test.com");
  await page.fill("#password", "mauvais");
  await page.click('button[data-mode="login"]');

  await expect(page.locator("#authMsg")).toHaveText(/Invalid login credentials/);
  await expect(page.locator("#appScreen")).toBeHidden();
});

test("création de compte : connecte directement l'utilisateur", async ({ page }) => {
  await mockAuth(page);
  await page.goto("/");
  await page.fill("#email", "new@test.com");
  await page.fill("#password", "secret");
  await page.click('button[data-mode="signup"]');

  await expect(page.locator("#appScreen")).toBeVisible();
});

test("déconnexion : retour à l'écran de connexion", async ({ page }) => {
  await mockAuth(page);
  await page.goto("/");
  await page.fill("#email", "e2e@test.com");
  await page.fill("#password", "secret");
  await page.click('button[data-mode="login"]');
  await expect(page.locator("#appScreen")).toBeVisible();

  await page.click("#logoutBtn");
  await expect(page.locator("#authScreen")).toBeVisible();
  await expect(page.locator("#appScreen")).toBeHidden();
});
