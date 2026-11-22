/**
 * Utilitário de slugificação padronizada para produtos e categorias da Overclock Store.
 * Remove acentos, caracteres especiais, normaliza espaços/underscores para hífen,
 * elimina hífens duplicados e remove hífens nas extremidades.
 */
export function slugify(text: string): string {
  if (!text) return "";
  return text
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove acentos
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "") // Remove caracteres não alfanuméricos exceto espaços e hífens
    .replace(/[\s_]+/g, "-") // Substitui espaços e underscores por hífen
    .replace(/-+/g, "-") // Elimina hífens duplicados
    .replace(/^-+|-+$/g, ""); // Remove hífens do começo e do fim
}
