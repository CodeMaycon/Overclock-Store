export interface ProductVariant {
  id: string;
  name: string;
  durationValue: number;
  durationType: 'HOURS' | 'DAYS' | 'LIFETIME';
  priceCents: number;
  compareAtPriceCents?: number;
  stockCount: number;
  isPopular?: boolean;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  shortDescription: string;
  fullDescription: string;
  category: string;
  status: 'ONLINE' | 'MAINTENANCE' | 'OUT_OF_STOCK';
  badge?: string;
  videoUrl?: string; // YouTube ou MP4 direto
  images: string[];
  features: string[];
  specifications: {
    os: string;
    processor: string;
    anticheat: string;
    streamProof: string;
    injectionMode: string;
  };
  variants: ProductVariant[];
  currentVersion: string;
  lastUpdated: string;
  rating: number;
  reviewCount: number;
}

export interface StatusService {
  id: string;
  name: string;
  slug: string;
  category: string;
  status: 'OPERATIONAL' | 'DEGRADED' | 'MAINTENANCE' | 'OUTAGE';
  uptimePercentage: number;
  historyBars: ('UP' | 'DEGRADED' | 'DOWN')[]; // 30 dias para preview
  currentIncident?: {
    title: string;
    description: string;
    status: string;
    updatedAt: string;
  };
}

export interface Changelog {
  id: string;
  productSlug: string;
  productName: string;
  version: string;
  title: string;
  date: string;
  type: 'FEATURE' | 'SECURITY' | 'MAINTENANCE';
  changes: string[];
}

export interface Review {
  id: string;
  productName: string;
  userName: string;
  userAvatar: string;
  rating: number;
  date: string;
  isVerified: boolean;
  comment: string;
  productPlan: string;
}

export interface LicenseItem {
  id: string;
  key: string;
  productName: string;
  productSlug: string;
  variantName: string;
  status: 'ACTIVE' | 'NOT_ACTIVATED' | 'FROZEN' | 'EXPIRED' | 'REVOKED';
  activatedAt?: string;
  expiresAt?: string;
  remainingTime: string;
  hwid: string | null;
  lastHwidResetAt?: string;
  downloadAvailable: boolean;
  version: string;
}

export interface MockUser {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: 'CUSTOMER' | 'RESELLER' | 'ADMIN';
  isLoggedIn: boolean;
  isDiscordLinked: boolean;
  discordId?: string;
  discordUsername?: string;
  discordAvatar?: string;
  avatarUrl: string;
}

// ----------------------------------------------------
// DADOS MOCKADOS
// ----------------------------------------------------

export const MOCK_USER: MockUser = {
  id: "usr_01J8K90LMN",
  username: "cyber_ghost",
  fullName: "Alexandre Silva",
  email: "alexandre.silva@exemplo.com",
  role: "ADMIN",
  isLoggedIn: true,
  isDiscordLinked: true,
  discordId: "891238912093812903",
  discordUsername: "cyberghost#9901",
  discordAvatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80",
  avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80"
};

