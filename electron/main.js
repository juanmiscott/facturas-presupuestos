const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const nodemailer = require("nodemailer");

// Detect if running in dev or production
const isDev = !app.isPackaged;

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: "FactuFácil",
    icon: path.join(__dirname, "icon.png"),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  if (isDev) {
    win.loadURL("http://localhost:5173");
  } else {
    win.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }

  win.setMenuBarVisibility(false);
}

// ─── Email handler ──────────────────────────────────────
ipcMain.handle("send-email", async (_event, data) => {
  const { gmailUser, gmailAppPassword, to, subject, body, pdfBase64, pdfFilename } = data;

  if (!gmailUser || !gmailAppPassword) {
    return { success: false, error: "Configura tu correo Gmail y contraseña de aplicación en Configuración." };
  }
  if (!to) {
    return { success: false, error: "Introduce el correo del destinatario." };
  }

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: gmailUser,
        pass: gmailAppPassword,
      },
    });

    const mailOptions = {
      from: `"FactuFácil" <${gmailUser}>`,
      to: to,
      subject: subject || "Documento adjunto",
      html: body || "<p>Adjunto el documento solicitado.</p><p>Un saludo,<br>FactuFácil</p>",
      attachments: [],
    };

    if (pdfBase64) {
      mailOptions.attachments.push({
        filename: pdfFilename || "documento.pdf",
        content: Buffer.from(pdfBase64, "base64"),
        contentType: "application/pdf",
      });
    }

    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (err) {
    console.error("Error sending email:", err);
    let errorMsg = err.message;
    if (err.code === "EAUTH") {
      errorMsg = "Error de autenticación. Verifica tu correo Gmail y contraseña de aplicación.";
    }
    return { success: false, error: errorMsg };
  }
});

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
