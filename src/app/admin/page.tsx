"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { 
  BarChart3, 
  Package, 
  Key, 
  Users, 
  ShieldAlert, 
  Tag, 
  Activity, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Plus, 
  Upload, 
  Search, 
  Lock, 
  TrendingUp, 
  DollarSign, 
  ShoppingBag, 
  X,
  FileText,
  User,
  Snowflake,
  Ticket,
  Store,
  RefreshCw,
  Play,
  Download,
  Edit,
  Pencil,
  Loader2,
  Trash2,
  Sparkles,
  Flame,
  SunMedium,
  UserX,
  Shield,
  Eye,
  Check,
  Ban,
  AlertCircle,
  EyeOff,
  Gift,
  Copy
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/lib/auth-context";

interface OverviewData {
  kpis: {
    totalRevenueCents: number;
    totalRevenueFormatted: string;
    completedOrders: number;
    pendingOrders: number;
    totalUsers: number;
    totalResellers: number;
    unassignedKeys: number;
    activeKeys: number;
    frozenKeys: number;
    notActivatedKeys: number;
    lowStockAlertCount: number;
  };
  lowStockAlerts: Array<{
    productId: string;
    productName: string;
    variantId: string;
    variantName: string;
    stock: number;
  }>;
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    createdAt: string;
    status: string;
    totalFormatted: string;
    user: { username: string; email: string };
    productSummary: string;
  }>;
}

interface AdminUserItem {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: string;
  isBanned: boolean;
  banReason?: string | null;
  hasDiscord: boolean;
  discordId?: string | null;
  discordUsername?: string | null;
  orderCount: number;
  licenseCount: number;
  createdAt: string;
}

interface BlacklistItem {
  id: string;
  type: "IP" | "EMAIL" | "HWID" | "DISCORD_ID" | "USERNAME";
  value: string;
  reason?: string | null;
  active: boolean;
  createdAt: string;
}

interface HwidRequestItem {
  id: string;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  user: {
    id: string;
    username: string;
    email: string;
  };
  licenseKey: {
    id: string;
    key: string;
    hwid?: string | null;
    product: {
      name: string;
    };
  };
}

interface StatusServiceItem {
  id: string;
  name: string;
  slug: string;
  status: "OPERATIONAL" | "MAINTENANCE" | "DEGRADED";
  uptimePercentage: number;
  description?: string | null;
}

interface CouponItem {
  id: string;
  code: string;
  discountPercent?: number | null;
  discountAmountCents?: number | null;
  maxUses?: number | null;
  usedCount: number;
  active: boolean;
  minOrderAmountCents?: number | null;
  maxUsesPerUser: number;
  expiresAt?: string | null;
  createdAt: string;
}

interface AuditLogItem {
  id: string;
  action: string;
  details?: any;
  ipAddress?: string | null;
  createdAt: string;
  formattedDate: string;
  user?: {
    username: string;
    email: string;
    role: string;
  } | null;
}

interface AdminVariant {
  id: string;
  name: string;
  durationHours: number;
  priceCents: number;
  isLifetime: boolean;
  stockCount: number;
}

interface AdminProduct {
  id: string;
  name: string;
  slug: string;
  category: string;
  tagline: string;
  description: string;
  status: "ONLINE" | "MAINTENANCE" | "OUT_OF_STOCK" | "DISABLED";
  isFeatured: boolean;
  videoUrl?: string | null;
  images: string[];
  discordRoleId?: string | null;
  currentVersion: string;
  stockCount: number;
  variants: AdminVariant[];
  features?: string[];
  specifications?: {
    os?: string;
    processor?: string;
    anticheat?: string;
    streamProof?: string;
  };
  changelogs?: any[];
}

interface AdminOrder {
  id: string;
  orderNumber: string;
  createdAt: string;
  formattedDateTime: string;
  status: "PENDING" | "COMPLETED" | "CANCELLED" | "REFUNDED";
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
  totalFormatted: string;
  paymentMethod: string;
  paymentGateway: string;
  paymentStatus: string;
  productSummary: string;
  itemCount: number;
  licenseKeyCount: number;
  user: {
    id: string;
    username: string;
    email: string;
    fullName: string | null;
    hasDiscord: boolean;
    discordId: string | null;
    discordUsername: string | null;
    isDiscordVerified: boolean;
  };
}

interface LicenseMetrics {
  unassigned: number;
  active: number;
  frozen: number;
  notActivated: number;
  expired: number;
}

function parsePriceToCents(val: string): number {
  const clean = val.replace(/[^\d.,]/g, "").replace(",", ".");
  const num = parseFloat(clean);
  if (isNaN(num)) return 0;
  return Math.round(num * 100);
}

