/**
 * prerender.mjs — Pre-rendering estático para Conejo Motors
 *
 * Flujo:
 *  1. Levanta un servidor local sirviendo dist/ con fallback SPA
 *  2. Obtiene los IDs de vehículos disponibles desde la API y cachea las respuestas
 *  3. Usa Puppeteer con interceptación de red para servir datos cacheados
 *     (evita latencia de Cloud Run dentro del browser de Puppeteer)
 *  4. Limpia tags duplicados del <head> (react-helmet-async + base estática)
 *  5. Guarda el HTML resultante en dist/ como archivos estáticos
 *
 * Firebase Hosting sirve archivos estáticos primero, antes de rewrites.
 * Así /catalog/9/index.html es servido para /catalog/9 automáticamente.
 */

import puppeteer   from 'puppeteer';
import { createServer } from 'http';
import {
  readFileSync, writeFileSync, mkdirSync, existsSync,
} from 'fs';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST      = join(__dirname, 'dist');
const API       = 'https://conejo-motors-backend-18412185769.us-central1.run.app';
const PORT      = 3077;

// ── Tipos MIME ────────────────────────────────────────────────────────────────
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.xml':  'application/xml',
  '.txt':  'text/plain',
  '.json': 'application/json',
  '.woff2':'font/woff2',
  '.woff': 'font/woff',
};

// ── Caché de respuestas API ───────────────────────────────────────────────────
const apiCache = new Map(); // url → { body, contentType }

// ── Servidor estático local con fallback SPA ──────────────────────────────────
function startServer() {
  const server = createServer((req, res) => {
    const urlPath  = req.url.split('?')[0].split('#')[0];
    const filePath = join(DIST, urlPath);

    const tryFile = (fp) => {
      try {
        const data = readFileSync(fp);
        const ext  = extname(fp).toLowerCase();
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
        res.end(data);
        return true;
      } catch { return false; }
    };

    if (tryFile(filePath))                      return;
    if (tryFile(join(filePath, 'index.html')))  return;
    // SPA fallback
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(readFileSync(join(DIST, 'index.html')));
  });
  return new Promise((resolve) => server.listen(PORT, () => resolve(server)));
}

// ── Obtener vehículos y cachear respuestas API ────────────────────────────────
async function fetchAndCacheVehicles() {
  try {
    // 1. Catálogo público
    console.log('  📡 Obteniendo catálogo de la API...');
    const catalogRes = await fetch(`${API}/vehicles/sales/catalog`, {
      signal: AbortSignal.timeout(45_000),
    });
    if (!catalogRes.ok) throw new Error(`HTTP ${catalogRes.status}`);
    const catalogBody = await catalogRes.text();
    const vehicles = JSON.parse(catalogBody);
    console.log(`  📦 ${vehicles.length} vehículos en catálogo`);

    // Cachear el catálogo
    apiCache.set(`${API}/vehicles/sales/catalog`, {
      body: catalogBody,
      contentType: 'application/json',
    });

    // 2. Detalle de cada vehículo — en paralelo con límite de concurrencia
    console.log('  🔥 Descargando y cacheando detalles de vehículos...');
    const BATCH = 5;
    for (let i = 0; i < vehicles.length; i += BATCH) {
      const batch = vehicles.slice(i, i + BATCH);
      await Promise.allSettled(
        batch.map(async (v) => {
          const url = `${API}/vehicles/${v.id}`;
          try {
            const r = await fetch(url, { signal: AbortSignal.timeout(30_000) });
            if (r.ok) {
              const body = await r.text();
              apiCache.set(url, { body, contentType: 'application/json' });
              // También cachear variantes con /public si el frontend las usa
              apiCache.set(`${API}/vehicles/${v.id}/public`, { body, contentType: 'application/json' });
            }
          } catch (e) {
            console.warn(`    ⚠️  Vehicle ${v.id}: ${e.message}`);
          }
        })
      );
      process.stdout.write(`    ${Math.min(i + BATCH, vehicles.length)}/${vehicles.length} cacheados\r`);
    }
    console.log(`\n  ✅ ${apiCache.size} respuestas en caché\n`);

    return vehicles;
  } catch (e) {
    console.warn(`  ⚠️  API no responde: ${e.message} — solo rutas estáticas`);
    return [];
  }
}

