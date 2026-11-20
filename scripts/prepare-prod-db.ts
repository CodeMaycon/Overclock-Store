import { PrismaClient, Role, ServiceHealthStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("⚡ [PROD PREPARE] Iniciando preparação do banco de dados para produção...");

  const targetAdminEmail = "maycon.sm7@hotmail.com";

  // 1. Localiza ou cria o usuário administrador único
  let adminUser = await prisma.user.findUnique({
    where: { email: targetAdminEmail },
  });

  if (adminUser) {
    adminUser = await prisma.user.update({
      where: { id: adminUser.id },
      data: {
        role: Role.ADMIN,
        isBanned: false,
        banReason: null,
      },
    });
    console.log(`✓ Usuário existente promovido a ADMIN: ${adminUser.email} (ID: ${adminUser.id})`);
  } else {
    const passwordHash = await bcrypt.hash("Overclock@2026Admin", 10);
    adminUser = await prisma.user.create({
      data: {
        email: targetAdminEmail,
        username: "maycon",
        fullName: "Maycon Souza",
        role: Role.ADMIN,
        isBanned: false,
        passwordHash,
      },
    });
    console.log(`✓ Novo usuário ADMIN criado com sucesso: ${adminUser.email}`);
  }

  // 2. Limpeza de pedidos, pagamentos, itens e licenças de teste
  console.log("🧹 Limpando dados de teste e mockups...");
  await prisma.hWIDResetRequest.deleteMany();
  await prisma.licenseKey.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.order.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.changelog.deleteMany();
  await prisma.review.deleteMany();
  await prisma.coupon.deleteMany();

  // 3. Remove incidentes e serviços de status atrelados a produtos mockados
  await prisma.statusIncident.deleteMany();
  await prisma.serviceDailyUptime.deleteMany();
  await prisma.statusService.deleteMany({
    where: {
      OR: [
        { slug: "apex-legends-module" },
        { productId: { not: null } },
      ],
    },
  });

  // 4. Remove produtos mockados
  await prisma.product.deleteMany();

  // 5. Remove sessões, contas e usuários fictícios/de teste (mantendo apenas o admin real)
  await prisma.session.deleteMany({
    where: { userId: { not: adminUser.id } },
  });
  await prisma.account.deleteMany({
    where: { userId: { not: adminUser.id } },
  });
  const deletedUsers = await prisma.user.deleteMany({
    where: { id: { not: adminUser.id } },
  });
  console.log(`✓ ${deletedUsers.count} contas fictícias/de teste removidas.`);

  // 6. Limpa logs de auditoria de teste e registra evento inicial de produção
  await prisma.auditLog.deleteMany();
  await prisma.auditLog.create({
    data: {
      userId: adminUser.id,
      actorType: "ADMIN",
      action: "PRODUCTION_DATABASE_INITIALIZED",
      entityType: "System",
      entityId: "OVERCLOCK_STORE",
      metadata: {
        adminEmail: targetAdminEmail,
        timestamp: new Date().toISOString(),
        description: "Limpeza de dados mockups concluída. Base pronta para cadastro dos produtos reais das parcerias.",
      },
    },
  });

  // 7. Garante serviços básicos de infraestrutura no Status (sem jogos fictícios)
  const existingInfraServices = await prisma.statusService.count();
  if (existingInfraServices === 0) {
    await prisma.statusService.createMany({
      data: [
        {
          name: "Infraestrutura de Autenticação & API",
          slug: "auth-api-cluster",
          description: "Clusters distribuídos de autenticação e validação de tokens",
          status: ServiceHealthStatus.OPERATIONAL,
          uptimePercentage: 99.99,
          orderPriority: 1,
        },
        {
          name: "Serviço de Injeção & Drivers Ring-0",
          slug: "kernel-injection-engine",
          description: "Carregamento seguro de drivers e integridade de memória",
          status: ServiceHealthStatus.OPERATIONAL,
          uptimePercentage: 99.95,
          orderPriority: 2,
        },
        {
          name: "Sistema de Freeze Time Preventivo",
          slug: "freeze-time-controller",
          description: "Congelamento automático de tempo durante atualizações de patches",
          status: ServiceHealthStatus.OPERATIONAL,
          uptimePercentage: 100.0,
          orderPriority: 3,
        },
      ],
    });
    console.log("✓ 3 Nós de infraestrutura criados na página de Status.");
  }

  console.log("\n🚀 [SUCESSO] Base de dados da Overclock Store 100% limpa e pronta para produtos reais!");
  console.log(`- Administrador Único: ${adminUser.email} (Role: ${adminUser.role})`);
  console.log("- Total de Produtos: 0 (Catálogo e Home limpos)");
  console.log("- Total de Chaves de Teste: 0");
  console.log("- Total de Pedidos de Teste: 0");
}

main()
  .catch((e) => {
    console.error("❌ Erro ao preparar banco:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
