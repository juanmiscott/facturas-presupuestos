const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  sendEmail: (data) => ipcRenderer.invoke("send-email", data),
});
