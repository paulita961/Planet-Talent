import "dotenv/config";
import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { CASTING_ONLY_PREVIEW_MODE } from "./src/lib/castingConfig";

const CASTING_PHOTOS_DIR = path.resolve(process.cwd(), "storage", "casting-photos");
const CASTING_PHOTOS_INDEX = path.resolve(CASTING_PHOTOS_DIR, "index.json");
const MAX_SINGLE_PHOTO_BYTES = 2.5 * 1024 * 1024;
const ALLOWED_PHOTO_FILENAME_RE = /^[a-f0-9-]{36}-(cara|cuerpo)\.(webp|jpg|png)$/i;

interface StoredCastingPhotoEntry {
  id: string;
  correo: string;
  instagram: string;
  whatsapp: string;
  nombre: string;
  apellidos: string;
  fotoCaraUrl: string;
  fotoCuerpoUrl: string;
  createdAt: string;
}

let photoIndexQueue: Promise<unknown> = Promise.resolve();

function withPhotoIndexLock<T>(task: () => Promise<T>): Promise<T> {
  const next = photoIndexQueue.then(task, task);
  photoIndexQueue = next.catch(() => {});
  return next;
}

function ensureCastingPhotosDir(): void {
  fs.mkdirSync(CASTING_PHOTOS_DIR, { recursive: true });
}

