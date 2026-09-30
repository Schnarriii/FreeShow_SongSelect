(function() {
    if (document.getElementById("freeshow-ss-banner")) {
        if (typeof updateBannerState === "function") {
            updateBannerState();
        }
        return;
    }

    const banner = document.createElement("div");
    banner.id = "freeshow-ss-banner";
    banner.style.cssText = [
        "position: fixed",
        "bottom: 24px",
        "right: 24px",
        "z-index: 2147483647",
        "background: rgba(22, 27, 34, 0.95)",
        "backdrop-filter: blur(12px)",
        "-webkit-backdrop-filter: blur(12px)",
        "border: 1px solid rgba(255, 255, 255, 0.2)",
        "border-radius: 35px",
        "padding: 8px 16px",
        "box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6)",
        "display: flex",
        "align-items: center",
        "gap: 12px",
        "font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        "font-size: 13px",
        "color: #ffffff",
        "user-select: none",
        "transition: all 0.25s ease"
    ].join(";");

    banner.innerHTML = [
        '<div id="freeshow-dock-content" style="display:flex; align-items:center; gap: 12px;">',
        '    <div style="display:flex; align-items:center; gap: 8px;">',
        '        <span style="background: #00a3e0; color: #fff; font-weight: 700; font-size: 11px; padding: 4px 9px; border-radius: 12px; letter-spacing: 0.5px;">FreeShow</span>',
        '        <span id="freeshow-ss-status" style="font-size: 12px; color: #cbd2d9;">Lied auswählen...</span>',
        '    </div>',
        '    <button id="freeshow-import-btn" style="background: #28a745; color: white; border: none; padding: 8px 18px; border-radius: 20px; font-weight: 700; font-size: 13px; cursor: pointer; display: flex; align-items: center; gap: 7px; transition: background 0.2s, transform 0.1s; box-shadow: 0 2px 8px rgba(40,167,69,0.4);">',
        '        📥 Lied in FreeShow importieren',
        '    </button>',
        '</div>',
        '<div style="display:flex; align-items:center; gap: 6px;">',
        '    <button id="freeshow-min-btn" title="Minimieren" style="background: transparent; border: 1px solid #444c56; color: #cbd2d9; border-radius: 50%; width: 26px; height: 26px; font-size: 13px; cursor: pointer; display: flex; align-items: center; justify-content: center; line-height: 1;">',
        '        —',
        '    </button>',
        '    <button id="freeshow-close-btn" title="Fenster schließen" style="background: transparent; border: 1px solid #444c56; color: #cbd2d9; border-radius: 50%; width: 26px; height: 26px; font-size: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; line-height: 1;">',
        '        ✕',
        '    </button>',
        '</div>'
    ].join("");

    document.body.appendChild(banner);

    const importBtn = document.getElementById("freeshow-import-btn");
    const closeBtn = document.getElementById("freeshow-close-btn");
    const minBtn = document.getElementById("freeshow-min-btn");
    const dockContent = document.getElementById("freeshow-dock-content");

    let isMinimized = false;
    if (minBtn) {
        minBtn.onclick = function() {
            isMinimized = !isMinimized;
            if (isMinimized) {
                if (dockContent) dockContent.style.display = "none";
                banner.style.padding = "6px 10px";
                banner.style.borderRadius = "20px";
                minBtn.innerText = "🎵";
                minBtn.title = "Wiederherstellen";
            } else {
                if (dockContent) dockContent.style.display = "flex";
                banner.style.padding = "8px 16px";
                banner.style.borderRadius = "35px";
                minBtn.innerText = "—";
                minBtn.title = "Minimieren";
            }
        };
    }

    if (closeBtn) {
        closeBtn.onclick = function() {
            if (window.freeShowAPI && window.freeShowAPI.closeWindow) {
                window.freeShowAPI.closeWindow();
            }
        };
    }

    if (importBtn) {
        importBtn.onclick = async function() {
            await executeImport(importBtn);
        };
    }

    setInterval(updateBannerState, 400);
    window.addEventListener("popstate", updateBannerState);
    window.addEventListener("hashchange", updateBannerState);

    updateBannerState();

    function isCurrentlyOnSongPage() {
        const path = window.location.pathname || "";
        if (/\/songs\/\d+/i.test(path) || path.includes("/songs/")) return true;
        const full = document.body ? document.body.innerText : "";
        if (/CCLI\s*(?:Song)?\s*#\s*\d+/i.test(full) && /(?:Chorus|Verse|Refrain|Vers)/i.test(full)) return true;
        return false;
    }

    function updateBannerState() {
        const onSong = isCurrentlyOnSongPage();
        const btn = document.getElementById("freeshow-import-btn");
        const status = document.getElementById("freeshow-ss-status");
        if (!btn) return;

        if (onSong) {
            const lyrics = extractSongLyrics();
            if (lyrics && lyrics.length > 20) {
                btn.disabled = false;
                btn.style.opacity = "1";
                btn.style.cursor = "pointer";
                btn.style.background = "#28a745";
                btn.innerHTML = "📥 Lied in FreeShow importieren";
                if (status) status.innerText = "Lied bereit (2 Zeilen / Folie)";
            } else {
                btn.disabled = false;
                btn.style.opacity = "0.9";
                btn.style.cursor = "pointer";
                btn.style.background = "#00a3e0";
                btn.innerHTML = "📥 Lied wird geladen...";
                if (status) status.innerText = "Lade Liedtext...";
            }
        } else {
            btn.disabled = false;
            btn.style.opacity = "0.85";
            btn.style.cursor = "pointer";
            btn.style.background = "#007acc";
            btn.innerHTML = "📥 Lied importieren";
            if (status) status.innerText = "Suche Lied...";
        }
    }

    async function executeImport(btn) {
        btn.disabled = true;
        btn.style.background = "#e27c00";
        btn.innerHTML = "⏳ Lade Liedtext...";

        try {
            let songData = extractSongData();
            if (!songData || !songData.lyrics || songData.lyrics.length < 15) {
                await new Promise(function(r) { setTimeout(r, 600); });
                songData = extractSongData();
            }
            if (!songData || !songData.lyrics || songData.lyrics.length < 15) {
                await new Promise(function(r) { setTimeout(r, 800); });
                songData = extractSongData();
            }

            if (!songData || !songData.lyrics || songData.lyrics.length < 15) {
                throw new Error("Liedtext konnte auf dieser Seite noch nicht geladen werden. Bitte vergewissere dich, dass das Lied vollständig angezeigt wird.");
            }

            // Format as clean text
            let formattedText = "";
            if (songData.title) formattedText += songData.title + "\n\n";
            formattedText += songData.lyrics + "\n\n";

            const metaLines = [];
            if (songData.ccli) metaLines.push("CCLI Song # " + songData.ccli);
            if (songData.authors) metaLines.push(songData.authors);
            if (songData.copyright) metaLines.push(songData.copyright);
            if (metaLines.length) formattedText += metaLines.join("\n");

            if (window.freeShowAPI && window.freeShowAPI.importSong) {
                window.freeShowAPI.importSong({ text: formattedText, name: songData.title });
            }

            btn.style.background = "#28a745";
            btn.innerHTML = "✅ In FreeShow importiert!";
            setTimeout(function() {
                updateBannerState();
            }, 3500);
        } catch (err) {
            alert("Hinweis: " + (err.message || err));
            btn.disabled = false;
            btn.style.background = "#ce0037";
            btn.innerHTML = "❌ Fehler beim Import";
            setTimeout(function() {
                updateBannerState();
            }, 3500);
        }
    }

    function extractSongData() {
        let title = "";
        let authors = "";
        let ccli = "";
        let copyright = "";

        // 1. Title
        const h1 = document.querySelector("h1");
        if (h1 && h1.innerText && h1.innerText.trim().length > 1) {
            title = h1.innerText.trim();
        }
        if (!title) {
            const titleParts = document.title.split("|")[0];
            title = titleParts.replace(/Akkorde.*$/i, "").replace(/Liedtexte.*$/i, "").replace(/Noten.*$/i, "").trim();
        }

        // 2. CCLI Number
        const ccliMatch = window.location.pathname.match(/\/songs\/(\d+)/);
        if (ccliMatch) {
            ccli = ccliMatch[1];
        } else {
            const docText = document.body ? document.body.innerText : "";
            const m2 = docText.match(/CCLI\s*(?:Song)?\s*#\s*(\d+)/i);
            if (m2) ccli = m2[1];
        }

        // 3. Authors
        const authorEl = document.querySelector(".authors, .author, [data-testid='song-authors'], .credits, .song-authors, .byline");
        if (authorEl && authorEl.innerText) {
            authors = authorEl.innerText.trim();
        } else {
            const lines = (document.body ? document.body.innerText : "").split("\n").map(function(l) { return l.trim(); });
            for (let i = 0; i < Math.min(lines.length, 35); i++) {
                if (/^(?:Von|By)\s*:\s*(.+)/i.test(lines[i])) {
                    authors = lines[i].replace(/^(?:Von|By)\s*:\s*/i, "").trim();
                    break;
                }
            }
        }

        // 4. Copyright
        const copyEl = document.querySelector(".copyright, [data-testid='song-copyright'], .song-copyright");
        if (copyEl && copyEl.innerText) {
            copyright = copyEl.innerText.trim();
        } else {
            const match = (document.body ? document.body.innerText : "").match(/(?:©|\(c\)|Copyright)\s*\d{4}[^\n]+/i);
            if (match) copyright = match[0].trim();
        }

        // 5. Lyrics extraction via smart text slicing
        const lyrics = extractSongLyrics();

        return { title: title, authors: authors, ccli: ccli, copyright: copyright, lyrics: lyrics };
    }

    function extractSongLyrics() {
        // First check dedicated lyrics viewer elements
        const specificSelectors = [
            "[data-testid*='lyrics-viewer']",
            "[data-testid*='lyrics']",
            ".song-viewer-lyrics",
            ".lyrics-text",
            ".lyrics",
            "[class*='Lyrics']"
        ];
        for (let s = 0; s < specificSelectors.length; s++) {
            const sel = specificSelectors[s];
            try {
                const el = document.querySelector(sel);
                if (el && el.innerText && el.innerText.trim().length > 30) {
                    const parsed = parseCleanSections(el.innerText);
                    if (parsed && parsed.length > 20) return parsed;
                }
            } catch (e) {}
        }

        // Robust text extraction from document.body.innerText
        const fullText = document.body ? document.body.innerText : "";
        if (!fullText) return "";

        return parseCleanSections(fullText);
    }

    function parseCleanSections(rawText) {
        if (!rawText) return "";
        const lines = rawText.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").map(function(l) { return l.trim(); }).filter(Boolean);

        const headerRegex = /^(Chorus|Refrain|Verse|Vers|Strophe|Bridge|Pre-?Chorus|Pre-?Refrain|Ending|Outro|Tag|Intro|Instrumental|Interlude|Vamp|Teil|Part)(\s*\d+)?\s*:?$/i;
        const endKeywords = /^(Themen|Themes|Andere Sprachversionen|Other language versions|Verlag\s*\/\s*Katalog|Publisher\s*\/\s*Catalog|Urheberrechte|Copyright|verwaltet von:|Administered by:|CCLI Song\s*#|©)/i;
        const isBlacklisted = function(line) {
            return /^(Startseite|CCLI\s*Top\s*100|Themen|Themes|Liturgieplanung|Lieder nach Sprache|Gemeinfreie Lieder|Ihre Bibliothek|Chronik|Einstellungen|Settings|Upgrade|Loop Community|Top Multitracks|WorshipTools|Kostenfreie Gemeinde-Apps|Liedtext|Lyrics|Zum Kopieren bitte anklicken|Click to copy|Andere Sprachversionen|Verlag\s*\/\s*Katalog|Urheberrechte|verwaltet von:|Allgemein|Akkorde|Noten|Lead Sheet|Vocal Sheet)/i.test(line)
                || /^(?:©|\(c\)|copyright|ccli\s*(?:song)?\s*#)/i.test(line)
                || /^https?:\/\//i.test(line);
        };

        const sections = [];
        let currentHeader = "";
        let currentLines = [];
        let songStarted = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // If song has already started and we hit an end keyword, stop parsing!
            if (songStarted && (endKeywords.test(line) || (isBlacklisted(line) && /Themen|Urheberrechte|Verlag|verwaltet von/i.test(line)))) {
                break;
            }

            if (isBlacklisted(line)) continue;

            if (headerRegex.test(line)) {
                songStarted = true;
                if (currentLines.length > 0) {
                    sections.push({ header: currentHeader, lines: currentLines });
                    currentLines = [];
                }
                currentHeader = line.replace(/[:]/g, "").trim();
            } else if (songStarted) {
                currentLines.push(line);
            }
        }

        if (currentLines.length > 0) {
            sections.push({ header: currentHeader, lines: currentLines });
        }

        // Fallback for songs without explicit headers
        if (sections.length === 0) {
            let collecting = false;
            const fallbackLines = [];
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                if (/^(?:Liedtext|Lyrics)/i.test(line)) {
                    collecting = true;
                    continue;
                }
                if (collecting && endKeywords.test(line)) break;
                if (collecting && !isBlacklisted(line)) fallbackLines.push(line);
            }
            if (fallbackLines.length > 0) {
                sections.push({ header: "Verse", lines: fallbackLines });
            }
        }

        if (sections.length === 0) return "";

        return sections.map(function(sec) {
            const headerTag = sec.header ? "[" + sec.header + "]" : "[Verse]";
            return headerTag + "\n" + sec.lines.join("\n");
        }).join("\n\n");
    }
})();
