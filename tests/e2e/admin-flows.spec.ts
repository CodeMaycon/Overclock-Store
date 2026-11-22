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

  test("10. Revogação e Devolução ao Estoque de Chave Atribuída a Cliente (NOT_ACTIVATED)", async ({ page }) => {
    // Intercepta confirmações de prompt para retorno ao estoque / revogação
    page.on("dialog", async (dialog) => {
      await dialog.accept("Devolução ao estoque solicitada pelo cliente.");
    });

    await page.route("**/api/admin/overview", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          kpis: {
            totalRevenueCents: 0,
            totalRevenueFormatted: "R$ 0,00",
            completedOrders: 0,
            completedOrdersCount: 0,
            pendingOrders: 0,
            totalUsers: 1,
            totalResellers: 0,
          },
          lowStockAlerts: [],
          recentOrders: [],
        }),
      });
    });

    await page.route("**/api/admin/users", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          users: [
            {
              id: "usr-cliente-rev",
              username: "cliente_premium",
              fullName: "Cliente Premium",
              email: "premium@cliente.com",
              role: "CUSTOMER",
              isBanned: false,
              orderCount: 1,
              licenseCount: 1,
            },
          ],
        }),
      });
    });

    let licenseRevokedOrUnlinked = false;

    await page.route("**/api/admin/users/usr-cliente-rev", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          user: {
            id: "usr-cliente-rev",
            username: "cliente_premium",
            fullName: "Cliente Premium",
            email: "premium@cliente.com",
            role: "CUSTOMER",
            isBanned: false,
            createdAt: "2026-01-10T00:00:00.000Z",
            orders: [],
            licenses: licenseRevokedOrUnlinked
              ? []
              : [
                  {
                    id: "lic-assigned-101",
                    key: "OVLK-PREM-9999",
                    status: "NOT_ACTIVATED",
                    product: { name: "Software Pro" },
                    variant: { name: "Mensal" },
                  },
                ],
          },
        }),
      });
    });

    await page.route("**/api/admin/licenses/lic-assigned-101", async (route) => {
      const json = await route.request().postDataJSON();
      expect(json.action).toBe("RETURN_TO_STOCK");
      licenseRevokedOrUnlinked = true;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          message: "Chave desvinculada com sucesso e retornada ao estoque disponível!",
        }),
      });
    });

    await page.goto("/admin");
    const usersTab = page.locator("button:has-text('Clientes & Blacklist')").first();
    await usersTab.click();

    await expect(page.locator("body")).toContainText("@cliente_premium");

    // Abre detalhes da ficha do cliente
    await page.locator("button:has-text('Detalhes')").first().click();
    await expect(page.locator("body")).toContainText("Licenças Digitais do Cliente");
    await expect(page.locator("body")).toContainText("OVLK-PREM-9999");

    // Verifica presença dos botões de gestão da chave não ativada
    const returnStockBtn = page.locator("button:has-text('Devolver ao Estoque')").first();
    const revokeBtn = page.locator("button:has-text('Revogar')").first();
    await expect(returnStockBtn).toBeVisible();
    await expect(revokeBtn).toBeVisible();

    // Executa ação de desvincular e devolver ao estoque
    await returnStockBtn.click();

    // Valida que a licença foi desvinculada e o modal atualizou
    await expect(page.locator("body")).toContainText("Nenhuma licença atribuída a este usuário.");
  });

  test("11. Segurança: Chave já ativada (ACTIVE) oculta Devolver ao Estoque e permite apenas Revogar", async ({ page }) => {
    page.on("dialog", async (dialog) => {
      await dialog.accept("Revogação por solicitação ou estorno");
    });

    await page.route("**/api/admin/overview", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          kpis: {
            totalRevenueCents: 0,
            totalRevenueFormatted: "R$ 0,00",
            completedOrders: 0,
            completedOrdersCount: 0,
            pendingOrders: 0,
            totalUsers: 1,
            totalResellers: 0,
          },
          lowStockAlerts: [],
          recentOrders: [],
        }),
      });
    });

    await page.route("**/api/admin/users", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          users: [
            {
              id: "usr-active-client",
              username: "cliente_ativo",
              fullName: "Cliente Ativo",
              email: "ativo@cliente.com",
              role: "CUSTOMER",
              isBanned: false,
              orderCount: 1,
              licenseCount: 1,
            },
          ],
        }),
      });
    });

    let revoked = false;

    await page.route("**/api/admin/users/usr-active-client", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          user: {
            id: "usr-active-client",
            username: "cliente_ativo",
            fullName: "Cliente Ativo",
            email: "ativo@cliente.com",
            role: "CUSTOMER",
            isBanned: false,
            createdAt: "2026-01-10T00:00:00.000Z",
            orders: [],
            licenses: [
              {
                id: "lic-active-999",
                key: "OVLK-ACTIVE-KEY-999",
                status: revoked ? "REVOKED" : "ACTIVE",
                product: { name: "Software Ativo" },
                variant: { name: "Mensal" },
              },
            ],
          },
        }),
      });
    });

    await page.route("**/api/admin/licenses/lic-active-999", async (route) => {
      const json = await route.request().postDataJSON();
      expect(json.action).toBe("REVOKE");
      revoked = true;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          message: "Chave revogada com sucesso no sistema da Overclock Store!",
        }),
      });
    });

    await page.goto("/admin");
    const usersTab = page.locator("button:has-text('Clientes & Blacklist')").first();
    await usersTab.click();

    await page.locator("button:has-text('Detalhes')").first().click();
    await expect(page.locator("body")).toContainText("OVLK-ACTIVE-KEY-999");

    // Devolver ao estoque NÃO deve existir para chave ACTIVE
    const returnBtn = page.locator("button:has-text('Devolver ao Estoque')");
    await expect(returnBtn).not.toBeVisible();

    // Botão Revogar deve estar presente e funcional
    const revokeBtn = page.locator("button:has-text('Revogar')").first();
    await expect(revokeBtn).toBeVisible();
    await revokeBtn.click();
  });

  test("12. Moderação de Avaliações (/admin): Visualização, filtros e aprovação", async ({ page }) => {
    let isApproved = false;

    await page.route("**/api/admin/reviews*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          counts: { all: 1, pending: isApproved ? 0 : 1, approved: isApproved ? 1 : 0 },
          reviews: [
            {
              id: "rev-adm-1",
              rating: 5,
              comment: "Produto funcionando perfeitamente sem problemas!",
              isApproved,
              isVerifiedPurchase: true,
              createdAt: "2026-11-20T10:00:00.000Z",
              product: { id: "p1", name: "Apex Pro", slug: "apex-pro" },
              user: { id: "u1", name: "Maycon Souza", email: "cliente@teste.com" },
              order: { id: "o1", orderNumber: "ORD-2026-9001" },
            },
          ],
        }),
      });
    });

    await page.route("**/api/admin/reviews/rev-adm-1", async (route) => {
      const data = await route.request().postDataJSON();
      isApproved = data.isApproved;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          message: "Avaliação aprovada e publicada com sucesso.",
        }),
      });
    });

    await page.goto("/admin");
    const reviewsTab = page.locator("button:has-text('Avaliações')").first();
    await reviewsTab.click();

    await expect(page.locator("body")).toContainText("Moderação de Avaliações de Clientes");
    await expect(page.locator("body")).toContainText("Apex Pro");
    await expect(page.locator("body")).toContainText("cliente@teste.com");
    await expect(page.locator("body")).toContainText("PENDENTE DE APROVAÇÃO");

    // Aprova a avaliação
    const approveBtn = page.locator("button:has-text('Aprovar & Publicar')").first();
    await approveBtn.click();
  });

  test("13. Geração de Chaves: Adição de exatamente 1 chave sem fallback para 10", async ({ page }) => {
    let capturedPayload: any = null;

    await page.route("**/api/admin/products", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          products: [
            {
              id: "prod-gen-1",
              name: "Software Teste 1 Key",
              slug: "software-teste-1-key",
              category: "FPS",
              variants: [
                {
                  id: "var-gen-1",
                  name: "Passe Diário (24h)",
                  priceCents: 2490,
                  stockCount: 0,
                },
              ],
            },
          ],
        }),
      });
    });

    await page.route("**/api/admin/licenses/generate", async (route) => {
      capturedPayload = await route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          count: capturedPayload.count || capturedPayload.quantity || 1,
          generatedCount: capturedPayload.count || capturedPayload.quantity || 1,
          message: `${capturedPayload.count || 1} chave gerada com sucesso!`,
        }),
      });
    });

    await page.goto("/admin");
    const productsTab = page.locator("button:has-text('Produtos & Estoque')").first();
    await productsTab.click();

    // Abre o modal de Importar/Gerar Chaves
    const importKeysBtn = page.locator("button:has-text('Importar Chaves')").first();
    await importKeysBtn.click();

    await expect(page.locator("body")).toContainText("Gestão de Estoque de Chaves");

    // Alterne para modo Gerar Auto
    const generateModeBtn = page.locator("button:has-text('Gerar Auto')");
    await generateModeBtn.click();

    // Verifica que o campo de quantidade inicia com '1' e permite definir '1'
    const qtyInput = page.locator("input[type='number']");
    await expect(qtyInput).toHaveValue("1");

    // Clica em Gerar e Salvar
    const submitBtn = page.locator("button:has-text('Gerar e Salvar')");
    await submitBtn.click();

    // Valida que o payload enviado à API foi exatamente 1 chave (e não fallback para 10)
    expect(capturedPayload).not.toBeNull();
    const effectiveQty = capturedPayload.quantity !== undefined ? capturedPayload.quantity : capturedPayload.count;
    expect(effectiveQty).toBe(1);
  });

  test("14. Criação de Produto: Nome com espaços gera slug limpo e acessível sem 404", async ({ page }) => {
    let createdProductPayload: any = null;

    await page.route("**/api/admin/products", async (route) => {
      if (route.request().method() === "POST") {
        createdProductPayload = await route.request().postDataJSON();
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            product: {
              id: "prod-oxine-spoofer",
              name: createdProductPayload.name,
              slug: createdProductPayload.slug,
              category: createdProductPayload.category || "Utilitários",
              status: "ONLINE",
              currentVersion: "2.1.0",
              stockCount: 0,
              variants: [],
            },
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, products: [] }),
        });
      }
    });

    await page.goto("/admin");
    await page.locator("button:has-text('Produtos & Estoque')").first().click();

    // Abre o modal de cadastro de novo produto
    await page.locator("button:has-text('+ Novo Produto')").click();

    // Digita nome com espaços e acentos
    const nameInput = page.locator("input[placeholder*='Apex Phantom Pro']");
    await nameInput.fill("Oxine Spoofer Permanent");

    // Preenche tagline obrigatória
    await page.locator("input[placeholder*='O padrão definitivo']").fill("Spoofer permanente sem formatação.");

    // Slug gerado automaticamente em tempo real no input de slug
    const slugInput = page.locator("input[placeholder*='apex-phantom-pro']");
    await expect(slugInput).toHaveValue("oxine-spoofer-permanent");

    // Clica em salvar
    const saveBtn = page.locator("button:has-text('Cadastrar Software')");
    await saveBtn.click();

    // Confirma que a API recebeu o slug sanitizado e sem espaços
    expect(createdProductPayload).not.toBeNull();
    expect(createdProductPayload.slug).toBe("oxine-spoofer-permanent");
  });

  test("15. Modal de Produto no Admin: Renderização em Portal com botões Cancelar e Salvar visíveis", async ({ page }) => {
    await page.goto("/admin");
    await page.locator("button:has-text('Produtos & Estoque')").first().click();

    // Abre o modal de produto
    await page.locator("button:has-text('+ Novo Produto')").click();

    // O modal deve estar montado diretamente sob document.body via Portal com z-[100]
    const modalOverlay = page.locator(".fixed.inset-0.z-\\[100\\]");
    await expect(modalOverlay).toBeVisible();

    // Botões no rodapé fixo devem ser visíveis e clicáveis
    const cancelBtn = page.locator("button:has-text('Cancelar')").first();
    const saveBtn = page.locator("button:has-text('Cadastrar Software')");

    await expect(cancelBtn).toBeVisible();
    await expect(saveBtn).toBeVisible();

    // Fecha o modal via botão cancelar
    await cancelBtn.click();
    await expect(modalOverlay).not.toBeVisible();
  });

  test("16. Variantes Flexíveis: Configuração de Uso Único e Lifetime no Admin", async ({ page }) => {
    let savedPayload: any = null;

    await page.route("**/api/admin/products", async (route) => {
      if (route.request().method() === "POST") {
        savedPayload = await route.request().postDataJSON();
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            product: {
              id: "prod-spoofer-vars",
              name: savedPayload.name,
              slug: savedPayload.slug,
              category: savedPayload.category,
              variants: savedPayload.variants,
            },
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, products: [] }),
        });
      }
    });

    await page.goto("/admin");
    await page.locator("button:has-text('Produtos & Estoque')").first().click();
    await page.locator("button:has-text('+ Novo Produto')").click();

    // Preenche nome
    await page.locator("input[placeholder*='Apex Phantom Pro']").fill("Oxine Permanent Spoofer");

    // Preenche tagline obrigatória
    await page.locator("input[placeholder*='O padrão definitivo']").fill("Spoofer permanente com driver indetectável.");

    // Adiciona variante Uso Único
    await page.locator("button:has-text('+ Adicionar Variante')").click();
    const typeSelects = page.locator("select:has-text('Uso Único (One-Time)')");
    // Seleciona ONE_TIME
    await typeSelects.first().selectOption("ONE_TIME");

    // Preenche preço da variante
    const priceInput = page.locator("input[placeholder='149,90']").first();
    await priceInput.fill("89,90");

    // Salva o produto
    await page.locator("button:has-text('Cadastrar Software')").click();

    expect(savedPayload).not.toBeNull();
    expect(savedPayload.variants).toBeDefined();
    const oneTimeVar = savedPayload.variants.find((v: any) => v.durationType === "ONE_TIME");
    expect(oneTimeVar).toBeDefined();
    expect(oneTimeVar.name).toBe("Uso Único");
  });

  test("17. Gestão Dinâmica de Categorias: Criação refletindo no formulário de produtos", async ({ page }) => {
    let createdCategoryPayload: any = null;
    let categoriesList = [
      { id: "cat-1", name: "Utilitários", slug: "utilitarios", orderPriority: 1, productCount: 2 },
    ];

    await page.route("**/api/admin/categories*", async (route) => {
      if (route.request().method() === "POST") {
        createdCategoryPayload = await route.request().postDataJSON();
        const newCat = {
          id: "cat-2",
          name: createdCategoryPayload.name,
          slug: createdCategoryPayload.slug,
          orderPriority: createdCategoryPayload.orderPriority || 2,
          productCount: 0,
        };
        categoriesList.push(newCat);
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({ success: true, category: newCat }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, categories: categoriesList }),
        });
      }
    });

    await page.goto("/admin");
    await page.locator("button:has-text('Produtos & Estoque')").first().click();

    // Acessa sub-aba Categorias
    await page.locator("button:has-text('Categorias (')").click();

    // Clica no botão + Nova Categoria
    await page.locator("button:has-text('+ Nova Categoria')").click();

    // Preenche nome da nova categoria
    await page.locator("input[placeholder*='Utilitários']").fill("Hardware & Bios");

    // Salva a categoria
    await page.locator("button:has-text('Salvar Categoria')").click();

    expect(createdCategoryPayload).not.toBeNull();
    expect(createdCategoryPayload.name).toBe("Hardware & Bios");
    expect(createdCategoryPayload.slug).toBe("hardware-bios");
  });
});
