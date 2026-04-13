process.env.BROWSERSLIST_IGNORE_OLD_DATA = "1";

const path = require("path");
const fs = require("fs-extra");
const { execFileSync } = require("child_process");
const { minify: minifyHtml } = require("html-minifier-terser");
const CleanCSS = require("clean-css");
const { minify: minifyJs } = require("terser");
const cheerio = require("cheerio");

const ROOT = process.cwd();
const DIST_DIR = path.join(ROOT, "dist");
const DIST_CSS = path.join(DIST_DIR, "css");
const DIST_JS = path.join(DIST_DIR, "js");
const DIST_ASSETS = path.join(DIST_DIR, "assets");
const INPUT_HTML = path.join(ROOT, "index.html");
const OUTPUT_HTML = path.join(DIST_DIR, "index.html");
const BUILD_VERSION = Date.now().toString();

const CANONICAL_URL = "https://pos.personaltraineracademy.com.br/";
const DEFAULT_DESCRIPTION =
  "Evento presencial Biomechanics Specialist: 2 dias de imersao pratica em biomecanica aplicada para profissionais que buscam avaliacao precisa, seguranca e alta performance.";

async function ensureDistStructure() {
  await fs.remove(DIST_DIR);
  await fs.ensureDir(DIST_CSS);
  await fs.ensureDir(DIST_JS);
  await fs.ensureDir(DIST_ASSETS);
}

function ensureMetaTag($, name, content) {
  let tag = $(`meta[name="${name}"]`);
  if (!tag.length) {
    $("head").append(`<meta name="${name}" content="">`);
    tag = $(`meta[name="${name}"]`);
  }
  tag.attr("content", content);
}

function ensureHttpEquivMeta($, httpEquiv, content) {
  let tag = $(`meta[http-equiv="${httpEquiv}"]`);
  if (!tag.length) {
    $("head").append(`<meta http-equiv="${httpEquiv}" content="">`);
    tag = $(`meta[http-equiv="${httpEquiv}"]`);
  }
  tag.attr("content", content);
}

function ensurePropertyMetaTag($, property, content) {
  let tag = $(`meta[property="${property}"]`);
  if (!tag.length) {
    $("head").append(`<meta property="${property}" content="">`);
    tag = $(`meta[property="${property}"]`);
  }
  tag.attr("content", content);
}

function ensureTwitterMetaTag($, name, content) {
  let tag = $(`meta[name="${name}"]`);
  if (!tag.length) {
    $("head").append(`<meta name="${name}" content="">`);
    tag = $(`meta[name="${name}"]`);
  }
  tag.attr("content", content);
}

function ensureCanonical($, href) {
  let canonical = $('link[rel="canonical"]');
  if (!canonical.length) {
    $("head").append('<link rel="canonical" href="">');
    canonical = $('link[rel="canonical"]');
  }
  canonical.attr("href", href);
}

function ensurePreconnect($, href, crossorigin = false) {
  const selector = `link[rel="preconnect"][href="${href}"]`;
  if (!$(selector).length) {
    if (crossorigin) {
      $("head").append(`<link rel="preconnect" href="${href}" crossorigin>`);
    } else {
      $("head").append(`<link rel="preconnect" href="${href}">`);
    }
  }
}

function ensureDnsPrefetch($, href) {
  const selector = `link[rel="dns-prefetch"][href="${href}"]`;
  if (!$(selector).length) {
    $("head").append(`<link rel="dns-prefetch" href="${href}">`);
  }
}

function buildTailwindPurge() {
  const twBin = path.join(ROOT, "node_modules", ".bin", "tailwindcss");
  if (!fs.existsSync(twBin)) {
    throw new Error("tailwindcss nao encontrado em node_modules. Execute npm install.");
  }
  execFileSync(
    twBin,
    [
      "-i",
      path.join(ROOT, "src", "tailwind.css"),
      "-o",
      path.join(DIST_CSS, "tailwind.min.css"),
      "--minify",
    ],
    { stdio: "inherit", cwd: ROOT }
  );
}

/** Comprime JPEG/WebP em dist/assets quando menor que o original (sharp opcional). */
async function optimizeRasterAssets() {
  let sharp;
  try {
    sharp = require("sharp");
  } catch {
    process.stderr.write("Aviso: sharp indisponivel — pulando otimizacao de imagens.\n");
    return;
  }
  const files = await fs.readdir(DIST_ASSETS);
  for (const name of files) {
    const filePath = path.join(DIST_ASSETS, name);
    if (!(await fs.stat(filePath)).isFile()) continue;
    const ext = path.extname(name).toLowerCase();
    const buf = await fs.readFile(filePath);
    try {
      if (ext === ".jpg" || ext === ".jpeg") {
        const out = await sharp(buf).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
        if (out.length < buf.length) await fs.writeFile(filePath, out);
      } else if (ext === ".webp") {
        const out = await sharp(buf).webp({ quality: 82, effort: 4 }).toBuffer();
        if (out.length < buf.length) await fs.writeFile(filePath, out);
      }
    } catch (e) {
      process.stderr.write(`Aviso: nao foi possivel otimizar ${name}: ${e.message}\n`);
    }
  }
}

