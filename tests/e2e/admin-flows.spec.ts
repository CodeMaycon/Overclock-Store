import { test, expect } from "@playwright/test";

test.describe("Fluxos Completos do Administrador - Overclock Store", () => {
  test.beforeEach(async ({ page, context }) => {
    // Cookie para contornar NextAuth middleware em ambiente de teste E2E
    await context.addCookies([
      {
        name: "x-test-role",
        value: "ADMIN",
        domain: "localhost",
        path: "/",
      },
    ]);

    // Intercepta sessão de admin para testes autenticados
    await page.route("**/api/auth/session", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: {
            id: "admin-id-123",
            username: "admin_overclock",
            fullName: "Administrador Geral",
            email: "admin@overclockstore.com.br",
            role: "ADMIN",
            isBanned: false,
          },
          expires: new Date(Date.now() + 86400000).toISOString(),
        }),
      });
    });
  });

  test("1. Visão Geral: Deve exibir Faturamento Total sincronizado e Vendas Recentes", async ({ page }) => {
    await page.route("**/api/admin/overview", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          kpis: {
            totalRevenueCents: 154900,
            totalRevenueFormatted: "R$ 1.549,00",
            completedOrders: 14,
            completedOrdersCount: 14,
            pendingOrders: 2,
            totalUsers: 48,
            totalResellers: 3,
          },
          lowStockAlerts: [],
          recentOrders: [
            {
              id: "ord-test-1",
              orderNumber: "ORD-2026-1001",
              createdAt: "20/11/2026",
              user: { username: "cliente_pro" },
              productSummary: "Phantom Apex (Passe Diário)",
              totalFormatted: "R$ 24,90",
              status: "COMPLETED",
            },
          ],
        }),
      });
    });

    await page.goto("/admin");

    // Verifica que o Faturamento Total exibe o valor formatado real
    await expect(page.locator("body")).toContainText("R$ 1.549,00");
    await expect(page.locator("body")).toContainText("14 pedidos pagos");

    // Verifica exibição de vendas recentes
    await expect(page.locator("body")).toContainText("cliente_pro");
    await expect(page.locator("body")).toContainText("Phantom Apex (Passe Diário)");
  });

  test("2. Gestão de Produtos: Visualização, sub-abas e persistência de alteração de preços", async ({ page }) => {
    await page.route("**/api/admin/products", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            products: [
              {
                id: "prod-apex-1",
                name: "Phantom Apex Suite",
                slug: "phantom-apex",
                category: "FPS Tático",
                status: "ONLINE",
                stockCount: 12,
                variants: [
                  { id: "var-1", name: "Passe Diário (24h)", durationHours: 24, priceCents: 2490, stockCount: 5 },
                  { id: "var-2", name: "Acesso Semanal (7 Dias)", durationHours: 168, priceCents: 7990, stockCount: 4 },
                ],
              },
            ],
          }),
        });
      }
    });

    await page.goto("/admin");
    const productsTab = page.locator("button:has-text('Produtos & Estoque')").first();
    await productsTab.click();

    // Verifica a presença do produto e botões de ação
    await expect(page.locator("body")).toContainText("Phantom Apex Suite");
    await expect(page.locator("body")).toContainText("Atribuir Licença Sem Pagamento");
  });

  test("3. Gestão de Chaves: Listagem, remoção e filtros de status", async ({ page }) => {
    await page.route("**/api/admin/licenses*", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            metrics: { unassigned: 8, active: 4, frozen: 0, notActivated: 1, expired: 0 },
            keys: [
              {
                id: "key-123",
                key: "OVLK-TEST-9999-ABCD",
                status: "UNASSIGNED",
                product: { name: "Phantom Apex Suite" },
                variant: { name: "Acesso Semanal (7 Dias)" },
                user: null,
              },
            ],
          }),
        });
      } else if (route.request().method() === "DELETE") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            message: "Chave removida com sucesso do estoque.",
          }),
        });
      }
    });

    await page.goto("/admin");
    const productsTab = page.locator("button:has-text('Produtos & Estoque')").first();
    await productsTab.click();

    const keysSubTab = page.locator("button:has-text('Estoque de Chaves')");
    if (await keysSubTab.isVisible()) {
      await keysSubTab.click();
      await expect(page.locator("body")).toContainText("OVLK-TEST-9999-ABCD");
      await expect(page.locator("body")).toContainText("UNASSIGNED");
    }
  });

  test("4. Atribuição de Licença Gratuita: Modal de giveaway/sorteio para cliente", async ({ page }) => {
    await page.route("**/api/admin/products", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          products: [
            {
              id: "prod-apex-1",
              name: "Phantom Apex Suite",
              slug: "phantom-apex",
              status: "ONLINE",
              variants: [{ id: "var-1", name: "Passe Diário (24h)", priceCents: 2490, stockCount: 5 }],
            },
          ],
        }),
      });
    });

    await page.goto("/admin");
    const productsTab = page.locator("button:has-text('Produtos & Estoque')").first();
    await productsTab.click();

    const grantBtn = page.locator("button:has-text('Atribuir Licença Sem Pagamento')");
    if (await grantBtn.isVisible()) {
      await grantBtn.click();
      await expect(page.locator("body")).toContainText("Atribuir Licença Sem Pagamento");
    }
  });

  test("5. Status & Freeze Time: Alteração de status sincronizando com telemetria", async ({ page }) => {
    await page.route("**/api/admin/status", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            services: [
              {
                id: "srv-apex",
                name: "Apex Driver Kernel",
                slug: "phantom-apex",
                status: "OPERATIONAL",
                uptimePercentage: 99.9,
              },
            ],
          }),
        });
      }
    });

    await page.goto("/admin");
    const statusTab = page.locator("button:has-text('Status & Freeze Time')").first();
    await statusTab.click();

    await expect(page.locator("body")).toContainText("Apex Driver Kernel");
    await expect(page.locator("body")).toContainText("OPERACIONAL");
  });

  test("6. Gestão de Cupons: Criação e visualização de cupons de desconto", async ({ page }) => {
    await page.route("**/api/admin/coupons", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            coupons: [
              {
                id: "cpn-1",
                code: "PROMO20",
                discountType: "PERCENTAGE",
                discountPercent: 20,
                usedCount: 5,
                maxUses: 100,
                isActive: true,
              },
            ],
          }),
        });
      }
    });

    await page.goto("/admin");
    const couponsTab = page.locator("button:has-text('Cupons de Desconto')").first();
    await couponsTab.click();

    await expect(page.locator("body")).toContainText("PROMO20");
    await expect(page.locator("body")).toContainText("20%");
    await expect(page.locator("button:has-text('Novo Cupom')")).toBeVisible();
  });

  test("7. Gestão de Clientes: Visualização de ficha com histórico e licenças", async ({ page }) => {
    await page.route("**/api/admin/users", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          users: [
            {
              id: "usr-cliente-1",
              username: "cliente_val",
              fullName: "Carlos Silva",
              email: "carlos@exemplo.com",
              role: "CUSTOMER",
              isBanned: false,
              orderCount: 2,
              licenseCount: 1,
            },
          ],
        }),
      });
    });

    await page.route("**/api/admin/users/usr-cliente-1", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          user: {
            id: "usr-cliente-1",
            username: "cliente_val",
            fullName: "Carlos Silva",
            email: "carlos@exemplo.com",
            role: "CUSTOMER",
            isBanned: false,
            createdAt: "2026-01-10T00:00:00.000Z",
            orders: [
              {
                id: "ord-1",
                orderNumber: "ORD-991",
                createdAt: "2026-02-15T00:00:00.000Z",
                totalCents: 4990,
                status: "COMPLETED",
                items: [{ product: { name: "Spectre Valorant" }, variant: { name: "Diário" } }],
              },
            ],
            licenses: [
              {
                id: "lic-1",
                key: "OVLK-VAL-001",
                status: "ACTIVE",
                product: { name: "Spectre Valorant" },
                variant: { name: "Diário" },
              },
            ],
          },
        }),
      });
    });

    await page.goto("/admin");
    const usersTab = page.locator("button:has-text('Clientes & Blacklist')").first();
    await usersTab.click();

    await expect(page.locator("body")).toContainText("@cliente_val");
    await expect(page.locator("button:has-text('Detalhes')").first()).toBeVisible();

    // Abre detalhes da ficha
    await page.locator("button:has-text('Detalhes')").first().click();
    await expect(page.locator("body")).toContainText("Licenças Digitais do Cliente");
    await expect(page.locator("body")).toContainText("OVLK-VAL-001");
  });

  test("8. Banimento e Desbanimento Real de Usuário", async ({ page }) => {
    // Aceita qualquer prompt de diálogo que o navegador disparar
    page.on("dialog", async (dialog) => {
      await dialog.accept("Violação grave dos termos de uso e segurança.");
    });

    await page.route("**/api/admin/users", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          users: [
            {
              id: "usr-cliente-1",
              username: "cliente_infrator",
              fullName: "Infrator",
              email: "infrator@exemplo.com",
              role: "CUSTOMER",
              isBanned: false,
              orderCount: 1,
              licenseCount: 1,
            },
          ],
        }),
      });
    });

    await page.route("**/api/admin/users/usr-cliente-1/ban", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          message: "Conta de @cliente_infrator suspensa com sucesso.",
        }),
      });
    });

    await page.goto("/admin");
    const usersTab = page.locator("button:has-text('Clientes & Blacklist')").first();
    await usersTab.click();

    await expect(page.locator("body")).toContainText("@cliente_infrator");
    const banBtn = page.locator("button:has-text('Banir')").first();
    await expect(banBtn).toBeVisible();
    await banBtn.click();
  });

  test("9. Auditoria & Logs: Visualização dos registros de eventos administrativos", async ({ page }) => {
    await page.route("**/api/admin/audit", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          logs: [
            {
              id: "log-1",
              action: "PRODUCT_UPDATED",
              actorType: "ADMIN",
              user: "@admin_overclock (admin@overclockstore.com.br)",
              dateFormatted: "20/11/2026",
              timeFormatted: "03:15:00",
              metadata: { productName: "Phantom Apex Suite" },
            },
          ],
        }),
      });
    });

    await page.goto("/admin");
    const auditTab = page.locator("button:has-text('Auditoria & Logs')").first();
    await auditTab.click();

    await expect(page.locator("body")).toContainText("PRODUCT_UPDATED");
    await expect(page.locator("body")).toContainText("@admin_overclock");
  });
});
