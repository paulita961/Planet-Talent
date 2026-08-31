import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for JSON body parsing
  app.use(express.json());

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // API Route to send notification for new course registrations
  app.post("/api/notify-course", async (req, res) => {
    const { nombre, edad, telefono, email, referencia_pago } = req.body;
    const targetNumber = 'whatsapp:+5358757024';

    const escapeHTML = (str: string) => String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const twilioMessage = `Nueva inscripción al Curso de Verano (Estilo Reality): ${nombre}, ${edad} años. Teléfono: ${telefono}. Ref Pago: ${referencia_pago || 'No especificada'}.`;
    const telegramMessage = `<b>🌟 Nueva Inscripción: Curso de Verano</b>

👤 <b>Nombre:</b> ${escapeHTML(nombre)}
🎂 <b>Edad:</b> ${escapeHTML(edad)} años
📱 <b>Teléfono/WhatsApp:</b> ${escapeHTML(telefono)}
📧 <b>Email:</b> ${escapeHTML(email)}
💳 <b>Ref. Pago:</b> ${escapeHTML(referencia_pago || 'Enviado comprobante/Pendiente')}

Revisa la sección "Curso de Verano" en el panel de administración.`;
    const telegramBotToken = '8875004415:AAED6CX7msEFkNuqBn9Xagv4jq7KHT4WQbw';
    const telegramChatId = '-1004303735696';

    try {
      try {
        await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: telegramChatId,
            text: telegramMessage,
            parse_mode: 'HTML'
          })
        });
      } catch (telegramErr) {
        console.error('Error sending Telegram course notification:', telegramErr);
      }

      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER;

      if (accountSid && authToken && fromNumber) {
        const twilio = (await import('twilio')).default;
        const client = twilio(accountSid, authToken);
        await client.messages.create({
          body: twilioMessage,
          from: fromNumber,
          to: targetNumber
        });
      }

      return res.status(200).json({ success: true });
    } catch (err: any) {
      console.error("Error sending course notification:", err);
      return res.status(500).json({ error: "Failed to send notification" });
    }
  });

  // API Route to send WhatsApp and Telegram notification for new bookings
  app.post("/api/notify-booking", async (req, res) => {
    const { nombre, modelos, fecha } = req.body;
    const targetNumber = 'whatsapp:+5358757024';
  
    const escapeHTML = (str: string) => String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const twilioMessage = `Nueva solicitud de booking recibida en Planet Talent. Cliente: ${nombre}. Modelos solicitadas: ${modelos}. Fecha del evento: ${fecha}. Revisa el panel para más detalles.`;
    const telegramMessage = `<b>🔔 Nueva solicitud de booking</b>

👤 <b>Cliente:</b> ${escapeHTML(nombre)}
📱 <b>Modelos:</b> ${escapeHTML(modelos)}
📅 <b>Fecha del evento:</b> ${escapeHTML(fecha)}

Revisa el panel de administración para más detalles`;
    const telegramBotToken = '8875004415:AAED6CX7msEFkNuqBn9Xagv4jq7KHT4WQbw';
    const telegramChatId = '-1004303735696';
  
    try {
      // Send Telegram notification
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
        } else {
          console.log('Telegram notification sent');
        }
      } catch (telegramErr) {
        console.error('Error sending Telegram notification:', telegramErr);
      }

      // Send Twilio WhatsApp notification
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER;
  
      if (!accountSid || !authToken || !fromNumber) {
        console.warn("Twilio credentials not configured. Skipping WhatsApp notification.");
        return res.status(200).json({ success: true, reason: "Telegram sent, Twilio skipped" });
      }
  
      const twilio = (await import('twilio')).default;
      const client = twilio(accountSid, authToken);
      await client.messages.create({
        body: twilioMessage,
        from: fromNumber,
        to: targetNumber
      });
      
      return res.status(200).json({ success: true });
    } catch (err: any) {
      console.error("Error sending notifications:", err);
      return res.status(500).json({ error: "Failed to send notification" });
    }
  });

  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      try {
        const indexPath = path.join(distPath, "index.html");
        let html = fs.readFileSync(indexPath, "utf-8");
        const host = (req.headers["x-forwarded-host"] as string) || req.headers.host || "";
        const proto = (req.headers["x-forwarded-proto"] as string) || req.protocol || "https";
        if (host) {
          const origin = `${proto}://${host}`;
          html = html
            .replace(/content="\/og-preview\.jpg"/g, `content="${origin}/og-preview.jpg"`)
            .replace(/href="\/og-preview\.jpg"/g, `href="${origin}/og-preview.jpg"`);
        }
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