function readPhotoIndex(): StoredCastingPhotoEntry[] {
  ensureCastingPhotosDir();
  if (!fs.existsSync(CASTING_PHOTOS_INDEX)) return [];
  try {
    const raw = fs.readFileSync(CASTING_PHOTOS_INDEX, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writePhotoIndex(entries: StoredCastingPhotoEntry[]): void {
  ensureCastingPhotosDir();
  const tmpPath = path.resolve(CASTING_PHOTOS_DIR, `index.${crypto.randomUUID()}.tmp`);
  if (!tmpPath.startsWith(CASTING_PHOTOS_DIR + path.sep)) {
    throw new Error("Invalid index path");
  }
  fs.writeFileSync(tmpPath, JSON.stringify(entries, null, 2), "utf-8");
  fs.renameSync(tmpPath, CASTING_PHOTOS_INDEX);
}

function parseValidatedImageDataUrl(raw: unknown): {
  buffer: Buffer;
  ext: "webp" | "jpg" | "png";
  mime: string;
} | null {
  if (typeof raw !== "string") return null;
  const match = /^data:image\/(jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=\s]+)$/i.exec(raw.trim());
  if (!match) return null;

  const declared = match[1].toLowerCase();
  const b64 = match[2].replace(/\s+/g, "");
  const buffer = Buffer.from(b64, "base64");

  if (buffer.length < 32 || buffer.length > MAX_SINGLE_PHOTO_BYTES) {
    return null;
  }

  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const isPng =
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47;
  const isWebp =
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP";

  if ((declared === "jpeg" || declared === "jpg") && isJpeg) {
    return { buffer, ext: "jpg", mime: "image/jpeg" };
  }
  if (declared === "png" && isPng) {
    return { buffer, ext: "png", mime: "image/png" };
  }
  if (declared === "webp" && isWebp) {
    return { buffer, ext: "webp", mime: "image/webp" };
  }
  return null;
}

function resolveConfinedPhotoPath(filename: string): string | null {
  if (!ALLOWED_PHOTO_FILENAME_RE.test(filename)) return null;
  const resolved = path.resolve(CASTING_PHOTOS_DIR, filename);
  if (!resolved.startsWith(CASTING_PHOTOS_DIR + path.sep)) return null;
  return resolved;
}

async function verifySupabaseAdminRequest(req: express.Request): Promise<{ id: string; email?: string } | null> {
  const authHeader = req.headers.authorization;
  if (typeof authHeader !== "string" || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.slice("Bearer ".length).trim();
  if (!token || token.length > 4096) return null;

  const supabaseUrl = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "").trim().replace(/\/+$/, "");
  const supabaseAnonKey = (process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "").trim();
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  try {
    const authRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${token}`,
      },
    });
    if (!authRes.ok) return null;
    const user = (await authRes.json()) as { id?: string; email?: string };
    if (!user?.id) return null;
    return { id: user.id, email: user.email };
  } catch {
    return null;
  }
}

function getRequestOrigin(req: express.Request): string {
  const host = (req.headers["x-forwarded-host"] as string) || req.headers.host || "";
  const proto = (req.headers["x-forwarded-proto"] as string) || req.protocol || "https";
  return host ? `${proto}://${host}` : "";
}

function applySeoMeta(html: string, origin: string, isCastingPage: boolean): string {
  if (!isCastingPage) {
    if (!origin) return html;
    return html
      .replace(/content="\/og-preview\.jpg"/g, `content="${origin}/og-preview.jpg"`)
      .replace(/href="\/og-preview\.jpg"/g, `href="${origin}/og-preview.jpg"`);
  }

  const castingTitle = "Casting Planet Talent | Convocatoria para Modelos";
  const castingDesc =
    "Convocatoria presencial de casting para modelos · 28 y 29 de noviembre en Estudio 50 (Calle Lugareño esq. Almendares, Vedado, Plaza de la Revolución), La Habana.";
  const castingImg = origin
    ? `${origin}/assets/aistudio/casting_flyer_top.jpg`
    : "/assets/aistudio/casting_flyer_top.jpg";

  return html
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${castingTitle}</title>`)
    .replace(
      /<meta\s+name="description"\s+content="[^"]*"\s*\/>/i,
      `<meta name="description" content="${castingDesc}" />`
    )
    .replace(
      /<meta\s+name="keywords"\s+content="[^"]*"\s*\/>/i,
      `<meta name="keywords" content="casting, modelos, planet talent, planet records, convocatoria, la habana" />`
    )
    .replace(
      /<meta\s+property="og:title"\s+content="[^"]*"\s*\/>/i,
      `<meta property="og:title" content="${castingTitle}" />`
    )
    .replace(
      /<meta\s+property="og:description"\s+content="[^"]*"\s*\/>/i,
      `<meta property="og:description" content="${castingDesc}" />`
    )
    .replace(
      /<meta\s+property="og:image"\s+content="[^"]*"\s*\/>/i,
      `<meta property="og:image" content="${castingImg}" />`
    )
    .replace(
      /<meta\s+property="og:image:secure_url"\s+content="[^"]*"\s*\/>/i,
      `<meta property="og:image:secure_url" content="${castingImg}" />`
    )
    .replace(
      /<meta\s+property="og:image:width"\s+content="[^"]*"\s*\/>/i,
      `<meta property="og:image:width" content="870" />`
    )
    .replace(
      /<meta\s+property="og:image:height"\s+content="[^"]*"\s*\/>/i,
      `<meta property="og:image:height" content="628" />`
    )
    .replace(
      /<meta\s+property="og:image:alt"\s+content="[^"]*"\s*\/>/i,
      `<meta property="og:image:alt" content="${castingTitle}" />`
    )
    .replace(
      /<link\s+rel="image_src"\s+href="[^"]*"\s*\/>/i,
      `<link rel="image_src" href="${castingImg}" />`
    )
    .replace(
      /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/>/i,
      `<meta name="twitter:title" content="${castingTitle}" />`
    )
    .replace(
      /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/>/i,
      `<meta name="twitter:description" content="${castingDesc}" />`
    )
    .replace(
      /<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/>/i,
      `<meta name="twitter:image" content="${castingImg}" />`
    )
    .replace(
      /<meta\s+name="twitter:image:alt"\s+content="[^"]*"\s*\/>/i,
      `<meta name="twitter:image:alt" content="${castingTitle}" />`
    )
    .replace(
      /<meta\s+name="apple-mobile-web-app-title"\s+content="[^"]*"\s*\/>/i,
      `<meta name="apple-mobile-web-app-title" content="Casting PT" />`
    )
    .replace(
      /<link\s+rel="manifest"\s+href="[^"]*"\s*\/>/i,
      `<link rel="manifest" href="/manifest-casting.json" />`
    );
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware de tamaño alto exclusivo para carga de las 2 fotos locales de casting
  app.post("/api/casting-photos", express.json({ limit: "8mb" }), async (req, res) => {
    const {
      fotoCara,
      fotoCuerpo,
      correo,
      instagram,
      whatsapp,
      nombre,
      apellidos,
      website,
    } = req.body || {};

    // Honeypot silencioso
    if (typeof website === "string" && website.trim().length > 0) {
      return res.status(200).json({ ok: true, fotoCaraUrl: "", fotoCuerpoUrl: "" });
    }

    const clientIp =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.socket.remoteAddress ||
      "unknown";
    const now = Date.now();
    const recentUploads = (castingPhotoRateMap.get(clientIp) || []).filter(
      (ts) => now - ts < 15 * 60 * 1000
    );
    if (recentUploads.length >= 12) {
      return res.status(429).json({ error: "Demasiadas cargas de fotos recientes desde este dispositivo." });
    }
    recentUploads.push(now);
    castingPhotoRateMap.set(clientIp, recentUploads);

    const parsedCara = parseValidatedImageDataUrl(fotoCara);
    const parsedCuerpo = parseValidatedImageDataUrl(fotoCuerpo);
    if (!parsedCara || !parsedCuerpo) {
      return res.status(400).json({
        error: "Formato o tamaño de fotografía inválido. Usa imágenes JPG, PNG o WebP (máx. 2.5 MB cada una).",
      });
    }

    try {
      const recordId = crypto.randomUUID();
      const caraFilename = `${recordId}-cara.${parsedCara.ext}`;
      const cuerpoFilename = `${recordId}-cuerpo.${parsedCuerpo.ext}`;

      const caraPath = resolveConfinedPhotoPath(caraFilename);
      const cuerpoPath = resolveConfinedPhotoPath(cuerpoFilename);
      if (!caraPath || !cuerpoPath) {
        return res.status(400).json({ error: "Nombre de archivo inválido." });
      }

      ensureCastingPhotosDir();
      fs.writeFileSync(caraPath, parsedCara.buffer);
      fs.writeFileSync(cuerpoPath, parsedCuerpo.buffer);

      const entry: StoredCastingPhotoEntry = {
        id: recordId,
        correo: String(correo || "").trim().toLowerCase().slice(0, 180),
        instagram: String(instagram || "").trim().slice(0, 120),
        whatsapp: String(whatsapp || "").trim().slice(0, 60),
        nombre: String(nombre || "").trim().slice(0, 120),
        apellidos: String(apellidos || "").trim().slice(0, 140),
        fotoCaraUrl: `/api/casting-photos/${caraFilename}`,
        fotoCuerpoUrl: `/api/casting-photos/${cuerpoFilename}`,
        createdAt: new Date().toISOString(),
      };

      await withPhotoIndexLock(async () => {
        const current = readPhotoIndex();
        current.unshift(entry);
        writePhotoIndex(current);
      });

      return res.status(200).json({
        ok: true,
        id: recordId,
        fotoCaraUrl: entry.fotoCaraUrl,
        fotoCuerpoUrl: entry.fotoCuerpoUrl,
      });
    } catch (err) {
      console.error("Error saving casting photos locally:", err);
      return res.status(500).json({ error: "No se pudieron guardar las fotografías localmente." });
    }
  });

  // Endpoints protegidos de lectura y limpieza para el panel de administración (Supabase Auth Bearer)
  app.get("/api/casting-photos/index", async (req, res) => {
    const admin = await verifySupabaseAdminRequest(req);
    if (!admin) {
      return res.status(401).json({ error: "Sesión de administrador requerida." });
    }
    try {
      const records = await withPhotoIndexLock(async () => readPhotoIndex());
      return res.status(200).json({ records });
    } catch (err) {
      console.error("Error reading casting photo index:", err);
      return res.status(500).json({ error: "Error leyendo índice de fotos locales." });
    }
  });

  app.get("/api/casting-photos/:filename", async (req, res) => {
    const admin = await verifySupabaseAdminRequest(req);
    if (!admin) {
      return res.status(401).json({ error: "Sesión de administrador requerida." });
    }
    const filename = String(req.params.filename || "");
    const resolvedPath = resolveConfinedPhotoPath(filename);
    if (!resolvedPath || !fs.existsSync(resolvedPath)) {
      return res.status(404).json({ error: "Fotografía no encontrada." });
    }
    const ext = path.extname(filename).toLowerCase();
    const contentType =
      ext === ".webp" ? "image/webp" : ext === ".png" ? "image/png" : "image/jpeg";
    res.setHeader("Content-Type", contentType);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "private, max-age=3600");
    return res.sendFile(resolvedPath);
  });

  app.delete("/api/casting-photos", express.json({ limit: "64kb" }), async (req, res) => {
    const admin = await verifySupabaseAdminRequest(req);
    if (!admin) {
      return res.status(401).json({ error: "Sesión de administrador requerida." });
    }
    const { correo, instagram, fotoCaraUrl, fotoCuerpoUrl } = req.body || {};
    const targetEmail = String(correo || "").trim().toLowerCase();
    const targetIg = String(instagram || "").trim().replace(/^@+/, "").toLowerCase();
    const targetCara = String(fotoCaraUrl || "").trim();
    const targetCuerpo = String(fotoCuerpoUrl || "").trim();

    try {
      await withPhotoIndexLock(async () => {
        const current = readPhotoIndex();
        const toDelete: StoredCastingPhotoEntry[] = [];
        const remaining = current.filter((item) => {
          const matches =
            (targetCara && item.fotoCaraUrl === targetCara) ||
            (targetCuerpo && item.fotoCuerpoUrl === targetCuerpo) ||
            (targetEmail && item.correo === targetEmail) ||
            (targetIg && item.instagram.replace(/^@+/, "").toLowerCase() === targetIg);
          if (matches) {
            toDelete.push(item);
            return false;
          }
          return true;
        });

        for (const item of toDelete) {
          for (const url of [item.fotoCaraUrl, item.fotoCuerpoUrl]) {
            const fname = path.basename(url || "");
            const confined = resolveConfinedPhotoPath(fname);
            if (confined && fs.existsSync(confined)) {
              fs.unlinkSync(confined);
            }
          }
        }
        writePhotoIndex(remaining);
      });
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error("Error deleting local casting photos:", err);
      return res.status(500).json({ error: "No se pudieron eliminar las fotos locales." });
    }
  });

  // Middleware for JSON body parsing on remaining routes
  app.use(express.json({ limit: "1mb" }));

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // API Route to send Telegram notification for new bookings
  app.post("/api/notify-booking", async (req, res) => {
    const { nombre, modelos, fecha } = req.body;

    const escapeHTML = (str: string) => String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const telegramMessage = `<b>🔔 Nueva solicitud de booking</b>

👤 <b>Cliente:</b> ${escapeHTML(nombre)}
📱 <b>Modelos:</b> ${escapeHTML(modelos)}
📅 <b>Fecha del evento:</b> ${escapeHTML(fecha)}

Revisa el panel de administración para más detalles`;
    const telegramBotToken = '8875004415:AAED6CX7msEFkNuqBn9Xagv4jq7KHT4WQbw';
    const telegramChatId = '-1004303735696';

    try {
      const response = await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          chat_id: telegramChatId,
          text: telegramMessage,
          parse_mode: 'HTML'
        })
      });

      if (!response.ok) {
        console.error('Telegram API error:', await response.text());
        return res.status(502).json({ error: "Failed to send Telegram notification" });
      }

      console.log('Telegram notification sent');
      return res.status(200).json({ success: true });
    } catch (err: any) {
      console.error("Error sending Telegram notification:", err);
      return res.status(500).json({ error: "Failed to send notification" });
    }
  });

  // Rate limit sencillo en memoria por IP para el formulario de Casting (máx. 5 envíos cada 15 min)
  const castingRateMap = new Map<string, number[]>();
  const castingPhotoRateMap = new Map<string, number[]>();

  // API Route to send Telegram-only notification for new Casting applications
  app.post("/api/notify-casting", async (req, res) => {
    const { nombre, apellidos, edad, estatura, whatsapp, instagram, website } = req.body || {};

    // Campo trampa honeypot: si viene relleno, responder ok silenciosamente sin notificar
    if (typeof website === 'string' && website.trim().length > 0) {
      return res.status(200).json({ success: true });
    }

    const clientIp =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      'unknown';
    const now = Date.now();
    const recentHits = (castingRateMap.get(clientIp) || []).filter(
      (ts) => now - ts < 15 * 60 * 1000
    );
    if (recentHits.length >= 5) {
      return res.status(429).json({ error: 'Demasiados envíos recientes desde este dispositivo.' });
    }
    recentHits.push(now);
    castingRateMap.set(clientIp, recentHits);

    if (!nombre || !whatsapp) {
      return res.status(400).json({ error: 'Faltan campos requeridos de la postulación.' });
    }

    const numericAge = Number(edad);
    if (!Number.isNaN(numericAge) && numericAge > 0 && numericAge < 17) {
      return res.status(400).json({ error: 'La edad mínima para postularse es de 17 años.' });
    }

    const escapeHTML = (str: unknown) =>
      String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    const fullName = `${nombre}${apellidos ? ` ${apellidos}` : ''}`;
    const tutorLine =
      numericAge === 17
        ? `\n⚠️ <b>Nota:</b> Tiene 17 años (debe asistir con tutor)`
        : '';
    const telegramMessage = `<b>🎬 Nueva postulante — Casting Planet Talent</b>

👤 <b>Nombre:</b> ${escapeHTML(fullName)}
🎂 <b>Edad:</b> ${escapeHTML(edad)} años
📏 <b>Estatura:</b> ${escapeHTML(estatura)} cm
📱 <b>WhatsApp:</b> ${escapeHTML(whatsapp)}
📸 <b>Instagram:</b> ${escapeHTML(instagram || 'No especificado')}${tutorLine}`;

    const telegramBotToken = '8875004415:AAED6CX7msEFkNuqBn9Xagv4jq7KHT4WQbw';
    const telegramChatId = '-1004303735696';

    try {
      const response = await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: telegramChatId,
          text: telegramMessage,
          parse_mode: 'HTML',
        }),
      });

      if (!response.ok) {
        console.error('Telegram casting API error:', await response.text());
        return res.status(502).json({ error: 'Failed to send Telegram casting notification' });
      }

      return res.status(200).json({ success: true });
    } catch (err: any) {
      console.error('Error sending Telegram casting notification:', err);
      return res.status(500).json({ error: 'Failed to send casting notification' });
    }
  });

  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });

    app.get(["/", "/casting", "/admin"], async (req, res, next) => {
      try {
        const rawHtml = fs.readFileSync(path.join(process.cwd(), "index.html"), "utf-8");
        const isCastingPage =
          CASTING_ONLY_PREVIEW_MODE || req.path.replace(/\/+$/, "") === "/casting";
        const origin = getRequestOrigin(req);
        const transformed = await vite.transformIndexHtml(req.originalUrl, rawHtml);
        const html = applySeoMeta(transformed, origin, isCastingPage);
        res.status(200).set({ "Content-Type": "text/html; charset=utf-8" }).end(html);
      } catch (e) {
        next(e);
      }
    });

    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath, { index: false }));
    app.get("*", (req, res) => {
      try {
        const indexPath = path.join(distPath, "index.html");
        const rawHtml = fs.readFileSync(indexPath, "utf-8");
        const origin = getRequestOrigin(req);
        const isCastingPage =
          CASTING_ONLY_PREVIEW_MODE || req.path.replace(/\/+$/, "") === "/casting";
        const html = applySeoMeta(rawHtml, origin, isCastingPage);
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.send(html);
      } catch {
        res.sendFile(path.join(distPath, "index.html"));
      }
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
