import { app, BrowserWindow, ipcMain } from "electron"
import fs from "fs"
import path from "path"
import { sendToMain } from "../IPC/main"
import { ToMain } from "../../types/IPC/ToMain"

let songSelectWindow: BrowserWindow | null = null
let ipcListenersRegistered = false

export function openSongSelectWindow(query?: string) {
    if (songSelectWindow && !songSelectWindow.isDestroyed()) {
        songSelectWindow.show()
        songSelectWindow.focus()
        if (query && query.trim()) {
            const searchUrl = `https://songselect.ccli.com/search/results?SearchText=${encodeURIComponent(query.trim())}`
            songSelectWindow.loadURL(searchUrl)
        }
        return true
    }

    registerSongSelectIpc()

    let preloadPath = path.join(__dirname, "preloadSongSelect.js")
    if (!fs.existsSync(preloadPath)) {
        preloadPath = path.join(__dirname, "preloadSongSelect.ts")
    }

    const iconPath = path.join(app.getAppPath(), "public", "icon.png")

    songSelectWindow = new BrowserWindow({
        width: 1180,
        height: 850,
        minWidth: 850,
        minHeight: 600,
        title: "SongSelect by CCLI - FreeShow",
        icon: fs.existsSync(iconPath) ? iconPath : undefined,
        backgroundColor: "#17191c",
        autoHideMenuBar: true,
        webPreferences: {
            partition: "persist:songselect",
            preload: preloadPath,
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: false
        }
    })

    // Intercept download requests from SongSelect (e.g. lyrics text files)
    const session = songSelectWindow.webContents.session
    session.on("will-download", (_event, item) => {
        const filename = item.getFilename()
        const lowerName = filename.toLowerCase()
        if (lowerName.endsWith(".txt") || lowerName.endsWith(".usr")) {
            const tempFile = path.join(app.getPath("temp"), `ccli_${Date.now()}_${filename}`)
            item.setSavePath(tempFile)
            item.once("done", (_e, state) => {
                if (state === "completed" && fs.existsSync(tempFile)) {
                    try {
                        const content = fs.readFileSync(tempFile, "utf-8")
                        fs.unlinkSync(tempFile)
                        const songTitle = filename.replace(/\.(txt|usr)$/i, "")
                        handleImportedSongLyrics(content, songTitle)
                    } catch (err) {
                        console.error("Error reading downloaded SongSelect file:", err)
                    }
                }
            })
        }
    })

    // Inject helper banner and scraper after page load and SPA navigation
    const injectOrUpdateBanner = () => {
        if (!songSelectWindow || songSelectWindow.isDestroyed()) return
        const currentUrl = songSelectWindow.webContents.getURL()
        if (currentUrl.includes("songselect.ccli.com") || currentUrl.includes("ccli.com")) {
            songSelectWindow.webContents.executeJavaScript(getInjectedBannerScript()).catch((err) => {
                console.error("Failed to inject SongSelect banner:", err)
            })
        }
    }

    songSelectWindow.webContents.on("did-finish-load", injectOrUpdateBanner)
    songSelectWindow.webContents.on("did-navigate-in-page", injectOrUpdateBanner)
    songSelectWindow.webContents.on("did-navigate", injectOrUpdateBanner)

    songSelectWindow.on("closed", () => {
        songSelectWindow = null
    })

    const initialUrl = query && query.trim()
        ? `https://songselect.ccli.com/search/results?SearchText=${encodeURIComponent(query.trim())}`
        : "https://songselect.ccli.com"

    songSelectWindow.loadURL(initialUrl)
    return true
}

export function closeSongSelectWindow(): boolean {
    if (songSelectWindow && !songSelectWindow.isDestroyed()) {
        songSelectWindow.close()
        songSelectWindow = null
        return true
    }
    return false
}

function registerSongSelectIpc() {
    if (ipcListenersRegistered) return
    ipcListenersRegistered = true

    ipcMain.on("SONGSELECT_EXTRACTED", (_event, data: { text: string; name?: string }) => {
        if (data && data.text) {
            handleImportedSongLyrics(data.text, data.name)
        }
    })

    ipcMain.on("SONGSELECT_CLOSE_WINDOW", () => {
        closeSongSelectWindow()
    })
}

export function handleImportedSongLyrics(text: string, name?: string) {
    if (!text || !text.trim()) return

    sendToMain(ToMain.SONGSELECT_IMPORT, {
        text: text.trim(),
        name: (name || "").trim()
    })
}

function getInjectedBannerScript(): string {
    const candidates = [
        path.join(__dirname, "injectedBanner.js"),
        path.join(app.getAppPath(), "build", "electron", "songselect", "injectedBanner.js"),
        path.join(app.getAppPath(), "src", "electron", "songselect", "injectedBanner.js"),
        path.join(process.cwd(), "src", "electron", "songselect", "injectedBanner.js")
    ]
    for (const p of candidates) {
        if (fs.existsSync(p)) {
            try {
                return fs.readFileSync(p, "utf-8")
            } catch (err) {
                console.error("Failed to read injected banner script from:", p, err)
            }
        }
    }
    return ""
}
