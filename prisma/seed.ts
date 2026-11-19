import { PrismaClient, Role, ProductStatus, DurationType, StockType, ServiceHealthStatus, DiscountType, KeyStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("⚡ [SEED] Iniciando população do banco de dados Overclock Store...");

  // 1. Limpeza segura na ordem correta
  await prisma.licenseKey.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.order.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.statusIncident.deleteMany();
  await prisma.serviceDailyUptime.deleteMany();
  await prisma.statusService.deleteMany();
  await prisma.product.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();

  console.log("✓ Tabelas limpas para re-seed.");

  // 2. Usuários Iniciais
  const adminPasswordHash = await bcrypt.hash("OverclockAdmin@2026", 10);
  const userPasswordHash = await bcrypt.hash("Cliente@2026", 10);
  const resellerPasswordHash = await bcrypt.hash("Revendedor@2026", 10);

  const adminUser = await prisma.user.create({
    data: {
      username: "admin",
      email: "admin@overclockstore.com",
      fullName: "Administrador Overclock",
      role: Role.ADMIN,
      passwordHash: adminPasswordHash,
    },
  });

  const customerUser = await prisma.user.create({
    data: {
      username: "cliente",
      email: "cliente@overclockstore.com",
      fullName: "Cliente Exemplo",
      role: Role.CUSTOMER,
      passwordHash: userPasswordHash,
    },
  });

  const resellerUser = await prisma.user.create({
    data: {
      username: "revendedor",
      email: "revendedor@overclockstore.com",
      fullName: "Revendedor Autorizado",
      role: Role.RESELLER,
      passwordHash: resellerPasswordHash,
    },
  });

  console.log(`✓ 3 Usuários criados:
    - Admin: admin@overclockstore.com / OverclockAdmin@2026
    - Cliente: cliente@overclockstore.com / Cliente@2026
    - Revendedor: revendedor@overclockstore.com / Revendedor@2026`);

  // 3. Produtos em Destaque
  const p1 = await prisma.product.create({
    data: {
      name: "Apex Phantom Pro",
      slug: "apex-phantom-pro",
      shortDescription: "O padrão definitivo em visibilidade e previsão tática para Apex Legends.",
      fullDescription: "Desenvolvido com arquitetura proprietária de leitura direta de memória protegida e modo StreamProof com zero flickering. Totalmente invisível em gravações OBS e transmissões ao vivo com compatibilidade total para monitores 240Hz+.",
      category: "Battle Royale",
      status: ProductStatus.ONLINE,
      videoUrl: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
      images: [
        "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1200&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=1200&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=1200&auto=format&fit=crop",
      ],
      specifications: {
        os: "Windows 10 / 11 (21H2 - 24H2)",
        processor: "Intel & AMD (Todas as gerações)",
        anticheat: "Easy Anti-Cheat (EAC Server-side)",
        streamProof: "100% Nativo (OBS, Discord, GeForce)",
      },
      features: [
        "ESP Tático 3D com delimitação precisa de caixas e vida",
        "Previsão balística em tempo real para snipers",
        "Radar HUD 2D flutuante e personalizável",
        "Injeção segura Ring-0 com proteção contra memory scans",
      ],
      currentVersion: "v4.8.2-PRO",
      isFeatured: true,
      orderPriority: 10,
    },
  });

  const p2 = await prisma.product.create({
    data: {
      name: "Warzone Ghost Ring-0",
      slug: "warzone-ghost-ring0",
      shortDescription: "Driver Hypervisor com total isolamento em Ring-0 e proteção anti-scan.",
      fullDescription: "Construído sobre nossa plataforma de virtualização em nível de kernel, operando abaixo da camada do sistema operacional para garantir máxima estabilidade e imunidade a checagens de integridade em Call of Duty.",
      category: "FPS Tático",
      status: ProductStatus.ONLINE,
      images: [
        "https://images.unsplash.com/photo-1552824796-03c0316447c2?q=80&w=1200&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?q=80&w=1200&auto=format&fit=crop",
      ],
      specifications: {
        os: "Windows 10 / 11 (x64)",
        processor: "Intel & AMD (Virtualização habilitada)",
        anticheat: "Ricochet Kernel Driver",
        streamProof: "Sim (Modo Camuflado)",
      },
      features: [
        "Glow Glow ESP e caixas 3D com filtragem por distância",
        "Triggerbot configurável com delay humanizado",
        "Compensação dinâmica de recuo de armas",
        "Suporte a todos os modos do Warzone e Multiplayer",
      ],
      currentVersion: "v2.1.0-HYPER",
      isFeatured: true,
      orderPriority: 9,
    },
  });

  const p3 = await prisma.product.create({
    data: {
      name: "Valorant Discreet Engine",
      slug: "valorant-discreet-engine",
      shortDescription: "Tecnologia de hardware emulação privada com suporte a TPM 2.0 e Secure Boot.",
      fullDescription: "Solução premium de altíssima segurança criada especificamente para os ambientes mais rigorosos de anti-cheat, com leitura segura via microcontrolador externo e zero hooks no processo do jogo.",
      category: "Competitivo",
      status: ProductStatus.ONLINE,
      images: [
        "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?q=80&w=1200&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1548484352-ea579e5233a8?q=80&w=1200&auto=format&fit=crop",
      ],
      specifications: {
        os: "Windows 10 / 11 (UEFI / TPM 2.0)",
        processor: "Intel Core ou AMD Ryzen",
        anticheat: "Vanguard Ring-0 Shield",
        streamProof: "Totalmente indetectável em tela cheia",
      },
      features: [
        "Glow com suavização de cor por visibilidade",
        "Controle de spray humanizado por curva Bézier",
        "Injeção temporária que não deixa resíduos no registro",
        "Atualizações instantâneas automáticas via Cloud",
      ],
      currentVersion: "v1.9.4-LEAGUE",
      isFeatured: true,
      orderPriority: 8,
    },
  });

  console.log("✓ 3 Produtos criados.");

  // 4. Variantes de Preço e Chaves de Estoque
  const products = [p1, p2, p3];

  for (const prod of products) {
    const v1 = await prisma.productVariant.create({
      data: {
        productId: prod.id,
        name: "Passe Diário (24h)",
        durationValue: 24,
        durationType: DurationType.HOURS,
        priceCents: 2490, // R$ 24,90
        compareAtPriceCents: 3500,
        stockType: StockType.BATCH,
        orderPriority: 1,
      },
    });

    const v2 = await prisma.productVariant.create({
      data: {
        productId: prod.id,
        name: "Passe Semanal (7 Dias)",
        durationValue: 7,
        durationType: DurationType.DAYS,
        priceCents: 7990, // R$ 79,90
        compareAtPriceCents: 11000,
        stockType: StockType.BATCH,
        orderPriority: 2,
      },
    });

    const v3 = await prisma.productVariant.create({
      data: {
        productId: prod.id,
        name: "Passe Mensal (30 Dias)",
        durationValue: 30,
        durationType: DurationType.DAYS,
        priceCents: 16990, // R$ 169,90
        compareAtPriceCents: 23000,
        stockType: StockType.BATCH,
        orderPriority: 3,
      },
    });

    const v4 = await prisma.productVariant.create({
      data: {
        productId: prod.id,
        name: "Licença Vitalícia (Lifetime)",
        durationValue: 0,
        durationType: DurationType.LIFETIME,
        priceCents: 49990, // R$ 499,90
        compareAtPriceCents: 69900,
        stockType: StockType.BATCH,
        orderPriority: 4,
      },
    });

    // Gera 5 chaves de estoque para cada variante
    for (const variant of [v1, v2, v3, v4]) {
      for (let i = 1; i <= 5; i++) {
        const randomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
        await prisma.licenseKey.create({
          data: {
            productId: prod.id,
            variantId: variant.id,
            key: `OVERCLOCK-${prod.slug.substring(0, 4).toUpperCase()}-${variant.durationValue}D-${randomCode}-${i}026`,
            status: KeyStatus.UNASSIGNED,
          },
        });
      }
    }
  }

  console.log("✓ Variantes e 60 Chaves de Licença pré-alocadas no estoque.");

  // 5. Serviços da Página de Status
  await prisma.statusService.create({
    data: {
      name: "Infraestrutura de Autenticação & API",
      slug: "auth-api-cluster",
      description: "Clusters distribuídos de autenticação e validação de tokens",
      status: ServiceHealthStatus.OPERATIONAL,
      uptimePercentage: 99.99,
      orderPriority: 1,
    },
  });

  await prisma.statusService.create({
    data: {
      name: "Serviço de Injeção & Drivers Ring-0",
      slug: "kernel-injection-engine",
      description: "Carregamento seguro de drivers e integridade de memória",
      status: ServiceHealthStatus.OPERATIONAL,
      uptimePercentage: 99.95,
      orderPriority: 2,
    },
  });

  await prisma.statusService.create({
    data: {
      name: "Módulo Apex Legends",
      slug: "apex-legends-module",
      description: "Módulo ativo com sincronização de versão contínua",
      status: ServiceHealthStatus.OPERATIONAL,
      productId: p1.id,
      uptimePercentage: 99.92,
      orderPriority: 3,
    },
  });

  await prisma.statusService.create({
    data: {
      name: "Sistema de Freeze Time Preventivo",
      slug: "freeze-time-controller",
      description: "Congelamento automático de tempo durante updates de patches",
      status: ServiceHealthStatus.OPERATIONAL,
      uptimePercentage: 100.0,
      orderPriority: 4,
    },
  });

  console.log("✓ 4 Serviços de Telemetria criados na tabela StatusService.");

  // 6. Cupom Promocional
  await prisma.coupon.create({
    data: {
      code: "OVERCLOCK15",
      discountType: DiscountType.PERCENTAGE,
      discountValue: 15,
      maxUses: 1000,
      isActive: true,
    },
  });

  console.log("✓ Cupom promocional 'OVERCLOCK15' (15%) cadastrado com sucesso.");

  console.log("🚀 [SEED] Banco de dados populado com sucesso!");
}

main()
  .catch((e) => {
    console.error("❌ Erro durante o seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
