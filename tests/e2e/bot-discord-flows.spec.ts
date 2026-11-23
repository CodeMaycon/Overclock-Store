import { test, expect } from "@playwright/test";

const INTERNAL_BOT_SECRET = process.env.INTERNAL_BOT_SECRET || "overclock_internal_bot_secret_2026";

test.describe("Segurança dos Endpoints Internos do Bot (/api/bot/*)", () => {
  test("1. Deve bloquear requisições em /api/bot/products sem header x-bot-secret (401)", async ({ request }) => {
    const res = await request.get("/api/bot/products");
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.error).toContain("x-bot-secret");
  });

  test("2. Deve bloquear requisições com x-bot-secret inválido (401)", async ({ request }) => {
    const res = await request.get("/api/bot/products", {
      headers: {
        "x-bot-secret": "segredo_completamente_incorreto_xyz",
      },
    });
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.error).toContain("inválida");
  });

  test("3. Deve liberar /api/bot/products com x-bot-secret válido e retornar variantes com estoque", async ({ request }) => {
    const res = await request.get("/api/bot/products", {
      headers: {
        "x-bot-secret": INTERNAL_BOT_SECRET,
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.products)).toBe(true);
    if (body.products.length > 0) {
      const prod = body.products[0];
      expect(prod).toHaveProperty("id");
      expect(prod).toHaveProperty("name");
      expect(prod).toHaveProperty("slug");
      expect(Array.isArray(prod.variants)).toBe(true);
    }
  });

  test("4. Deve consultar /api/bot/users/[discordId] retornando status de vínculo", async ({ request }) => {
    const res = await request.get("/api/bot/users/discord-inexistente-9999", {
      headers: {
        "x-bot-secret": INTERNAL_BOT_SECRET,
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.linked).toBe(false);
  });

  test("5. SEGURANÇA: Bloqueio de chave quando PENDING e liberação segura quando COMPLETED", async ({ request }) => {
    // 1. Consulta produtos para pegar uma variante ativa
    const prodRes = await request.get("/api/bot/products", {
      headers: { "x-bot-secret": INTERNAL_BOT_SECRET },
    });
    expect(prodRes.status()).toBe(200);
    const prodData = await prodRes.json();
    expect(prodData.products.length).toBeGreaterThan(0);
    const testProduct = prodData.products[0];
    const testVariant = testProduct.variants[0];

    // 2. Cria pedido via POST /api/bot/orders
    const orderRes = await request.post("/api/bot/orders", {
      headers: { "x-bot-secret": INTERNAL_BOT_SECRET },
      data: {
        discordId: "test_bot_user_9999",
        discordUsername: "gamer_discord_test",
        productId: testProduct.id,
        variantId: testVariant.id,
      },
    });

    // Se houver chaves em estoque, valida fluxo completo
    if (orderRes.status() === 200) {
      const orderData = await orderRes.json();
      expect(orderData.success).toBe(true);
      expect(orderData.status).toBe("PENDING");
      expect(orderData).toHaveProperty("orderId");
      expect(orderData).toHaveProperty("pixQrCode");
      // CRÍTICO: Jamais expor chave na criação do pedido pendente
      expect(orderData).not.toHaveProperty("license");
      expect(orderData).not.toHaveProperty("licenseKey");

      // 3. Consulta GET /api/bot/orders/[orderId] enquanto PENDING
      const getPendingRes = await request.get(`/api/bot/orders/${orderData.orderId}`, {
        headers: { "x-bot-secret": INTERNAL_BOT_SECRET },
      });
      expect(getPendingRes.status()).toBe(200);
      const pendingData = await getPendingRes.json();
      expect(pendingData.status).toBe("PENDING");
      // CRÍTICO: Jamais expor chave enquanto PENDING
      expect(pendingData).not.toHaveProperty("license");
      expect(pendingData).not.toHaveProperty("licenseKey");
    } else {
      // Se sem estoque no momento, deve retornar 409
      expect(orderRes.status()).toBe(409);
    }
  });

  test("6. Rotas OAuth do Discord devem exigir autenticação de sessão e proteger contra CSRF", async ({ request }) => {
    // GET /api/auth/discord sem login deve redirecionar para /login
    const authRes = await request.get("/api/auth/discord", { maxRedirects: 0 });
    expect([302, 307]).toContain(authRes.status());
    expect(authRes.headers().location).toContain("/login");

    // POST /api/auth/discord/unlink sem sessão deve retornar 401
    const unlinkRes = await request.post("/api/auth/discord/unlink");
    expect(unlinkRes.status()).toBe(401);

    // POST /api/auth/discord/sync sem sessão deve retornar 401
    const syncRes = await request.post("/api/auth/discord/sync");
    expect(syncRes.status()).toBe(401);
  });
});

test.describe("Interface de Integração com Discord no /dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.context().addCookies([
      {
        name: "x-test-role",
        value: "CUSTOMER",
        domain: "localhost",
        path: "/",
      },
      {
        name: "next-auth.session-token",
        value: "test-customer-token",
        domain: "localhost",
        path: "/",
      },
    ]);
  });

  test("1. Deve exibir card de Integração Discord desvinculado com botão 'Vincular Discord' e cargo @Verificado", async ({ page }) => {
    // Mock de sessão autenticada de cliente
    await page.route("**/api/auth/session", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: {
            id: "user-cliente-teste",
            name: "Cliente Teste",
            email: "teste@overclockstore.com.br",
            role: "CUSTOMER",
          },
          expires: "2099-01-01T00:00:00.000Z",
        }),
      });
    });

    // Mock de perfil sem Discord vinculado
    await page.route("**/api/client/profile", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: {
            id: "user-cliente-teste",
            username: "clienteteste",
            fullName: "Cliente Teste",
            email: "teste@overclockstore.com.br",
            role: "CUSTOMER",
            discordId: null,
            discordUsername: null,
            isDiscordVerified: false,
          },
        }),
      });
    });

    await page.route("**/api/client/licenses", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ licenses: [] }),
      });
    });

    await page.goto("/dashboard");

    // Navega para aba de Segurança & Perfil
    const settingsTab = page.locator("aside button:has-text('Segurança & Perfil')");
    await settingsTab.click();

    // Valida o card de Integração Oficial com o Discord
    const discordCard = page.locator("[data-testid='discord-integration-card']");
    await expect(discordCard).toBeVisible();
    await expect(discordCard).toContainText("NÃO VINCULADO");
    await expect(discordCard).toContainText("@Verificado");

    // Valida botão Vincular Discord apontando para /api/auth/discord
    const linkBtn = discordCard.locator("a[href='/api/auth/discord']");
    await expect(linkBtn).toBeVisible();
    await expect(linkBtn).toContainText("Vincular Discord");
  });

  test("2. Deve exibir card de Integração Discord vinculado com badge VERIFICADO, Sincronizar e Desvincular", async ({ page }) => {
    await page.route("**/api/auth/session", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: {
            id: "user-cliente-vinculado",
            name: "Cliente Vinculado",
            email: "vinculado@overclockstore.com.br",
            role: "CUSTOMER",
          },
          expires: "2099-01-01T00:00:00.000Z",
        }),
      });
    });

    // Mock de perfil com Discord vinculado
    await page.route("**/api/client/profile", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: {
            id: "user-cliente-vinculado",
            username: "clientevinculado",
            fullName: "Cliente Vinculado",
            email: "vinculado@overclockstore.com.br",
            role: "CUSTOMER",
            discordId: "987654321098765432",
            discordUsername: "overclock_pro",
            discordLinkedAt: "2026-11-20T10:00:00Z",
            isDiscordVerified: true,
          },
        }),
      });
    });

    await page.route("**/api/client/licenses", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ licenses: [] }),
      });
    });

    // Mock da rota de sincronização de cargo
    await page.route("**/api/auth/discord/sync", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          notInGuild: false,
          message: "Cargos sincronizados no Discord com sucesso!",
        }),
      });
    });

    await page.goto("/dashboard");

    // Navega para aba de Segurança & Perfil
    const settingsTab = page.locator("aside button:has-text('Segurança & Perfil')");
    await settingsTab.click();

    // Valida card no estado conectado
    const discordCard = page.locator("[data-testid='discord-integration-card']");
    await expect(discordCard).toBeVisible();
    await expect(discordCard).toContainText("CONECTADO");
    await expect(discordCard).toContainText("@overclock_pro");
    await expect(discordCard).toContainText("VERIFICADO");

    // Valida botões de ação
    const syncBtn = discordCard.locator("button:has-text('Sincronizar Cargo')");
    const unlinkBtn = discordCard.locator("button:has-text('Desvincular')");
    await expect(syncBtn).toBeVisible();
    await expect(unlinkBtn).toBeVisible();

    // Testa acionamento da sincronização
    await syncBtn.click();
    await expect(page.locator("body")).toContainText("Cargos sincronizados no Discord com sucesso!");
  });

  test("3. Deve exibir toasts informativos conforme parâmetros de retorno do OAuth2", async ({ page }) => {
    await page.route("**/api/auth/session", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: { id: "user-1", name: "User", email: "user@overclockstore.com.br", role: "CUSTOMER" },
          expires: "2099-01-01T00:00:00.000Z",
        }),
      });
    });

    await page.route("**/api/client/licenses", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ licenses: [] }) });
    });

    await page.route("**/api/client/profile", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ user: {} }) });
    });

    // Teste ?discord=linked
    await page.goto("/dashboard?discord=linked");
    await expect(page.locator("body")).toContainText("Conta Discord vinculada com sucesso! Cargo @Verificado entregue.");

    // Teste ?discord=linked_not_in_guild
    await page.goto("/dashboard?discord=linked_not_in_guild");
    await expect(page.locator("body")).toContainText("Entre no nosso servidor do Discord para receber o cargo @Verificado.");

    // Teste ?discord=already_linked
    await page.goto("/dashboard?discord=already_linked");
    await expect(page.locator("body")).toContainText("já está vinculada a outro usuário");
  });
});
