const { app, BrowserWindow, ipcMain, dialog, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const nodemailer = require("nodemailer");

// Detect if running in dev or production
const isDev = !app.isPackaged;

// ─── Persistent storage ─────────────────────────────────
let store;
async function initStore () {
  const Store = (await import("electron-store")).default;
  store = new Store({
    name: "factufacil-data",
    defaults: {
      docs: [],
      company: null,
      catalogo: null,
      clientes: [],
      gastos: [],
    },
  });
}

function createWindow () {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: "LISA",
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

// ─── Data persistence handlers ──────────────────────────
ipcMain.handle("store-get", (_event, key) => {
  if (!store) return null;
  return store.get(key);
});

ipcMain.handle("store-set", (_event, key, value) => {
  if (!store) return;
  store.set(key, value);
});

// ─── Export / Import backup ─────────────────────────────
ipcMain.handle("export-data", async () => {
  if (!store) return { success: false, error: "Store no inicializado" };
  const win = BrowserWindow.getFocusedWindow();
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: "Exportar copia de seguridad",
    defaultPath: `factufacil-backup-${new Date().toISOString().split("T")[0]}.json`,
    filters: [{ name: "JSON", extensions: ["json"] }],
  });
  if (canceled || !filePath) return { success: false, error: "Cancelado" };
  try {
    const data = {
      docs: store.get("docs") || [],
      company: store.get("company") || null,
      catalogo: store.get("catalogo") || null,
      clientes: store.get("clientes") || [],
      gastos: store.get("gastos") || [],
      exportedAt: new Date().toISOString(),
    };
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
    return { success: true, path: filePath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("import-data", async () => {
  if (!store) return { success: false, error: "Store no inicializado" };
  const win = BrowserWindow.getFocusedWindow();
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    title: "Importar copia de seguridad",
    filters: [{ name: "JSON", extensions: ["json"] }],
    properties: ["openFile"],
  });
  if (canceled || !filePaths.length) return { success: false, error: "Cancelado" };
  try {
    const raw = fs.readFileSync(filePaths[0], "utf-8");
    const data = JSON.parse(raw);
    if (data.docs) store.set("docs", data.docs);
    if (data.company) store.set("company", data.company);
    if (data.catalogo) store.set("catalogo", data.catalogo);
    if (data.clientes) store.set("clientes", data.clientes);
    if (data.gastos) store.set("gastos", data.gastos);
    return { success: true, data };
  } catch (err) {
    return { success: false, error: "Archivo no válido: " + err.message };
  }
});

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

// ─── Open bundled PDF files ─────────────────────────────
ipcMain.handle("open-pdf", async (_event, filename) => {
  try {
    // In production: dist/ folder; in dev: public/ folder
    const pdfPath = isDev
      ? path.join(__dirname, "..", "public", filename)
      : path.join(__dirname, "..", "dist", filename);
    if (!fs.existsSync(pdfPath)) {
      return { success: false, error: "Archivo no encontrado: " + filename };
    }
    await shell.openPath(pdfPath);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

app.whenReady().then(async () => {
  await initStore();
  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
