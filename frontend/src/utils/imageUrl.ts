// src/utils/imageUrl.ts
// Centraliza la construcción de URLs de imágenes.
// - URLs nuevas (GCS): ya son absolutas → se usan tal cual
// - URLs antiguas (disco local): relativas → se les antepone el baseURL del backend
import apiClient from "@/api/apiClient";

export function getImageUrl(url?: string | null): string {
  if (!url) return "/placeholder.png";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  // Ruta relativa legada (ej: "uploads/filename.jpg")
  return `${apiClient.defaults.baseURL}/${url}`;
}
