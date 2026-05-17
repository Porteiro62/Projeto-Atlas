var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// electron/main.ts
var import_electron = require("electron");
var import_path = __toESM(require("path"), 1);
var import_child_process = require("child_process");
var mainWindow = null;
var serverProcess = null;
function startServer() {
  if (!import_electron.app.isPackaged) {
    console.log("Running in dev mode: Skipping built-in server startup as it should be running via npm run dev");
    return;
  }
  const serverPath = import_path.default.join(process.resourcesPath, "dist/server.cjs");
  serverProcess = (0, import_child_process.fork)(serverPath, [], {
    env: { ...process.env, NODE_ENV: "production" },
    stdio: "inherit"
  });
  serverProcess.on("error", (err) => {
    console.error("Failed to start server:", err);
  });
}
function createWindow() {
  mainWindow = new import_electron.BrowserWindow({
    width: 1280,
    height: 800,
    titleBarStyle: "hidden",
    titleBarOverlay: {
      color: "#1c1917",
      // bg-stone-900
      symbolColor: "#a8a29e",
      // text-stone-400
      height: 40
    },
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: import_path.default.join(__dirname, "preload.cjs")
    },
    icon: import_path.default.join(__dirname, "../public/icon.png")
    // Assume an icon exists
  });
  const url = "http://localhost:3000";
  if (!import_electron.app.isPackaged) {
    setTimeout(() => {
      mainWindow?.loadURL(url);
    }, 3e3);
  } else {
    mainWindow.loadURL(url);
  }
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}
import_electron.app.whenReady().then(() => {
  startServer();
  createWindow();
  import_electron.app.on("activate", () => {
    if (import_electron.BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
import_electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    import_electron.app.quit();
  }
});
import_electron.app.on("before-quit", () => {
  if (serverProcess) {
    serverProcess.kill();
  }
});