export const MOCK_PRODUCTS: Product[] = [
  {
    id: "prod_apex_01",
    slug: "apex-phantom-pro",
    name: "Apex Phantom Pro",
    tagline: "O padrão definitivo em visibilidade e previsão tática para Apex Legends.",
    shortDescription: "Injeção instantânea via kernel driver indetectável com bypass completo de EAC.",
    fullDescription: "Desenvolvido com arquitetura proprietária de leitura direta de memória protegida e modo StreamProof com zero flickering. Totalmente invisível em gravações OBS e transmissões ao vivo com compatibilidade total para monitores 240Hz+.",
    category: "Battle Royale",
    status: "ONLINE",
    badge: "Mais Popular",
    videoUrl: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ", // Demonstração com vídeo
    images: [
      "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1000&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1000&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=1000&auto=format&fit=crop&q=80"
    ],
    features: [
      "ESP Tático 3D com delimitação precisa de caixas e vida",
      "Previsão balística em tempo real para snipers",
      "Radar HUD 2D flutuante e personalizável",
      "Injeção segura Ring-0 com proteção contra memory scans",
      "StreamProof nativo (oculto no OBS, Discord e gravações)",
      "Entrega 100% instantânea pós-pagamento"
    ],
    specifications: {
      os: "Windows 10 / 11 (21H2 - 24H2)",
      processor: "Intel & AMD (Todas as gerações)",
      anticheat: "Easy Anti-Cheat (EAC Server-side)",
      streamProof: "100% Nativo (OBS, Discord, GeForce)",
      injectionMode: "Kernel Memory Loader"
    },
    variants: [
      { id: "e9325682-0783-435a-8e01-e79a6b18afd0", name: "Passe Diário (24h)", durationValue: 24, durationType: "HOURS", priceCents: 2490, compareAtPriceCents: 3500, stockCount: 5 },
      { id: "5dab1f79-a2da-404c-b28a-7a3fccdef7c3", name: "Passe Semanal (7 Dias)", durationValue: 7, durationType: "DAYS", priceCents: 7990, compareAtPriceCents: 11000, stockCount: 5 },
      { id: "c169655b-8dc4-4588-9308-e138afec4153", name: "Passe Mensal (30 Dias)", durationValue: 30, durationType: "DAYS", priceCents: 16990, compareAtPriceCents: 23000, stockCount: 5, isPopular: true },
      { id: "8dcfa11f-81dd-4b62-b870-603cdf4cd477", name: "Licença Vitalícia (Lifetime)", durationValue: 0, durationType: "LIFETIME", priceCents: 49990, compareAtPriceCents: 69900, stockCount: 5 }
    ],
    currentVersion: "v4.8.2-PRO",
    lastUpdated: "Hoje, às 04:12",
    rating: 4.95,
    reviewCount: 328
  },
  {
    id: "prod_warzone_02",
    slug: "warzone-ghost-ring0",
    name: "Warzone Ghost Ring-0",
    tagline: "Driver Hypervisor com total isolamento em Ring-0 e proteção anti-scan.",
    shortDescription: "Construído sobre nossa plataforma de virtualização em nível de kernel com proteção anti-scan.",
    fullDescription: "Construído sobre nossa plataforma de virtualização em nível de kernel, operando abaixo da camada do sistema operacional para garantir máxima estabilidade e imunidade a checagens de integridade em Call of Duty.",
    category: "FPS Tático",
    status: "ONLINE",
    badge: "Indetectado",
    images: [
      "https://images.unsplash.com/photo-1552824796-03c0316447c2?w=1000&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?w=1000&auto=format&fit=crop&q=80"
    ],
    features: [
      "Glow ESP e caixas 3D com filtragem por distância",
      "Triggerbot configurável com delay humanizado",
      "Compensação dinâmica de recuo de armas",
      "Suporte a todos os modos do Warzone e Multiplayer"
    ],
    specifications: {
      os: "Windows 10 / 11 (x64)",
      processor: "Intel & AMD (Virtualização habilitada)",
      anticheat: "Ricochet Kernel Driver",
      streamProof: "Sim (Modo Camuflado)",
      injectionMode: "Hypervisor Ring-0"
    },
    variants: [
      { id: "var_wz_1d", name: "Passe Diário (24h)", durationValue: 24, durationType: "HOURS", priceCents: 2990, stockCount: 5 },
      { id: "var_wz_7d", name: "Passe Semanal (7 Dias)", durationValue: 7, durationType: "DAYS", priceCents: 8990, compareAtPriceCents: 11990, stockCount: 5 },
      { id: "var_wz_30d", name: "Passe Mensal (30 Dias)", durationValue: 30, durationType: "DAYS", priceCents: 18990, compareAtPriceCents: 24900, stockCount: 5, isPopular: true }
    ],
    currentVersion: "v2.1.0-HYPER",
    lastUpdated: "Ontem",
    rating: 4.88,
    reviewCount: 192
  },
  {
    id: "prod_val_03",
    slug: "valorant-discreet-engine",
    name: "Valorant Discreet Engine",
    tagline: "Tecnologia de hardware emulação privada com suporte a TPM 2.0 e Secure Boot.",
    shortDescription: "Solução premium de altíssima segurança criada especificamente para ambientes rigorosos de anti-cheat.",
    fullDescription: "Solução premium de altíssima segurança criada especificamente para os ambientes mais rigorosos de anti-cheat, com leitura segura via microcontrolador externo e zero hooks no processo do jogo.",
    category: "Competitivo",
    status: "ONLINE",
    badge: "Hardware Emulation",
    images: [
      "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=1000&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1548484352-ea579e5233a8?w=1000&auto=format&fit=crop&q=80"
    ],
    features: [
      "Emulação de hardware físico 1:1 via firmware customizado",
      "ESP Glow vetorial 2D desacoplado do cliente do jogo",
      "Micro-ajuste de precisão com algoritmo de suavização",
      "Compatível com TPM 2.0, HVCI e Secure Boot ativos"
    ],
    specifications: {
      os: "Windows 10 / 11 (x64)",
      processor: "Intel & AMD",
      anticheat: "Vanguard Kernel Driver",
      streamProof: "100% Nativo",
      injectionMode: "External Hardware Emulation"
    },
    variants: [
      { id: "var_val_7d", name: "Passe Semanal (7 Dias)", durationValue: 7, durationType: "DAYS", priceCents: 14990, stockCount: 5 },
      { id: "var_val_30d", name: "Passe Mensal (30 Dias)", durationValue: 30, durationType: "DAYS", priceCents: 34990, compareAtPriceCents: 45000, stockCount: 5 }
    ],
    currentVersion: "v3.4.1-DISCREET",
    lastUpdated: "Hoje",
    rating: 4.98,
    reviewCount: 145
  }
];

