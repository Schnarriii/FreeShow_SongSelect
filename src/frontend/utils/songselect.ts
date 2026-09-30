import { Main } from "../../types/IPC/Main"
import { ToMain } from "../../types/IPC/ToMain"
import { convertText } from "../converters/txt"
import { sendMain } from "../IPC/main"
import { newToast } from "./common"

export function openSongSelect(query: string = "") {
    sendMain(Main.SONGSELECT_OPEN, { query: (query || "").trim() })
}

export function closeSongSelect() {
    sendMain(Main.SONGSELECT_CLOSE)
}

export function importSongSelectLyrics(text: string, title?: string) {
    if (!text || !text.trim()) return

    try {
        // Create show in the default "song" ("Lieder") category
        // with splitLinesCount = 2 (always 2 lines per slide)
        const showData = convertText({
            name: title || "",
            category: "song",
            text: text.trim(),
            splitLinesCount: 2, // Always 2 lines per slide!
            noFormatting: true,
            returnData: false, // Saves show, adds to history & filesystem, and opens it
            open: true
        })

        const songName = showData?.show?.name || title || "Lied"
        newToast(`Lied "${songName}" erfolgreich mit 2 Zeilen pro Folie in "Lieder" gespeichert!`)
        return showData
    } catch (err) {
        console.error("Failed to import SongSelect song:", err)
        newToast("Fehler beim Importieren des Liedes von SongSelect")
    }
}