// ── Limpiar tags duplicados en <head> ─────────────────────────────────────────
function cleanHead(html) {
  const headMatch = html.match(/<head>([\s\S]*?)<\/head>/i);
  if (!headMatch) return html;

  let head = headMatch[1];

  const singletons = [
    /<title>[^<]*<\/title>/gi,
    /<meta\s+name="description"[^>]*>/gi,
    /<meta\s+name="robots"[^>]*>/gi,
    /<link\s+rel="canonical"[^>]*>/gi,
    /<meta\s+property="og:title"[^>]*>/gi,
    /<meta\s+property="og:description"[^>]*>/gi,
    /<meta\s+property="og:url"[^>]*>/gi,
    /<meta\s+property="og:image"[^>]*>/gi,
    /<meta\s+property="og:type"[^>]*>/gi,
    /<meta\s+name="twitter:title"[^>]*>/gi,
    /<meta\s+name="twitter:description"[^>]*>/gi,
    /<meta\s+name="twitter:image"[^>]*>/gi,
  ];

  for (const pattern of singletons) {
    const matches = [...head.matchAll(pattern)];
    if (matches.length <= 1) continue;
    // react-helmet-async inserta sus tags ANTES de los estáticos de index.html,
    // así el PRIMERO es el dinámico (correcto) y el ÚLTIMO es el genérico base.
    const first = matches[0][0];
    head = head.replace(pattern, ''); // elimina todas
    head = first + '\n' + head;       // reinsertar el primero al inicio
  }

  return html.replace(/<head>[\s\S]*?<\/head>/i, `<head>${head}</head>`);
}

