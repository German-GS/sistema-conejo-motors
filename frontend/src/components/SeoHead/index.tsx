/**
 * SeoHead — helper reutilizable para meta tags SEO con react-helmet-async.
 * Úsalo al inicio del return() de cada página pública.
 */
import { Helmet } from "react-helmet-async";

const SITE_NAME  = "Conejo Motors";
const BASE_URL   = "https://conejomotors.com";
const OG_DEFAULT = `${BASE_URL}/og-default.png`;

interface SeoHeadProps {
  /** Título de la pestaña y OG. Se le añade " | Conejo Motors" automáticamente. */
  title: string;
  /** Descripción meta (max ~160 chars). */
  description: string;
  /** URL canónica de la página (path o URL completa). */
  canonical?: string;
  /** URL imagen OG (debe ser absoluta). Si se omite usa og-default.png */
  ogImage?: string;
  /** Tipo OG: "website" | "product" | "article". Por defecto "website". */
  ogType?: string;
  /** Datos estructurados JSON-LD para el schema.org */
  jsonLd?: object | object[];
  /** Si es true no se indexa (páginas de admin, etc.). */
  noIndex?: boolean;
}

export const SeoHead = ({
  title,
  description,
  canonical,
  ogImage,
  ogType = "website",
  jsonLd,
  noIndex = false,
}: SeoHeadProps) => {
  const fullTitle    = `${title} | ${SITE_NAME}`;
  const canonicalUrl = canonical
    ? canonical.startsWith("http") ? canonical : `${BASE_URL}${canonical}`
    : BASE_URL;
  const image = ogImage ?? OG_DEFAULT;

  const schemas = jsonLd
    ? Array.isArray(jsonLd) ? jsonLd : [jsonLd]
    : [];

  return (
    <Helmet>
      {/* Básicos */}
      <title>{fullTitle}</title>
      <meta name="description"      content={description} />
      <meta name="robots"           content={noIndex ? "noindex, nofollow" : "index, follow"} />
      <link rel="canonical"         href={canonicalUrl} />

      {/* Open Graph */}
      <meta property="og:type"        content={ogType} />
      <meta property="og:title"       content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url"         content={canonicalUrl} />
      <meta property="og:image"       content={image} />
      <meta property="og:site_name"   content={SITE_NAME} />
      <meta property="og:locale"      content="es_CR" />

      {/* Twitter */}
      <meta name="twitter:card"        content="summary_large_image" />
      <meta name="twitter:title"       content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image"       content={image} />

      {/* JSON-LD */}
      {schemas.map((schema, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      ))}
    </Helmet>
  );
};
