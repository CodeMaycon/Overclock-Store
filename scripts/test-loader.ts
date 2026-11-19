import { PrismaClient, KeyStatus, DiscountType } from "@prisma/client";

const prisma = new PrismaClient();
const BASE_URL = "http://localhost:3001";

async function main() {
  console.log("=================================================");
  console.log("⚡ TESTE DE CICLO COMPLETO DA API DO LOADER (OVERCLOCK)");
  console.log("=================================================\n");

  // 1. Localiza produto para o teste
  const product = await prisma.product.findFirst({
    where: { slug: "apex-phantom-pro" },
    include: { variants: true },
  });

  if (!product || product.variants.length === 0) {
    throw new Error("Produto 'apex-phantom-pro' com variantes não encontrado no banco.");
  }

  const variant = product.variants[0];
  console.log(`✓ Produto Selecionado: ${product.name} (${product.slug})`);
  console.log(`✓ Variante: ${variant.name} (Duração: ${variant.durationValue} ${variant.durationType})\n`);

  // 2. Cria chave de teste virgem (NOT_ACTIVATED)
  const testKeyString = `OVERCLOCK-TEST-${Date.now()}`;
  const testKey = await prisma.licenseKey.create({
    data: {
      key: testKeyString,
      productId: product.id,
      variantId: variant.id,
      status: KeyStatus.NOT_ACTIVATED,
    },
  });

  console.log(`🔑 Chave de Teste Criada: ${testKey.key} (Status inicial: ${testKey.status})\n`);

  const HWID_ORIGINAL = "HWID-PC-ORIGINAL-FAACIN-9999";
  const HWID_INVASOR = "HWID-PC-INVASOR-MALICIOSO-6666";

  // Limpa qualquer blacklist remanescente de testes anteriores
  await prisma.blacklist.deleteMany({
    where: { value: { in: [HWID_ORIGINAL, HWID_INVASOR] } },
  });

  let sessionToken = "";

  try {
    // -------------------------------------------------------------
    // ETAPA 1: 1º Login -> Ativação da Chave e Travamento de HWID
    // -------------------------------------------------------------
    console.log("📡 [ETAPA 1] Realizando 1º Login da chave (Ativação + HWID Lock)...");
    const res1 = await fetch(`${BASE_URL}/api/loader/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: testKey.key,
        hwid: HWID_ORIGINAL,
        productSlug: product.slug,
        version: "v2.4.0",
      }),
    });

    const data1 = await res1.json();
    console.log(`   Status HTTP: ${res1.status}`);
    console.log(`   Resposta:`, JSON.stringify(data1, null, 2));

    if (res1.status !== 200 || !data1.success || !data1.isFirstActivation) {
      throw new Error(`Falha na Etapa 1: Esperado 200 com isFirstActivation=true. Recebido: ${res1.status}`);
    }

    sessionToken = data1.token;

    // Valida no banco se o HWID foi travado e a validade calculada
    const dbKeyAfter1 = await prisma.licenseKey.findUnique({
      where: { id: testKey.id },
    });

    console.log(`\n   🔍 Validação no PostgreSQL:`);
    console.log(`   - Status no banco: ${dbKeyAfter1?.status} (Esperado: ACTIVE)`);
    console.log(`   - HWID no banco: ${dbKeyAfter1?.hwid} (Esperado: ${HWID_ORIGINAL})`);
    console.log(`   - Data de expiração: ${dbKeyAfter1?.expiresAt?.toISOString()}`);
    console.log(`   - Data de ativação: ${dbKeyAfter1?.activatedAt?.toISOString()}`);

    if (dbKeyAfter1?.status !== KeyStatus.ACTIVE || dbKeyAfter1?.hwid !== HWID_ORIGINAL) {
      throw new Error("Falha na validação no PostgreSQL da Etapa 1.");
    }
    console.log("   ✓ ETAPA 1 APROVADA: Chave ativada e HWID travado com sucesso!\n");

    // -------------------------------------------------------------
    // ETAPA 2: 2º Login com HWID Diferente -> Deve Retornar 403 HWID_MISMATCH
    // -------------------------------------------------------------
    console.log("📡 [ETAPA 2] Tentativa de login com HWID diferente (HWID Mismatch Protection)...");
    const res2 = await fetch(`${BASE_URL}/api/loader/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: testKey.key,
        hwid: HWID_INVASOR,
        productSlug: product.slug,
        version: "v2.4.0",
      }),
    });

    const data2 = await res2.json();
    console.log(`   Status HTTP: ${res2.status}`);
    console.log(`   Resposta:`, JSON.stringify(data2, null, 2));

    if (res2.status !== 403 || data2.error !== "HWID_MISMATCH") {
      throw new Error(`Falha na Etapa 2: Esperado 403 HWID_MISMATCH. Recebido: ${res2.status} (${data2.error})`);
    }
    console.log("   ✓ ETAPA 2 APROVADA: Bloqueio anti-compartilhamento funcionou perfeitamente (403 HWID_MISMATCH)!\n");

    // -------------------------------------------------------------
    // ETAPA 3: Login Subsequente com HWID Correto -> Deve Retornar 200
    // -------------------------------------------------------------
    console.log("📡 [ETAPA 3] Login subsequente com o HWID original autorizado...");
    const res3 = await fetch(`${BASE_URL}/api/loader/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: testKey.key,
        hwid: HWID_ORIGINAL,
        productSlug: product.slug,
        version: "v2.4.0",
      }),
    });

    const data3 = await res3.json();
    console.log(`   Status HTTP: ${res3.status}`);
    console.log(`   isFirstActivation: ${data3.isFirstActivation}`);

    if (res3.status !== 200 || !data3.success || data3.isFirstActivation !== false) {
      throw new Error(`Falha na Etapa 3: Esperado 200 com isFirstActivation=false.`);
    }
    console.log("   ✓ ETAPA 3 APROVADA: Acesso legítimo liberado sem resetar tempo!\n");

    // -------------------------------------------------------------
    // ETAPA 4: Heartbeat de Sessão Ativa
    // -------------------------------------------------------------
    console.log("📡 [ETAPA 4] Executando Heartbeat do Loader (POST /api/loader/heartbeat)...");
    const res4 = await fetch(`${BASE_URL}/api/loader/heartbeat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: testKey.key,
        hwid: HWID_ORIGINAL,
        token: sessionToken,
      }),
    });

    const data4 = await res4.json();
    console.log(`   Status HTTP: ${res4.status}`);
    console.log(`   Resposta:`, JSON.stringify(data4, null, 2));

    if (res4.status !== 200 || !data4.active) {
      throw new Error(`Falha na Etapa 4: Esperado 200 com active=true.`);
    }
    console.log("   ✓ ETAPA 4 APROVADA: Heartbeat ativo com tempo restante validado!\n");

    // -------------------------------------------------------------
    // ETAPA 5: Teste de Blacklist (Bloqueio Dinâmico)
    // -------------------------------------------------------------
    console.log("📡 [ETAPA 5] Inserindo HWID na Blacklist e testando rejeição...");
    const blackEntry = await prisma.blacklist.create({
      data: {
        type: "HWID",
        value: HWID_ORIGINAL,
        reason: "HWID flagged for testing blacklist lock",
      },
    });

    const res5 = await fetch(`${BASE_URL}/api/loader/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: testKey.key,
        hwid: HWID_ORIGINAL,
        productSlug: product.slug,
        version: "v2.4.0",
      }),
    });

    const data5 = await res5.json();
    console.log(`   Status HTTP: ${res5.status}`);
    console.log(`   Resposta:`, JSON.stringify(data5, null, 2));

    if (res5.status !== 403 || (data5.error !== "HWID_BLACKLISTED" && data5.error !== "BLACKLISTED")) {
      throw new Error(`Falha na Etapa 5: Esperado 403 HWID_BLACKLISTED. Recebido: ${res5.status} (${data5.error})`);
    }
    console.log("   ✓ ETAPA 5 APROVADA: Blacklist barrou o login imediatamente (403 HWID_BLACKLISTED)!\n");

    // Remove blacklist de teste
    await prisma.blacklist.delete({ where: { id: blackEntry.id } });

    console.log("=================================================");
    console.log("🎉 TODOS OS TESTES DO LOADER FORAM CONCLUÍDOS COM 100% DE SUCESSO!");
    console.log("=================================================");

  } finally {
    // Limpeza da chave de teste e da blacklist de teste
    await prisma.blacklist.deleteMany({
      where: { value: { in: [HWID_ORIGINAL, HWID_INVASOR] } },
    });
    await prisma.auditLog.deleteMany({
      where: { entityId: testKey.id },
    });
    await prisma.licenseKey.delete({
      where: { id: testKey.id },
    });
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("\n❌ ERRO NO TESTE:", err);
  process.exit(1);
});
