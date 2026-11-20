import { test, expect } from "@playwright/test";

test.describe("Fluxos Completos do Cliente - Overclock Store", () => {
  test("1. Home: Nova copy oficial, Marquee, Hero, 4 Microblocos e 7 Seções Numeradas", async ({ page }) => {
    await page.goto("/");

    // 1. Navbar e logo da Overclock Store
    const logo = page.locator("header img[alt='OVERCLOCK STORE']");
    await expect(logo).toBeVisible();

    // 2. Faixa superior / Marquee oficial
    await expect(page.locator("body")).toContainText("ENTREGA APÓS CONFIRMAÇÃO DO PIX");
    await expect(page.locator("body")).toContainText("STATUS ACOMPANHADO POR PRODUTO");
    await expect(page.locator("body")).toContainText("SUPORTE EM PORTUGUÊS");

    // 3. Hero oficial
    await expect(page.locator("body")).toContainText("PIX VIA MERCADO PAGO · ENTREGA APÓS CONFIRMAÇÃO");
    await expect(page.locator("h1")).toContainText("Sua vantagem começa aqui. Chave liberada em segundos.");
    await expect(page.locator("body")).toContainText("Softwares, spoofers e utilitários selecionados para PC.");

    // 4. Quatro microblocos de confiança
    await expect(page.locator("body")).toContainText("01 — Liberação após confirmação");
    await expect(page.locator("body")).toContainText("02 — Pagamento via Pix");
    await expect(page.locator("body")).toContainText("03 — Status por Produto");
    await expect(page.locator("body")).toContainText("04 — Suporte em Português");

    // 5. Seções Numeradas da Home (01 a 07)
    await expect(page.locator("body")).toContainText("01 // CATÁLOGO");
    await expect(page.locator("body")).toContainText("Escolha o que você precisa");
    await expect(page.locator("body")).toContainText("02 // TRANSPARÊNCIA");
    await expect(page.locator("body")).toContainText("03 // COMO FUNCIONA");
    await expect(page.locator("body")).toContainText("Do Pix à ativação em segundos");
    await expect(page.locator("body")).toContainText("04 // DIFERENCIAIS");
    await expect(page.locator("body")).toContainText("Por que escolher a Overclock Store");
    await expect(page.locator("body")).toContainText("05 // ANTES DE COMPRAR");
    await expect(page.locator("body")).toContainText("O que conferir antes de fechar o pedido");
    await expect(page.locator("body")).toContainText("06 // DÚVIDAS");
    await expect(page.locator("body")).toContainText("Perguntas Frequentes");
    await expect(page.locator("body")).toContainText("07 // COMUNIDADE");
    await expect(page.locator("body")).toContainText("É no Discord que tudo acontece primeiro");

    // 6. Footer oficial com aviso legal e ano dinâmico
    await expect(page.locator("footer")).toContainText("Overclock Store — Licenças digitais, spoofers e utilitários");
    await expect(page.locator("footer")).toContainText("Loja independente de licenças digitais");
    await expect(page.locator("footer")).toContainText("PIX VIA MERCADO PAGO");
    await expect(page.locator("footer")).not.toContainText("CARTÃO");
    await expect(page.locator("footer")).not.toContainText("CRIPTO (BTC/USDT)");
  });

  test("2. Home: Estado vazio elegante quando 0 produtos cadastrados no catálogo", async ({ page }) => {
    await page.route("**/api/products*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          products: [],
        }),
      });
    });

    await page.goto("/");
    await expect(page.locator("body")).toContainText("Catálogo em Preparação");
    await expect(page.locator("body")).toContainText("Nenhum produto cadastrado no momento.");
  });

  test("3. Status dos Produtos (/status): Dados transparentes sem métricas inventadas", async ({ page }) => {
    await page.route("**/api/status", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          products: [
            {
              id: "p1",
              name: "Software Teste Alpha",
              slug: "software-teste",
              category: "Utilitário",
              status: "ONLINE",
              version: "v1.2.0",
              updatedAt: "2026-11-20T10:00:00.000Z",
            },
          ],
          services: [],
          totalCount: 1,
        }),
      });
    });

    await page.goto("/status");
    await expect(page.locator("h1")).toContainText("Status dos Produtos");
    await expect(page.locator("body")).toContainText("Software Teste Alpha");
    await expect(page.locator("body")).toContainText("ONLINE");
    await expect(page.locator("body")).toContainText("v1.2.0");

    // Garante que não existem alegações de latência ou servidores inventados
    await expect(page.locator("body")).not.toContainText("Clusters BR/US");
    await expect(page.locator("body")).not.toContainText("142 dias sem incidentes");
  });

  test("4. Status dos Produtos: Estado vazio quando 0 produtos e serviços cadastrados", async ({ page }) => {
    await page.route("**/api/status", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          products: [],
          services: [],
          totalCount: 0,
        }),
      });
    });

    await page.goto("/status");
    await expect(page.locator("body")).toContainText("Nenhum produto listado no momento");
  });

  test("5. Avaliações (/reviews): Estado vazio sem notas inventadas", async ({ page }) => {
    await page.route("**/api/reviews*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          totalCount: 0,
          averageRating: 0,
          distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
          reviews: [],
        }),
      });
    });

    await page.goto("/reviews");
    await expect(page.locator("h1")).toContainText("Avaliações Verificadas de Clientes");
    await expect(page.locator("body")).toContainText("Ainda não existem avaliações publicadas");
    await expect(page.locator("body")).toContainText("Somente clientes com compras concluídas podem avaliar");

    // Garante ausência de nota fictícia 5.0 ou contadores hardcoded
    await expect(page.locator("body")).not.toContainText("Baseado em 5 compras aprovadas");
  });

  test("6. Avaliações (/reviews): Exibição de avaliações aprovadas com badge Compra Verificada", async ({ page }) => {
    await page.route("**/api/reviews*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          totalCount: 1,
          averageRating: 5.0,
          distribution: { 5: 1, 4: 0, 3: 0, 2: 0, 1: 0 },
          reviews: [
            {
              id: "rev-real-1",
              authorName: "Maycon S.",
              productName: "Software Apex Pro",
              productSlug: "software-apex-pro",
              category: "Utilitário",
              rating: 5,
              comment: "Instalação super rápida e suporte excelente em português no Discord!",
              isVerifiedPurchase: true,
              createdAt: "20/11/2026",
            },
          ],
        }),
      });
    });

    await page.goto("/reviews");
    await expect(page.locator("body")).toContainText("Maycon S.");
    await expect(page.locator("body")).toContainText("Compra Verificada");
    await expect(page.locator("body")).toContainText("Instalação super rápida e suporte excelente");
  });

  test("7. Catálogo (/products): Listagem dinâmica sem alegações inventadas de tempo", async ({ page }) => {
    await page.route("**/api/products*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          products: [
            {
              id: "prod-cat-1",
              name: "Utilitário Gamer X",
              slug: "utilitario-gamer-x",
              category: "Otimizador",
              shortDescription: "Utilitário de alto desempenho para PC.",
              status: "ONLINE",
              currentVersion: "v2.0",
              variants: [{ id: "v1", name: "Mensal", priceCents: 4990 }],
            },
          ],
        }),
      });
    });

    await page.goto("/products");
    await expect(page.locator("body")).toBeVisible();
    await expect(page.locator("h1")).toContainText("Softwares & Licenças");
    await expect(page.locator("body")).toContainText("Utilitário Gamer X");
    await expect(page.locator("body")).not.toContainText("ENVIO MÉDIO 0.42s");
    await expect(page.locator("body")).not.toContainText("SERVIDOR BR-01");
  });

  test("8. Pedido Pix (/order/[id]): QR Code e Copia e Cola legítimos", async ({ page }) => {
    await page.route("**/api/orders/ord-test-real", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          order: {
            id: "ord-test-real",
            orderNumber: "ORD-2026-8888",
            status: "PENDING",
            totalCents: 7990,
            items: [
              {
                id: "item-1",
                productName: "Software Pro",
                variantName: "Acesso Mensal",
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

    await page.goto("/order/ord-test-real");
    await expect(page.locator("body")).toContainText("R$ 79,90");
    await expect(page.locator("body")).toContainText("CÓDIGO PIX COPIA E COLA");
    const qrImage = page.locator("img[alt*='QR Code Pix']");
    await expect(qrImage).toBeVisible();
  });

  test("9. Dashboard: Histórico de pedidos e fluxo de Avaliar Compra", async ({ page, context }) => {
    await context.addCookies([
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

    await page.route("**/api/auth/session", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: {
            id: "user-cliente-99",
            username: "cliente_top",
            fullName: "Cliente Satisfeito",
            email: "cliente@overclockstore.com.br",
            role: "CUSTOMER",
            isBanned: false,
          },
          expires: new Date(Date.now() + 86400000).toISOString(),
        }),
      });
    });

    await page.route("**/api/client/profile", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: {
            id: "user-cliente-99",
            username: "cliente_top",
            fullName: "Cliente Satisfeito",
            email: "cliente@overclockstore.com.br",
            role: "CUSTOMER",
            isBanned: false,
            discordId: null,
            isDiscordVerified: false,
          },
        }),
      });
    });

    // Mock de pedidos com um pedido concluído apto a avaliar
    await page.route("**/api/client/orders", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          orders: [
            {
              id: "ord-comp-1",
              orderNumber: "ORD-2026-9999",
              status: "COMPLETED",
              productName: "Software Pro Gamer",
              productSlug: "software-pro-gamer",
              productId: "prod-1",
              variantName: "Mensal",
              amountCents: 4990,
              amountFormatted: "R$ 49,90",
              paymentMethod: "PIX",
              createdAt: "20/11/2026",
              hasReview: false,
              reviewStatus: null,
              reviewRating: null,
            },
          ],
        }),
      });
    });

    await page.route("**/api/client/licenses", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, licenses: [] }),
      });
    });

    // Mock do envio de avaliação
    await page.route("**/api/client/reviews", async (route) => {
      const data = await route.request().postDataJSON();
      expect(data.orderId).toBe("ord-comp-1");
      expect(data.rating).toBe(5);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          message: "Avaliação enviada com sucesso! Ela passará por moderação antes de ser publicada.",
        }),
      });
    });

    await page.goto("/dashboard");
    await expect(page.locator("h1")).toContainText("OVERCLOCK");

    const ordersTab = page.locator("button:has-text('Histórico de Pedidos')").first();
    await ordersTab.click();

    await expect(page.locator("body")).toContainText("ORD-2026-9999");
    await expect(page.locator("body")).toContainText("CONCLUÍDO");

    // Clica no botão Avaliar Compra
    const reviewBtn = page.locator("button:has-text('Avaliar Compra')").first();
    await expect(reviewBtn).toBeVisible();
    await reviewBtn.click();

    // Modal de avaliação abre
    await expect(page.locator("body")).toContainText("Avaliar Compra");
    await expect(page.locator("body")).toContainText("Software Pro Gamer");

    // Preenche comentário
    const textarea = page.locator("textarea");
    await textarea.fill("Excelente atendimento e funcionamento 100%!");

    // Envia formulário
    const submitBtn = page.locator("button:has-text('Enviar Avaliação')").first();
    await submitBtn.click();

    // Mensagem de sucesso
    await expect(page.locator("body")).toContainText("Avaliação Enviada!");
  });

  test("10. Autenticação: Login, Cadastro e Recuperação de Senha seguros", async ({ page }) => {
    // 1. Login
    await page.goto("/login");
    const emailInput = page.locator("input[placeholder='seu_email@exemplo.com']");
    await expect(emailInput).toBeVisible();

    // 2. Bloqueio por conta banida
    await page.goto("/login?error=BannedAccount");
    await expect(page.locator("body")).toContainText("Esta conta foi suspensa por violação dos termos de uso e segurança.");

    // 3. Recuperação de Senha
    await page.goto("/forgot-password");
    await expect(page.locator("h1, h2")).toContainText("Esqueceu sua senha?");
    await expect(page.locator("input[type='email']")).toBeVisible();
  });
});