async function build() {
  await ensureDistStructure();

  if (await fs.pathExists(path.join(ROOT, "assets"))) {
    await fs.copy(path.join(ROOT, "assets"), DIST_ASSETS);
    await optimizeRasterAssets();
  }

  buildTailwindPurge();

  const htmlRaw = await fs.readFile(INPUT_HTML, "utf8");
  const $ = cheerio.load(htmlRaw, { decodeEntities: false });

  // Producao: Tailwind purgado em arquivo local (remove CDN + config inline)
  $('script[src*="cdn.tailwindcss.com"]').remove();
  $("script").each((_, el) => {
    const txt = ($(el).html() || "").trim();
    if (txt.startsWith("tailwind.config")) {
      $(el).remove();
    }
  });
  const firstStylesheet = $("head link[rel='stylesheet']").first();
  if (firstStylesheet.length) {
    firstStylesheet.before(`<link rel="stylesheet" href="css/tailwind.min.css?v=${BUILD_VERSION}">`);
  } else {
    $("head").append(`<link rel="stylesheet" href="css/tailwind.min.css?v=${BUILD_VERSION}">`);
  }

  // SEO essencial
  const title = ($("title").first().text() || "Biomechanics Specialist").trim();
  ensureMetaTag($, "description", DEFAULT_DESCRIPTION);
  ensureCanonical($, CANONICAL_URL);
  ensureHttpEquivMeta($, "Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  ensureHttpEquivMeta($, "Pragma", "no-cache");
  ensureHttpEquivMeta($, "Expires", "0");
  ensureHttpEquivMeta($, "Surrogate-Control", "no-store");

  // Open Graph + Twitter
  ensurePropertyMetaTag($, "og:title", title);
  ensurePropertyMetaTag($, "og:description", DEFAULT_DESCRIPTION);
  ensurePropertyMetaTag($, "og:type", "website");
  ensurePropertyMetaTag($, "og:url", CANONICAL_URL);
  ensurePropertyMetaTag($, "og:image", `${CANONICAL_URL}assets/capaVideo.webp`);
  ensurePropertyMetaTag($, "og:locale", "pt_BR");
  ensureTwitterMetaTag($, "twitter:card", "summary_large_image");
  ensureTwitterMetaTag($, "twitter:title", title);
  ensureTwitterMetaTag($, "twitter:description", DEFAULT_DESCRIPTION);
  ensureTwitterMetaTag($, "twitter:image", `${CANONICAL_URL}assets/capaVideo.webp`);

  // Performance hints
  ensurePreconnect($, "https://fonts.googleapis.com");
  ensurePreconnect($, "https://fonts.gstatic.com", true);
  ensurePreconnect($, "https://www.googletagmanager.com");
  ensurePreconnect($, "https://unpkg.com");
  ensurePreconnect($, "https://cdnjs.cloudflare.com");
  ensurePreconnect($, "https://www.youtube.com");
  ensureDnsPrefetch($, "https://images.unsplash.com");

  // Acessibilidade basica: garante alt nas imagens
  $("img").each((_, img) => {
    const currentAlt = ($(img).attr("alt") || "").trim();
    if (!currentAlt) {
      $(img).attr("alt", "Imagem do Biomechanics Specialist");
    }
  });

  // Normaliza caminhos de assets para dist/assets
  $("[src], [href]").each((_, el) => {
    const src = $(el).attr("src");
    const href = $(el).attr("href");
    if (src && src.startsWith("./assets/")) {
      $(el).attr("src", src.replace("./assets/", "assets/"));
    }
    if (href && href.startsWith("./assets/")) {
      $(el).attr("href", href.replace("./assets/", "assets/"));
    }
  });

  // Extrai e minifica CSS inline
  let cssBundle = "";
  $('style:not([data-build-ignore="true"])').each((_, style) => {
    cssBundle += `${$(style).html() || ""}\n`;
    $(style).remove();
  });

  if (cssBundle.trim()) {
    const cssMinified = new CleanCSS({ level: 2 }).minify(cssBundle).styles;
    await fs.writeFile(path.join(DIST_CSS, "main.min.css"), cssMinified, "utf8");
    $('head link[rel="stylesheet"]').last().after(`<link rel="stylesheet" href="css/main.min.css?v=${BUILD_VERSION}">`);
  }

  // Extrai e minifica JS inline. Scripts com src (GTM, Pixel, Analytics, AOS, etc.) NUNCA sao removidos.
  // tailwind.config inline nao entra no bundle: CDN removido em prod; incluir quebraria o restante do JS.
  let jsBundle = "";
  $("script").each((_, script) => {
    const hasSrc = !!$(script).attr("src");
    if (!hasSrc) {
      const inner = ($(script).html() || "").trim();
      if (inner.startsWith("tailwind.config")) {
        $(script).remove();
        return;
      }
      // GTM e outros trechos marcados permanecem inline no HTML (ordem recomendada no <head>)
      if (
        $(script).attr("data-build-preserve") === "true" ||
        inner.includes("googletagmanager.com/gtm.js") ||
        inner.includes("GTM-55TLN64G")
      ) {
        return;
      }
      jsBundle += `${$(script).html() || ""}\n`;
      $(script).remove();
    }
  });

  if (jsBundle.trim()) {
    const jsMinified = await minifyJs(jsBundle, {
      compress: true,
      mangle: {
        reserved: ["abrirPopup", "fecharPopup", "tailwind"],
      },
      format: { comments: false },
    });
    await fs.writeFile(path.join(DIST_JS, "main.min.js"), jsMinified.code || "", "utf8");
    $("body").append(`<script src="js/main.min.js?v=${BUILD_VERSION}" defer></script>`);
  }

  const htmlPrepared = $.html();
  const htmlMinified = await minifyHtml(htmlPrepared, {
    collapseWhitespace: true,
    removeComments: true,
    removeRedundantAttributes: true,
    removeEmptyAttributes: true,
    useShortDoctype: true,
    minifyCSS: false,
    minifyJS: false,
    keepClosingSlash: true,
  });

  await fs.writeFile(OUTPUT_HTML, htmlMinified, "utf8");
}

build()
  .then(() => {
    process.stdout.write("Build concluido com sucesso em dist/\n");
  })
  .catch((error) => {
    process.stderr.write(`Falha no build: ${error.message}\n`);
    process.exit(1);
  });
