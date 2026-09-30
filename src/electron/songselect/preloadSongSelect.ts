import { contextBridge, ipcRenderer } from "electron"

contextBridge.exposeInMainWorld("freeShowAPI", {
    importSong: (data: { text: string; name?: string; author?: string; ccli?: string }) => {
        ipcRenderer.send("SONGSELECT_EXTRACTED", data)
    },
    closeWindow: () => {
        ipcRenderer.send("SONGSELECT_CLOSE_WINDOW")
    }
})
