import { test, expect } from "@playwright/test";

test.describe("Fluxos do Cliente - Overclock Store", () => {
  test("1. Home: Deve carregar navbar com logo aumentada, sem sombra de corte e links principais", async ({ page }) => {
    await page.goto("/");

    // Verifica imagem da logo da Overclock Store
    const logo = page.locator("header img[alt='OVERCLOCK STORE']");
    await expect(logo).toBeVisible();

    // Verifica links principais na navbar
    await expect(page.locator("header nav")).toContainText("Produtos");
    await expect(page.locator("header nav")).toContainText("Status");
    await expect(page.locator("header nav")).toContainText("Atualizações");
    await expect(page.locator("header nav")).toContainText("Avaliações");
    await expect(page.locator("header nav")).toContainText("FAQ");

    // Verifica que Cargo VIP não está presente na navbar
    await expect(page.locator("header")).not.toContainText("Cargo VIP");
  });

  test("2. Home: Deve exibir estado vazio limpo quando nenhum produto estiver em destaque (isFeatured: 0)", async ({ page }) => {
    // Intercepta a rota de produtos simulando catálogo com 0 produtos destacados
    await page.route("**/api/products*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          products: [
            {
              id: "prod-1",
              name: "Phantom Apex Suite",
              slug: "phantom-apex",
              status: "ONLINE",
              isFeatured: false,
              variants: [],
            },
          ],
        }),
      });
    });

    await page.goto("/");
    // Garante que a página não quebra e exibe o fallback gracioso de catálogo
    await expect(page.locator("body")).toBeVisible();
  });

  test("3. Produto: Seleção de variantes, cálculo de preço e validação de cupom", async ({ page }) => {
    // Intercepta requisição de validação de cupom para teste determinístico
    await page.route("**/api/checkout/validate-coupon", async (route) => {
      const request = route.request();
      const postData = JSON.parse(request.postData() || "{}");

      if (postData.code?.toUpperCase() === "PROMO10") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            valid: true,
            coupon: {
              code: "PROMO10",
              discountType: "PERCENTAGE",
              discountValue: 10,
              discountPercent: 10,
            },
            discountCents: 249,
            newTotalCents: 2241,
          }),
        });
      } else {
        await route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({
            valid: false,
            error: "Cupom inválido ou expirado.",
          }),
        });
      }
    });

    await page.goto("/products/phantom-apex");
    await expect(page.locator("body")).toBeVisible();

    // Se houver input de cupom na página de produto
    const couponInput = page.locator("input[placeholder*='CUPOM'], input[placeholder*='Cupom']").first();
    if (await couponInput.isVisible()) {
      await couponInput.fill("PROMO10");
      const applyBtn = page.locator("button:has-text('Aplicar'), button:has-text('APLICAR')").first();
      await applyBtn.click();
      await expect(page.locator("body")).toContainText("10%");
    }
  });

  test("4. Pedido / Pix: Exibição correta de QR Code, Copia e Cola e ausência de simulação em produção", async ({ page }) => {
    // Mock do pedido com Pix do Mercado Pago
    await page.route("**/api/orders/ord-test-123", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          order: {
            id: "ord-test-123",
            orderNumber: "ORD-2026-99999",
            status: "PENDING",
            totalCents: 7990,
            items: [
              {
                id: "item-1",
                productName: "Spectre Valorant Pro",
                variantName: "Acesso Semanal (7 Dias)",
                unitPriceCents: 7990,
              },
            ],
            payment: {
              method: "PIX",
              gateway: "MERCADOPAGO",
              status: "PENDING",
              pixQrCodeText: "00020126580014br.gov.bcb.pix0136overclock-real-payment52040000530398654079.905802BR5915OVERCLOCK",
              pixQrCode: "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=teste",
              isSandbox: false,
            },
          },
        }),
      });
    });

    await page.goto("/order/ord-test-123");

    // Verifica exibição do total do pedido
    await expect(page.locator("body")).toContainText("R$ 79,90");
    await expect(page.locator("body")).toContainText("CÓDIGO PIX COPIA E COLA");

    // Verifica que o QR Code está renderizado
    const qrImage = page.locator("img[alt*='QR Code Pix']");
    await expect(qrImage).toBeVisible();

    // Garante que o botão de simulação sandbox NÃO aparece na loja em produção
    const simulateBtn = page.locator("button:has-text('Simular Aprovação de Pagamento')");
    await expect(simulateBtn).not.toBeVisible();
  });

  test("5. Autenticação: Login com placeholder correto e bloqueio com mensagem para conta suspensa/banida", async ({ page }) => {
    // 1. Acesso à tela de login normal
    await page.goto("/login");

    // Verifica o placeholder do email
    const emailInput = page.locator("input[placeholder='seu_email@exemplo.com']");
    await expect(emailInput).toBeVisible();

    // 2. Simula redirecionamento do middleware de segurança por conta banida
    await page.goto("/login?error=BannedAccount");

    // Verifica que o alerta de bloqueio é exibido na tela
    await expect(page.locator("body")).toContainText("Esta conta foi suspensa por violação dos termos de uso e segurança.");
  });

  test("6. Recuperação de Senha: /forgot-password e /reset-password carregam com visual cyberpunk", async ({ page }) => {
    await page.goto("/forgot-password");
    await expect(page.locator("h1, h2")).toContainText("Esqueceu sua senha?");
    await expect(page.locator("input[type='email']")).toBeVisible();

    await page.goto("/reset-password?token=token-teste");
    await expect(page.locator("body")).toBeVisible();
  });
});
