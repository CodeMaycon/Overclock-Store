"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { Product } from "@/lib/mock-data";

export default function CatalogPage() {
  const [productsList, setProductsList] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("bestsellers");
  const [layoutMode, setLayoutMode] = useState<"grid-3" | "grid-4" | "list">("grid-3");

  useEffect(() => {
    async function loadCatalog() {
      try {
        const res = await fetch("/api/products");
        const data = await res.json();
        if (data.success && Array.isArray(data.products)) {
          setProductsList(data.products);
        } else {
          setProductsList([]);
        }
      } catch (err) {
        console.error("Erro ao carregar catálogo do banco:", err);
        setProductsList([]);
      } finally {
        setIsLoading(false);
      }
    }
    loadCatalog();
  }, []);

  const categories = useMemo(() => {
    return Array.from(new Set(productsList.map((p) => p.category).filter(Boolean)));
  }, [productsList]);

  // Filtro e Ordenação
  const filteredProducts = useMemo(() => {
    let result = [...productsList];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.shortDescription || p.tagline || "").toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          (p.features && p.features.some((f: string) => f.toLowerCase().includes(q)))
      );
    }

    if (selectedCategory !== "all") {
      result = result.filter((p) => p.category === selectedCategory);
    }

    if (sortBy === "price-asc") {
      result.sort((a, b) => (a.variants?.[0]?.priceCents || 0) - (b.variants?.[0]?.priceCents || 0));
    } else if (sortBy === "price-desc") {
      result.sort((a, b) => (b.variants?.[0]?.priceCents || 0) - (a.variants?.[0]?.priceCents || 0));
    }

    return result;
  }, [productsList, searchQuery, selectedCategory, sortBy]);

  return (
    <div className="w-full pb-16">

      {/* ---------------------------------------------------- */}
      {/* PAGE HEADER & COMMAND TOOLBAR                        */}
      {/* ---------------------------------------------------- */}
      <section className="max-w-7xl mx-auto w-full px-4 lg:px-12 pt-6 pb-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 font-mono-badge text-xs text-outline mb-4">
          <Link href="/" className="hover:text-primary transition-colors">INÍCIO</Link>
          <span>/</span>
          <span className="text-on-surface-variant">CATÁLOGO</span>
          <span>/</span>
          <span className="text-primary font-semibold">TODOS OS PRODUTOS</span>
        </nav>

        {/* Main Title & Live System Status Pill */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
          <div className="flex flex-col gap-1 max-w-3xl">
            <div className="flex items-center gap-2">
              <div className="px-2 py-0.5 rounded bg-surface-container text-primary font-mono-badge text-[11px] uppercase tracking-wider flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                CATÁLOGO DE PRODUTOS
              </div>
            </div>
            <h1 className="font-headline-lg text-3xl sm:text-4xl lg:font-display-xl lg:text-5xl text-on-surface tracking-tight uppercase font-bold">
              Softwares &amp; <span className="text-primary">Licenças</span>
            </h1>
            <p className="font-body-md text-sm text-on-surface-variant leading-relaxed">
              Confira recursos, compatibilidade e status antes de comprar. Chave liberada no Painel do Cliente e no e-mail após a confirmação do Pix.
            </p>
          </div>

          {/* Quick Metrics Counter Ribbon */}
          <div className="flex items-center gap-4 bg-surface-container-low px-4 py-2.5 rounded-xl shrink-0 border border-white/5">
            <div className="flex flex-col pr-4 border-r border-white/10">
              <span className="font-mono-badge text-[10px] text-outline">TOTAL DISPONÍVEL</span>
              <span className="font-headline-sm text-base text-on-surface font-bold">
                {filteredProducts.length} {filteredProducts.length === 1 ? "Produto" : "Produtos"}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="font-mono-badge text-[10px] text-primary">CHECKOUT PIX</span>
              <span className="font-headline-sm text-base text-primary font-bold">Mercado Pago</span>
            </div>
          </div>
        </div>

        {/* Command & Filter Toolbar */}
        <div className="bg-surface-container-low rounded-xl p-3 flex flex-col gap-3 shadow-sm border border-white/5">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-lg">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nome do software, jogo, categoria ou recurso..."
                className="w-full h-11 pl-10 pr-20 rounded-lg bg-surface-container-lowest text-on-surface font-body-sm text-xs focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-outline transition-all border border-white/5"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
                <kbd className="px-1.5 py-0.5 rounded bg-surface-container text-outline font-mono-badge text-[10px]">CTRL</kbd>
                <span className="text-outline text-xs">+</span>
                <kbd className="px-1.5 py-0.5 rounded bg-surface-container text-outline font-mono-badge text-[10px]">K</kbd>
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-3">
              {/* Sort Dropdown */}
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3 text-outline text-base pointer-events-none">
                  sort
                </span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="h-11 pl-9 pr-8 rounded-lg bg-surface-container-lowest text-on-surface font-label-md text-xs appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary border border-white/5"
                >
                  <option value="bestsellers">Ordenar: Mais Vendidos</option>
                  <option value="price-asc">Preço: Menor para Maior</option>
                  <option value="price-desc">Preço: Maior para Menor</option>
                </select>
                <span className="material-symbols-outlined absolute right-2 text-outline text-sm pointer-events-none">
                  expand_more
                </span>
              </div>

              {/* Layout Mode Switcher */}
              <div className="flex items-center p-1 rounded-lg bg-surface-container-lowest gap-0.5 border border-white/5">
                <button
                  onClick={() => setLayoutMode("grid-3")}
                  className={`p-1.5 rounded transition-colors ${
                    layoutMode === "grid-3" ? "text-primary bg-surface-container-high" : "text-outline hover:text-on-surface"
                  }`}
                  title="3 Colunas"
                >
                  <span className="material-symbols-outlined text-lg leading-none">grid_view</span>
                </button>
                <button
                  onClick={() => setLayoutMode("grid-4")}
                  className={`p-1.5 rounded transition-colors ${
                    layoutMode === "grid-4" ? "text-primary bg-surface-container-high" : "text-outline hover:text-on-surface"
                  }`}
                  title="4 Colunas Compacto"
                >
                  <span className="material-symbols-outlined text-lg leading-none">apps</span>
                </button>
                <button
                  onClick={() => setLayoutMode("list")}
                  className={`p-1.5 rounded transition-colors ${
                    layoutMode === "list" ? "text-primary bg-surface-container-high" : "text-outline hover:text-on-surface"
                  }`}
                  title="Visualização em Lista"
                >
                  <span className="material-symbols-outlined text-lg leading-none">view_list</span>
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Row: Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`whitespace-nowrap px-4 py-1.5 rounded-full font-mono-badge text-xs transition-all ${
                selectedCategory === "all"
                  ? "bg-primary-container text-on-primary-container font-semibold"
                  : "bg-surface-container text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
              }`}
            >
              Todos os Produtos ({productsList.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`whitespace-nowrap px-4 py-1.5 rounded-full font-mono-badge text-xs transition-all ${
                  selectedCategory === cat
                    ? "bg-primary-container text-on-primary-container font-semibold"
                    : "bg-surface-container text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
                }`}
              >
                {cat} ({productsList.filter((p) => p.category === cat).length})
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* PRODUCTS DISPLAY GRID / LIST                         */}
      {/* ---------------------------------------------------- */}
      <section className="max-w-7xl mx-auto px-4 lg:px-12">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-on-surface-variant font-mono-data text-xs">
            <span className="material-symbols-outlined text-3xl text-primary animate-spin">progress_activity</span>
            <span>Carregando softwares do catálogo...</span>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-16 px-6 rounded-2xl bg-surface-container-low border border-white/5 text-center space-y-4 max-w-xl mx-auto">
            <span className="material-symbols-outlined text-4xl text-primary">inventory_2</span>
            <h3 className="font-headline-sm text-lg font-bold text-white">Nenhum software disponível no momento</h3>
            <p className="font-body-sm text-xs text-on-surface-variant leading-relaxed">
              Nosso catálogo está sendo preparado para o lançamento oficial dos novos softwares após o fechamento das parcerias. Fique atento aos anúncios no Discord ou contate nosso suporte.
            </p>
          </div>
        ) : (
          <div
            className={`grid gap-6 ${
              layoutMode === "grid-3"
                ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                : layoutMode === "grid-4"
                ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
                : "grid-cols-1"
            }`}
          >
            {filteredProducts.map((prod, idx) => {
            const minPrice = (prod.variants && prod.variants.length > 0)
              ? Math.min(...prod.variants.map((v: any) => v.priceCents)) / 100
              : 24.9;
            const isFeatured = idx === 0;

            if (layoutMode === "list") {
              return (
                <div
                  key={prod.id}
                  className="rounded-xl bg-surface-container-low p-4 flex flex-col sm:flex-row items-center justify-between gap-4 border border-white/5 hover:border-primary/30 transition-all"
                >
                  <div className="flex items-center gap-4 w-full sm:w-auto">
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-surface-container-lowest shrink-0 border border-white/5">
                      <img
                        src={prod.images?.[0] || "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1200&auto=format&fit=crop"}
                        alt={prod.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono-badge text-[10px] px-2 py-0.5 rounded bg-surface-container text-primary font-bold">
                          {prod.category}
                        </span>
                        <span className="font-mono-badge text-[10px] text-outline">{prod.currentVersion}</span>
                      </div>
                      <h3 className="font-headline-sm text-base font-bold text-on-surface">{prod.name}</h3>
                      <p className="font-body-sm text-xs text-on-surface-variant line-clamp-1">{prod.shortDescription}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                    <div className="text-right">
                      <span className="font-headline-sm text-lg font-bold text-on-surface">
                        R$ {minPrice.toFixed(2).replace(".", ",")}
                      </span>
                      <span className="block font-mono-badge text-[10px] text-primary">● Disponível</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/products/${prod.slug}`}
                        className="px-3 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-xs font-semibold text-on-surface transition-colors"
                      >
                        Ver Detalhes
                      </Link>
                      <Link
                        href={`/products/${prod.slug}`}
                        className="px-4 py-2 rounded-lg bg-primary-container hover:bg-primary text-on-primary-container text-xs font-bold shadow-sm"
                      >
                        Comprar
                      </Link>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={prod.id}
                className="relative flex flex-col justify-between rounded-xl bg-gradient-to-b from-[#06281A] via-surface-container-low to-surface-container-lowest p-6 shadow-xl shadow-primary-container/5 transition-all duration-300 hover:-translate-y-1 border border-white/5 group"
              >
                <div className="flex flex-col">
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 mb-4">
                    {isFeatured ? (
                      <span className="px-2 py-0.5 rounded font-mono-badge text-[11px] uppercase font-bold bg-primary-container text-on-primary-container whitespace-nowrap shrink-0">
                        DESTAQUE
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded font-mono-badge text-[11px] uppercase font-semibold bg-surface-container text-primary whitespace-nowrap shrink-0">
                        {prod.category}
                      </span>
                    )}

                    <span className="inline-flex items-center gap-1 font-mono-badge text-[11px] text-primary whitespace-nowrap shrink-0">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse shrink-0" />
                      Entrega após Confirmação
                    </span>
                  </div>

                  {/* Thumbnail HUD Box */}
                  <div className="relative w-full h-[140px] rounded-lg bg-surface-container-lowest/80 overflow-hidden mb-4 flex flex-col items-center justify-center border border-white/5">
                    <img
                      src={prod.images?.[0] || "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1200&auto=format&fit=crop"}
                      alt={prod.name}
                      className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(16,185,129,0.18)_0%,_transparent_75%)]" />
                    <span className="font-mono-badge text-mono-badge uppercase tracking-widest text-primary relative z-10 font-bold">
                      {prod.category} • ATIVAÇÃO DIGITAL
                    </span>
                    <span className="font-body-sm text-body-sm text-outline relative z-10 text-xs">
                      Licença liberada no painel e por e-mail
                    </span>
                  </div>

                  {/* Title & Category Info */}
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center text-primary shadow-inner shrink-0 border border-white/5">
                      <span className="material-symbols-outlined text-xl">
                        {idx === 0 ? "desktop_windows" : idx === 1 ? "code_blocks" : "verified_user"}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-headline-sm text-base text-on-surface leading-snug font-bold truncate">
                        {prod.name}
                      </h3>
                      <p className="font-mono-badge text-[10px] text-outline uppercase truncate">
                        {prod.currentVersion} // CHAVE DIGITAL
                      </p>
                    </div>
                  </div>

                  <p className="font-body-sm text-xs text-on-surface-variant mb-4 leading-relaxed line-clamp-2">
                    {prod.shortDescription}
                  </p>

                  {/* Feature Tags */}
                  <div className="flex items-center gap-1.5 mb-6 overflow-hidden">
                    {(prod.features || []).slice(0, 3).map((feat: any, fIdx: number) => (
                      <span
                        key={fIdx}
                        className="font-mono-badge text-[10px] px-2 py-0.5 rounded bg-surface-container text-secondary border border-white/5 whitespace-nowrap truncate max-w-[110px]"
                        title={feat}
                      >
                        {feat}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Price and Standardized Action Buttons */}
                <div>
                  <div className="flex items-baseline justify-between mb-3">
                    <span className="font-body-sm text-xs text-outline">A partir de</span>
                    <span className="font-headline-md text-lg text-on-surface font-bold">
                      R$ {minPrice.toFixed(2).replace(".", ",")}
                      <span className="text-xs font-normal text-outline"> / chave</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      href={`/products/${prod.slug}`}
                      className="py-2.5 rounded-lg bg-surface-container-high hover:bg-surface-variant text-on-surface font-label-md text-xs font-semibold transition-all border border-white/5 flex items-center justify-center text-center"
                    >
                      Ver Detalhes
                    </Link>
                    <Link
                      href={`/products/${prod.slug}`}
                      className="py-2.5 rounded-lg bg-primary-container hover:bg-primary text-on-primary-container font-label-md text-xs font-bold transition-all shadow-[0_0_18px_rgba(16,185,129,0.3)] flex items-center justify-center gap-1"
                    >
                      <span className="material-symbols-outlined text-sm">shopping_cart</span>
                      <span>Comprar</span>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        )}
      </section>

      {/* ---------------------------------------------------- */}
      {/* PAGINATION                                           */}
      {/* ---------------------------------------------------- */}
      {filteredProducts.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 lg:px-12 pt-12 flex items-center justify-between border-t border-white/5 mt-12 text-xs font-mono-badge">
          <span className="text-outline">
            Exibindo 1 - {filteredProducts.length} de {filteredProducts.length} produtos disponíveis
          </span>
          <div className="flex items-center gap-1">
            <button className="px-3 py-1.5 rounded bg-surface-container text-outline hover:text-on-surface transition-colors disabled:opacity-50" disabled>
              Anterior
            </button>
            <button className="px-3 py-1.5 rounded bg-primary-container text-on-primary-container font-bold">
              1
            </button>
            <button className="px-3 py-1.5 rounded bg-surface-container text-outline hover:text-on-surface transition-colors disabled:opacity-50" disabled>
              Próxima
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