function centsToBr(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

export default function AdminBackofficePage() {
  const { user } = useAuth();
  const [activeAdminTab, setActiveAdminTab] = useState<
    "overview" | "products" | "orders" | "users" | "status" | "coupons" | "audit"
  >("overview");

  // Dados Reais do Banco
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [licenseMetrics, setLicenseMetrics] = useState<LicenseMetrics>({
    unassigned: 0,
    active: 0,
    frozen: 0,
    notActivated: 0,
    expired: 0,
  });

  // Estados Reais de Overview
  const [overviewData, setOverviewData] = useState<OverviewData | null>(null);
  const [loadingOverview, setLoadingOverview] = useState(false);

  // Estados Reais de Clientes / Usuários
  const [userSubTab, setUserSubTab] = useState<"users" | "blacklist" | "hwid">("users");
  const [usersList, setUsersList] = useState<AdminUserItem[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState<"ALL" | "CUSTOMER" | "RESELLER" | "ADMIN">("ALL");

  // Estados Reais de Blacklist
  const [blacklistList, setBlacklistList] = useState<BlacklistItem[]>([]);
  const [loadingBlacklist, setLoadingBlacklist] = useState(false);
  const [newBlacklistType, setNewBlacklistType] = useState<"IP" | "EMAIL" | "HWID" | "DISCORD_ID" | "USERNAME">("EMAIL");
  const [newBlacklistValue, setNewBlacklistValue] = useState("");
  const [newBlacklistReason, setNewBlacklistReason] = useState("");
  const [savingBlacklist, setSavingBlacklist] = useState(false);

  // Estados Reais de HWID Reset Requests
  const [hwidRequests, setHwidRequests] = useState<HwidRequestItem[]>([]);
  const [loadingHwidRequests, setLoadingHwidRequests] = useState(false);

  // Estados Reais de Telemetria / Status dos Serviços
  const [statusServices, setStatusServices] = useState<StatusServiceItem[]>([]);
  const [loadingStatus, setLoadingStatus] = useState(false);

  // Estados Reais de Cupons
  const [couponsList, setCouponsList] = useState<CouponItem[]>([]);
  const [loadingCoupons, setLoadingCoupons] = useState(false);
  const [couponModalOpen, setCouponModalOpen] = useState(false);
  const [editingCouponId, setEditingCouponId] = useState<string | null>(null);
  const [couponFormCode, setCouponFormCode] = useState("");
  const [couponFormType, setCouponFormType] = useState<"PERCENT" | "FIXED">("PERCENT");
  const [couponFormValue, setCouponFormValue] = useState("15");
  const [couponFormMaxUses, setCouponFormMaxUses] = useState("");
  const [couponFormMinAmount, setCouponFormMinAmount] = useState("");
  const [savingCoupon, setSavingCoupon] = useState(false);

  // Estados Reais de Auditoria
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [auditSearch, setAuditSearch] = useState("");

  // Modais Administrativos
  const [freezeModalOpen, setFreezeModalOpen] = useState(false);
  const [compensateModalOpen, setCompensateModalOpen] = useState(false);
  const [importKeysModalOpen, setImportKeysModalOpen] = useState(false);
  const [productModalOpen, setProductModalOpen] = useState(false);

  // Estados de Edição/Criação de Produto
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [prodFormName, setProdFormName] = useState("");
  const [prodFormSlug, setProdFormSlug] = useState("");
  const [prodFormCategory, setProdFormCategory] = useState("Battle Royale");
  const [prodFormTagline, setProdFormTagline] = useState("");
  const [prodFormDesc, setProdFormDesc] = useState("");
  const [prodFormVideo, setProdFormVideo] = useState("");
  const [prodFormImages, setProdFormImages] = useState("");
  const [prodFormDiscordRole, setProdFormDiscordRole] = useState("");
  const [prodFormStatus, setProdFormStatus] = useState<"ONLINE" | "MAINTENANCE" | "OUT_OF_STOCK" | "DISABLED">("ONLINE");
  const [prodFormIsFeatured, setProdFormIsFeatured] = useState(true);
  const [prodFormDailyPrice, setProdFormDailyPrice] = useState("24,90");
  const [prodFormWeeklyPrice, setProdFormWeeklyPrice] = useState("79,90");
  const [prodFormMonthlyPrice, setProdFormMonthlyPrice] = useState("169,90");
  const [prodFormLifetimePrice, setProdFormLifetimePrice] = useState("499,90");

  // Estados das 3 Abas Técnicas do Produto
  const [prodFormFeatures, setProdFormFeatures] = useState("");
  const [prodFormSpecOS, setProdFormSpecOS] = useState("Windows 10 / 11 (x64)");
  const [prodFormSpecCPU, setProdFormSpecCPU] = useState("Intel & AMD");
  const [prodFormSpecAnticheat, setProdFormSpecAnticheat] = useState("Kernel Driver Shield");
  const [prodFormSpecStreamProof, setProdFormSpecStreamProof] = useState("100% Nativo (OBS / Discord)");
  const [prodFormCurrentVersion, setProdFormCurrentVersion] = useState("v2.4.0");
  const [prodFormChangelogTitle, setProdFormChangelogTitle] = useState("");
  const [prodFormChangelogChanges, setProdFormChangelogChanges] = useState("");

  const [savingProduct, setSavingProduct] = useState(false);

  // Estados de Chaves / Modais de Operação
  const [selectedProductForImport, setSelectedProductForImport] = useState("");
  const [selectedVariantForImport, setSelectedVariantForImport] = useState("");
  const [importMode, setImportMode] = useState<"manual" | "generate">("manual");
  const [batchKeysText, setBatchKeysText] = useState("");
  const [generateCount, setGenerateCount] = useState("10");
  const [savingKeys, setSavingKeys] = useState(false);

  const [selectedProductForFreeze, setSelectedProductForFreeze] = useState("");
  const [freezeAction, setFreezeAction] = useState<"freeze" | "unfreeze">("freeze");
  const [freezeReason, setFreezeReason] = useState("Manutenção preventiva de integridade e driver.");
  const [savingFreeze, setSavingFreeze] = useState(false);

  const [selectedProductForCompensate, setSelectedProductForCompensate] = useState("all");
  const [compensateHours, setCompensateHours] = useState("24");
  const [savingCompensate, setSavingCompensate] = useState(false);

  const [adminNotice, setAdminNotice] = useState<string | null>(null);

  const showAdminToast = (msg: string) => {
    setAdminNotice(msg);
    setTimeout(() => setAdminNotice(null), 4000);
  };

  // Sub-aba de Produtos: Catálogo ou Gestão de Chaves
  const [productSubTab, setProductSubTab] = useState<"catalog" | "keys">("catalog");
  const [keysList, setKeysList] = useState<any[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(false);
  const [keyProductFilter, setKeyProductFilter] = useState("");
  const [keyStatusFilter, setKeyStatusFilter] = useState("");
  const [keySearch, setKeySearch] = useState("");

  // Estados de Atribuição Gratuita (Sorteios / Brindes)
  const [grantFreeModalOpen, setGrantFreeModalOpen] = useState(false);
  const [grantFreeUserId, setGrantFreeUserId] = useState("");
  const [grantFreeProductId, setGrantFreeProductId] = useState("");
  const [grantFreeVariantId, setGrantFreeVariantId] = useState("");
  const [grantFreeReason, setGrantFreeReason] = useState("Sorteio / Brinde da Comunidade");
  const [grantingFreeLicense, setGrantingFreeLicense] = useState(false);

  // Estados de Detalhes do Cliente
  const [customerDetailsModalOpen, setCustomerDetailsModalOpen] = useState(false);
  const [selectedCustomerDetails, setSelectedCustomerDetails] = useState<any | null>(null);
  const [loadingCustomerDetails, setLoadingCustomerDetails] = useState(false);

  // Carregar lista de chaves com filtros
  const loadKeys = useCallback(async () => {
    setLoadingKeys(true);
    try {
      const params = new URLSearchParams();
      if (keyProductFilter) params.append("productId", keyProductFilter);
      if (keyStatusFilter) params.append("status", keyStatusFilter);
      params.append("limit", "100");
      const res = await fetch(`/api/admin/licenses?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setKeysList(data.keys || []);
      }
    } catch (err) {
      console.error("Erro ao carregar chaves:", err);
    } finally {
      setLoadingKeys(false);
    }
  }, [keyProductFilter, keyStatusFilter]);

  // Excluir chave do estoque
  const handleDeleteKey = async (keyId: string) => {
    if (!confirm("Tem certeza que deseja remover esta chave do estoque?")) return;
    try {
      const res = await fetch("/api/admin/licenses", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao remover chave.");
      showAdminToast(data.message || "Chave removida com sucesso!");
      loadKeys();
      loadAdminData();
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    }
  };

  // Gerenciar licença atribuída a cliente (Devolver ao Estoque ou Revogar)
  const handleManageLicense = async (
    keyId: string,
    action: "RETURN_TO_STOCK" | "REVOKE",
    keyDisplay: string
  ) => {
    const isReturn = action === "RETURN_TO_STOCK";
    const promptMsg = isReturn
      ? `Deseja desvincular a chave "${keyDisplay}" e devolvê-la ao estoque disponível para venda? Digite o motivo (opcional):`
      : `Deseja revogar permanentemente a chave "${keyDisplay}"? Digite o motivo:`;

    const reason = window.prompt(promptMsg, isReturn ? "Devolução manual ao estoque" : "Revogação administrativa");
    if (reason === null) return;

    try {
      const res = await fetch(`/api/admin/licenses/${keyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao processar alteração na chave.");

      showAdminToast(data.message || "Chave atualizada com sucesso!");
      if (selectedCustomerDetails?.id) {
        loadCustomerDetails(selectedCustomerDetails.id);
      }
      loadKeys();
      loadAdminData();
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    }
  };

  // Abrir modal de atribuição gratuita
  const handleOpenGrantFree = (userId?: string) => {
    if (userId) {
      setGrantFreeUserId(userId);
    } else if (usersList.length > 0) {
      setGrantFreeUserId(usersList[0].id);
    }

    if (products.length > 0) {
      setGrantFreeProductId(products[0].id);
      if (products[0].variants?.length > 0) {
        setGrantFreeVariantId(products[0].variants[0].id);
      }
    }
    setGrantFreeReason("Sorteio / Brinde da Comunidade");
    setGrantFreeModalOpen(true);
  };

  // Conceder licença gratuita via API
  const handleGrantFreeLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grantFreeUserId || !grantFreeProductId) {
      alert("Selecione o cliente e o produto.");
      return;
    }
    setGrantingFreeLicense(true);
    try {
      const res = await fetch("/api/admin/licenses/grant-free", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: grantFreeUserId,
          productId: grantFreeProductId,
          variantId: grantFreeVariantId || undefined,
          reason: grantFreeReason,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao atribuir licença.");
      showAdminToast(data.message || "Licença atribuída com sucesso!");
      setGrantFreeModalOpen(false);
      loadKeys();
      loadAdminData();
      loadUsers();
      if (selectedCustomerDetails?.id === grantFreeUserId) {
        loadCustomerDetails(grantFreeUserId);
      }
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    } finally {
      setGrantingFreeLicense(false);
    }
  };

  // Abrir e carregar detalhes do cliente
  const loadCustomerDetails = async (userId: string) => {
    setLoadingCustomerDetails(true);
    setCustomerDetailsModalOpen(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedCustomerDetails(data.user);
      }
    } catch (err) {
      console.error("Erro ao carregar detalhes do cliente:", err);
    } finally {
      setLoadingCustomerDetails(false);
    }
  };

  // Carregar histórico de vendas reais do PostgreSQL
  const loadOrders = useCallback(async () => {
    setLoadingOrders(true);
    try {
      const res = await fetch("/api/admin/orders");
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      }
    } catch (err) {
      console.error("Erro ao carregar histórico de vendas:", err);
    } finally {
      setLoadingOrders(false);
    }
  }, []);

  // Carregar dados de Produtos e Licenças do Banco
  const loadAdminData = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const [prodsRes, licRes] = await Promise.all([
        fetch("/api/admin/products"),
        fetch("/api/admin/licenses")
      ]);

      if (prodsRes.ok) {
        const pData = await prodsRes.json();
        setProducts(pData.products || []);
        if (pData.products?.length > 0 && !selectedProductForImport) {
          setSelectedProductForImport(pData.products[0].id);
          if (pData.products[0].variants?.length > 0) {
            setSelectedVariantForImport(pData.products[0].variants[0].id);
          }
        }
      }

      if (licRes.ok) {
        const lData = await licRes.json();
        if (lData.metrics) {
          setLicenseMetrics(lData.metrics);
        }
      }
    } catch (err) {
      console.error("Erro ao carregar dados administrativos:", err);
      showAdminToast("Erro de conexão ao carregar dados do banco.");
    } finally {
      setLoadingProducts(false);
    }
  }, [selectedProductForImport]);

  // Carregar overview com métricas consolidadas
  const loadOverview = useCallback(async () => {
    setLoadingOverview(true);
    try {
      const res = await fetch("/api/admin/overview");
      if (res.ok) {
        const data = await res.json();
        setOverviewData(data);
      }
    } catch (err) {
      console.error("Erro ao carregar overview:", err);
    } finally {
      setLoadingOverview(false);
    }
  }, []);

  // Carregar lista de usuários
  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const data = await res.json();
        setUsersList(data.users || []);
      }
    } catch (err) {
      console.error("Erro ao carregar usuários:", err);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  // Banir / Desbanir usuário
  const handleToggleBanUser = async (userId: string, currentBanned: boolean) => {
    const actionName = currentBanned ? "desbanir" : "banir";
    const reason = !currentBanned ? prompt("Motivo do banimento:") : null;
    if (!currentBanned && reason === null) return;

    try {
      const res = await fetch(`/api/admin/users/${userId}/ban`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ban: !currentBanned, reason: reason || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Erro ao ${actionName} usuário.`);
      showAdminToast(data.message);
      loadUsers();
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    }
  };

  // Carregar blacklist
  const loadBlacklist = useCallback(async () => {
    setLoadingBlacklist(true);
    try {
      const res = await fetch("/api/admin/blacklist");
      if (res.ok) {
        const data = await res.json();
        setBlacklistList(data.blacklist || []);
      }
    } catch (err) {
      console.error("Erro ao carregar blacklist:", err);
    } finally {
      setLoadingBlacklist(false);
    }
  }, []);

  const handleAddBlacklist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBlacklistValue.trim()) {
      alert("Informe o valor do bloqueio (IP, e-mail, HWID, Discord ID ou Username).");
      return;
    }
    setSavingBlacklist(true);
    try {
      const res = await fetch("/api/admin/blacklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: newBlacklistType,
          value: newBlacklistValue.trim(),
          reason: newBlacklistReason.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao adicionar à blacklist.");
      showAdminToast(data.message);
      setNewBlacklistValue("");
      setNewBlacklistReason("");
      loadBlacklist();
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    } finally {
      setSavingBlacklist(false);
    }
  };

  const handleDeleteBlacklist = async (id: string) => {
    if (!confirm("Remover este registro da blacklist?")) return;
    try {
      const res = await fetch(`/api/admin/blacklist?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao remover da blacklist.");
      showAdminToast(data.message);
      loadBlacklist();
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    }
  };

  // Carregar solicitações de Reset HWID
  const loadHwidRequests = useCallback(async () => {
    setLoadingHwidRequests(true);
    try {
      const res = await fetch("/api/admin/hwid-requests");
      if (res.ok) {
        const data = await res.json();
        setHwidRequests(data.requests || []);
      }
    } catch (err) {
      console.error("Erro ao carregar solicitações de HWID:", err);
    } finally {
      setLoadingHwidRequests(false);
    }
  }, []);

  const handleHwidRequestAction = async (requestId: string, action: "APPROVED" | "REJECTED") => {
    const confirmMsg = action === "APPROVED" 
      ? "Aprovar o reset desvinculará o hardware da licença imediatamente. Continuar?" 
      : "Recusar a solicitação de troca de HWID?";
    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch("/api/admin/hwid-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao processar solicitação.");
      showAdminToast(data.message);
      loadHwidRequests();
      loadAdminData();
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    }
  };

  // Carregar telemetria de status de serviços
  const loadStatusServices = useCallback(async () => {
    setLoadingStatus(true);
    try {
      const res = await fetch("/api/admin/status");
      if (res.ok) {
        const data = await res.json();
        setStatusServices(data.services || []);
      }
    } catch (err) {
      console.error("Erro ao carregar status dos serviços:", err);
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  const handleUpdateServiceStatus = async (serviceId: string, status: string) => {
    try {
      const res = await fetch("/api/admin/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId, status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao atualizar status.");
      showAdminToast(data.message);
      loadStatusServices();
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    }
  };

  // Carregar cupons
  const loadCoupons = useCallback(async () => {
    setLoadingCoupons(true);
    try {
      const res = await fetch("/api/admin/coupons");
      if (res.ok) {
        const data = await res.json();
        setCouponsList(data.coupons || []);
      }
    } catch (err) {
      console.error("Erro ao carregar cupons:", err);
    } finally {
      setLoadingCoupons(false);
    }
  }, []);

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponFormCode.trim()) {
      alert("Informe o código do cupom.");
      return;
    }

    setSavingCoupon(true);
    try {
      const isPercent = couponFormType === "PERCENT";
      let discountVal = 0;

      if (isPercent) {
        const clean = couponFormValue.replace(",", ".");
        discountVal = Math.round(parseFloat(clean) || 0);
      } else {
        discountVal = parsePriceToCents(couponFormValue);
      }

      if (!discountVal || discountVal <= 0) {
        alert("Informe um valor de desconto válido e maior que zero.");
        setSavingCoupon(false);
        return;
      }

      const parsedMaxUses = couponFormMaxUses && parseInt(couponFormMaxUses, 10) > 0 ? parseInt(couponFormMaxUses, 10) : null;
      const parsedMinAmount = couponFormMinAmount && couponFormMinAmount.trim() !== "" ? parsePriceToCents(couponFormMinAmount) : 0;

      const payload: any = {
        code: couponFormCode.trim().toUpperCase(),
        discountType: isPercent ? "PERCENTAGE" : "FIXED",
        discountValue: discountVal,
        maxUses: parsedMaxUses,
        minOrderCents: parsedMinAmount,
        minOrderValueCents: parsedMinAmount,
        minOrderAmountCents: parsedMinAmount,
        isActive: true,
        active: true,
      };

      let res: Response;
      if (editingCouponId) {
        payload.id = editingCouponId;
        res = await fetch("/api/admin/coupons", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/admin/coupons", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao salvar cupom.");

      showAdminToast(data.message || `Cupom ${payload.code} ${editingCouponId ? "atualizado" : "criado"} com sucesso!`);
      setCouponModalOpen(false);
      setEditingCouponId(null);
      setCouponFormCode("");
      setCouponFormValue("15");
      setCouponFormMaxUses("");
      setCouponFormMinAmount("");
      loadCoupons();
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    } finally {
      setSavingCoupon(false);
    }
  };

  const handleOpenNewCoupon = () => {
    setEditingCouponId(null);
    setCouponFormCode("");
    setCouponFormType("PERCENT");
    setCouponFormValue("15");
    setCouponFormMaxUses("");
    setCouponFormMinAmount("");
    setCouponModalOpen(true);
  };

  const handleOpenEditCoupon = (cup: any) => {
    setEditingCouponId(cup.id);
    setCouponFormCode(cup.code);
    const isPercent = cup.discountType === "PERCENTAGE" || (cup.discountPercent !== null && cup.discountPercent !== undefined);
    setCouponFormType(isPercent ? "PERCENT" : "FIXED");
    const discountVal = cup.discountValue ?? cup.discountPercent ?? (cup.discountAmountCents ? cup.discountAmountCents / 100 : 15);
    setCouponFormValue(String(discountVal));
    setCouponFormMaxUses(cup.maxUses ? String(cup.maxUses) : "");
    const minVal = cup.minOrderCents ?? cup.minOrderAmountCents ?? 0;
    setCouponFormMinAmount(minVal > 0 ? centsToBr(minVal) : "");
    setCouponModalOpen(true);
  };

  const handleToggleCoupon = async (id: string, currentActive: boolean) => {
    try {
      const res = await fetch("/api/admin/coupons", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isActive: !currentActive, active: !currentActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao atualizar cupom.");
      showAdminToast(data.message || "Status do cupom atualizado.");
      loadCoupons();
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    if (!confirm("Excluir definitivamente este cupom?")) return;
    try {
      const res = await fetch(`/api/admin/coupons?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao excluir cupom.");
      showAdminToast(data.message);
      loadCoupons();
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    }
  };

  // Carregar auditoria
  const loadAuditLogs = useCallback(async () => {
    setLoadingAudit(true);
    try {
      const res = await fetch("/api/admin/audit");
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.logs || []);
      }
    } catch (err) {
      console.error("Erro ao carregar auditoria:", err);
    } finally {
      setLoadingAudit(false);
    }
  }, []);

  useEffect(() => {
    loadAdminData();
    loadOrders();
    loadOverview();
  }, [loadAdminData, loadOrders, loadOverview]);

  useEffect(() => {
    if (activeAdminTab === "overview") loadOverview();
    if (activeAdminTab === "users") {
      loadUsers();
      loadBlacklist();
      loadHwidRequests();
    }
    if (activeAdminTab === "status") loadStatusServices();
    if (activeAdminTab === "coupons") loadCoupons();
    if (activeAdminTab === "audit") loadAuditLogs();
  }, [activeAdminTab, loadOverview, loadUsers, loadBlacklist, loadHwidRequests, loadStatusServices, loadCoupons, loadAuditLogs]);

  useEffect(() => {
    if (activeAdminTab === "products" && productSubTab === "keys") {
      loadKeys();
    }
  }, [activeAdminTab, productSubTab, loadKeys]);

  // Atualizar variante selecionada quando muda o produto na importação
  useEffect(() => {
    if (selectedProductForImport) {
      const current = products.find((p) => p.id === selectedProductForImport);
      if (current && current.variants.length > 0) {
        setSelectedVariantForImport(current.variants[0].id);
      }
    }
  }, [selectedProductForImport, products]);

  // Abertura de Modais
  const handleOpenNewProduct = () => {
    setEditingProductId(null);
    setProdFormName("");
    setProdFormSlug("");
    setProdFormCategory("FPS Tático");
    setProdFormTagline("");
    setProdFormDesc("");
    setProdFormVideo("");
    setProdFormImages("");
    setProdFormDiscordRole("");
    setProdFormStatus("ONLINE");
    setProdFormIsFeatured(true);
    setProdFormDailyPrice("24,90");
    setProdFormWeeklyPrice("79,90");
    setProdFormMonthlyPrice("169,90");
    setProdFormLifetimePrice("499,90");

    // Abas Técnicas Padrão
    setProdFormFeatures(
      "Injeção segura Ring-0 indetectável\nProteção contra memory scans e snapshots\nAutoatendimento de HWID instantâneo\nSuporte Dedicado 24/7 no Discord"
    );
    setProdFormSpecOS("Windows 10 / 11 (x64)");
    setProdFormSpecCPU("Intel & AMD");
    setProdFormSpecAnticheat("Kernel Driver Shield");
    setProdFormSpecStreamProof("100% Nativo (OBS / Discord)");
    setProdFormCurrentVersion("v2.4.0");
    setProdFormChangelogTitle("Lançamento da Versão Estável");
    setProdFormChangelogChanges("Otimização de latência do driver de kernel\nAtualização de offsets para o patch mais recente\nBypass aprimorado para EAC / BattleEye");

    setProductModalOpen(true);
  };

  const handleOpenEditProduct = (prod: AdminProduct) => {
    setEditingProductId(prod.id);
    setProdFormName(prod.name);
    setProdFormSlug(prod.slug);
    setProdFormCategory(prod.category);
    setProdFormTagline(prod.tagline || "");
    setProdFormDesc(prod.description || "");
    setProdFormVideo(prod.videoUrl || "");
    setProdFormImages((prod.images || []).join("\n"));
    setProdFormDiscordRole(prod.discordRoleId || "");
    setProdFormStatus(prod.status);
    setProdFormIsFeatured(prod.isFeatured);

    // Abas Técnicas Carregadas do PostgreSQL
    setProdFormFeatures((prod.features || []).join("\n"));
    setProdFormSpecOS(prod.specifications?.os || "Windows 10 / 11 (x64)");
    setProdFormSpecCPU(prod.specifications?.processor || "Intel & AMD");
    setProdFormSpecAnticheat(prod.specifications?.anticheat || "Kernel Driver Shield");
    setProdFormSpecStreamProof(prod.specifications?.streamProof || "100% Nativo");
    setProdFormCurrentVersion(prod.currentVersion || "v1.0.0");
    setProdFormChangelogTitle("");
    setProdFormChangelogChanges("");

    const pDaily = prod.variants.find((v) => v.durationHours === 24 || v.name.includes("24"));
    const pWeekly = prod.variants.find((v) => v.durationHours === 168 || v.name.includes("7"));
    const pMonthly = prod.variants.find((v) => v.durationHours === 720 || v.name.includes("30"));
    const pLife = prod.variants.find((v) => v.isLifetime || v.name.includes("Life"));

    if (pDaily) setProdFormDailyPrice(centsToBr(pDaily.priceCents));
    if (pWeekly) setProdFormWeeklyPrice(centsToBr(pWeekly.priceCents));
    if (pMonthly) setProdFormMonthlyPrice(centsToBr(pMonthly.priceCents));
    if (pLife) setProdFormLifetimePrice(centsToBr(pLife.priceCents));

    setProductModalOpen(true);
  };

  // Salvar (Criar ou Atualizar) Produto via API
  const handleSubmitProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProduct(true);

    try {
      const imagesArray = prodFormImages
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);

      const editingProd = products.find((p) => p.id === editingProductId);
      const findVariantId = (durHours: number, isLife: boolean) => {
        if (!editingProd) return undefined;
        return editingProd.variants.find((v) => isLife ? v.isLifetime : v.durationHours === durHours)?.id;
      };

      const variantsPayload = [
        {
          id: findVariantId(24, false),
          name: "Passe Diário (24h)",
          durationHours: 24,
          priceCents: parsePriceToCents(prodFormDailyPrice),
          isLifetime: false,
        },
        {
          id: findVariantId(168, false),
          name: "Acesso Semanal (7 Dias)",
          durationHours: 168,
          priceCents: parsePriceToCents(prodFormWeeklyPrice),
          isLifetime: false,
        },
        {
          id: findVariantId(720, false),
          name: "Acesso Mensal (30 Dias)",
          durationHours: 720,
          priceCents: parsePriceToCents(prodFormMonthlyPrice),
          isLifetime: false,
        },
        {
          id: findVariantId(876000, true),
          name: "Licença Vitalícia (Lifetime)",
          durationHours: 876000,
          priceCents: parsePriceToCents(prodFormLifetimePrice),
          isLifetime: true,
        },
      ];

      const payload = {
        name: prodFormName,
        slug: prodFormSlug,
        category: prodFormCategory,
        tagline: prodFormTagline,
        shortDescription: prodFormTagline,
        description: prodFormDesc,
        fullDescription: prodFormDesc,
        status: prodFormStatus,
        isFeatured: prodFormIsFeatured,
        videoUrl: prodFormVideo.trim() || null,
        images: imagesArray,
        discordRoleId: prodFormDiscordRole.trim() || null,
        variants: variantsPayload,
        features: prodFormFeatures.split("\n").map((s) => s.trim()).filter(Boolean),
        specifications: {
          os: prodFormSpecOS.trim(),
          processor: prodFormSpecCPU.trim(),
          anticheat: prodFormSpecAnticheat.trim(),
          streamProof: prodFormSpecStreamProof.trim(),
        },
        currentVersion: prodFormCurrentVersion.trim() || "v1.0.0",
        changelogEntry: prodFormChangelogTitle.trim()
          ? {
              version: prodFormCurrentVersion.trim() || "v1.0.0",
              title: prodFormChangelogTitle.trim(),
              contentMarkdown: prodFormChangelogChanges.trim() || undefined,
            }
          : undefined,
      };

      let res: Response;
      if (editingProductId) {
        res = await fetch(`/api/admin/products/${editingProductId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/admin/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro ao salvar produto.");
      }

      setProductModalOpen(false);
      showAdminToast(
        editingProductId
          ? `Produto "${prodFormName}" atualizado com sucesso!`
          : `Produto "${prodFormName}" criado com 4 variantes no PostgreSQL!`
      );
      loadAdminData();
    } catch (err: any) {
      alert(`Falha ao salvar produto: ${err.message}`);
    } finally {
      setSavingProduct(false);
    }
  };

  // Alternar Status: Ativar (ONLINE) / Desativar (DISABLED)
  const handleToggleProductStatus = async (prod: AdminProduct) => {
    try {
      const newStatus = prod.status === "DISABLED" ? "ONLINE" : "DISABLED";
      const res = await fetch(`/api/admin/products/${prod.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao alterar status do produto.");

      showAdminToast(
        newStatus === "ONLINE"
          ? `Produto "${prod.name}" reativado na vitrine pública!`
          : `Produto "${prod.name}" desativado da vitrine pública.`
      );
      loadAdminData();
    } catch (err: any) {
      alert(`Falha ao alterar status: ${err.message}`);
    }
  };

  // Excluir Definitivamente o Produto (com chaves e variantes)
  const handleDeleteProduct = async (prod: AdminProduct) => {
    const confirmMessage = `⚠️ ATENÇÃO: EXCLUSÃO PERMANENTE ⚠️\n\nDeseja realmente excluir em definitivo o produto "${prod.name}"?\n\nTodas as chaves vinculadas (${prod.stockCount} chaves) e as 4 variantes serão permanentemente removidas do banco de dados.\n\nEsta ação NÃO pode ser desfeita. Confirmar?`;
    if (!confirm(confirmMessage)) return;

    try {
      const res = await fetch(`/api/admin/products/${prod.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao excluir produto.");

      showAdminToast(data.message || `Produto "${prod.name}" excluído definitivamente.`);
      loadAdminData();
    } catch (err: any) {
      alert(`Falha ao excluir produto: ${err.message}`);
    }
  };

  // Salvar Chaves (Importação Manual ou Geração Automática)
  const handleSaveKeys = async () => {
    if (!selectedProductForImport || !selectedVariantForImport) {
      alert("Selecione o produto e a variante correspondente.");
      return;
    }

    setSavingKeys(true);
    try {
      if (importMode === "manual") {
        const keysList = batchKeysText
          .split("\n")
          .map((k) => k.trim())
          .filter(Boolean);

        if (keysList.length === 0) {
          alert("Cole pelo menos uma chave válida.");
          setSavingKeys(false);
          return;
        }

        const res = await fetch("/api/admin/licenses/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId: selectedProductForImport,
            variantId: selectedVariantForImport,
            keys: keysList,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Erro ao importar chaves.");

        setImportKeysModalOpen(false);
        setBatchKeysText("");
        showAdminToast(`${data.count} chaves importadas com sucesso como UNASSIGNED!`);
      } else {
        const countNum = parseInt(generateCount, 10) || 10;
        const res = await fetch("/api/admin/licenses/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId: selectedProductForImport,
            variantId: selectedVariantForImport,
            count: countNum,
            prefix: "OVERCLOCK",
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Erro ao gerar chaves.");

        setImportKeysModalOpen(false);
        showAdminToast(`${data.count} chaves geradas automaticamente (OVERCLOCK-XXXX)!`);
      }

      loadAdminData();
    } catch (err: any) {
      alert(`Erro no processo de chaves: ${err.message}`);
    } finally {
      setSavingKeys(false);
    }
  };

  // Executar Freeze Time (Congelar ou Descongelar)
  const handleExecuteFreeze = async () => {
    if (!selectedProductForFreeze) {
      alert("Selecione o produto alvo para congelamento/descongelamento.");
      return;
    }

    setSavingFreeze(true);
    try {
      const res = await fetch("/api/admin/licenses/freeze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: selectedProductForFreeze,
          action: freezeAction,
          reason: freezeReason,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha na operação de Freeze Time.");

      setFreezeModalOpen(false);
      showAdminToast(data.message);
      loadAdminData();
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    } finally {
      setSavingFreeze(false);
    }
  };

  // Executar Compensação de Horas
  const handleExecuteCompensate = async () => {
    const hours = parseInt(compensateHours, 10);
    if (isNaN(hours) || hours <= 0) {
      alert("Informe uma quantidade válida de horas positivas.");
      return;
    }

    setSavingCompensate(true);
    try {
      const res = await fetch("/api/admin/licenses/compensate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: selectedProductForCompensate === "all" ? undefined : selectedProductForCompensate,
          hours,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao aplicar compensação.");

      setCompensateModalOpen(false);
      showAdminToast(data.message);
      loadAdminData();
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    } finally {
      setSavingCompensate(false);
    }
  };

  const navItems = [
    { id: "overview", label: "Visão Geral", icon: BarChart3 },
    { id: "products", label: "Produtos & Estoque", icon: Package },
    { id: "orders", label: "Vendas & Pedidos", icon: ShoppingBag },
    { id: "users", label: "Clientes & Blacklist", icon: Users },
    { id: "status", label: "Status & Freeze Time", icon: Snowflake },
    { id: "coupons", label: "Cupons de Desconto", icon: Ticket },
    { id: "audit", label: "Auditoria & Logs", icon: FileText },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-4 pb-12 space-y-6">
      
      {/* Toast Notification */}
      {adminNotice && (
        <div className="fixed top-20 right-6 z-50 p-4 rounded-xl bg-[#10b981] text-[#050706] font-['Space_Grotesk'] font-bold text-xs shadow-2xl animate-in slide-in-from-top-4 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{adminNotice}</span>
        </div>
      )}

      {/* Topbar Telemetry Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/8">
        <div>
          <div className="flex items-center gap-2 font-mono text-xs text-[#86948a] mb-1">
            <span className="text-white font-semibold">NÓ DO SISTEMA</span>
            <span>/</span>
            <span>Painel Administrativo</span>
            <span>/</span>
            <span className="text-[#10b981] font-bold">POSTGRES-PROD</span>
          </div>
          <h1 className="font-['Space_Grotesk'] text-2xl sm:text-3xl font-extrabold text-white tracking-tight uppercase">
            OVERCLOCK<span className="text-[#10b981]">.ADMIN</span> // Painel Executivo
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadAdminData}
            disabled={loadingProducts}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#101412] border border-[#10b981]/30 text-[#10b981] font-mono text-xs hover:bg-[#141a16] transition-colors cursor-pointer"
            title="Atualizar dados do banco"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingProducts ? "animate-spin" : ""}`} />
            <span>SINCRONIZAR</span>
          </button>

          <Link
            href="/"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold font-['Space_Grotesk'] bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-colors"
          >
            <Store className="w-3.5 h-3.5 text-[#10b981]" />
            <span>Voltar para a Loja</span>
          </Link>

          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold font-['Space_Grotesk'] bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-colors"
          >
            <span>Área do Cliente</span>
          </Link>
        </div>
      </div>

      {/* Grid: Sidebar (3 cols) + Workspace (9 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* SIDEBAR DO ADMIN */}
        <aside className="lg:col-span-3 space-y-4">
          <div className="p-2 sm:p-3 rounded-2xl bg-[#0b0f0d] border border-white/8 flex lg:flex-col overflow-x-auto gap-1.5 no-scrollbar pb-1">
            <span className="hidden lg:block px-3 font-mono text-[10px] tracking-widest text-[#86948a] uppercase my-2 font-semibold shrink-0">
              ADMINISTRAÇÃO // ROOT
            </span>

            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeAdminTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveAdminTab(item.id as any)}
                  className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl font-['Space_Grotesk'] text-xs font-bold transition-all cursor-pointer shrink-0 lg:w-full whitespace-nowrap ${
                    isActive
                      ? "bg-[#10b981] text-[#050706] shadow-[0_0_20px_rgba(16,185,129,0.35)]"
                      : "text-[#bbcabf] hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Quick Metrics Widget */}
          <div className="hidden lg:block p-4 rounded-2xl bg-[#0b0f0d] border border-white/8 space-y-3 font-mono text-xs">
            <span className="text-[10px] text-[#86948a] uppercase block">STATUS DO ESTOQUE (CHAVES)</span>
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-[#bbcabf]">Disponíveis:</span>
                <span className="text-[#10b981] font-bold">{licenseMetrics.unassigned}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#bbcabf]">Ativas em uso:</span>
                <span className="text-white font-bold">{licenseMetrics.active}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#bbcabf]">Congeladas (Freeze):</span>
                <span className="text-cyan-400 font-bold">{licenseMetrics.frozen}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#bbcabf]">Não Ativadas:</span>
                <span className="text-amber-400 font-bold">{licenseMetrics.notActivated}</span>
              </div>
            </div>
          </div>
        </aside>

        {/* WORKSPACE DO ADMIN (9 cols) */}
        <div className="lg:col-span-9 space-y-6">
          
          {/* TAB 1: OVERVIEW */}
          {activeAdminTab === "overview" && (
            <div className="space-y-6">
              
              {/* 4 KPIs Cards Reais Conectados ao Postgres */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-2xl bg-[#0b0f0d] p-5 border border-white/8 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase text-[#86948a] block">
                      Faturamento Total
                    </span>
                    <DollarSign className="w-4 h-4 text-[#10b981]" />
                  </div>
                  <div className="font-['Space_Grotesk'] text-2xl font-extrabold text-[#10b981]">
                    {overviewData?.kpis?.totalRevenueFormatted || "R$ 0,00"}
                  </div>
                  <span className="text-[11px] text-[#86948a] font-mono">
                    {overviewData?.kpis?.completedOrders || 0} pedidos pagos concluídos
                  </span>
                </div>

                <div className="rounded-2xl bg-[#0b0f0d] p-5 border border-white/8 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase text-[#86948a] block">
                      Estoque Disponível
                    </span>
                    <Key className="w-4 h-4 text-[#10b981]" />
                  </div>
                  <div className="font-['Space_Grotesk'] text-2xl font-extrabold text-white">
                    {licenseMetrics.unassigned}
                  </div>
                  <span className="text-[11px] text-[#10b981] font-mono">
                    Chaves UNASSIGNED prontas
                  </span>
                </div>

                <div className="rounded-2xl bg-[#0b0f0d] p-5 border border-white/8 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase text-[#86948a] block">
                      Licenças em Uso
                    </span>
                    <Activity className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div className="font-['Space_Grotesk'] text-2xl font-extrabold text-white">
                    {licenseMetrics.active}
                  </div>
                  <span className="text-[11px] text-cyan-400 font-mono">
                    {licenseMetrics.frozen} congeladas temporariamente
                  </span>
                </div>

                <div className="rounded-2xl bg-[#0b0f0d] p-5 border border-white/8 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase text-[#86948a] block">
                      Base de Clientes
                    </span>
                    <Users className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="font-['Space_Grotesk'] text-2xl font-extrabold text-white">
                    {overviewData?.kpis?.totalUsers || 0}
                  </div>
                  <span className="text-[11px] text-purple-400 font-mono">
                    {overviewData?.kpis?.totalResellers || 0} revendedores autorizados
                  </span>
                </div>
              </div>

              {/* Alerta de Estoque Baixo (quando houver variantes com <= 3 chaves) */}
              {overviewData?.lowStockAlerts && overviewData.lowStockAlerts.length > 0 && (
                <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-['Space_Grotesk'] text-sm font-bold text-white flex items-center gap-2">
                          <span>Atenção: Alerta de Estoque Baixo no PostgreSQL</span>
                          <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold">
                            {overviewData.lowStockAlerts.length} VARIANTE(S)
                          </span>
                        </h4>
                        <p className="text-xs text-[#bbcabf] font-['Geist']">
                          As seguintes variantes estão com estoque crítico (menor ou igual a 3 chaves disponíveis):
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveAdminTab("products")}
                      className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#050706] font-['Space_Grotesk'] text-xs font-bold shrink-0 transition-colors cursor-pointer"
                    >
                      Repor Estoque
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1">
                    {overviewData.lowStockAlerts.map((item, idx) => {
                      const prodName = item.productName || (item as any).name || "Software";
                      const varName = item.variantName || "Plano";
                      const stockCount = item.stock ?? (item as any).availableKeys ?? 0;
                      const isZero = stockCount === 0;

                      return (
                        <div
                          key={item.variantId || idx}
                          className="p-3 rounded-xl bg-[#050706] border border-amber-500/25 flex items-center justify-between gap-2 text-xs font-mono shadow-sm"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${isZero ? "bg-rose-500 animate-pulse" : "bg-amber-400"}`} />
                            <span className="text-white truncate font-medium">
                              {prodName} <span className="text-[#86948a] font-normal">({varName})</span>
                            </span>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold shrink-0 ${
                            isZero
                              ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                              : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          }`}>
                            {isZero ? "0 restando" : `${stockCount} restando`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Botões de Ação Rápida */}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => {
                    setImportMode("manual");
                    setImportKeysModalOpen(true);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-[#10b981] hover:bg-[#34d399] text-[#050706] font-['Space_Grotesk'] font-bold text-xs flex items-center gap-2 shadow-md cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>Importar Chaves em Lote</span>
                </button>

                <button
                  onClick={() => {
                    setImportMode("generate");
                    setImportKeysModalOpen(true);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-purple-900/40 hover:bg-purple-800/60 text-purple-300 border border-purple-500/40 font-['Space_Grotesk'] font-bold text-xs flex items-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Gerar Chaves Automáticas</span>
                </button>

                <button
                  onClick={() => {
                    if (products.length > 0) setSelectedProductForFreeze(products[0].id);
                    setFreezeAction("freeze");
                    setFreezeModalOpen(true);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-cyan-950/40 hover:bg-cyan-900/60 text-cyan-300 border border-cyan-500/40 font-['Space_Grotesk'] font-bold text-xs flex items-center gap-2 cursor-pointer"
                >
                  <Snowflake className="w-4 h-4" />
                  <span>Freeze Time (Congelar)</span>
                </button>

                <button
                  onClick={() => setCompensateModalOpen(true)}
                  className="px-4 py-2.5 rounded-xl bg-[#141816] hover:bg-[#1a201c] text-white border border-white/10 font-['Space_Grotesk'] font-bold text-xs flex items-center gap-2 cursor-pointer"
                >
                  <Clock className="w-4 h-4 text-[#10b981]" />
                  <span>Compensar Horas</span>
                </button>
              </div>

              {/* Prévia das Vendas Recentes */}
              <div className="rounded-2xl bg-[#0b0f0d] p-5 border border-white/8 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/8">
                  <div>
                    <h3 className="font-['Space_Grotesk'] text-sm font-bold text-white flex items-center gap-2">
                      <ShoppingBag className="w-4 h-4 text-[#10b981]" />
                      <span>Atividade Recente de Vendas</span>
                    </h3>
                    <p className="text-xs text-[#86948a] font-['Geist'] mt-0.5">
                      Últimos pedidos registrados no PostgreSQL em tempo real.
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveAdminTab("orders")}
                    className="text-xs font-['Space_Grotesk'] text-[#10b981] hover:underline cursor-pointer"
                  >
                    Ver Todos os Pedidos →
                  </button>
                </div>

                {(!overviewData?.recentOrders || overviewData.recentOrders.length === 0) ? (
                  <div className="py-8 text-center text-xs text-[#86948a] font-mono">
                    Nenhuma venda registrada ainda.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono min-w-[600px]">
                      <thead className="bg-[#050706] text-[#86948a] uppercase">
                        <tr>
                          <th className="p-3">PEDIDO</th>
                          <th className="p-3">DATA</th>
                          <th className="p-3">CLIENTE</th>
                          <th className="p-3">PRODUTO</th>
                          <th className="p-3">VALOR</th>
                          <th className="p-3">STATUS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-white">
                        {overviewData.recentOrders.map((ord) => (
                          <tr key={ord.id} className="hover:bg-white/[0.02]">
                            <td className="p-3 font-bold text-[#10b981]">
                              #{ord.orderNumber || ord.id.slice(0, 8)}
                            </td>
                            <td className="p-3 text-[#86948a]">{ord.createdAt}</td>
                            <td className="p-3 font-sans">
                              {ord.user?.username || "Cliente"}
                            </td>
                            <td className="p-3 font-sans truncate max-w-xs">
                              {ord.productSummary}
                            </td>
                            <td className="p-3 font-bold text-[#10b981]">
                              {ord.totalFormatted}
                            </td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                ord.status === "COMPLETED"
                                  ? "bg-[#10b981]/15 text-[#10b981]"
                                  : ord.status === "PENDING"
                                  ? "bg-amber-500/15 text-amber-300"
                                  : "bg-rose-500/15 text-rose-300"
                              }`}>
                                {ord.status === "COMPLETED" ? "CONCLUÍDO" : ord.status === "PENDING" ? "PENDENTE" : ord.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 2: PRODUCTS & STOCK */}
          {activeAdminTab === "products" && (
            <div className="space-y-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-white/8">
                <div>
                  <h2 className="font-['Space_Grotesk'] text-base font-bold text-white">Catálogo de Softwares &amp; Gestão de Chaves</h2>
                  <p className="text-xs text-[#86948a]">Gerencie produtos, precificação, inventário atômico e concessão de licenças para sorteios e promoções.</p>
                </div>

                {/* Sub-abas de Navegação */}
                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#0b0f0d] border border-white/8 text-xs font-['Space_Grotesk'] font-bold">
                  <button
                    onClick={() => setProductSubTab("catalog")}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      productSubTab === "catalog"
                        ? "bg-[#10b981] text-[#050706]"
                        : "text-[#86948a] hover:text-white"
                    }`}
                  >
                    Catálogo ({products.length})
                  </button>
                  <button
                    onClick={() => {
                      setProductSubTab("keys");
                      loadKeys();
                    }}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      productSubTab === "keys"
                        ? "bg-[#10b981] text-[#050706]"
                        : "text-[#86948a] hover:text-white"
                    }`}
                  >
                    Estoque de Chaves ({licenseMetrics.unassigned} disp.)
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => handleOpenGrantFree()}
                    className="px-3.5 py-2 rounded-xl bg-purple-950/60 hover:bg-purple-900/80 text-purple-300 border border-purple-500/40 text-xs font-bold font-['Space_Grotesk'] flex items-center gap-1.5 cursor-pointer shadow-md transition-all"
                    title="Atribuir licença gratuita para sorteios, brindes ou promoções"
                  >
                    <Gift className="w-4 h-4 text-purple-400" />
                    <span>Atribuir Licença Sem Pagamento</span>
                  </button>

                  <button
                    onClick={handleOpenNewProduct}
                    className="px-3.5 py-2 rounded-xl bg-[#10b981] hover:bg-[#34d399] text-[#050706] text-xs font-bold font-['Space_Grotesk'] flex items-center gap-1.5 shadow-lg shadow-[#10b981]/20 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Novo Produto</span>
                  </button>

                  <button
                    onClick={() => {
                      setImportMode("manual");
                      setImportKeysModalOpen(true);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 text-xs font-bold font-['Space_Grotesk'] flex items-center gap-1.5 cursor-pointer"
                  >
                    <Upload className="w-4 h-4 text-[#10b981]" />
                    <span>Importar Chaves</span>
                  </button>
                </div>
              </div>

              {/* SUB-ABA 1: CATÁLOGO */}
              {productSubTab === "catalog" && (
                <>

              {loadingProducts ? (
                <div className="py-16 text-center text-[#86948a] font-mono text-xs flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-[#10b981]" />
                  <span>Carregando catálogo de produtos e estoque do PostgreSQL...</span>
                </div>
              ) : products.length === 0 ? (
                <div className="p-8 rounded-2xl bg-[#0b0f0d] border border-white/8 text-center text-[#86948a] font-mono text-xs space-y-3">
                  <Package className="w-8 h-8 mx-auto text-[#10b981]" />
                  <p>Nenhum produto cadastrado no banco de dados.</p>
                  <button
                    onClick={handleOpenNewProduct}
                    className="px-4 py-2 rounded-xl bg-[#10b981] text-[#050706] font-bold text-xs"
                  >
                    Cadastrar Primeiro Produto
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {products.map((prod) => (
                    <div 
                      key={prod.id} 
                      className={`rounded-2xl bg-[#0b0f0d] p-5 border transition-all ${
                        prod.status === "DISABLED" 
                          ? "border-rose-500/20 opacity-60" 
                          : "border-white/8 hover:border-white/15"
                      }`}
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3.5">
                          <div className="w-14 h-14 rounded-xl bg-[#141816] border border-white/10 flex items-center justify-center text-[#10b981] font-bold overflow-hidden shrink-0">
                            {prod.images && prod.images[0] ? (
                              <img src={prod.images[0]} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <Package className="w-7 h-7" />
                            )}
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="font-['Space_Grotesk'] text-base font-bold text-white">{prod.name}</h4>
                              
                              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                                prod.status === "ONLINE" 
                                  ? "bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/30"
                                  : prod.status === "MAINTENANCE"
                                  ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                                  : prod.status === "OUT_OF_STOCK"
                                  ? "bg-purple-500/15 text-purple-300 border border-purple-500/30"
                                  : "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                              }`}>
                                {prod.status}
                              </span>

                              {prod.isFeatured && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/40 flex items-center gap-1">
                                  <Flame className="w-3 h-3" /> DESTAQUE HOME
                                </span>
                              )}
                            </div>
                            <span className="font-mono text-xs text-[#86948a] block mt-0.5">
                              /{prod.slug} • {prod.category} • v{prod.currentVersion} {prod.discordRoleId ? `• Role: ${prod.discordRoleId}` : ""}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2.5 text-xs font-mono self-end md:self-center">
                          <div className="text-right pr-2">
                            <span className="text-[#86948a] text-[10px] block">ESTOQUE TOTAL</span>
                            <span className={`font-bold text-sm ${prod.stockCount > 0 ? "text-[#10b981]" : "text-amber-400"}`}>
                              {prod.stockCount} {prod.stockCount === 1 ? "chave" : "chaves"}
                            </span>
                          </div>

                          <button
                            onClick={() => {
                              setSelectedProductForImport(prod.id);
                              if (prod.variants.length > 0) setSelectedVariantForImport(prod.variants[0].id);
                              setImportMode("manual");
                              setImportKeysModalOpen(true);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 font-bold flex items-center gap-1 transition-colors cursor-pointer"
                            title="Adicionar chaves a este produto"
                          >
                            <Plus className="w-3.5 h-3.5 text-[#10b981]" />
                            <span>+ Chaves</span>
                          </button>

                          {/* Botão Ativar / Desativar */}
                          <button
                            onClick={() => handleToggleProductStatus(prod)}
                            className={`px-3 py-1.5 rounded-xl border font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                              prod.status === "DISABLED"
                                ? "bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-400 border-emerald-500/40"
                                : "bg-[#181c1a] hover:bg-[#202623] text-[#86948a] hover:text-white border-white/10"
                            }`}
                            title={prod.status === "DISABLED" ? "Reativar produto na vitrine pública" : "Desativar produto da vitrine pública"}
                          >
                            {prod.status === "DISABLED" ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Reativar</span>
                              </>
                            ) : (
                              <>
                                <EyeOff className="w-3.5 h-3.5 text-[#86948a]" />
                                <span>Desativar</span>
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => handleOpenEditProduct(prod)}
                            className="px-3 py-1.5 rounded-xl bg-[#181c1a] hover:bg-[#202623] text-white border border-white/10 font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                            title="Editar configurações do produto"
                          >
                            <Edit className="w-3.5 h-3.5 text-[#10b981]" />
                            <span>Editar</span>
                          </button>

                          <button
                            onClick={() => {
                              setSelectedProductForFreeze(prod.id);
                              setFreezeAction(prod.status === "MAINTENANCE" ? "unfreeze" : "freeze");
                              setFreezeModalOpen(true);
                            }}
                            className={`px-3 py-1.5 rounded-xl border font-bold flex items-center gap-1 cursor-pointer ${
                              prod.status === "MAINTENANCE"
                                ? "bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30"
                                : "bg-cyan-950/40 hover:bg-cyan-900/60 text-cyan-300 border-cyan-500/30"
                            }`}
                            title="Congelar ou descongelar tempo das chaves deste produto"
                          >
                            <Snowflake className="w-3.5 h-3.5" />
                            <span>{prod.status === "MAINTENANCE" ? "Unfreeze" : "Freeze"}</span>
                          </button>

                          <button
                            onClick={() => handleDeleteProduct(prod)}
                            className="p-1.5 rounded-xl bg-rose-950/30 hover:bg-rose-900/50 text-rose-400 border border-rose-500/30 transition-colors cursor-pointer"
                            title="Excluir produto e todas as suas chaves definitivamente"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Grade de Variantes e Estoque Individual */}
                      <div className="mt-4 pt-3 border-t border-white/5 grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs">
                        {prod.variants.map((v) => (
                          <div key={v.id} className="p-2 rounded-lg bg-[#050706] border border-white/5 flex flex-col justify-between">
                            <span className="text-[#86948a] text-[10px] truncate">{v.name}</span>
                            <div className="flex items-baseline justify-between mt-1">
                              <span className="font-bold text-white text-xs">R$ {centsToBr(v.priceCents)}</span>
                              <span className={`text-[10px] font-bold ${v.stockCount > 0 ? "text-[#10b981]" : "text-rose-400"}`}>
                                {v.stockCount} un
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              </>
              )}

              {/* SUB-ABA 2: GESTÃO COMPLETA DE CHAVES DO ESTOQUE */}
              {productSubTab === "keys" && (
                <div className="space-y-4">
                  {/* Filtros de Chaves */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-[#0b0f0d] border border-white/8">
                    <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                      {/* Filtro por Produto */}
                      <select
                        value={keyProductFilter}
                        onChange={(e) => setKeyProductFilter(e.target.value)}
                        className="px-3 py-2 rounded-xl bg-[#050706] border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-[#10b981]"
                      >
                        <option value="">Todos os Softwares</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>

                      {/* Filtro por Status */}
                      <select
                        value={keyStatusFilter}
                        onChange={(e) => setKeyStatusFilter(e.target.value)}
                        className="px-3 py-2 rounded-xl bg-[#050706] border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-[#10b981]"
                      >
                        <option value="">Todos os Status</option>
                        <option value="UNASSIGNED">UNASSIGNED (Disponível)</option>
                        <option value="ACTIVE">ACTIVE (Em Uso)</option>
                        <option value="FROZEN">FROZEN (Congelada)</option>
                        <option value="NOT_ACTIVATED">NOT_ACTIVATED (Aguardando Ativação)</option>
                        <option value="EXPIRED">EXPIRED (Expirada)</option>
                      </select>

                      <button
                        onClick={loadKeys}
                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white cursor-pointer"
                        title="Atualizar lista de chaves"
                      >
                        <RefreshCw className="w-4 h-4 text-[#10b981]" />
                      </button>
                    </div>

                    <div className="relative w-full sm:w-64">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#86948a]" />
                      <input
                        type="text"
                        placeholder="Buscar por código ou cliente..."
                        value={keySearch}
                        onChange={(e) => setKeySearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[#050706] border border-white/10 text-xs text-white placeholder-[#86948a] focus:outline-none focus:border-[#10b981]"
                      />
                    </div>
                  </div>

                  {loadingKeys ? (
                    <div className="py-16 text-center text-[#86948a] font-mono text-xs flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-[#10b981]" />
                      <span>Consultando chaves no PostgreSQL...</span>
                    </div>
                  ) : keysList.length === 0 ? (
                    <div className="p-8 rounded-2xl bg-[#0b0f0d] border border-white/8 text-center text-[#86948a] font-mono text-xs space-y-3">
                      <Key className="w-8 h-8 mx-auto text-[#10b981] opacity-40" />
                      <p>Nenhuma chave encontrada com os filtros aplicados.</p>
                      <button
                        onClick={() => {
                          setImportMode("generate");
                          setImportKeysModalOpen(true);
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-[#10b981] text-[#050706] font-bold text-xs cursor-pointer"
                      >
                        Gerar Chaves Automáticas
                      </button>
                    </div>
                  ) : (
                    <div className="rounded-2xl bg-[#0b0f0d] border border-white/8 overflow-x-auto">
                      <table className="w-full text-left text-xs font-mono min-w-[750px]">
                        <thead className="bg-[#101412] text-[#86948a] uppercase border-b border-white/8">
                          <tr>
                            <th className="p-3.5">CÓDIGO DA CHAVE</th>
                            <th className="p-3.5">SOFTWARE / PLANO</th>
                            <th className="p-3.5">STATUS</th>
                            <th className="p-3.5">CLIENTE ALOCADO</th>
                            <th className="p-3.5">EXPIRAÇÃO</th>
                            <th className="p-3.5 text-right">AÇÕES</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-white">
                          {keysList
                            .filter((k) => {
                              if (!keySearch) return true;
                              const s = keySearch.toLowerCase();
                              return (
                                k.key.toLowerCase().includes(s) ||
                                (k.user?.username && k.user.username.toLowerCase().includes(s)) ||
                                (k.user?.email && k.user.email.toLowerCase().includes(s))
                              );
                            })
                            .map((k) => (
                              <tr key={k.id} className="hover:bg-white/[0.02]">
                                <td className="p-3.5">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-[#10b981] tracking-wider select-all">
                                      {k.key}
                                    </span>
                                    <button
                                      onClick={() => {
                                        navigator.clipboard.writeText(k.key);
                                        showAdminToast(`Chave ${k.key} copiada!`);
                                      }}
                                      className="p-1 rounded hover:bg-white/10 text-[#86948a] hover:text-white cursor-pointer"
                                      title="Copiar chave"
                                    >
                                      <Copy className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>

                                <td className="p-3.5">
                                  <div className="flex flex-col">
                                    <span className="font-sans font-bold text-white">
                                      {k.product?.name || "Software"}
                                    </span>
                                    <span className="text-[10px] text-[#86948a]">
                                      {k.variant?.name || "Plano Padrão"}
                                    </span>
                                  </div>
                                </td>

                                <td className="p-3.5">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    k.status === "UNASSIGNED"
                                      ? "bg-[#10b981]/15 text-[#10b981]"
                                      : k.status === "ACTIVE"
                                      ? "bg-cyan-500/15 text-cyan-300"
                                      : k.status === "FROZEN"
                                      ? "bg-purple-500/15 text-purple-300"
                                      : k.status === "NOT_ACTIVATED"
                                      ? "bg-amber-500/15 text-amber-300"
                                      : "bg-rose-500/15 text-rose-300"
                                  }`}>
                                    {k.status}
                                  </span>
                                </td>

                                <td className="p-3.5">
                                  {k.user ? (
                                    <span className="text-white font-sans text-xs flex items-center gap-1">
                                      <User className="w-3 h-3 text-[#10b981]" />
                                      <span>@{k.user.username}</span>
                                    </span>
                                  ) : (
                                    <span className="text-[#86948a] text-[11px]">Disponível no Estoque</span>
                                  )}
                                </td>

                                <td className="p-3.5 text-[#86948a] text-[11px]">
                                  {k.expiresAt ? new Date(k.expiresAt).toLocaleDateString("pt-BR") : "—"}
                                </td>

                                <td className="p-3.5 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    {k.user && (
                                      <>
                                        <button
                                          onClick={() => handleManageLicense(k.id, "RETURN_TO_STOCK", k.key)}
                                          className="px-2 py-1 rounded bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 font-bold text-[10px] transition-colors cursor-pointer"
                                          title="Desvincular do cliente e devolver ao estoque"
                                        >
                                          Devolver ao Estoque
                                        </button>
                                        {k.status !== "REVOKED" && (
                                          <button
                                            onClick={() => handleManageLicense(k.id, "REVOKE", k.key)}
                                            className="px-2 py-1 rounded bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 font-bold text-[10px] transition-colors cursor-pointer"
                                            title="Revogar chave do cliente"
                                          >
                                            Revogar
                                          </button>
                                        )}
                                      </>
                                    )}
                                    <button
                                      onClick={() => handleDeleteKey(k.id)}
                                      className="px-2 py-1 rounded bg-white/5 hover:bg-rose-500/20 text-[#86948a] hover:text-rose-300 font-bold text-[10px] transition-colors cursor-pointer"
                                      title="Remover chave do estoque"
                                    >
                                      Remover
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ORDERS */}
          {activeAdminTab === "orders" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/8">
                <div>
                  <h2 className="font-['Space_Grotesk'] text-base font-bold text-white">Vendas &amp; Transações Concluídas</h2>
                  <p className="text-xs text-[#86948a]">Histórico de liquidações em tempo real do PostgreSQL.</p>
                </div>
                <button
                  onClick={loadOrders}
                  disabled={loadingOrders}
                  className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 font-mono text-xs flex items-center gap-2 transition-colors cursor-pointer self-start sm:self-auto"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-[#10b981] ${loadingOrders ? "animate-spin" : ""}`} />
                  <span>{loadingOrders ? "Atualizando..." : "Recarregar Vendas"}</span>
                </button>
              </div>

              {loadingOrders && orders.length === 0 ? (
                <div className="p-12 text-center rounded-2xl bg-[#0b0f0d] border border-white/8">
                  <Loader2 className="w-6 h-6 text-[#10b981] animate-spin mx-auto mb-2" />
                  <span className="font-mono text-xs text-[#86948a]">Carregando pedidos do PostgreSQL...</span>
                </div>
              ) : orders.length === 0 ? (
                <div className="p-12 text-center rounded-2xl bg-[#0b0f0d] border border-white/8 space-y-2">
                  <ShoppingBag className="w-8 h-8 text-[#86948a] mx-auto opacity-40" />
                  <h3 className="font-['Space_Grotesk'] text-sm font-bold text-white">Nenhum pedido registrado ainda</h3>
                  <p className="text-xs text-[#86948a] max-w-sm mx-auto">
                    Assim que uma compra for iniciada ou concluída no checkout, o registro aparecerá aqui com todos os detalhes e vínculo do Discord.
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl bg-[#0b0f0d] overflow-x-auto border border-white/8">
                  <table className="w-full text-left text-xs font-mono min-w-[760px]">
                    <thead className="bg-[#101412] text-[#86948a] uppercase border-b border-white/8">
                      <tr>
                        <th className="p-4">PEDIDO / DATA &amp; HORA</th>
                        <th className="p-4">CLIENTE / DISCORD</th>
                        <th className="p-4">PRODUTO</th>
                        <th className="p-4">FORMA DE PAGAMENTO</th>
                        <th className="p-4">TOTAL</th>
                        <th className="p-4">STATUS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-white">
                      {orders.map((ord) => {
                        const statusBadge =
                          ord.status === "COMPLETED"
                            ? "bg-[#10b981]/15 text-[#10b981] border-[#10b981]/30"
                            : ord.status === "PENDING"
                            ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                            : "bg-rose-500/15 text-rose-400 border-rose-500/30";

                        const statusLabel =
                          ord.status === "COMPLETED"
                            ? "CONCLUÍDO"
                            : ord.status === "PENDING"
                            ? "PENDENTE"
                            : ord.status === "CANCELLED"
                            ? "CANCELADO"
                            : ord.status;

                        return (
                          <tr key={ord.id} className="hover:bg-white/[0.02] transition-colors">
                            <td className="p-4">
                              <span className="text-[#10b981] font-bold block">
                                #{ord.orderNumber || ord.id.slice(0, 8)}
                              </span>
                              <span className="text-[#86948a] text-[11px] block mt-0.5">
                                {ord.formattedDateTime}
                              </span>
                            </td>

                            <td className="p-4">
                              <span className="font-sans font-medium text-white block">
                                {ord.user.fullName || ord.user.username}
                              </span>
                              <span className="text-[#86948a] text-[11px] block">
                                {ord.user.email}
                              </span>
                              {ord.user.hasDiscord ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 mt-1 rounded bg-[#5865F2]/15 text-[#7983F5] border border-[#5865F2]/25 text-[10px] font-sans font-medium">
                                  <span>🎮</span>
                                  <span>@{ord.user.discordUsername || ord.user.discordId}</span>
                                </span>
                              ) : (
                                <span className="inline-block mt-1 text-[10px] text-[#86948a]/70">
                                  Sem Discord vinculado
                                </span>
                              )}
                            </td>

                            <td className="p-4 font-sans max-w-xs">
                              <span className="text-white font-medium block truncate">
                                {ord.productSummary}
                              </span>
                              {ord.licenseKeyCount > 0 && (
                                <span className="text-[10px] font-mono text-[#10b981] block mt-0.5">
                                  ✓ {ord.licenseKeyCount} chave(s) emitida(s)
                                </span>
                              )}
                            </td>

                            <td className="p-4">
                              <span className="uppercase font-bold text-white block">
                                {ord.paymentMethod}
                              </span>
                              <span className="text-[10px] text-[#86948a] block">
                                Gateway: {ord.paymentGateway}
                              </span>
                            </td>

                            <td className="p-4 text-[#10b981] font-bold text-sm">
                              {ord.totalFormatted}
                            </td>

                            <td className="p-4">
                              <span className={`px-2 py-0.5 rounded border font-bold text-[10px] ${statusBadge}`}>
                                {statusLabel}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: USERS & ACCESS CONTROL */}
          {activeAdminTab === "users" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/8">
                <div>
                  <h2 className="font-['Space_Grotesk'] text-base font-bold text-white">
                    Gestão de Usuários, Blacklist &amp; Reset de HWID
                  </h2>
                  <p className="text-xs text-[#86948a]">
                    Controle de contas, aplicação de punições e liberação de troca de hardware.
                  </p>
                </div>

                {/* Sub-abas */}
                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#0b0f0d] border border-white/8 text-xs font-['Space_Grotesk'] font-bold">
                  <button
                    onClick={() => setUserSubTab("users")}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      userSubTab === "users"
                        ? "bg-[#10b981] text-[#050706]"
                        : "text-[#86948a] hover:text-white"
                    }`}
                  >
                    Base de Clientes ({usersList.length})
                  </button>

                  <button
                    onClick={() => setUserSubTab("blacklist")}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      userSubTab === "blacklist"
                        ? "bg-rose-500 text-white"
                        : "text-[#86948a] hover:text-white"
                    }`}
                  >
                    Blacklist Ativa ({blacklistList.length})
                  </button>

                  <button
                    onClick={() => setUserSubTab("hwid")}
                    className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                      userSubTab === "hwid"
                        ? "bg-cyan-500 text-[#050706]"
                        : "text-[#86948a] hover:text-white"
                    }`}
                  >
                    <span>Pedidos Reset HWID</span>
                    {hwidRequests.length > 0 && (
                      <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center font-mono">
                        {hwidRequests.length}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* SUB-ABA 1: USUÁRIOS */}
              {userSubTab === "users" && (
                <div className="space-y-4">
                  {/* Filtros */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="relative w-full sm:w-72">
                      <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#86948a]" />
                      <input
                        type="text"
                        placeholder="Buscar por usuário, e-mail ou Discord..."
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#0b0f0d] border border-white/10 text-xs text-white placeholder-[#86948a] focus:outline-none focus:border-[#10b981]"
                      />
                    </div>

                    <div className="flex items-center gap-1.5 text-xs font-mono self-start sm:self-auto">
                      {(["ALL", "CUSTOMER", "RESELLER", "ADMIN"] as const).map((r) => (
                        <button
                          key={r}
                          onClick={() => setUserRoleFilter(r)}
                          className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                            userRoleFilter === r
                              ? "bg-white/15 text-white font-bold"
                              : "text-[#86948a] hover:text-white bg-[#0b0f0d]"
                          }`}
                        >
                          {r === "ALL" ? "TODOS" : r === "CUSTOMER" ? "CLIENTES" : r === "RESELLER" ? "REVENDEDORES" : "ADMINS"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {loadingUsers ? (
                    <div className="py-12 text-center text-[#86948a] font-mono text-xs flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin text-[#10b981]" />
                      <span>Carregando usuários do PostgreSQL...</span>
                    </div>
                  ) : (
                    <div className="rounded-2xl bg-[#0b0f0d] overflow-x-auto border border-white/8">
                      <table className="w-full text-left text-xs font-mono min-w-[700px]">
                        <thead className="bg-[#101412] text-[#86948a] uppercase border-b border-white/8">
                          <tr>
                            <th className="p-3.5">USUÁRIO / NOME</th>
                            <th className="p-3.5">E-MAIL</th>
                            <th className="p-3.5">DISCORD</th>
                            <th className="p-3.5">CARGO</th>
                            <th className="p-3.5">HISTÓRICO</th>
                            <th className="p-3.5">STATUS</th>
                            <th className="p-3.5 text-right">AÇÕES</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-white">
                          {usersList
                            .filter((u) => {
                              const matchSearch =
                                !userSearch ||
                                u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
                                u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
                                (u.discordUsername && u.discordUsername.toLowerCase().includes(userSearch.toLowerCase()));
                              const matchRole =
                                userRoleFilter === "ALL" || u.role === userRoleFilter;
                              return matchSearch && matchRole;
                            })
                            .map((usr) => (
                              <tr key={usr.id} className="hover:bg-white/[0.02]">
                                <td className="p-3.5">
                                  <div 
                                    onClick={() => loadCustomerDetails(usr.id)}
                                    className="flex items-center gap-2.5 cursor-pointer group"
                                  >
                                    <div className="w-7 h-7 rounded-full bg-[#10b981]/20 text-[#10b981] font-bold text-xs flex items-center justify-center font-mono group-hover:scale-110 transition-transform">
                                      {usr.username.slice(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                      <span className="font-sans font-bold text-white block group-hover:text-[#10b981] transition-colors">
                                        @{usr.username}
                                      </span>
                                      <span className="text-[11px] text-[#86948a] font-sans">
                                        {usr.fullName}
                                      </span>
                                    </div>
                                  </div>
                                </td>

                                <td className="p-3.5 text-[#bbcabf]">{usr.email}</td>

                                <td className="p-3.5">
                                  {usr.hasDiscord ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#5865F2]/15 text-[#7983F5] text-[10px] font-sans font-medium">
                                      <span>🎮</span>
                                      <span>@{usr.discordUsername || usr.discordId}</span>
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-[#86948a]/60">Não vinculado</span>
                                  )}
                                </td>

                                <td className="p-3.5">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    usr.role === "ADMIN"
                                      ? "bg-rose-500/15 text-rose-400"
                                      : usr.role === "RESELLER"
                                      ? "bg-purple-500/15 text-purple-400"
                                      : "bg-[#10b981]/15 text-[#10b981]"
                                  }`}>
                                    {usr.role}
                                  </span>
                                </td>

                                <td className="p-3.5 text-[11px] text-[#86948a]">
                                  <span>{usr.orderCount} compras</span> • <span>{usr.licenseCount} licenças</span>
                                </td>

                                <td className="p-3.5">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    usr.isBanned
                                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                      : "bg-[#10b981]/15 text-[#10b981]"
                                  }`}>
                                    {usr.isBanned ? "BANIDO" : "ATIVO"}
                                  </span>
                                </td>

                                <td className="p-3.5 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      onClick={() => loadCustomerDetails(usr.id)}
                                      className="px-2.5 py-1 rounded-lg text-[10px] font-bold font-['Space_Grotesk'] bg-white/5 hover:bg-white/10 text-white transition-colors cursor-pointer"
                                      title="Ver compras, licenças e telemetria do cliente"
                                    >
                                      Detalhes
                                    </button>

                                    <button
                                      onClick={() => handleOpenGrantFree(usr.id)}
                                      className="px-2 py-1 rounded-lg text-[10px] font-bold font-['Space_Grotesk'] bg-purple-950/40 hover:bg-purple-900/60 text-purple-300 border border-purple-500/30 transition-colors cursor-pointer"
                                      title="Conceder licença gratuita para este cliente"
                                    >
                                      🎁 Licença
                                    </button>

                                    {usr.role !== "ADMIN" && (
                                      <button
                                        onClick={() => handleToggleBanUser(usr.id, usr.isBanned)}
                                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold font-['Space_Grotesk'] transition-colors cursor-pointer ${
                                          usr.isBanned
                                            ? "bg-[#10b981]/20 text-[#10b981] hover:bg-[#10b981]/30"
                                            : "bg-rose-500/15 text-rose-300 hover:bg-rose-500/25"
                                        }`}
                                      >
                                        {usr.isBanned ? "Desbanir" : "Banir"}
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* SUB-ABA 2: BLACKLIST */}
              {userSubTab === "blacklist" && (
                <div className="space-y-5">
                  {/* Formulário de Inclusão na Blacklist */}
                  <form onSubmit={handleAddBlacklist} className="p-4 rounded-2xl bg-[#0b0f0d] border border-white/8 space-y-3">
                    <h4 className="font-['Space_Grotesk'] text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-rose-400" />
                      <span>Adicionar Novo Bloqueio Rigoroso</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <label className="text-[#86948a] font-mono block mb-1">TIPO DE ALVO:</label>
                        <select
                          value={newBlacklistType}
                          onChange={(e) => setNewBlacklistType(e.target.value as any)}
                          className="w-full px-3 py-2 rounded-xl bg-[#050706] border border-white/10 text-white font-mono"
                        >
                          <option value="EMAIL">E-mail</option>
                          <option value="IP">Endereço IP</option>
                          <option value="HWID">HWID (Hardware ID)</option>
                          <option value="DISCORD_ID">Discord ID</option>
                          <option value="USERNAME">Nome de Usuário</option>
                        </select>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="text-[#86948a] font-mono block mb-1">VALOR DO ALVO:</label>
                        <input
                          type="text"
                          required
                          value={newBlacklistValue}
                          onChange={(e) => setNewBlacklistValue(e.target.value)}
                          placeholder="Ex: 192.168.1.1 ou usuario@fraude.com ou HWID-XXXX"
                          className="w-full px-3 py-2 rounded-xl bg-[#050706] border border-white/10 text-white font-mono"
                        />
                      </div>

                      <div>
                        <label className="text-[#86948a] font-mono block mb-1">MOTIVO (OPCIONAL):</label>
                        <input
                          type="text"
                          value={newBlacklistReason}
                          onChange={(e) => setNewBlacklistReason(e.target.value)}
                          placeholder="Ex: Chargeback fraudulento"
                          className="w-full px-3 py-2 rounded-xl bg-[#050706] border border-white/10 text-white"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        type="submit"
                        disabled={savingBlacklist}
                        className="px-4 py-2 rounded-xl text-xs font-bold font-['Space_Grotesk'] bg-rose-600 hover:bg-rose-500 text-white transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        {savingBlacklist && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        <Ban className="w-3.5 h-3.5" />
                        <span>Bloquear Alvo no Banco</span>
                      </button>
                    </div>
                  </form>

                  {/* Tabela de Blacklist */}
                  {loadingBlacklist ? (
                    <div className="py-12 text-center text-[#86948a] font-mono text-xs flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin text-rose-400" />
                      <span>Carregando registros da Blacklist...</span>
                    </div>
                  ) : blacklistList.length === 0 ? (
                    <div className="p-8 text-center rounded-2xl bg-[#0b0f0d] border border-white/8 text-xs text-[#86948a] font-mono">
                      Nenhum IP, e-mail ou HWID bloqueado no momento.
                    </div>
                  ) : (
                    <div className="rounded-2xl bg-[#0b0f0d] overflow-x-auto border border-white/8">
                      <table className="w-full text-left text-xs font-mono min-w-[650px]">
                        <thead className="bg-[#101412] text-[#86948a] uppercase border-b border-white/8">
                          <tr>
                            <th className="p-3.5">TIPO</th>
                            <th className="p-3.5">VALOR BLOQUEADO</th>
                            <th className="p-3.5">MOTIVO</th>
                            <th className="p-3.5">DATA DO BLOQUEIO</th>
                            <th className="p-3.5 text-right">AÇÕES</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-white">
                          {blacklistList.map((bl) => (
                            <tr key={bl.id} className="hover:bg-white/[0.02]">
                              <td className="p-3.5">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300">
                                  {bl.type}
                                </span>
                              </td>
                              <td className="p-3.5 font-bold text-white">{bl.value}</td>
                              <td className="p-3.5 text-[#86948a]">{bl.reason || "Sem motivo registrado"}</td>
                              <td className="p-3.5 text-[#86948a]">{new Date(bl.createdAt).toLocaleDateString("pt-BR")}</td>
                              <td className="p-3.5 text-right">
                                <button
                                  onClick={() => handleDeleteBlacklist(bl.id)}
                                  className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white/5 hover:bg-white/10 text-rose-400 transition-colors cursor-pointer"
                                >
                                  Remover Bloqueio
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* SUB-ABA 3: SOLICITAÇÕES DE HWID RESET */}
              {userSubTab === "hwid" && (
                <div className="space-y-4">
                  {loadingHwidRequests ? (
                    <div className="py-12 text-center text-[#86948a] font-mono text-xs flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
                      <span>Carregando solicitações de HWID...</span>
                    </div>
                  ) : hwidRequests.length === 0 ? (
                    <div className="p-10 text-center rounded-2xl bg-[#0b0f0d] border border-white/8 text-xs text-[#86948a] font-mono space-y-2">
                      <CheckCircle2 className="w-8 h-8 text-[#10b981] mx-auto opacity-40" />
                      <p>Nenhuma solicitação de troca de HWID pendente.</p>
                    </div>
                  ) : (
                    <div className="rounded-2xl bg-[#0b0f0d] overflow-x-auto border border-white/8">
                      <table className="w-full text-left text-xs font-mono min-w-[750px]">
                        <thead className="bg-[#101412] text-[#86948a] uppercase border-b border-white/8">
                          <tr>
                            <th className="p-3.5">CLIENTE</th>
                            <th className="p-3.5">SOFTWARE / CHAVE</th>
                            <th className="p-3.5">HWID ATUAL TRAVADO</th>
                            <th className="p-3.5">MOTIVO INFORMADO</th>
                            <th className="p-3.5">DATA</th>
                            <th className="p-3.5 text-right">DECISÃO</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-white">
                          {hwidRequests.map((req) => (
                            <tr key={req.id} className="hover:bg-white/[0.02]">
                              <td className="p-3.5">
                                <span className="font-sans font-bold text-white block">
                                  @{req.user.username}
                                </span>
                                <span className="text-[11px] text-[#86948a] block">
                                  {req.user.email}
                                </span>
                              </td>

                              <td className="p-3.5">
                                <span className="text-white block font-sans">
                                  {req.licenseKey?.product?.name || "Software"}
                                </span>
                                <span className="text-[10px] text-[#86948a] font-mono block">
                                  {req.licenseKey?.key?.slice(0, 16)}...
                                </span>
                              </td>

                              <td className="p-3.5 text-cyan-400 font-bold">
                                {req.licenseKey?.hwid || "NÃO VINCULADO"}
                              </td>

                              <td className="p-3.5 text-[#bbcabf] font-sans max-w-xs">
                                {req.reason}
                              </td>

                              <td className="p-3.5 text-[#86948a]">
                                {new Date(req.createdAt).toLocaleDateString("pt-BR")}
                              </td>

                              <td className="p-3.5 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => handleHwidRequestAction(req.id, "APPROVED")}
                                    className="px-3 py-1.5 rounded-lg text-xs font-bold font-['Space_Grotesk'] bg-[#10b981] text-[#050706] hover:bg-[#34d399] transition-colors cursor-pointer"
                                  >
                                    Aprovar Reset
                                  </button>
                                  <button
                                    onClick={() => handleHwidRequestAction(req.id, "REJECTED")}
                                    className="px-3 py-1.5 rounded-lg text-xs font-bold font-['Space_Grotesk'] bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 transition-colors cursor-pointer"
                                  >
                                    Recusar
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: STATUS DOS SERVIÇOS & TELEMETRIA REAL */}
          {activeAdminTab === "status" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/8">
                <div>
                  <h2 className="font-['Space_Grotesk'] text-base font-bold text-white">
                    Controle de Status dos Serviços (PostgreSQL)
                  </h2>
                  <p className="text-xs text-[#86948a]">
                    Altere o estado operacional em tempo real exibido na página pública de telemetria (/status).
                  </p>
                </div>
                <button
                  onClick={loadStatusServices}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-mono text-xs flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-[#10b981]" />
                  <span>Atualizar</span>
                </button>
              </div>

              {loadingStatus ? (
                <div className="py-12 text-center text-[#86948a] font-mono text-xs flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-[#10b981]" />
                  <span>Carregando serviços do PostgreSQL...</span>
                </div>
              ) : statusServices.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-[#0b0f0d] border border-white/8 text-xs text-[#86948a] font-mono">
                  Nenhum serviço de telemetria cadastrado no banco.
                </div>
              ) : (
                <div className="space-y-3">
                  {statusServices.map((srv) => (
                    <div
                      key={srv.id}
                      className="rounded-2xl bg-[#0b0f0d] p-5 border border-white/8 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div>
                        <div className="flex items-center gap-2.5">
                          <h4 className="font-['Space_Grotesk'] text-sm font-bold text-white">
                            {srv.name}
                          </h4>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                            srv.status === "OPERATIONAL"
                              ? "bg-[#10b981]/15 text-[#10b981]"
                              : srv.status === "MAINTENANCE"
                              ? "bg-amber-500/15 text-amber-300"
                              : "bg-rose-500/15 text-rose-300"
                          }`}>
                            {srv.status === "OPERATIONAL" ? "OPERACIONAL" : srv.status === "MAINTENANCE" ? "EM MANUTENÇÃO" : "DEGRADADO"}
                          </span>
                        </div>
                        <p className="text-xs text-[#86948a] font-mono mt-0.5">
                          Slug: {srv.slug} • Uptime Histórico: {srv.uptimePercentage}%
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <label className="text-[11px] font-mono text-[#86948a]">ESTADO:</label>
                        <select
                          value={srv.status}
                          onChange={(e) => handleUpdateServiceStatus(srv.id, e.target.value)}
                          className="px-3.5 py-1.5 rounded-xl bg-[#050706] border border-white/10 font-mono text-xs text-white focus:outline-none focus:border-[#10b981] cursor-pointer"
                        >
                          <option value="OPERATIONAL">OPERACIONAL</option>
                          <option value="MAINTENANCE">MANUTENÇÃO (Freeze)</option>
                          <option value="DEGRADED">DEGRADADO</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 6: CUPONS DE DESCONTO REAIS */}
          {activeAdminTab === "coupons" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/8">
                <div>
                  <h2 className="font-['Space_Grotesk'] text-base font-bold text-white">
                    Cupons de Desconto Promocionais
                  </h2>
                  <p className="text-xs text-[#86948a]">
                    Campanhas ativas validadas no checkout via PostgreSQL.
                  </p>
                </div>
                <button
                  onClick={handleOpenNewCoupon}
                  className="px-4 py-2 rounded-xl bg-[#10b981] hover:bg-[#34d399] text-[#050706] text-xs font-bold font-['Space_Grotesk'] flex items-center gap-1.5 shadow-md transition-colors cursor-pointer self-start sm:self-auto"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Novo Cupom</span>
                </button>
              </div>

              {loadingCoupons ? (
                <div className="py-12 text-center text-[#86948a] font-mono text-xs flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-[#10b981]" />
                  <span>Carregando cupons do banco...</span>
                </div>
              ) : couponsList.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-[#0b0f0d] border border-white/8 text-xs text-[#86948a] font-mono space-y-3">
                  <Ticket className="w-8 h-8 text-[#10b981] mx-auto opacity-40" />
                  <p>Nenhum cupom cadastrado ainda.</p>
                  <button
                    onClick={handleOpenNewCoupon}
                    className="px-3.5 py-1.5 rounded-xl bg-[#10b981] text-[#050706] font-bold text-xs"
                  >
                    Criar Primeiro Cupom
                  </button>
                </div>
              ) : (
                <div className="rounded-2xl bg-[#0b0f0d] overflow-x-auto border border-white/8">
                  <table className="w-full text-left text-xs font-mono min-w-[700px]">
                    <thead className="bg-[#101412] text-[#86948a] uppercase border-b border-white/8">
                      <tr>
                        <th className="p-3.5">CÓDIGO</th>
                        <th className="p-3.5">DESCONTO</th>
                        <th className="p-3.5">UTILIZAÇÃO</th>
                        <th className="p-3.5">PEDIDO MÍNIMO</th>
                        <th className="p-3.5">STATUS</th>
                        <th className="p-3.5 text-right">AÇÕES</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-white">
                      {couponsList.map((cup) => {
                        const isPercent = (cup as any).discountType === "PERCENTAGE" || (cup.discountPercent !== null && cup.discountPercent !== undefined);
                        const discountVal = (cup as any).discountValue ?? cup.discountPercent ?? cup.discountAmountCents ?? 0;
                        const minOrder = (cup as any).minOrderCents ?? cup.minOrderAmountCents ?? 0;
                        const isCupActive = (cup as any).isActive !== undefined ? (cup as any).isActive : cup.active;

                        return (
                          <tr key={cup.id} className="hover:bg-white/[0.02]">
                            <td className="p-3.5 font-bold text-[#10b981] text-sm">
                              {cup.code}
                            </td>
                            <td className="p-3.5">
                              {isPercent ? (
                                <span className="font-bold text-white">{discountVal}% OFF</span>
                              ) : (
                                <span className="font-bold text-white">R$ {centsToBr(discountVal)} OFF</span>
                              )}
                            </td>
                            <td className="p-3.5 text-[#bbcabf]">
                              {cup.usedCount} / {cup.maxUses ? `${cup.maxUses} máx.` : "Ilimitado"}
                            </td>
                            <td className="p-3.5 text-[#86948a]">
                              {minOrder > 0 ? `R$ ${centsToBr(minOrder)}` : "Sem mínimo"}
                            </td>
                            <td className="p-3.5">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                isCupActive
                                  ? "bg-[#10b981]/15 text-[#10b981]"
                                  : "bg-white/5 text-[#86948a]"
                              }`}>
                                {isCupActive ? "ATIVO" : "INATIVO"}
                              </span>
                            </td>
                            <td className="p-3.5 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleOpenEditCoupon(cup)}
                                  className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-[#181c1a] hover:bg-[#202623] text-emerald-400 border border-emerald-500/20 flex items-center gap-1 transition-colors cursor-pointer"
                                  title="Editar cupom"
                                >
                                  <Edit className="w-3 h-3 text-emerald-400" />
                                  <span>Editar</span>
                                </button>
                                <button
                                  onClick={() => handleToggleCoupon(cup.id, isCupActive)}
                                  className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white/5 hover:bg-white/10 text-white transition-colors cursor-pointer"
                                >
                                  {isCupActive ? "Desativar" : "Ativar"}
                                </button>
                                <button
                                  onClick={() => handleDeleteCoupon(cup.id)}
                                  className="p-1 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                  title="Excluir cupom"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 7: AUDITORIA & LOGS REAIS */}
          {activeAdminTab === "audit" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/8">
                <div>
                  <h2 className="font-['Space_Grotesk'] text-base font-bold text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#10b981]" />
                    <span>Logs de Auditoria &amp; Segurança (AuditLog)</span>
                  </h2>
                  <p className="text-xs text-[#86948a]">
                    Registro cronológico imutável de eventos críticos, ativações de chaves e acessos ao sistema.
                  </p>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#86948a]" />
                  <input
                    type="text"
                    placeholder="Filtrar eventos ou ação..."
                    value={auditSearch}
                    onChange={(e) => setAuditSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#0b0f0d] border border-white/10 text-xs text-white placeholder-[#86948a] focus:outline-none focus:border-[#10b981]"
                  />
                </div>
              </div>

              {loadingAudit ? (
                <div className="py-12 text-center text-[#86948a] font-mono text-xs flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-[#10b981]" />
                  <span>Carregando trilha de auditoria do PostgreSQL...</span>
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-[#0b0f0d] border border-white/8 text-xs text-[#86948a] font-mono">
                  Nenhum log de auditoria registrado no banco.
                </div>
              ) : (
                <div className="rounded-2xl bg-[#0b0f0d] overflow-x-auto border border-white/8">
                  <table className="w-full text-left text-xs font-mono min-w-[750px]">
                    <thead className="bg-[#101412] text-[#86948a] uppercase border-b border-white/8">
                      <tr>
                        <th className="p-3.5">DATA &amp; HORA</th>
                        <th className="p-3.5">AÇÃO</th>
                        <th className="p-3.5">USUÁRIO / ATOR</th>
                        <th className="p-3.5">IP</th>
                        <th className="p-3.5">DETALHES DO EVENTO</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-white">
                      {auditLogs
                        .filter((log) => {
                          if (!auditSearch) return true;
                          const s = auditSearch.toLowerCase();
                          return (
                            log.action.toLowerCase().includes(s) ||
                            (log.user?.username && log.user.username.toLowerCase().includes(s)) ||
                            (log.ipAddress && log.ipAddress.includes(s))
                          );
                        })
                        .map((log) => {
                          const isSecurity =
                            log.action.includes("MISMATCH") || log.action.includes("BAN") || log.action.includes("BLACKLIST");
                          const isSuccess =
                            log.action.includes("ACTIVATION") || log.action.includes("PAYMENT") || log.action.includes("LOGIN");

                          return (
                            <tr key={log.id} className="hover:bg-white/[0.02]">
                              <td className="p-3.5 text-[#86948a] whitespace-nowrap">
                                {log.formattedDate}
                              </td>
                              <td className="p-3.5">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  isSecurity
                                    ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                    : isSuccess
                                    ? "bg-[#10b981]/15 text-[#10b981]"
                                    : "bg-white/10 text-[#bbcabf]"
                                }`}>
                                  {log.action}
                                </span>
                              </td>
                              <td className="p-3.5">
                                {log.user ? (
                                  <div>
                                    <span className="font-bold text-white block">
                                      @{log.user.username}
                                    </span>
                                    <span className="text-[10px] text-[#86948a] block">
                                      {log.user.role}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-[#86948a]">Loader / Sistema</span>
                                )}
                              </td>
                              <td className="p-3.5 text-[#86948a]">
                                {log.ipAddress || "127.0.0.1"}
                              </td>
                              <td className="p-3.5 text-[#bbcabf] font-sans text-[11px] max-w-sm truncate">
                                {log.details ? JSON.stringify(log.details) : "—"}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        </div>

      </div>

      {/* ==================================================== */}
      {/* MODAL 1: FREEZE TIME & UNFREEZE                      */}
      {/* ==================================================== */}
      {freezeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="rounded-2xl bg-[#0b0f0d] max-w-md w-full p-6 border border-white/15 space-y-5 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/8">
              <h3 className="font-['Space_Grotesk'] text-base font-bold text-white flex items-center gap-2">
                <Snowflake className="w-4 h-4 text-cyan-400" />
                <span>Protocolo de Freeze Time</span>
              </h3>
              <button onClick={() => setFreezeModalOpen(false)} className="text-gray-500 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-[#bbcabf] space-y-4 font-['Geist']">
              <p>
                {freezeAction === "freeze" 
                  ? "Ao congelar o tempo do produto, todas as chaves ATIVAS terão seu status alterado para FROZEN e seus relógios paralisados."
                  : "Ao descongelar (unfreeze), o tempo em que o serviço esteve pausado é recalculado e somado à validade de cada chave."}
              </p>

              <div>
                <label className="text-[#86948a] font-mono text-[11px] block mb-1">AÇÃO DESEJADA:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFreezeAction("freeze")}
                    className={`py-2 rounded-xl font-bold font-mono text-xs transition-all ${
                      freezeAction === "freeze"
                        ? "bg-amber-500 text-[#050706]"
                        : "bg-[#050706] text-[#bbcabf] border border-white/10"
                    }`}
                  >
                    CONGELAR (Freeze)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFreezeAction("unfreeze")}
                    className={`py-2 rounded-xl font-bold font-mono text-xs transition-all ${
                      freezeAction === "unfreeze"
                        ? "bg-[#10b981] text-[#050706]"
                        : "bg-[#050706] text-[#bbcabf] border border-white/10"
                    }`}
                  >
                    DESCONGELAR (Unfreeze)
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[#86948a] font-mono text-[11px] block mb-1">PRODUTO ALVO:</label>
                <select
                  value={selectedProductForFreeze}
                  onChange={(e) => setSelectedProductForFreeze(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#050706] border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-[#10b981]"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.status})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[#86948a] font-mono text-[11px] block mb-1">MOTIVO / AVISO PÚBLICO:</label>
                <input
                  type="text"
                  value={freezeReason}
                  onChange={(e) => setFreezeReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#050706] border border-white/10 text-white text-xs focus:outline-none focus:border-[#10b981]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button onClick={() => setFreezeModalOpen(false)} className="px-4 py-2 text-xs text-[#86948a] cursor-pointer">
                Cancelar
              </button>
              <button
                onClick={handleExecuteFreeze}
                disabled={savingFreeze}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold font-['Space_Grotesk'] flex items-center gap-1.5 cursor-pointer ${
                  freezeAction === "freeze" ? "bg-amber-500 text-[#050706]" : "bg-[#10b981] text-[#050706]"
                }`}
              >
                {savingFreeze && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{freezeAction === "freeze" ? "Confirmar Freeze" : "Executar Unfreeze"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 2: COMPENSAÇÃO DE TEMPO                        */}
      {/* ==================================================== */}
      {compensateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="rounded-2xl bg-[#0b0f0d] max-w-md w-full p-6 border border-white/15 space-y-5 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/8">
              <h3 className="font-['Space_Grotesk'] text-base font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#10b981]" />
                <span>Compensação de Tempo em Massa</span>
              </h3>
              <button onClick={() => setCompensateModalOpen(false)} className="text-gray-500 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-[#bbcabf] space-y-4 font-['Geist']">
              <p>Adicione horas ou dias extras diretamente a todas as licenças ativas como bonificação compensatória.</p>
              
              <div>
                <label className="text-[#86948a] font-mono text-[11px] block mb-1">PRODUTO AFETADO:</label>
                <select
                  value={selectedProductForCompensate}
                  onChange={(e) => setSelectedProductForCompensate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#050706] border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-[#10b981]"
                >
                  <option value="all">TODOS OS PRODUTOS (Global)</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[#86948a] font-mono text-[11px] block mb-1">HORAS A ADICIONAR (+X):</label>
                <input
                  type="number"
                  min="1"
                  value={compensateHours}
                  onChange={(e) => setCompensateHours(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#050706] border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-[#10b981]"
                />
                <span className="text-[10px] text-[#86948a] block mt-1">Exemplo: 24 horas = +1 dia de validade para cada usuário com chave ativa.</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button onClick={() => setCompensateModalOpen(false)} className="px-4 py-2 text-xs text-[#86948a] cursor-pointer">
                Cancelar
              </button>
              <button
                onClick={handleExecuteCompensate}
                disabled={savingCompensate}
                className="px-5 py-2.5 rounded-xl text-xs font-bold font-['Space_Grotesk'] bg-[#10b981] text-[#050706] flex items-center gap-1.5 cursor-pointer shadow-lg shadow-[#10b981]/25"
              >
                {savingCompensate && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Aplicar Compensação</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 3: IMPORTAÇÃO OU GERAÇÃO AUTOMÁTICA DE CHAVES  */}
      {/* ==================================================== */}
      {importKeysModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="rounded-2xl bg-[#0b0f0d] max-w-md w-full p-6 border border-white/15 space-y-5 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/8">
              <h3 className="font-['Space_Grotesk'] text-base font-bold text-white flex items-center gap-2">
                <Key className="w-4 h-4 text-[#10b981]" />
                <span>Gestão de Estoque de Chaves</span>
              </h3>
              <button onClick={() => setImportKeysModalOpen(false)} className="text-gray-500 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-['Geist']">
              {/* Seletor de Modo: Importação Manual vs Geração Automática */}
              <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-[#050706] border border-white/5 font-mono text-[11px]">
                <button
                  type="button"
                  onClick={() => setImportMode("manual")}
                  className={`py-2 rounded-lg font-bold transition-all ${
                    importMode === "manual" ? "bg-[#10b981] text-[#050706]" : "text-[#86948a] hover:text-white"
                  }`}
                >
                  Importar Manual (1 por linha)
                </button>
                <button
                  type="button"
                  onClick={() => setImportMode("generate")}
                  className={`py-2 rounded-lg font-bold transition-all ${
                    importMode === "generate" ? "bg-purple-500 text-white" : "text-[#86948a] hover:text-white"
                  }`}
                >
                  Gerar Auto (OVERCLOCK-XXXX)
                </button>
              </div>

              {/* Seleção do Produto */}
              <div>
                <label className="text-[#86948a] font-mono text-[11px] block mb-1">PRODUTO ALVO:</label>
                <select
                  value={selectedProductForImport}
                  onChange={(e) => setSelectedProductForImport(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#050706] border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-[#10b981]"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Seleção da Variante */}
              <div>
                <label className="text-[#86948a] font-mono text-[11px] block mb-1">VARIANTE / PLANO:</label>
                <select
                  value={selectedVariantForImport}
                  onChange={(e) => setSelectedVariantForImport(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#050706] border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-[#10b981]"
                >
                  {products
                    .find((p) => p.id === selectedProductForImport)
                    ?.variants.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} (R$ {centsToBr(v.priceCents)}) - Estoque: {v.stockCount} un
                      </option>
                    ))}
                </select>
              </div>

              {importMode === "manual" ? (
                <div>
                  <label className="text-[#86948a] font-mono text-[11px] block mb-1">
                    LISTA DE CHAVES (UMA POR LINHA):
                  </label>
                  <textarea
                    rows={5}
                    value={batchKeysText}
                    onChange={(e) => setBatchKeysText(e.target.value)}
                    placeholder="OVERCLOCK-XXXX-XXXX-XXXX&#10;OVERCLOCK-YYYY-YYYY-YYYY"
                    className="w-full p-3 rounded-xl bg-[#050706] border border-white/10 text-white font-mono text-xs resize-none focus:outline-none focus:border-[#10b981]"
                  />
                  <span className="text-[10px] text-[#86948a] block mt-1">
                    Cada chave será salva no banco com status UNASSIGNED pronta para reserva atômica no checkout.
                  </span>
                </div>
              ) : (
                <div>
                  <label className="text-[#86948a] font-mono text-[11px] block mb-1">
                    QUANTIDADE DE CHAVES A GERAR:
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={generateCount}
                    onChange={(e) => setGenerateCount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#050706] border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-[#10b981]"
                  />
                  <span className="text-[10px] text-[#86948a] block mt-1">
                    Chaves criptográficas no formato OVERCLOCK-XXXX-XXXX-XXXX serão geradas e injetadas no estoque.
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button onClick={() => setImportKeysModalOpen(false)} className="px-4 py-2 text-xs text-[#86948a] cursor-pointer">
                Cancelar
              </button>
              <button
                onClick={handleSaveKeys}
                disabled={savingKeys}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold font-['Space_Grotesk'] flex items-center gap-1.5 cursor-pointer ${
                  importMode === "manual" ? "bg-[#10b981] text-[#050706]" : "bg-purple-500 text-white"
                }`}
              >
                {savingKeys && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{importMode === "manual" ? "Salvar no Estoque" : "Gerar e Salvar"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 4: CADASTRO E EDIÇÃO DE PRODUTO                */}
      {/* ==================================================== */}
      {productModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
          <div className="rounded-2xl bg-[#0b0f0d] max-w-2xl w-full p-6 sm:p-8 border border-white/15 space-y-6 shadow-2xl relative my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/8">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#10b981]/15 text-[#10b981] flex items-center justify-center">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-['Space_Grotesk'] text-lg font-bold text-white">
                    {editingProductId ? "Editar Produto" : "+ Cadastrar Novo Produto"}
                  </h3>
                  <span className="font-mono text-[10px] text-[#86948a]">
                    Persistência 100% real no PostgreSQL via Prisma ORM.
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setProductModalOpen(false)} 
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitProduct} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1 text-xs font-['Geist']">
              {/* Seção 1: Identificação Básica */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[#86948a] font-mono text-[11px] block mb-1">
                    NOME DO PRODUTO:
                  </label>
                  <input
                    type="text"
                    required
                    value={prodFormName}
                    onChange={(e) => {
                      setProdFormName(e.target.value);
                      if (!editingProductId) {
                        setProdFormSlug(
                          e.target.value
                            .toLowerCase()
                            .replace(/[^\w\s-]/g, "")
                            .replace(/\s+/g, "-")
                        );
                      }
                    }}
                    placeholder="Ex: Apex Phantom Pro"
                    className="w-full px-3 py-2 rounded-xl bg-[#050706] border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-[#10b981]"
                  />
                </div>

                <div>
                  <label className="text-[#86948a] font-mono text-[11px] block mb-1">
                    SLUG ÚNICO (URL):
                  </label>
                  <input
                    type="text"
                    required
                    value={prodFormSlug}
                    onChange={(e) => setProdFormSlug(e.target.value)}
                    placeholder="Ex: apex-phantom-pro"
                    className="w-full px-3 py-2 rounded-xl bg-[#050706] border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-[#10b981]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[#86948a] font-mono text-[11px] block mb-1">
                    CATEGORIA:
                  </label>
                  <select
                    value={prodFormCategory}
                    onChange={(e) => setProdFormCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#050706] border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-[#10b981]"
                  >
                    <option value="Battle Royale">Battle Royale</option>
                    <option value="FPS Tático">FPS Tático</option>
                    <option value="Competitivo">Competitivo</option>
                    <option value="Utilitários">Utilitários / HWID</option>
                  </select>
                </div>

                <div>
                  <label className="text-[#86948a] font-mono text-[11px] block mb-1">
                    STATUS OPERACIONAL:
                  </label>
                  <select
                    value={prodFormStatus}
                    onChange={(e) => setProdFormStatus(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-[#050706] border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-[#10b981]"
                  >
                    <option value="ONLINE">ONLINE (Disponível)</option>
                    <option value="MAINTENANCE">MANUTENÇÃO (Freeze Time)</option>
                    <option value="OUT_OF_STOCK">ESGOTADO</option>
                    <option value="DISABLED">OCULTO / DESATIVADO</option>
                  </select>
                </div>
              </div>

              {/* Destaque na Home */}
              <div className="p-3 rounded-xl bg-[#050706] border border-white/10 flex items-center justify-between">
                <div>
                  <span className="text-white font-bold block text-xs">Exibir em Destaque na Home (isFeatured)</span>
                  <span className="text-[#86948a] text-[10px]">Quando ativado, o produto ganha destaque na vitrine inicial da loja pública.</span>
                </div>
                <input
                  type="checkbox"
                  checked={prodFormIsFeatured}
                  onChange={(e) => setProdFormIsFeatured(e.target.checked)}
                  className="w-4 h-4 accent-[#10b981] rounded cursor-pointer"
                />
              </div>

              {/* Tagline e Descrição */}
              <div>
                <label className="text-[#86948a] font-mono text-[11px] block mb-1">
                  TAGLINE / SUBTÍTULO RESUMIDO:
                </label>
                <input
                  type="text"
                  required
                  value={prodFormTagline}
                  onChange={(e) => setProdFormTagline(e.target.value)}
                  placeholder="Ex: O padrão definitivo em visibilidade e previsão tática com driver Ring-0."
                  className="w-full px-3 py-2 rounded-xl bg-[#050706] border border-white/10 text-white text-xs focus:outline-none focus:border-[#10b981]"
                />
              </div>

              <div>
                <label className="text-[#86948a] font-mono text-[11px] block mb-1">
                  DESCRIÇÃO COMPLETA &amp; ARQUITETURA:
                </label>
                <textarea
                  rows={3}
                  value={prodFormDesc}
                  onChange={(e) => setProdFormDesc(e.target.value)}
                  placeholder="Descreva detalhes de funcionamento, compatibilidade de hardware, e proteções streamproof."
                  className="w-full p-3 rounded-xl bg-[#050706] border border-white/10 text-white text-xs resize-none focus:outline-none focus:border-[#10b981]"
                />
              </div>

              {/* Mídia: Vídeo & Imagens */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[#86948a] font-mono text-[11px] block mb-1">
                    URL DO VÍDEO (EMBED OU MP4):
                  </label>
                  <input
                    type="url"
                    value={prodFormVideo}
                    onChange={(e) => setProdFormVideo(e.target.value)}
                    placeholder="https://www.youtube.com/embed/..."
                    className="w-full px-3 py-2 rounded-xl bg-[#050706] border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-[#10b981]"
                  />
                </div>

                <div>
                  <label className="text-[#86948a] font-mono text-[11px] block mb-1">
                    CARGO DISCORD (ROLE ID):
                  </label>
                  <input
                    type="text"
                    value={prodFormDiscordRole}
                    onChange={(e) => setProdFormDiscordRole(e.target.value)}
                    placeholder="Ex: 118928374928173829"
                    className="w-full px-3 py-2 rounded-xl bg-[#050706] border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-[#10b981]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[#86948a] font-mono text-[11px] block mb-1">
                  URLS DAS IMAGENS / SCREENSHOTS (1 POR LINHA):
                </label>
                <textarea
                  rows={2}
                  value={prodFormImages}
                  onChange={(e) => setProdFormImages(e.target.value)}
                  placeholder="https://images.unsplash.com/photo-1&#10;https://images.unsplash.com/photo-2"
                  className="w-full p-3 rounded-xl bg-[#050706] border border-white/10 text-white font-mono text-xs resize-none focus:outline-none focus:border-[#10b981]"
                />
              </div>

              {/* ==================================================== */}
              {/* SEÇÃO TÉCNICA: CONTEÚDO DAS 3 ABAS DE /products/[slug] */}
              {/* ==================================================== */}
              <div className="p-4 rounded-xl bg-[#101412] border border-white/8 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-white/5">
                  <FileText className="w-4 h-4 text-[#10b981]" />
                  <span className="font-['Space_Grotesk'] text-xs font-bold text-white uppercase tracking-wider">
                    Abas Técnicas Exibidas na Página do Produto (/products/[slug])
                  </span>
                </div>

                {/* ABA 1: VISÃO GERAL & RECURSOS */}
                <div className="space-y-1.5">
                  <label className="text-[#10b981] font-mono text-[11px] font-bold block">
                    1. VISÃO GERAL &amp; RECURSOS DESTACADOS (1 por linha):
                  </label>
                  <textarea
                    rows={3}
                    value={prodFormFeatures}
                    onChange={(e) => setProdFormFeatures(e.target.value)}
                    placeholder="Injeção segura Ring-0 indetectável&#10;Proteção contra memory scans&#10;Autoatendimento de HWID&#10;Suporte Dedicado no Discord"
                    className="w-full p-2.5 rounded-lg bg-[#050706] border border-white/10 text-white font-mono text-xs resize-none focus:outline-none focus:border-[#10b981]"
                  />
                  <span className="text-[10px] text-[#86948a] block">
                    Cada linha será exibida como um card com ícone de verificação verde na aba Visão Geral.
                  </span>
                </div>

                {/* ABA 2: REQUISITOS DO SISTEMA */}
                <div className="space-y-2 pt-2 border-t border-white/5">
                  <label className="text-[#10b981] font-mono text-[11px] font-bold block">
                    2. REQUISITOS DO SISTEMA &amp; MATRIZ DE COMPATIBILIDADE:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[#86948a] font-mono text-[10px] block mb-1">SISTEMA OPERACIONAL:</label>
                      <input
                        type="text"
                        value={prodFormSpecOS}
                        onChange={(e) => setProdFormSpecOS(e.target.value)}
                        placeholder="Ex: Windows 10 / 11 (x64)"
                        className="w-full px-2.5 py-1.5 rounded-lg bg-[#050706] border border-white/10 text-white font-mono text-xs focus:border-[#10b981] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[#86948a] font-mono text-[10px] block mb-1">PROCESSADORES:</label>
                      <input
                        type="text"
                        value={prodFormSpecCPU}
                        onChange={(e) => setProdFormSpecCPU(e.target.value)}
                        placeholder="Ex: Intel & AMD (Todas as gerações)"
                        className="w-full px-2.5 py-1.5 rounded-lg bg-[#050706] border border-white/10 text-white font-mono text-xs focus:border-[#10b981] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[#86948a] font-mono text-[10px] block mb-1">ANTI-CHEAT ALVO:</label>
                      <input
                        type="text"
                        value={prodFormSpecAnticheat}
                        onChange={(e) => setProdFormSpecAnticheat(e.target.value)}
                        placeholder="Ex: Kernel Driver Shield / EAC / BattleEye"
                        className="w-full px-2.5 py-1.5 rounded-lg bg-[#050706] border border-white/10 text-white font-mono text-xs focus:border-[#10b981] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[#86948a] font-mono text-[10px] block mb-1">MODO STREAMPROOF:</label>
                      <input
                        type="text"
                        value={prodFormSpecStreamProof}
                        onChange={(e) => setProdFormSpecStreamProof(e.target.value)}
                        placeholder="Ex: 100% Nativo (OBS, Discord & Medal)"
                        className="w-full px-2.5 py-1.5 rounded-lg bg-[#050706] border border-white/10 text-white font-mono text-xs focus:border-[#10b981] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* ABA 3: CHANGELOGS & VERSÕES */}
                <div className="space-y-2 pt-2 border-t border-white/5">
                  <label className="text-[#10b981] font-mono text-[11px] font-bold block">
                    3. CHANGELOGS, ATUALIZAÇÕES &amp; VERSÕES:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[#86948a] font-mono text-[10px] block mb-1">VERSÃO ATUAL DO SOFTWARE:</label>
                      <input
                        type="text"
                        value={prodFormCurrentVersion}
                        onChange={(e) => setProdFormCurrentVersion(e.target.value)}
                        placeholder="Ex: v2.4.0"
                        className="w-full px-2.5 py-1.5 rounded-lg bg-[#050706] border border-white/10 text-white font-mono text-xs focus:border-[#10b981] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[#86948a] font-mono text-[10px] block mb-1">TÍTULO DA NOTA DE ATUALIZAÇÃO (OPCIONAL):</label>
                      <input
                        type="text"
                        value={prodFormChangelogTitle}
                        onChange={(e) => setProdFormChangelogTitle(e.target.value)}
                        placeholder="Ex: Hotfix de Estabilidade e Offsets"
                        className="w-full px-2.5 py-1.5 rounded-lg bg-[#050706] border border-white/10 text-white font-mono text-xs focus:border-[#10b981] focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[#86948a] font-mono text-[10px] block mb-1">MUDANÇAS RECENTES DO PATCH (1 por linha):</label>
                    <textarea
                      rows={2}
                      value={prodFormChangelogChanges}
                      onChange={(e) => setProdFormChangelogChanges(e.target.value)}
                      placeholder="Offsets atualizados para a nova season&#10;Melhoria na injeção do kernel driver&#10;Correção de latência no ESP"
                      className="w-full p-2.5 rounded-lg bg-[#050706] border border-white/10 text-white font-mono text-xs resize-none focus:outline-none focus:border-[#10b981]"
                    />
                  </div>
                </div>
              </div>

              {/* Variantes de Preço */}
              <div className="p-3.5 rounded-xl bg-[#101412] border border-white/8 space-y-2">
                <span className="font-mono text-[11px] text-[#10b981] font-bold uppercase block">
                  Precificação das Variantes de Acesso (Salvas em centavos no Postgres):
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="text-[#86948a] font-mono text-[10px] block mb-1">PASSE 24H (R$):</label>
                    <input
                      type="text"
                      value={prodFormDailyPrice}
                      onChange={(e) => setProdFormDailyPrice(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-[#050706] border border-white/10 text-white font-mono text-xs focus:border-[#10b981] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[#86948a] font-mono text-[10px] block mb-1">7 DIAS (R$):</label>
                    <input
                      type="text"
                      value={prodFormWeeklyPrice}
                      onChange={(e) => setProdFormWeeklyPrice(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-[#050706] border border-white/10 text-white font-mono text-xs focus:border-[#10b981] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[#86948a] font-mono text-[10px] block mb-1">30 DIAS (R$):</label>
                    <input
                      type="text"
                      value={prodFormMonthlyPrice}
                      onChange={(e) => setProdFormMonthlyPrice(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-[#050706] border border-white/10 text-white font-mono text-xs focus:border-[#10b981] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[#86948a] font-mono text-[10px] block mb-1">LIFETIME (R$):</label>
                    <input
                      type="text"
                      value={prodFormLifetimePrice}
                      onChange={(e) => setProdFormLifetimePrice(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-[#050706] border border-white/10 text-white font-mono text-xs focus:border-[#10b981] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Botões de Ação do Modal */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/8">
                <button
                  type="button"
                  onClick={() => setProductModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#86948a] hover:text-white transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingProduct}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold font-['Space_Grotesk'] bg-[#10b981] hover:bg-[#34d399] text-[#050706] shadow-lg shadow-[#10b981]/25 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {savingProduct && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingProductId ? "Salvar Alterações" : "Cadastrar Software"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ==================================================== */}
      {/* MODAL 5: NOVO CUPOM                                  */}
      {/* ==================================================== */}
      {couponModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="rounded-2xl bg-[#0b0f0d] max-w-md w-full p-6 border border-white/15 space-y-5 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/8">
              <h3 className="font-['Space_Grotesk'] text-base font-bold text-white flex items-center gap-2">
                <Ticket className="w-4 h-4 text-[#10b981]" />
                <span>{editingCouponId ? "Editar Cupom de Desconto" : "Criar Novo Cupom de Desconto"}</span>
              </h3>
              <button
                onClick={() => setCouponModalOpen(false)}
                className="text-gray-500 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCoupon} className="space-y-4 font-['Geist'] text-xs">
              <div>
                <label className="text-[#86948a] font-mono block mb-1">CÓDIGO DO CUPOM:</label>
                <input
                  type="text"
                  required
                  value={couponFormCode}
                  onChange={(e) => setCouponFormCode(e.target.value.toUpperCase())}
                  placeholder="Ex: PROMO20 ou OVERCLOCK10"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#050706] border border-white/10 font-mono text-xs uppercase font-bold text-[#10b981] tracking-wider focus:outline-none focus:border-[#10b981]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[#86948a] font-mono block mb-1">TIPO DE DESCONTO:</label>
                  <select
                    value={couponFormType}
                    onChange={(e) => setCouponFormType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-[#050706] border border-white/10 text-white font-mono"
                  >
                    <option value="PERCENT">Percentual (%)</option>
                    <option value="FIXED">Fixo em Reais (R$)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[#86948a] font-mono block mb-1">
                    {couponFormType === "PERCENT" ? "PORCENTAGEM (%):" : "VALOR (R$):"}
                  </label>
                  <input
                    type="text"
                    required
                    value={couponFormValue}
                    onChange={(e) => setCouponFormValue(e.target.value)}
                    placeholder={couponFormType === "PERCENT" ? "Ex: 20" : "Ex: 30,00"}
                    className="w-full px-3 py-2 rounded-xl bg-[#050706] border border-white/10 text-white font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[#86948a] font-mono block mb-1">LIMITE DE USOS (OPCIONAL):</label>
                  <input
                    type="number"
                    value={couponFormMaxUses}
                    onChange={(e) => setCouponFormMaxUses(e.target.value)}
                    placeholder="Ex: 50 (Vazio = Ilimitado)"
                    className="w-full px-3 py-2 rounded-xl bg-[#050706] border border-white/10 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-[#86948a] font-mono block mb-1">PEDIDO MÍNIMO (R$):</label>
                  <input
                    type="text"
                    value={couponFormMinAmount}
                    onChange={(e) => setCouponFormMinAmount(e.target.value)}
                    placeholder="Ex: 50,00 (Vazio = 0)"
                    className="w-full px-3 py-2 rounded-xl bg-[#050706] border border-white/10 text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/8">
                <button
                  type="button"
                  onClick={() => setCouponModalOpen(false)}
                  className="px-4 py-2 text-[#86948a] hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingCoupon}
                  className="px-5 py-2.5 rounded-xl font-bold font-['Space_Grotesk'] bg-[#10b981] hover:bg-[#34d399] text-[#050706] transition-colors flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  {savingCoupon && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingCouponId ? "Salvar Alterações" : "Salvar Cupom no PostgreSQL"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ATRIBUIR LICENÇA SEM PAGAMENTO (SORTEIO / BRINDE / PROMOÇÃO) */}
      {grantFreeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-3xl bg-[#0b0f0d] border border-purple-500/30 p-6 sm:p-8 space-y-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-white/8">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                  <Gift className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-['Space_Grotesk'] text-lg font-bold text-white">
                    Atribuir Licença Sem Pagamento
                  </h3>
                  <p className="text-xs text-[#86948a]">
                    Conceda acesso a software para sorteios, testes de parceiros ou cortesia.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setGrantFreeModalOpen(false)}
                className="text-gray-500 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGrantFreeLicense} className="space-y-4 text-xs font-['Geist']">
              <div>
                <label className="text-[#86948a] font-mono block mb-1">CLIENTE DESTINATÁRIO:</label>
                <select
                  value={grantFreeUserId}
                  onChange={(e) => setGrantFreeUserId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#050706] border border-white/10 text-white font-mono focus:outline-none focus:border-purple-500"
                  required
                >
                  <option value="">Selecione um cliente cadastrado...</option>
                  {usersList.map((u) => (
                    <option key={u.id} value={u.id}>
                      @{u.username} — {u.email} ({u.fullName})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[#86948a] font-mono block mb-1">PRODUTO / SOFTWARE:</label>
                  <select
                    value={grantFreeProductId}
                    onChange={(e) => {
                      setGrantFreeProductId(e.target.value);
                      const prod = products.find((p) => p.id === e.target.value);
                      if (prod && prod.variants.length > 0) {
                        setGrantFreeVariantId(prod.variants[0].id);
                      }
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#050706] border border-white/10 text-white font-mono focus:outline-none focus:border-purple-500"
                    required
                  >
                    <option value="">Selecione o produto...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[#86948a] font-mono block mb-1">PLANO / VARIANTE:</label>
                  <select
                    value={grantFreeVariantId}
                    onChange={(e) => setGrantFreeVariantId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#050706] border border-white/10 text-white font-mono focus:outline-none focus:border-purple-500"
                    required
                  >
                    {(() => {
                      const prod = products.find((p) => p.id === grantFreeProductId);
                      if (!prod || prod.variants.length === 0) {
                        return <option value="">Selecione um produto antes</option>;
                      }
                      return prod.variants.map((v) => (
                        <option key={v.id} value={v.id}>{v.name}</option>
                      ));
                    })()}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[#86948a] font-mono block mb-1">MOTIVO / FINALIDADE (AUDITORIA):</label>
                <input
                  type="text"
                  value={grantFreeReason}
                  onChange={(e) => setGrantFreeReason(e.target.value)}
                  placeholder="Ex: Sorteio no Discord oficial / Brinde da comunidade"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#050706] border border-white/10 text-white font-mono focus:outline-none focus:border-purple-500"
                  required
                />
              </div>

              <div className="p-3.5 rounded-xl bg-purple-950/20 border border-purple-500/20 text-[#bbcabf] text-[11px] space-y-1">
                <span className="font-bold text-purple-300 block">Como funciona a concessão gratuita:</span>
                <p>• Uma chave atômica disponível no estoque será alocada para o cliente com status <strong>NOT_ACTIVATED</strong>.</p>
                <p>• Um pedido auditado com valor R$ 0,00 será registrado e a licença aparecerá no <strong>/dashboard</strong> do cliente.</p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/8">
                <button
                  type="button"
                  onClick={() => setGrantFreeModalOpen(false)}
                  className="px-4 py-2 text-[#86948a] hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={grantingFreeLicense}
                  className="px-5 py-2.5 rounded-xl font-bold font-['Space_Grotesk'] bg-purple-600 hover:bg-purple-500 text-white transition-colors flex items-center gap-1.5 cursor-pointer shadow-lg shadow-purple-600/30"
                >
                  {grantingFreeLicense && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Conceder Licença</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: FICHA CADASTRAL DO CLIENTE (HISTÓRICO & LICENÇAS) */}
      {customerDetailsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-3xl rounded-3xl bg-[#0b0f0d] border border-white/10 p-6 sm:p-8 space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-white/8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#10b981]/20 text-[#10b981] font-bold text-sm flex items-center justify-center font-mono">
                  {selectedCustomerDetails?.username ? selectedCustomerDetails.username.slice(0, 2).toUpperCase() : "US"}
                </div>
                <div>
                  <h3 className="font-['Space_Grotesk'] text-lg font-bold text-white flex items-center gap-2">
                    <span>@{selectedCustomerDetails?.username}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      selectedCustomerDetails?.isBanned
                        ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                        : "bg-[#10b981]/15 text-[#10b981]"
                    }`}>
                      {selectedCustomerDetails?.isBanned ? "BANIDO" : "ATIVO"}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white/10 text-white">
                      {selectedCustomerDetails?.role}
                    </span>
                  </h3>
                  <p className="text-xs text-[#86948a] font-['Geist']">
                    {selectedCustomerDetails?.fullName} • {selectedCustomerDetails?.email}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCustomerDetailsModalOpen(false)}
                className="text-gray-500 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingCustomerDetails ? (
              <div className="py-16 text-center text-[#86948a] font-mono text-xs flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-[#10b981]" />
                <span>Carregando telemetria e compras do cliente...</span>
              </div>
            ) : selectedCustomerDetails ? (
              <div className="space-y-6 text-xs">
                {/* 1. Resumo de Cadastro */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
                  <div className="p-3 rounded-xl bg-[#050706] border border-white/5">
                    <span className="text-[#86948a] text-[10px] block">DISCORD</span>
                    <span className="text-white font-bold truncate block">
                      {selectedCustomerDetails.discordUsername ? `@${selectedCustomerDetails.discordUsername}` : "Não vinculado"}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#050706] border border-white/5">
                    <span className="text-[#86948a] text-[10px] block">TOTAL DE COMPRAS</span>
                    <span className="text-[#10b981] font-bold text-sm block">
                      {selectedCustomerDetails.orders?.length || 0} pedidos
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#050706] border border-white/5">
                    <span className="text-[#86948a] text-[10px] block">LICENÇAS VINCULADAS</span>
                    <span className="text-cyan-400 font-bold text-sm block">
                      {selectedCustomerDetails.licenses?.length || 0} licenças
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#050706] border border-white/5">
                    <span className="text-[#86948a] text-[10px] block">CADASTRADO EM</span>
                    <span className="text-white text-xs block">
                      {new Date(selectedCustomerDetails.createdAt).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                </div>

                {/* 2. Licenças Ativas do Cliente */}
                <div className="space-y-2">
                  <h4 className="font-['Space_Grotesk'] font-bold text-white text-sm flex items-center justify-between">
                    <span>Licenças Digitais do Cliente</span>
                    <span className="text-xs text-[#86948a] font-mono">
                      {selectedCustomerDetails.licenses?.length || 0} no banco
                    </span>
                  </h4>

                  {(!selectedCustomerDetails.licenses || selectedCustomerDetails.licenses.length === 0) ? (
                    <div className="p-4 rounded-xl bg-[#050706] border border-white/5 text-[#86948a] font-mono text-center">
                      Nenhuma licença atribuída a este usuário.
                    </div>
                  ) : (
                    <div className="rounded-xl border border-white/5 overflow-hidden">
                      <table className="w-full text-left font-mono text-xs">
                        <thead className="bg-[#050706] text-[#86948a] uppercase">
                          <tr>
                            <th className="p-2.5">CHAVE</th>
                            <th className="p-2.5">SOFTWARE / PLANO</th>
                            <th className="p-2.5">STATUS</th>
                            <th className="p-2.5">VALIDADE</th>
                            <th className="p-2.5 text-right">AÇÕES</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-white">
                          {selectedCustomerDetails.licenses.map((lic: any) => (
                            <tr key={lic.id} className="hover:bg-white/[0.02]">
                              <td className="p-2.5 font-bold text-[#10b981] select-all">
                                {lic.key}
                              </td>
                              <td className="p-2.5 font-sans">
                                {lic.product?.name} ({lic.variant?.name})
                              </td>
                              <td className="p-2.5">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  lic.status === "ACTIVE"
                                    ? "bg-cyan-500/15 text-cyan-300"
                                    : lic.status === "REVOKED"
                                    ? "bg-rose-500/15 text-rose-300"
                                    : "bg-[#10b981]/15 text-[#10b981]"
                                }`}>
                                  {lic.status}
                                </span>
                              </td>
                              <td className="p-2.5 text-[#86948a]">
                                {lic.expiresAt ? new Date(lic.expiresAt).toLocaleDateString("pt-BR") : "Não ativada"}
                              </td>
                              <td className="p-2.5 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => handleManageLicense(lic.id, "RETURN_TO_STOCK", lic.key)}
                                    className="px-2 py-1 rounded bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 font-bold text-[10px] transition-colors cursor-pointer"
                                    title="Desvincular e Devolver ao Estoque"
                                  >
                                    Devolver ao Estoque
                                  </button>
                                  {lic.status !== "REVOKED" && (
                                    <button
                                      onClick={() => handleManageLicense(lic.id, "REVOKE", lic.key)}
                                      className="px-2 py-1 rounded bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 font-bold text-[10px] transition-colors cursor-pointer"
                                      title="Revogar Licença"
                                    >
                                      Revogar
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* 3. Histórico de Pedidos */}
                <div className="space-y-2">
                  <h4 className="font-['Space_Grotesk'] font-bold text-white text-sm flex items-center justify-between">
                    <span>Histórico de Pedidos e Compras</span>
                    <span className="text-xs text-[#86948a] font-mono">
                      {selectedCustomerDetails.orders?.length || 0} registros
                    </span>
                  </h4>

                  {(!selectedCustomerDetails.orders || selectedCustomerDetails.orders.length === 0) ? (
                    <div className="p-4 rounded-xl bg-[#050706] border border-white/5 text-[#86948a] font-mono text-center">
                      Nenhum pedido registrado para este cliente.
                    </div>
                  ) : (
                    <div className="rounded-xl border border-white/5 overflow-hidden">
                      <table className="w-full text-left font-mono text-xs">
                        <thead className="bg-[#050706] text-[#86948a] uppercase">
                          <tr>
                            <th className="p-2.5">PEDIDO</th>
                            <th className="p-2.5">DATA</th>
                            <th className="p-2.5">PRODUTO</th>
                            <th className="p-2.5">VALOR</th>
                            <th className="p-2.5">STATUS</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-white">
                          {selectedCustomerDetails.orders.map((ord: any) => (
                            <tr key={ord.id} className="hover:bg-white/[0.02]">
                              <td className="p-2.5 font-bold text-[#10b981]">
                                #{ord.orderNumber}
                              </td>
                              <td className="p-2.5 text-[#86948a]">
                                {new Date(ord.createdAt).toLocaleDateString("pt-BR")}
                              </td>
                              <td className="p-2.5 font-sans">
                                {ord.items?.map((i: any) => `${i.product.name} (${i.variant.name})`).join(", ") || "Software"}
                              </td>
                              <td className="p-2.5 font-bold text-[#10b981]">
                                R$ {(ord.totalCents / 100).toFixed(2).replace(".", ",")}
                              </td>
                              <td className="p-2.5">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  ord.status === "COMPLETED"
                                    ? "bg-[#10b981]/15 text-[#10b981]"
                                    : "bg-amber-500/15 text-amber-300"
                                }`}>
                                  {ord.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* 4. Ações Rápidas do Cliente */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-white/8">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenGrantFree(selectedCustomerDetails.id)}
                      className="px-4 py-2 rounded-xl bg-purple-900/40 hover:bg-purple-800/60 text-purple-300 border border-purple-500/40 font-bold font-['Space_Grotesk'] text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Gift className="w-4 h-4 text-purple-400" />
                      <span>Atribuir Licença Sem Pagamento</span>
                    </button>

                    {selectedCustomerDetails.role !== "ADMIN" && (
                      <button
                        onClick={async () => {
                          await handleToggleBanUser(selectedCustomerDetails.id, selectedCustomerDetails.isBanned);
                          loadCustomerDetails(selectedCustomerDetails.id);
                        }}
                        className={`px-4 py-2 rounded-xl font-bold font-['Space_Grotesk'] text-xs cursor-pointer ${
                          selectedCustomerDetails.isBanned
                            ? "bg-[#10b981]/20 text-[#10b981] hover:bg-[#10b981]/30"
                            : "bg-rose-500/15 text-rose-300 hover:bg-rose-500/25"
                        }`}
                      >
                        {selectedCustomerDetails.isBanned ? "Desbanir Conta" : "Banir Usuário"}
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => setCustomerDetailsModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-mono text-xs cursor-pointer"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

    </div>
  );
}