// ── Renderizar una ruta con Puppeteer ─────────────────────────────────────────
async function renderRoute(browser, route) {
  const url  = `http://localhost:${PORT}${route.path}`;
  const page = await browser.newPage();

  await page.setUserAgent(
    'Mozilla/5.0 (compatible; ConejoMotorsPrerender/1.0; +https://conejomotors.com)'
  );
  await page.setViewport({ width: 1280, height: 900 });
  page.on('console', () => {});
  page.on('pageerror', () => {});

  // ── Interceptar peticiones a la API y servir datos cacheados ─────────────
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const reqUrl = req.url();

    // Solo interceptar peticiones al API de Cloud Run
    if (reqUrl.startsWith(API)) {
      // Buscar en caché (con o sin query string)
      const urlWithoutQs = reqUrl.split('?')[0];
      const cached = apiCache.get(urlWithoutQs) || apiCache.get(reqUrl);

      if (cached) {
        req.respond({
          status: 200,
          contentType: cached.contentType,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': cached.contentType,
          },
          body: cached.body,
        });
        return;
      }
    }

    // Todo lo demás: dejar pasar normalmente
    req.continue();
  });

  try {
    // networkidle0 — todos los recursos completados (posible porque la API es inmediata via caché)
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30_000 });

    // Para fichas de vehículo: esperar a que el H1 tenga el nombre real
    if (route.vehicleName) {
      const marca = route.vehicleName.split(' ')[0]; // ej: "BYD"
      const found = await page.evaluate(async (m) => {
        for (let i = 0; i < 30; i++) {
          const h1 = document.querySelector('h1');
          if (h1 && h1.textContent.includes(m)) return true;
          await new Promise((r) => setTimeout(r, 300));
        }
        return false;
      }, marca).catch(() => false);

      if (!found) {
        // Segunda oportunidad: esperar un poco más
        await new Promise((r) => setTimeout(r, 2000));
        console.warn(`\n    ⚠️  H1 sin "${marca}" en ${route.path}`);
      }
    }

    // Pausa final para react-helmet-async
    await new Promise((r) => setTimeout(r, 500));

    // Leer los valores SEO FINALES del DOM (react-helmet-async ya los actualizó)
    const seo = await page.evaluate(() => {
      // Tomar el ÚLTIMO elemento coincidente — react-helmet-async puede insertar
      // sus tags dinámicos antes O después de los estáticos de index.html,
      // por eso usamos querySelectorAll y tomamos el último para OG/meta,
      // pero para title y canonical usamos lógica especial.
      const getLastMeta = (sel) => {
        const all = Array.from(document.querySelectorAll(sel));
        return all.length ? all[all.length - 1].getAttribute('content') : null;
      };
      const getMetaProp = (prop) => getLastMeta(`meta[property="${prop}"]`);
      const getMetaName = (name) => getLastMeta(`meta[name="${name}"]`);

      // Canonical: preferir el que sea específico de página (no homepage)
      const canonicals = Array.from(document.querySelectorAll('link[rel="canonical"]')).map(l => l.href);
      const canonical = canonicals.length > 1
        ? (canonicals.find(c => c !== 'https://conejomotors.com/') || canonicals[canonicals.length - 1])
        : (canonicals[0] || null);
      return {
        title:           document.title,
        description:     getMetaName('description'),
        robots:          getMetaName('robots'),
        canonical,
        ogType:          getMetaProp('og:type'),
        ogTitle:         getMetaProp('og:title'),
        ogDescription:   getMetaProp('og:description'),
        ogUrl:           getMetaProp('og:url'),
        ogImage:         getMetaProp('og:image'),
        twitterTitle:    getMetaName('twitter:title'),
        twitterDesc:     getMetaName('twitter:description'),
        twitterImage:    getMetaName('twitter:image'),
      };
    }).catch(() => null);

    let html = await page.content();

    // Inyectar los valores correctos del DOM (reemplazando duplicados)
    if (seo) {
      html = html
        .replace(/<title>[^<]*<\/title>/gi, `<title>${seo.title}</title>`)
        .replace(/<meta\s+name="description"[^>]*>/gi, seo.description ? `<meta name="description" content="${seo.description}">` : '')
        .replace(/<meta\s+name="robots"[^>]*>/gi, seo.robots ? `<meta name="robots" content="${seo.robots}">` : '')
        .replace(/<link\s+rel="canonical"[^>]*>/gi, seo.canonical ? `<link rel="canonical" href="${seo.canonical}">` : '')
        .replace(/<meta\s+property="og:type"[^>]*>/gi, seo.ogType ? `<meta property="og:type" content="${seo.ogType}">` : '')
        .replace(/<meta\s+property="og:title"[^>]*>/gi, seo.ogTitle ? `<meta property="og:title" content="${seo.ogTitle}">` : '')
        .replace(/<meta\s+property="og:description"[^>]*>/gi, seo.ogDescription ? `<meta property="og:description" content="${seo.ogDescription}">` : '')
        .replace(/<meta\s+property="og:url"[^>]*>/gi, seo.ogUrl ? `<meta property="og:url" content="${seo.ogUrl}">` : '')
        .replace(/<meta\s+property="og:image"[^>]*>/gi, seo.ogImage ? `<meta property="og:image" content="${seo.ogImage}">` : '')
        .replace(/<meta\s+name="twitter:title"[^>]*>/gi, seo.twitterTitle ? `<meta name="twitter:title" content="${seo.twitterTitle}">` : '')
        .replace(/<meta\s+name="twitter:description"[^>]*>/gi, seo.twitterDesc ? `<meta name="twitter:description" content="${seo.twitterDesc}">` : '')
        .replace(/<meta\s+name="twitter:image"[^>]*>/gi, seo.twitterImage ? `<meta name="twitter:image" content="${seo.twitterImage}">` : '');
    }

    html = cleanHead(html);

    const outPath = join(DIST, route.output);
    const outDir  = dirname(outPath);
    if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
    writeFileSync(outPath, html, 'utf-8');

    await page.close();
    return true;
  } catch (err) {
    try { await page.close(); } catch { /* ya cerrada */ }
    throw err;
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🐇 Conejo Motors — Pre-rendering SEO\n');

  const server  = await startServer();
  console.log(`✅ Servidor local en http://localhost:${PORT}\n`);

  const vehicles = await fetchAndCacheVehicles();

  const routes = [
    { path: '/',        output: 'index.html',          waitFor: 'h1',  label: 'Home' },
    { path: '/catalog', output: 'catalog/index.html',  waitFor: 'h1',  label: 'Catálogo' },
    { path: '/compare', output: 'compare/index.html',  waitFor: 'h1',  label: 'Comparador' },
    ...vehicles.map((v) => ({
      path:        `/catalog/${v.id}`,
      output:      `catalog/${v.id}/index.html`,
      waitFor:     'h1',
      vehicleName: `${v.marca} ${v.modelo}`,
      label:       `${v.marca} ${v.modelo} (#${v.id})`,
    })),
  ];

  console.log(`📄 ${routes.length} páginas a pre-renderizar\n`);

  const launchOpts = {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
           '--disable-gpu', '--disable-extensions'],
  };

  let browser = await puppeteer.launch(launchOpts);
  let ok = 0, fail = 0;

  for (const route of routes) {
    process.stdout.write(`  → ${route.label.padEnd(42)} `);
    try {
      await renderRoute(browser, route);

      const savedHtml  = readFileSync(join(DIST, route.output), 'utf-8');
      const titleMatch = savedHtml.match(/<title>([^<]+)<\/title>/);
      const h1Match    = savedHtml.match(/<h1[^>]*>\s*([^<]{4,})\s*<\/h1>/);
      const titleStr   = titleMatch ? titleMatch[1].substring(0, 50) : '?';
      const h1Str      = h1Match    ? ` H1:"${h1Match[1].trim().substring(0, 30)}"` : ' (sin H1)';
      const sizeKB     = (savedHtml.length / 1024).toFixed(1);
      console.log(`✅  ${sizeKB}KB  "${titleStr}"${h1Str}`);
      ok++;
    } catch (err) {
      console.log(`❌  ${err.message}`);
      fail++;
      try { await browser.close(); } catch { /* ignorar */ }
      browser = await puppeteer.launch(launchOpts);
    }
  }

  await browser.close();
  server.close();

  console.log(`\n✨ Pre-rendering completado: ${ok} OK, ${fail} errores\n`);
  if (fail > 0) process.exit(1);
}

main().catch((err) => {
  console.error('❌ Error fatal:', err);
  process.exit(1);
});
