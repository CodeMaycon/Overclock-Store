import { PrismaClient, Role, ServiceHealthStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("⚡ [SEED] Preparando ambiente Overclock Store para produtos reais...");

  const targetAdminEmail = "maycon.sm7@hotmail.com";

  // 1. Garante que maycon.sm7@hotmail.com existe como ADMIN
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
    console.log(`✓ Administrador principal confirmado: ${adminUser.email}`);
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
    console.log(`✓ Administrador principal criado: ${adminUser.email}`);
  }

  // 2. Remove contas de teste (mantendo o admin real)
  await prisma.session.deleteMany({
    where: { userId: { not: adminUser.id } },
  });
  await prisma.account.deleteMany({
    where: { userId: { not: adminUser.id } },
  });
  await prisma.user.deleteMany({
    where: { id: { not: adminUser.id } },
  });

  // 3. Garante Nós de Infraestrutura da página de Status
  const statusServicesCount = await prisma.statusService.count();
  if (statusServicesCount === 0) {
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
    console.log("✓ Nós de infraestrutura criados na página de Status.");
  }

  console.log("🚀 [SEED] Base limpa com sucesso. Pronto para produtos reais!");
}

main()
  .catch((e) => {
    console.error("❌ Erro durante seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