export const MOCK_STATUS_SERVICES: StatusService[] = [
  {
    id: "srv_loader",
    name: "Sistema de Injeção & Loader",
    slug: "auth-loader",
    category: "Infraestrutura Core",
    status: "OPERATIONAL",
    uptimePercentage: 99.98,
    historyBars: Array(30).fill('UP')
  },
  {
    id: "srv_apex",
    name: "Phantom Suite: Apex",
    slug: "phantom-apex",
    category: "Softwares Ativos",
    status: "OPERATIONAL",
    uptimePercentage: 99.85,
    historyBars: [...Array(28).fill('UP'), 'DEGRADED', 'UP']
  },
  {
    id: "srv_tactical",
    name: "Spectre Kernel: Tactical",
    slug: "spectre-val",
    category: "Softwares Ativos",
    status: "OPERATIONAL",
    uptimePercentage: 100.0,
    historyBars: Array(30).fill('UP')
  },
  {
    id: "srv_warzone",
    name: "Vortex Vision: Warzone",
    slug: "vortex-warzone",
    category: "Softwares Ativos",
    status: "MAINTENANCE",
    uptimePercentage: 96.4,
    historyBars: [...Array(26).fill('UP'), 'DOWN', 'DOWN', 'DOWN', 'DOWN'],
    currentIncident: {
      title: "Pausa Preventiva: Atualização Oficial do Jogo",
      description: "O jogo recebeu uma atualização de 14GB com novos módulos de integridade. Todas as licenças ativas deste produto foram automaticamente CONGELADAS (Freeze Time ativo). Nenhum segundo de duração será perdido.",
      status: "Em Análise & Testes pelo time de Engenharia",
      updatedAt: "Há 42 minutos"
    }
  },
  {
    id: "srv_discord",
    name: "Sincronização & Bot Discord",
    slug: "discord-sync",
    category: "Integrações",
    status: "OPERATIONAL",
    uptimePercentage: 99.95,
    historyBars: Array(30).fill('UP')
  }
];

export const MOCK_LICENSES: LicenseItem[] = [
  {
    id: "lic_01",
    key: "PHNT-APEX-9821-XKZL-2026",
    productName: "Phantom Suite: Apex",
    productSlug: "phantom-apex",
    variantName: "Plano 30 Dias",
    status: "ACTIVE",
    activatedAt: "2026-11-10 14:30",
    expiresAt: "2026-12-10 14:30",
    remainingTime: "21d 19h 44m",
    hwid: "E8F2-A901-C349-8812-7B4D",
    lastHwidResetAt: "2026-11-10",
    downloadAvailable: true,
    version: "v4.2.1"
  },
  {
    id: "lic_02",
    key: "SPCT-TACT-4410-MMOP-7782",
    productName: "Spectre Kernel: Tactical",
    productSlug: "spectre-val",
    variantName: "Plano 7 Dias",
    status: "NOT_ACTIVATED",
    remainingTime: "7 Dias (Não iniciado)",
    hwid: null,
    downloadAvailable: true,
    version: "v3.0.8"
  },
  {
    id: "lic_03",
    key: "VRTX-WZ2-1109-FREE-ZE99",
    productName: "Vortex Vision: Warzone",
    productSlug: "vortex-warzone",
    variantName: "Plano 30 Dias",
    status: "FROZEN",
    activatedAt: "2026-11-01 10:00",
    expiresAt: "2026-12-01 10:00 (+ Tempo Congelado)",
    remainingTime: "13d 04h (Pausado)",
    hwid: "E8F2-A901-C349-8812-7B4D",
    downloadAvailable: false,
    version: "v5.0.0-rc2"
  }
];

