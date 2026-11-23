import { config } from "../config";

export interface BotProductVariant {
  id: string;
  name: string;
  licenseType: string;
  priceCents: number;
  price: number;
  priceFormatted: string;
  stock: number;
  inStock: boolean;
}

export interface BotProduct {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  status: string;
  category: { id: string; name: string } | null;
  variants: BotProductVariant[];
}

export interface GetProductsResponse {
  success: boolean;
  total: number;
  products: BotProduct[];
}

export interface BotUserOrderSummary {
  orderNumber: string;
  product: string;
  variant: string;
  status: string;
  amountCents: number;
  amountFormatted: string;
  createdAt: string;
}

export interface BotUserData {
  id: string;
  fullName: string;
  username: string;
  email: string;
  discordId: string | null;
  discordUsername: string | null;
  discordLinkedAt: string | null;
  isDiscordVerified: boolean;
  isBanned: boolean;
  banReason: string | null;
  createdAt: string;
  totalCompletedOrders: number;
  recentOrders: BotUserOrderSummary[];
}

export interface GetUserResponse {
  linked: boolean;
  message?: string;
  user?: BotUserData;
}

export interface CreateOrderInput {
  discordId: string;
  discordUsername?: string;
  productId?: string;
  variantId?: string;
  email?: string;
}

export interface CreateOrderResponse {
  success: boolean;
  orderId: string;
  orderNumber: string;
  amount: number;
  amountFormatted: string;
  status: string;
  pixQrCode: string;
  pixQrCodeBase64: string;
  expiresAt: string;
}

export interface OrderLicenseInfo {
  licenseKey: string;
  productName: string;
  variantName: string;
  instructions: string;
  deliveredAt: string;
}

export interface GetOrderResponse {
  success: boolean;
  orderId: string;
  orderNumber: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "CANCELLED" | "REFUNDED" | "CHARGEBACK";
  amountCents: number;
  amountFormatted: string;
  paidAt?: string;
  expiresAt: string;
  license?: OrderLicenseInfo;
}

export class StoreApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: any
  ) {
    super(message);
    this.name = "StoreApiError";
  }
}

export class StoreApiClient {
  private baseUrl: string;
  private secret: string;

  constructor() {
    this.baseUrl = config.store.apiUrl;
    this.secret = config.store.internalSecret;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      "Content-Type": "application/json",
      "x-bot-secret": this.secret,
      ...(options.headers || {}),
    };

    const res = await fetch(url, {
      ...options,
      headers,
    });

    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
      const msg = body.error || body.message || `Erro HTTP ${res.status}`;
      throw new StoreApiError(msg, res.status, body);
    }

    return body as T;
  }

  /**
   * Consulta os produtos ativos e suas variantes com estoque real de chaves
   */
  async getProducts(): Promise<BotProduct[]> {
    const data = await this.request<GetProductsResponse>("/api/bot/products");
    return data.products || [];
  }

  /**
   * Busca um produto específico pelo slug
   */
  async getProductBySlug(slug: string): Promise<BotProduct | null> {
    const products = await this.getProducts();
    const cleanSlug = slug.toLowerCase().trim();
    return products.find((p) => p.slug.toLowerCase() === cleanSlug) || null;
  }

  /**
   * Consulta o histórico e dados de vínculo de um usuário do Discord
   */
  async getUserByDiscordId(discordId: string): Promise<GetUserResponse> {
    return this.request<GetUserResponse>(`/api/bot/users/${encodeURIComponent(discordId)}`);
  }

  /**
   * Cria uma reserva Pix de 30 minutos na Overclock Store
   */
  async createOrder(input: CreateOrderInput): Promise<CreateOrderResponse> {
    return this.request<CreateOrderResponse>("/api/bot/orders", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  /**
   * Consulta o status do pedido (retorna a chave de licença apenas se COMPLETED)
   */
  async getOrder(orderId: string): Promise<GetOrderResponse> {
    return this.request<GetOrderResponse>(`/api/bot/orders/${encodeURIComponent(orderId)}`);
  }
}

export const storeApi = new StoreApiClient();