export const MOCK_CHANGELOGS: Changelog[] = [
  {
    id: "chg_01",
    productSlug: "phantom-apex",
    productName: "Phantom Suite: Apex",
    version: "v4.2.1",
    title: "Otimização de Render e Suporte ao Patch 21",
    date: "17 de Novembro, 2026",
    type: "FEATURE",
    changes: [
      "Atualização de offsets para compatibilidade com o último update do jogo",
      "Redução de 35% no consumo de CPU durante renderização de caixas 3D",
      "Novo modo de sensibilidade dinâmica para o Smooth Aimbot",
      "Reforço de segurança no carregador de driver assinado"
    ]
  },
  {
    id: "chg_02",
    productSlug: "spectre-val",
    productName: "Spectre Kernel: Tactical",
    version: "v3.0.8",
    title: "Proteção UEFI Aprimorada e Radar Web",
    date: "14 de Novembro, 2026",
    type: "SECURITY",
    changes: [
      "Nova camada de ofuscação de chamadas de sistema (Syscall Stubs)",
      "Adicionado suporte a compartilhamento de Radar via WebSocket local",
      "Correção de travamento ocasional ao alternar entre resoluções 4K"
    ]
  }
];

export const MOCK_REVIEWS: Review[] = [
  {
    id: "rev_01",
    productName: "Phantom Suite: Apex",
    userName: "Matheus 'Krono' R.",
    userAvatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&auto=format&fit=crop&q=80",
    rating: 5,
    date: "Há 2 dias",
    isVerified: true,
    productPlan: "Plano 30 Dias",
    comment: "Utilizo há mais de 4 meses seguidos na minha conta principal. O suporte no Discord respondeu em menos de 3 minutos quando precisei resetar meu HWID após trocar de placa de vídeo. Melhor software do mercado com certeza."
  },
  {
    id: "rev_02",
    productName: "Spectre Kernel: Tactical",
    userName: "Felipe 'GhostBR'",
    userAvatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=80&auto=format&fit=crop&q=80",
    rating: 5,
    date: "Há 4 dias",
    isVerified: true,
    productPlan: "Plano Vitalício",
    comment: "O sistema de radar web em tela secundária é surreal! Dá pra jogar totalmente focado sem poluir a tela principal. A entrega da chave foi instantânea na tela logo após o Pix."
  },
  {
    id: "rev_03",
    productName: "Phantom Suite: Apex",
    userName: "Lucas Mendez",
    userAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&auto=format&fit=crop&q=80",
    rating: 5,
    date: "Há 1 semana",
    isVerified: true,
    productPlan: "Plano 7 Dias",
    comment: "Gostei muito do recurso de Freeze Time. Quando o jogo atualizou e o status ficou amarelo, meu tempo parou automaticamente e voltou intacto quando o dev liberou o update."
  }
];

export const MOCK_ORDERS = [
  {
    id: "ord_2026_9941",
    date: "10/11/2026 às 14:28",
    product: "Phantom Suite: Apex",
    variant: "30 Dias",
    amount: "R$ 149,90",
    method: "PIX",
    status: "COMPLETED",
    licenseKey: "PHNT-APEX-9821-XKZL-2026"
  },
  {
    id: "ord_2026_9882",
    date: "05/11/2026 às 20:11",
    product: "Spectre Kernel: Tactical",
    variant: "7 Dias",
    amount: "R$ 89,90",
    method: "CARTÃO",
    status: "COMPLETED",
    licenseKey: "SPCT-TACT-4410-MMOP-7782"
  }
];
