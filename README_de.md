# LLM Hub für Obsidian

[![DeepWiki](https://img.shields.io/badge/DeepWiki-takeshy%2Fobsidian--llm--hub-blue.svg?logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTQgMTloMTZhMiAyIDAgMCAwIDItMlY3YTIgMiAwIDAgMC0yLTJINWEyIDIgMCAwIDAtMiAydjEyYTIgMiAwIDAgMSAyLTJ6Ii8+PHBhdGggZD0iTTkgMTV2LTQiLz48cGF0aCBkPSJNMTIgMTV2LTIiLz48cGF0aCBkPSJNMTUgMTV2LTQiLz48L3N2Zz4=)](https://deepwiki.com/takeshy/obsidian-llm-hub)

**Kostenloser und quelloffener** KI-Assistent für Obsidian mit **Chat**, **Workflow-Automatisierung** und **Semantischer Suche (RAG)**. Unterstützt mehrere LLM-Anbieter — verwenden Sie die KI, die am besten zu Ihren Bedürfnissen passt.

> **Verwenden Sie einen beliebigen LLM-Anbieter:** [Gemini](https://ai.google.dev), [OpenAI](https://platform.openai.com), [Anthropic](https://console.anthropic.com), [OpenRouter](https://openrouter.ai), [Grok](https://console.x.ai), lokale LLMs ([Ollama](https://ollama.com), [LM Studio](https://lmstudio.ai), [vLLM](https://docs.vllm.ai)) oder CLI-Tools ([Gemini CLI](https://github.com/google-gemini/gemini-cli), [Claude Code](https://github.com/anthropics/claude-code), [Codex CLI](https://github.com/openai/codex)).

## Highlights

- **Multi-Provider LLM-Chat** - Verwenden Sie Gemini, OpenAI, Anthropic, OpenRouter, Grok, lokale LLMs oder CLI-Backends
- **Vault-Operationen** - KI liest, schreibt, sucht und bearbeitet Ihre Notizen mit Function Calling (Gemini, OpenAI, Anthropic)
- **Workflow Builder** - Automatisieren Sie mehrstufige Aufgaben mit visuellem Node-Editor und 25 Node-Typen
- **Semantische Suche (RAG)** - Lokale Vektorsuche mit dediziertem Such-Tab, PDF-Vorschau und Ergebnis-zu-Chat-Flow
- **AI Discussion** - Multi-Modell-Debattenarena mit parallelen Antworten, Abstimmung und Gewinner-Ermittlung
- **Bearbeitungsverlauf** - Verfolgen und Wiederherstellen von KI-Änderungen mit Diff-Ansicht
- **Websuche** - Zugriff auf aktuelle Informationen über Google Search (Gemini)
- **Bilderzeugung** - Erstellen Sie Bilder mit Gemini oder DALL-E
- **Discord Integration** - Verbinden Sie Ihr LLM mit Discord als Chat-Bot mit kanalspezifischer Modell-/RAG-Umschaltung
- **Verschlüsselung** - Passwortschutz für Chat-Verlauf und Workflow-Ausführungsprotokolle


## Unterstützte Anbieter

| Anbieter | Chat | Vault-Tools | Websuche | Bildgenerierung | RAG |
|----------|------|-------------|----------|-----------------|-----|
| **Gemini** (API) | ✅ Streaming | ✅ Function Calling | ✅ Google Search | ✅ Gemini-Bildmodelle | ✅ |
| **OpenAI** (API) | ✅ Streaming | ✅ Function Calling | ❌ | ✅ DALL-E | ✅ |
| **Anthropic** (API) | ✅ Streaming | ✅ Tool Use | ❌ | ❌ | ✅ |
| **OpenRouter** (API) | ✅ Streaming | ✅ Function Calling | ❌ | ❌ | ✅ |
| **Grok** (API) | ✅ Streaming | ✅ Function Calling | ❌ | ❌ | ✅ |
| **Lokales LLM** (Ollama, LM Studio, vLLM) | ✅ Streaming | ❌ | ❌ | ❌ | ✅ |
| **CLI** (Gemini, Claude, Codex) | ✅ Streaming | ❌ | ❌ | ❌ | ✅ |

> [!TIP]
> **Mehrere Anbieter können gleichzeitig konfiguriert werden.** Wechseln Sie während des Chats frei zwischen Modellen — jeder Anbieter hat seinen eigenen API-Schlüssel und eigene Einstellungen.

> [!TIP]
> **CLI-Optionen** ermöglichen die Nutzung von Flaggschiff-Modellen nur mit einem Konto - kein API-Schlüssel erforderlich!
> - **Gemini CLI**: Installieren Sie [Gemini CLI](https://github.com/google-gemini/gemini-cli), führen Sie `gemini` aus und authentifizieren Sie sich mit `/auth`
> - **Claude CLI**: Installieren Sie [Claude Code](https://github.com/anthropics/claude-code) (`npm install -g @anthropic-ai/claude-code`), führen Sie `claude` aus und authentifizieren Sie sich
> - **Codex CLI**: Installieren Sie [Codex CLI](https://github.com/openai/codex) (`npm install -g @openai/codex`), führen Sie `codex` aus und authentifizieren Sie sich

### Tipps für den kostenlosen Gemini API-Schlüssel

- **Rate-Limits** gelten pro Modell und werden täglich zurückgesetzt. Wechseln Sie das Modell, um weiterzuarbeiten.
- **Gemma 4** kann Function Calling nicht mit RAG/Web Search in einer einzelnen Anfrage kombinieren. Wenn RAG oder Web Search aktiv ist, werden Vault-Tools automatisch deaktiviert. **CLI-Modelle** und **lokale LLMs** unterstützen keine Vault-Operationen, aber **Workflows können weiterhin Notizen lesen/schreiben** mit `note`, `note-read` und anderen Node-Typen. Die Variablen `{content}` und `{selection}` funktionieren ebenfalls.

---

# KI-Chat

Die KI-Chat-Funktion bietet eine interaktive Konversationsschnittstelle mit Ihrem gewählten LLM-Anbieter, integriert in Ihren Obsidian-Vault.

![Chat-Oberfläche](docs/images/chat.png)

**Chat öffnen:**
- Klicken Sie auf das Chat-Symbol im Ribbon
- Befehl: "LLM Hub: Open chat"
- Umschalten: "LLM Hub: Toggle chat / editor"

**Chat-Steuerung:**
- **Enter** - Nachricht senden
- **Shift+Enter** - Neue Zeile
- **Stop-Schaltfläche** - Generierung stoppen
- **+-Schaltfläche** - Neuer Chat
- **Verlauf-Schaltfläche** - Frühere Chats laden

## Slash-Befehle

Erstellen Sie wiederverwendbare Prompt-Vorlagen, die mit `/` ausgelöst werden:

- Definieren Sie Vorlagen mit `{selection}` (ausgewählter Text) und `{content}` (aktive Notiz)
- Optionale Modell- und Suchüberschreibung pro Befehl
- Tippen Sie `/`, um verfügbare Befehle anzuzeigen

**Standard:** `/infographic` - Konvertiert Inhalte in HTML-Infografiken

![Infografik-Beispiel](docs/images/chat_infographic.png)

## @-Erwähnungen

Referenzieren Sie Dateien und Variablen durch Eingabe von `@`:

- `{selection}` - Ausgewählter Text
- `{content}` - Inhalt der aktiven Notiz
- Jede Vault-Datei - Durchsuchen und einfügen (nur Pfad; KI liest Inhalt über Tools)

> [!NOTE]
> **Wie `{selection}` und `{content}` funktionieren:** Wenn Sie von der Markdown-Ansicht zur Chat-Ansicht wechseln, würde die Auswahl normalerweise aufgrund des Fokuswechsels gelöscht. Um Ihre Auswahl zu bewahren, erfasst das Plugin sie beim Wechsel der Ansichten und hebt den ausgewählten Bereich mit einer Hintergrundfarbe in der Markdown-Ansicht hervor. Die Option `{selection}` erscheint nur in den @-Vorschlägen, wenn Text ausgewählt wurde.
>
> Sowohl `{selection}` als auch `{content}` werden absichtlich **nicht erweitert** im Eingabebereich – da das Chat-Eingabefeld kompakt ist, würde das Erweitern von langem Text die Eingabe erschweren. Der Inhalt wird beim Senden der Nachricht erweitert, was Sie überprüfen können, indem Sie Ihre gesendete Nachricht im Chat betrachten.

> [!NOTE]
> Vault-Datei-@-Erwähnungen fügen nur den Dateipfad ein - die KI liest den Inhalt über Tools. Dies funktioniert nicht mit CLI-Modellen oder lokalen LLMs (keine Vault-Tool-Unterstützung). Gemini CLI kann Dateien über die Shell lesen, aber das Antwortformat kann abweichen.

## Dateianhänge

Hängen Sie Dateien direkt an: Bilder (PNG, JPEG, GIF, WebP), PDFs, Textdateien

## Function Calling (Vault-Operationen)

Die KI kann mit Ihrem Vault über diese Tools interagieren:

| Tool | Beschreibung |
|------|--------------|
| `read_note` | Notizinhalt lesen |
| `create_note` | Neue Notizen erstellen |
| `propose_edit` | Bearbeiten mit Bestätigungsdialog |
| `propose_delete` | Löschen mit Bestätigungsdialog |
| `bulk_propose_edit` | Massenbearbeitung mehrerer Dateien mit Auswahldialog |
| `bulk_propose_delete` | Massenlöschung mehrerer Dateien mit Auswahldialog |
| `search_notes` | Vault nach Name oder Inhalt durchsuchen |
| `list_notes` | Notizen in Ordner auflisten |
| `rename_note` | Notizen umbenennen/verschieben |
| `create_folder` | Neue Ordner erstellen |
| `list_folders` | Ordner im Vault auflisten |
| `get_active_note_info` | Informationen über aktive Notiz abrufen |
| `bulk_propose_rename` | Massenumbenennung mehrerer Dateien mit Auswahldialog |

### Vault-Tool-Modus

Wenn die KI Notizen im Chat verarbeitet, verwendet sie Vault-Tools. Steuern Sie, welche Vault-Tools die KI verwenden kann, über das Datenbank-Symbol (📦) unter dem Anhang-Button:

| Modus | Beschreibung | Verfügbare Tools |
|-------|--------------|------------------|
| **Vault: Alle** | Voller Vault-Zugriff | Alle Tools |
| **Vault: Ohne Suche** | Suchwerkzeuge ausschließen | Alle außer `search_notes`, `list_notes` |
| **Vault: Aus** | Kein Vault-Zugriff | Keine |

**Wann welcher Modus verwendet werden sollte:**

- **Vault: Alle** - Standardmodus für allgemeine Verwendung. Die KI kann Ihren Vault lesen, schreiben und durchsuchen.
- **Vault: Ohne Suche** - Verwenden Sie diesen Modus, wenn Sie die Zieldatei bereits kennen. Dies vermeidet redundante Vault-Suchen und spart Tokens und verbessert die Antwortzeit.
- **Vault: Aus** - Verwenden Sie diesen Modus, wenn Sie überhaupt keinen Vault-Zugriff benötigen.

**Automatische Modusauswahl:**

| Bedingung | Standardmodus | Änderbar |
|-----------|---------------|----------|
| CLI-Modelle (Gemini/Claude/Codex CLI) | Vault: Aus | Nein |
| Lokales LLM | Vault: Aus | Nein |
| Gemma 4 + RAG/Web Search | Vault: Aus | Ja (Deaktivierung von RAG/Web Search aktiviert Tools wieder) |
| Normal | Vault: Alle | Ja |

**Warum einige Modi erzwungen werden:**

- **CLI/Lokale LLM-Modelle**: Diese Modelle unterstützen keine Funktionsaufrufe, daher können Vault-Tools nicht verwendet werden.
- **Gemma 4**: Function Calling und RAG/Web Search können nicht in einer einzelnen Anfrage kombiniert werden. Wenn eines aktiv ist, wird das andere automatisch deaktiviert.

## Sicheres Bearbeiten

Wenn die KI `propose_edit` verwendet:
1. Ein Bestätigungsdialog zeigt die vorgeschlagenen Änderungen
2. Klicken Sie auf **Anwenden**, um Änderungen in die Datei zu schreiben
3. Klicken Sie auf **Verwerfen**, um ohne Änderung der Datei abzubrechen

> Änderungen werden NICHT geschrieben, bis Sie bestätigen.

## Bearbeitungsverlauf

Verfolgen und Wiederherstellen von Änderungen an Ihren Notizen:

- **Automatische Verfolgung** - Alle KI-Bearbeitungen (Chat, Workflow) und manuelle Änderungen werden aufgezeichnet
- **Dateimenü-Zugriff** - Rechtsklick auf eine Markdown-Datei für Zugriff auf:
  - **Snapshot** - Aktuellen Zustand als Snapshot speichern
  - **History** - Bearbeitungsverlauf-Modal öffnen


- **Befehlspalette** - Auch verfügbar über den Befehl "Show edit history"
- **Diff-Ansicht** - Sehen Sie genau, was sich geändert hat, mit farbcodierten Hinzufügungen/Löschungen
- **Wiederherstellen** - Mit einem Klick zu jeder früheren Version zurückkehren
- **Kopieren** - Speichere eine historische Version als neue Datei (Standardname: `{filename}_{datetime}.md`)
- **Größenveränderbares Modal** - Ziehen zum Verschieben, Größe an den Ecken ändern

**Diff-Anzeige:**
- `+` Zeilen existierten in der älteren Version
- `-` Zeilen wurden in der neueren Version hinzugefügt

**So funktioniert es:**

Der Bearbeitungsverlauf verwendet einen Snapshot-basierten Ansatz:

1. **Snapshot-Erstellung** - Wenn eine Datei zum ersten Mal geöffnet oder von der KI geändert wird, wird ein Snapshot ihres Inhalts gespeichert
2. **Diff-Aufzeichnung** - Wenn die Datei geändert wird, wird der Unterschied zwischen dem neuen Inhalt und dem Snapshot als Verlaufseintrag aufgezeichnet
3. **Snapshot-Aktualisierung** - Der Snapshot wird nach jeder Änderung auf den neuen Inhalt aktualisiert
4. **Wiederherstellen** - Um zu einer früheren Version zurückzukehren, werden Diffs vom Snapshot rückwärts angewendet

**Wann wird der Verlauf aufgezeichnet:**
- KI-Chat-Bearbeitungen (`propose_edit`-Tool)
- Workflow-Notizänderungen (`note`-Node)
- Manuelle Speicherungen über Befehl
- Auto-Erkennung, wenn die Datei beim Öffnen vom Snapshot abweicht

**Speicher:** Der Bearbeitungsverlauf wird im Arbeitsspeicher gespeichert und beim Neustart von Obsidian gelöscht. Die dauerhafte Versionsverfolgung wird durch die integrierte Dateiwiederherstellung von Obsidian abgedeckt.

![Bearbeitungsverlauf-Modal](docs/images/edit_history.png)

## MCP-Server

MCP (Model Context Protocol)-Server bieten zusätzliche Werkzeuge, die die Fähigkeiten der KI über Vault-Operationen hinaus erweitern.

**Zwei Transportmodi werden unterstützt:**

**HTTP (Streamable HTTP):**

1. Plugin-Einstellungen öffnen → Abschnitt **MCP-Server**
2. Auf **Server hinzufügen** klicken → **HTTP** auswählen
3. Servername und URL eingeben
4. Optionale Header (JSON-Format) für Authentifizierung konfigurieren
5. Auf **Verbindung testen** klicken, um zu verifizieren und verfügbare Werkzeuge abzurufen
6. Serverkonfiguration speichern

**Stdio (Lokaler Prozess):**

1. Plugin-Einstellungen öffnen → Abschnitt **MCP-Server**
2. Auf **Server hinzufügen** klicken → **Stdio** auswählen
3. Servername und Befehl eingeben (z.B. `npx -y @modelcontextprotocol/server-filesystem /path/to/dir`)
4. Optionale Umgebungsvariablen (JSON-Format) konfigurieren
5. Auf **Verbindung testen** klicken, um zu verifizieren und verfügbare Werkzeuge abzurufen
6. Serverkonfiguration speichern

> **Hinweis:** Stdio-Transport startet einen lokalen Prozess und ist nur für Desktop verfügbar. Der Verbindungstest ist vor dem Speichern erforderlich.

![MCP-Server-Einstellungen](docs/images/setting_mcp.png)

**Verwendung von MCP-Werkzeugen:**

- **Im Chat:** Klicken Sie auf das Datenbank-Symbol (📦), um die Werkzeugeinstellungen zu öffnen. Aktivieren/deaktivieren Sie MCP-Server pro Konversation.
- **In Workflows:** Verwenden Sie den `mcp`-Knoten, um MCP-Server-Werkzeuge aufzurufen.

**Werkzeughinweise:** Nach einem erfolgreichen Verbindungstest werden die Namen der verfügbaren Werkzeuge gespeichert und sowohl in den Einstellungen als auch in der Chat-Oberfläche angezeigt.

### MCP Apps (Interaktive UI)

Einige MCP-Werkzeuge geben interaktive UI zurück, die es Ihnen ermöglicht, visuell mit den Werkzeugergebnissen zu interagieren. Diese Funktion basiert auf der [MCP Apps-Spezifikation](https://github.com/anthropics/anthropic-cookbook/tree/main/misc/mcp_apps).


**So funktioniert es:**

- Wenn ein MCP-Werkzeug einen `ui://`-Ressourcen-URI in seinen Antwort-Metadaten zurückgibt, ruft das Plugin den HTML-Inhalt ab und rendert ihn
- Die UI wird aus Sicherheitsgründen in einem Sandbox-iframe angezeigt (`sandbox="allow-scripts allow-forms"`)
- Interaktive Apps können über eine JSON-RPC-Brücke zusätzliche MCP-Werkzeuge aufrufen und den Kontext aktualisieren

**Im Chat:**
- MCP Apps erscheinen inline in Assistenznachrichten mit einem Erweitern/Reduzieren-Button
- Klicken Sie auf ⊕ um auf Vollbild zu erweitern, ⊖ zum Reduzieren

**In Workflows:**
- MCP Apps werden während der Workflow-Ausführung in einem Modal-Dialog angezeigt
- Der Workflow pausiert für Benutzerinteraktion und wird fortgesetzt, wenn das Modal geschlossen wird

> **Sicherheit:** Alle MCP-App-Inhalte werden in einem Sandbox-iframe mit eingeschränkten Berechtigungen ausgeführt. Das iframe kann nicht auf das DOM der übergeordneten Seite, Cookies oder lokalen Speicher zugreifen. Nur `allow-scripts` und `allow-forms` sind aktiviert.

## Agent-Skills

Erweitern Sie die KI mit benutzerdefinierten Anweisungen, Referenzmaterialien und ausführbaren Workflows. Skills folgen dem branchenüblichen Agent-Skills-Muster (z.B. [OpenAI Codex](https://github.com/openai/codex) `.codex/skills/`).

- **Benutzerdefinierte Anweisungen** - Definieren Sie domänenspezifisches Verhalten über `SKILL.md`-Dateien
- **Referenzmaterialien** - Styleguides, Vorlagen und Checklisten in `references/` einbinden
- **Workflow-Integration** - Skills können Workflows als Function-Calling-Werkzeuge bereitstellen
- **Slash-Befehl** - Geben Sie `/folder-name` ein, um einen Skill sofort aufzurufen und zu senden
- **CLI-Modus-Unterstützung** - Skills funktionieren mit Gemini CLI, Claude CLI und Codex CLI Backends
- **Selektive Aktivierung** - Wählen Sie, welche Skills pro Konversation aktiv sind

Erstellen Sie Skills genauso wie Workflows — wählen Sie **+ New (AI)**, aktivieren Sie **„Als Agent-Skill erstellen"** und beschreiben Sie, was Sie möchten. Die AI generiert sowohl die `SKILL.md`-Anweisungen als auch den Workflow.

> **Für Einrichtungsanleitungen und Beispiele siehe [SKILLS.md](docs/SKILLS_de.md)**

---

# Discord Integration

Verbinden Sie das LLM Ihres Obsidian-Vaults mit Discord als Chat-Bot. Benutzer können mit der KI chatten, Modelle wechseln, RAG-Suche nutzen und Slash-Befehle aktivieren — alles direkt aus Discord.

## Einrichtung

### 1. Discord Bot erstellen

1. Gehen Sie zum [Discord Developer Portal](https://discord.com/developers/applications)
2. Klicken Sie auf **New Application** → geben Sie einen Namen ein → **Create**
3. Gehen Sie zu **Bot** in der linken Seitenleiste
4. Klicken Sie auf **Reset Token** → kopieren Sie das Bot-Token (Sie benötigen es später)
5. Aktivieren Sie unter **Privileged Gateway Intents** den **Message Content Intent** (erforderlich zum Lesen von Nachrichtentext)

### 2. Bot zum Server einladen

1. Gehen Sie zu **OAuth2** in der linken Seitenleiste
2. Wählen Sie unter **OAuth2 URL Generator** den Bereich **bot**
3. Wählen Sie unter **Bot Permissions**:
   - **Send Messages**
   - **Read Message History**
4. Kopieren Sie die generierte URL und öffnen Sie sie in Ihrem Browser
5. Wählen Sie einen Server und autorisieren Sie den Bot

### 3. In Obsidian konfigurieren

1. Öffnen Sie die Plugin-Einstellungen → Abschnitt **Discord**
2. Aktivieren Sie **Discord Bot**
3. Fügen Sie das Bot-Token ein
4. Klicken Sie auf **Connect** (das Plugin überprüft das Token vor der Verbindung)
5. Die Statusanzeige zeigt an, ob der Bot verbunden ist

## Konfigurationsoptionen

| Einstellung | Beschreibung | Standard |
|-------------|-------------|----------|
| **Enabled** | Discord Bot ein-/ausschalten | Aus |
| **Bot Token** | Discord Bot-Token vom Developer Portal | — |
| **Respond to DMs** | Ob der Bot auf Direktnachrichten antwortet | Ein |
| **Require @mention** | In Serverkanälen nur antworten, wenn @erwähnt (DMs antworten immer) | Ein |
| **Allowed Channel IDs** | Kommagetrennte Kanal-IDs zur Einschränkung (leer = alle Kanäle) | leer |
| **Allowed User IDs** | Kommagetrennte Benutzer-IDs zur Einschränkung (leer = alle Benutzer) | leer |
| **Model Override** | Festlegen, welches Modell für Discord verwendet wird (leer = aktuell ausgewähltes Modell) | leer |
| **System Prompt Override** | Benutzerdefinierter System-Prompt für Discord-Konversationen | leer |
| **Max Response Length** | Maximale Zeichen pro Nachricht (1–2000, Discord-Limit) | 2000 |

> [!TIP]
> **Kanal-/Benutzer-IDs finden:** Aktivieren Sie in Discord den **Entwicklermodus** (Einstellungen → Erweitert → Entwicklermodus). Klicken Sie dann mit der rechten Maustaste auf einen Kanal oder Benutzer und wählen Sie **ID kopieren**.

## Bot-Befehle

Benutzer können mit dem Bot über folgende Befehle in Discord interagieren:

| Befehl | Beschreibung |
|--------|-------------|
| `!model` | Verfügbare Modelle auflisten |
| `!model <name>` | Zu einem bestimmten Modell für diesen Kanal wechseln |
| `!rag` | Verfügbare RAG-Einstellungen auflisten |
| `!rag <name>` | Zu einer bestimmten RAG-Einstellung für diesen Kanal wechseln |
| `!rag off` | RAG für diesen Kanal deaktivieren |
| `!skill` | Verfügbare Slash-Befehle auflisten |
| `!skill <name>` | Einen Slash-Befehl aktivieren (erfordert möglicherweise eine Folgenachricht) |
| `!discuss <theme>` | AI-Discussion mit konfigurierten Teilnehmern starten (Hintergrund) |
| `!reset` | Konversationsverlauf für diesen Kanal löschen |
| `!help` | Hilfenachricht anzeigen |

## Funktionen

- **Multi-Provider-Unterstützung** — Funktioniert mit allen konfigurierten LLM-Anbietern (Gemini, OpenAI, Anthropic, OpenRouter, Grok, CLI, lokales LLM)
- **Kanalspezifischer Status** — Jeder Discord-Kanal verwaltet seinen eigenen Konversationsverlauf, seine Modellauswahl und RAG-Einstellung
- **Vault-Tools** — KI hat vollen Zugriff auf Vault-Tools (Notizen lesen, schreiben, suchen) basierend auf Ihren Plugin-Einstellungen
- **RAG-Integration** — Semantische Suche kann pro Kanal über den Befehl `!rag` aktiviert werden
- **Slash-Befehle** — Plugin-Slash-Befehle über `!skill` aktivieren
- **Lange Nachrichten aufteilen** — Antworten, die das 2000-Zeichen-Limit von Discord überschreiten, werden automatisch an natürlichen Umbruchstellen aufgeteilt
- **Konversationsspeicher** — Kanalspezifischer Verlauf (max. 20 Nachrichten, 30-Minuten-TTL)
- **Automatische Wiederverbindung** — Erholt sich von Verbindungsabbrüchen mit exponentiellem Backoff

> [!NOTE]
> Der Konversationsverlauf wird nur im Arbeitsspeicher gehalten und wird gelöscht, wenn der Bot die Verbindung trennt oder Obsidian neu gestartet wird.

---

# Workflow Builder

Erstellen Sie automatisierte mehrstufige Workflows direkt in Markdown-Dateien. **Keine Programmierkenntnisse erforderlich** - beschreiben Sie einfach in natürlicher Sprache, was Sie möchten, und die KI erstellt den Workflow für Sie.

![Visueller Workflow-Editor](docs/images/visual_workflow.png)

## AI-gestützte Workflow- & Skill-Erstellung

**Sie müssen keine YAML-Syntax oder Node-Typen lernen.** Beschreiben Sie Ihren Workflow einfach in natürlicher Sprache:

1. Öffnen Sie den **Workflow**-Tab in der Plugin-Seitenleiste
2. Wählen Sie **+ New (AI)** aus dem Dropdown
3. Beschreiben Sie, was Sie möchten: *"Erstelle einen Workflow, der die ausgewählte Notiz zusammenfasst und in einem Zusammenfassungsordner speichert"*
4. Aktivieren Sie **„Als Agent-Skill erstellen"**, wenn Sie statt eines eigenständigen Workflows einen Agent-Skill erstellen möchten
5. Klicken Sie auf **Generate** - die KI erstellt den kompletten Workflow

![Workflow mit KI erstellen](docs/images/create_workflow_with_ai.png)

**Bestehende Workflows auf die gleiche Weise ändern:**
1. Laden Sie einen beliebigen Workflow
2. Klicken Sie auf die Schaltfläche **AI Modify**
3. Beschreiben Sie die Änderungen: *"Füge einen Schritt hinzu, um die Zusammenfassung ins Japanische zu übersetzen"*
4. Überprüfen und anwenden


## Verfügbare Node-Typen

24 Node-Typen stehen für die Workflow-Erstellung zur Verfügung:

| Kategorie | Nodes |
|-----------|-------|
| Variablen | `variable`, `set` |
| Steuerung | `if`, `while` |
| LLM | `command` |
| Daten | `http`, `json`, `script` |
| Notizen | `note`, `note-read`, `note-search`, `note-list`, `folder-list`, `open` |
| Dateien | `file-explorer`, `file-save` |
| Eingaben | `prompt-file`, `prompt-selection`, `dialog` |
| Komposition | `workflow` |
| Extern | `mcp`, `obsidian-command` |
| Dienstprogramm | `sleep` |

> **Für detaillierte Node-Spezifikationen und Beispiele siehe [WORKFLOW_NODES_de.md](docs/WORKFLOW_NODES_de.md)**

## Tastenkürzel-Modus

Weisen Sie Tastenkürzel zu, um Workflows sofort auszuführen:

1. Fügen Sie ein `name:`-Feld zu Ihrem Workflow hinzu
2. Öffnen Sie die Workflow-Datei und wählen Sie den Workflow aus dem Dropdown
3. Klicken Sie auf das Tastatur-Symbol (⌨️) in der Workflow-Panel-Fußzeile
4. Gehen Sie zu Einstellungen → Tastenkürzel → suchen Sie "Workflow: [Ihr Workflow-Name]"
5. Weisen Sie ein Tastenkürzel zu (z.B. `Ctrl+Shift+T`)

Bei Auslösung durch Tastenkürzel:
- `prompt-file` verwendet automatisch die aktive Datei (kein Dialog)
- `prompt-selection` verwendet die aktuelle Auswahl, oder den gesamten Dateiinhalt, wenn keine Auswahl vorhanden ist

## Ereignis-Trigger

Workflows können automatisch durch Obsidian-Ereignisse ausgelöst werden:

![Ereignis-Trigger-Einstellungen](docs/images/event_setting.png)

| Ereignis | Beschreibung |
|----------|--------------|
| File Created | Wird ausgelöst, wenn eine neue Datei erstellt wird |
| File Modified | Wird ausgelöst, wenn eine Datei gespeichert wird (entprellt 5s) |
| File Deleted | Wird ausgelöst, wenn eine Datei gelöscht wird |
| File Renamed | Wird ausgelöst, wenn eine Datei umbenannt wird |
| File Opened | Wird ausgelöst, wenn eine Datei geöffnet wird |

**Ereignis-Trigger einrichten:**
1. Fügen Sie ein `name:`-Feld zu Ihrem Workflow hinzu
2. Öffnen Sie die Workflow-Datei und wählen Sie den Workflow aus dem Dropdown
3. Klicken Sie auf das Blitz-Symbol (⚡) in der Workflow-Panel-Fußzeile
4. Wählen Sie, welche Ereignisse den Workflow auslösen sollen
5. Fügen Sie optional einen Dateimusterfilter hinzu

**Dateimuster-Beispiele:**
- `**/*.md` - Alle Markdown-Dateien in jedem Ordner
- `journal/*.md` - Markdown-Dateien nur im Journal-Ordner
- `*.md` - Markdown-Dateien nur im Stammordner
- `**/{daily,weekly}/*.md` - Dateien in Daily- oder Weekly-Ordnern
- `projects/[a-z]*.md` - Dateien, die mit Kleinbuchstaben beginnen

**Ereignis-Variablen:** Bei Auslösung durch ein Ereignis werden diese Variablen automatisch gesetzt:

| Variable | Beschreibung |
|----------|--------------|
| `_eventType` | Ereignistyp: `create`, `modify`, `delete`, `rename`, `file-open` |
| `_eventFilePath` | Pfad der betroffenen Datei |
| `_eventFile` | JSON mit Dateiinformationen (path, basename, name, extension) |
| `_eventFileContent` | Dateiinhalt (für create/modify/file-open-Ereignisse) |
| `_eventOldPath` | Vorheriger Pfad (nur für Umbenennungs-Ereignisse) |

> **Hinweis:** `prompt-file`- und `prompt-selection`-Nodes verwenden automatisch die Ereignis-Datei, wenn sie durch Ereignisse ausgelöst werden. `prompt-selection` verwendet den gesamten Dateiinhalt als Auswahl.

---

# Allgemeines

## Unterstützte Modelle

### Gemini

| Modell | Beschreibung |
|--------|--------------|
| Gemini 3.1 Pro Preview | Neuestes Flaggschiff-Modell, 1M Kontext (empfohlen) |
| Gemini 3.1 Pro Preview (Custom Tools) | Optimiert für agentische Workflows mit benutzerdefinierten Tools und Bash |
| Gemini 3 Flash Preview | Schnelles Modell, 1M Kontext, bestes Preis-Leistungs-Verhältnis |
| Gemini 3.1 Flash Lite Preview | Kostengünstigstes Modell mit hoher Leistung |
| Gemini 2.5 Flash | Schnelles Modell, 1M Kontext |
| Gemini 2.5 Pro | Pro-Modell, 1M Kontext |
| Gemini 3 Pro (Image) | Pro-Bildgenerierung, 4K |
| Gemini 3.1 Flash (Image) | Schnelle, kostengünstige Bildgenerierung |
| Gemma 4 | Kostenlos, Function Calling und RAG/Web Search sind gegenseitig exklusiv |

> **Thinking-Modus:** Im Chat wird der Thinking-Modus durch Schlüsselwörter wie „nachdenken", „analysieren" oder „überlegen" in Ihrer Nachricht aktiviert. **Gemini 3.1 Pro** verwendet jedoch immer den Thinking-Modus, unabhängig von Schlüsselwörtern — dieses Modell unterstützt das Deaktivieren von Thinking nicht.

**Always Think-Umschalter:**

Sie können den Thinking-Modus für Flash-Modelle erzwingen, ohne Schlüsselwörter zu verwenden. Klicken Sie auf das Database-Symbol (📦), um das Tool-Menü zu öffnen, und aktivieren Sie die Umschalter unter **Always Think**:

- **Flash** — Standardmäßig AUS. Aktivieren, um Thinking für Flash-Modelle immer einzuschalten.
- **Flash Lite** — Standardmäßig EIN. Flash Lite hat mit aktiviertem Thinking minimale Kosten- und Geschwindigkeitsunterschiede, daher wird empfohlen, dies eingeschaltet zu lassen.

Wenn ein Umschalter EIN ist, ist Thinking für diese Modellfamilie immer aktiv, unabhängig vom Nachrichteninhalt. Wenn AUS, wird die vorhandene schlüsselwortbasierte Erkennung verwendet.

![Always Think Settings](docs/images/setting_thinking.png)

### OpenAI

| Modell | Beschreibung |
|--------|--------------|
| GPT-5.4 | Neuestes Flaggschiff-Modell |
| GPT-5.4-mini | Kostengünstiges Mittelklasse-Modell |
| GPT-5.4-nano | Leichtes, schnelles Modell |
| O3 | Reasoning-Modell |
| DALL-E 3 / DALL-E 2 | Bildgenerierung |

### Anthropic

| Modell | Beschreibung |
|--------|--------------|
| Claude Opus 4.6 | Leistungsfähigstes Modell, erweitertes Thinking |
| Claude Sonnet 4.6 | Ausgewogene Leistung und Kosten |
| Claude Haiku 4.5 | Schnelles, leichtes Modell |

### OpenRouter / Grok / Custom

Konfigurieren Sie jeden OpenAI-kompatiblen Endpunkt mit benutzerdefinierter Base-URL und Modellen. OpenRouter bietet Zugriff auf Hunderte von Modellen verschiedener Anbieter.

### Lokales LLM

Verbinden Sie sich mit lokal laufenden Modellen über Ollama, LM Studio, vLLM oder AnythingLLM. Modelle werden automatisch vom laufenden Server erkannt.

## Installation

### BRAT (Empfohlen)
1. Installieren Sie das [BRAT](https://github.com/TfTHacker/obsidian42-brat)-Plugin
2. Öffnen Sie BRAT-Einstellungen → "Add Beta plugin"
3. Geben Sie ein: `https://github.com/takeshy/obsidian-llm-hub`
4. Aktivieren Sie das Plugin in den Community-Plugin-Einstellungen

### Manuell
1. Laden Sie `main.js`, `manifest.json`, `styles.css` von den Releases herunter
2. Erstellen Sie einen `llm-hub`-Ordner in `.obsidian/plugins/`
3. Kopieren Sie die Dateien und aktivieren Sie in den Obsidian-Einstellungen

### Aus dem Quellcode
```bash
git clone https://github.com/takeshy/obsidian-llm-hub
cd obsidian-llm-hub
npm install
npm run build
```

## Konfiguration

### API-Anbieter

Fügen Sie einen oder mehrere API-Anbieter in den Plugin-Einstellungen hinzu. Jeder Anbieter hat seinen eigenen API-Schlüssel und eine eigene Modellauswahl.

| Anbieter | API-Schlüssel erhalten |
|----------|------------------------|
| Gemini | [ai.google.dev](https://ai.google.dev) |
| OpenAI | [platform.openai.com](https://platform.openai.com) |
| Anthropic | [console.anthropic.com](https://console.anthropic.com) |
| OpenRouter | [openrouter.ai](https://openrouter.ai) |
| Grok | [console.x.ai](https://console.x.ai) |

Sie können auch benutzerdefinierte OpenAI-kompatible Endpunkte hinzufügen.

![Grundeinstellungen](docs/images/setting_basic.png)

### Lokales LLM

Verbinden Sie sich mit lokal laufenden LLM-Servern:

1. Starten Sie Ihren lokalen Server (Ollama, LM Studio, vLLM oder AnythingLLM)
2. Geben Sie die Server-URL in den Plugin-Einstellungen ein
3. Klicken Sie auf "Verify", um verfügbare Modelle zu erkennen

> [!NOTE]
> Lokale LLMs unterstützen kein Function Calling (Vault-Tools). Verwenden Sie Workflows für Notiz-Operationen.

### CLI-Modus (Gemini / Claude / Codex)

**Gemini CLI:**
1. Installieren Sie [Gemini CLI](https://github.com/google-gemini/gemini-cli)
2. Authentifizieren Sie sich mit `gemini` → `/auth`
3. Klicken Sie auf "Verify" im Gemini CLI-Bereich

**Claude CLI:**
1. Installieren Sie [Claude Code](https://github.com/anthropics/claude-code): `npm install -g @anthropic-ai/claude-code`
2. Authentifizieren Sie sich mit `claude`
3. Klicken Sie auf "Verify" im Claude CLI-Bereich

**Codex CLI:**
1. Installieren Sie [Codex CLI](https://github.com/openai/codex): `npm install -g @openai/codex`
2. Authentifizieren Sie sich mit `codex`
3. Klicken Sie auf "Verify" im Codex CLI-Bereich

**CLI-Einschränkungen:** Keine Vault-Tool-Unterstützung, keine Websuche, nur Desktop

> [!NOTE]
> **Nur-CLI-Nutzung:** Sie können den CLI-Modus ohne API-Schlüssel verwenden. Installieren und verifizieren Sie einfach ein CLI-Tool.

**Benutzerdefinierter CLI-Pfad:** Wenn die automatische CLI-Erkennung fehlschlägt, klicken Sie auf das Zahnradsymbol (⚙️) neben der Verify-Schaltfläche, um den CLI-Pfad manuell anzugeben. Das Plugin durchsucht automatisch gängige Installationspfade, einschließlich Versions-Manager (nodenv, nvm, volta, fnm, asdf, mise).

<details>
<summary><b>Windows: So finden Sie den CLI-Pfad</b></summary>

Lassen Sie das CLI-Pfad-Feld leer und klicken Sie auf **Verify** — das Plugin erkennt die npm-global-Installation automatisch (prüft `%APPDATA%\npm\node_modules`, `%PROGRAMFILES%\nodejs\node_modules` und PATH-basierte Verzeichnisse) und führt den echten `.js`-Einstiegspunkt über `node` aus. Claudes Standalone-Installation unter `%LOCALAPPDATA%\Programs\claude\claude.exe` wird ebenfalls automatisch erkannt.

Setzen Sie einen Custom CLI-Pfad nur, wenn die Auto-Erkennung fehlschlägt. Die folgenden Optionen funktionieren alle (von sicher zu weniger sicher):

1. **`.js`-Skript (empfohlen)** — z.B. `C:\Users\YourName\AppData\Roaming\npm\node_modules\@google\gemini-cli\dist\index.js`. Wird über `node` ausgeführt (kein `cmd.exe` beteiligt).
2. **`.exe`-Datei** — z.B. `C:\Users\YourName\AppData\Local\Programs\claude\claude.exe`. Wird direkt ausgeführt.
3. **`.cmd` / `.bat`-Wrapper** — z.B. `C:\Users\YourName\AppData\Roaming\npm\gemini.cmd`. Muss durch `cmd.exe`, daher können Prompts mit `&`, `|`, `>`, `^` oder `%VAR%` Fehlverhalten zeigen.

Verwenden Sie in PowerShell `Get-Command gemini` / `Get-Command claude` / `Get-Command codex`, um den Wrapper-Pfad zu finden; geben Sie ihn direkt ein (Option 3) oder navigieren Sie zum benachbarten `.js` / `.exe` für die sichereren Optionen.
</details>

<details>
<summary><b>macOS / Linux: So finden Sie den CLI-Pfad</b></summary>

1. Öffnen Sie ein Terminal und führen Sie aus:
   ```bash
   which gemini
   ```
2. Geben Sie den angezeigten Pfad (z.B. `/home/user/.local/bin/gemini`) in den CLI-Pfad-Einstellungen ein

Für Claude CLI verwenden Sie `which claude`. Für Codex CLI verwenden Sie `which codex`.

**Node.js Versions-Manager:** Bei Verwendung von nodenv, nvm, volta, fnm, asdf oder mise erkennt das Plugin die Node-Binary automatisch. Falls die Erkennung fehlschlägt, geben Sie den CLI-Skriptpfad direkt an (z.B. `~/.npm-global/lib/node_modules/@google/gemini-cli/dist/index.js`).
</details>

> [!TIP]
> **Claude CLI-Tipp:** Chat-Sitzungen von LLM Hub werden lokal gespeichert. Sie können Gespräche außerhalb von Obsidian fortsetzen, indem Sie `claude --resume` in Ihrem Vault-Verzeichnis ausführen, um vergangene Sitzungen anzuzeigen und fortzusetzen.

### Workspace-Einstellungen
- **Workspace Folder** - Speicherort für Chat-Verlauf und Einstellungen
- **System Prompt** - Zusätzliche KI-Anweisungen
- **Tool Limits** - Steuerung der Function-Call-Limits
- **Edit History** - Verfolgen und Wiederherstellen von KI-Änderungen

![Tool-Limits & Bearbeitungsverlauf](docs/images/setting_tool_history.png)

### Verschlüsselung

Schützen Sie Ihren Chat-Verlauf und Workflow-Ausführungsprotokolle separat mit Passwort.

**Einrichtung:**

1. Legen Sie ein Passwort in den Plugin-Einstellungen fest (sicher gespeichert mittels Public-Key-Kryptographie)

![Initiale Verschlüsselungseinrichtung](docs/images/setting_initial_encryption.png)

2. Nach der Einrichtung aktivieren Sie die Verschlüsselung für jeden Protokolltyp:
   - **AI-Chat-Verlauf verschlüsseln** - Verschlüsselt Chat-Konversationsdateien
   - **Workflow-Ausführungsprotokolle verschlüsseln** - Verschlüsselt Workflow-Verlaufsdateien

![Verschlüsselungseinstellungen](docs/images/setting_encryption.png)

Jede Einstellung kann unabhängig aktiviert/deaktiviert werden.

**Funktionen:**
- **Separate Steuerung** - Wählen Sie, welche Protokolle verschlüsselt werden sollen (Chat, Workflow oder beide)
- **Automatische Verschlüsselung** - Neue Dateien werden beim Speichern basierend auf den Einstellungen verschlüsselt
- **Passwort-Caching** - Passwort einmal pro Sitzung eingeben
- **Dedizierter Viewer** - Verschlüsselte Dateien öffnen sich in einem sicheren Editor mit Vorschau
- **Entschlüsselungsoption** - Verschlüsselung bei Bedarf von einzelnen Dateien entfernen

**Funktionsweise:**

```
[Setup - einmalig bei Passwortvergabe]
Passwort → Schlüsselpaar generieren (RSA) → Privaten Schlüssel verschlüsseln → In Einstellungen speichern

[Verschlüsselung - pro Datei]
Dateiinhalt → Mit neuem AES-Schlüssel verschlüsseln → AES-Schlüssel mit öffentlichem Schlüssel verschlüsseln
→ In Datei speichern: verschlüsselte Daten + verschlüsselter privater Schlüssel (aus Einstellungen) + Salt

[Entschlüsselung]
Passwort + Salt → Privaten Schlüssel wiederherstellen → AES-Schlüssel entschlüsseln → Inhalt entschlüsseln
```

- Schlüsselpaar wird einmalig generiert (RSA-Generierung ist langsam), AES-Schlüssel wird pro Datei generiert
- Jede Datei speichert: verschlüsselten Inhalt + verschlüsselten privaten Schlüssel (aus Einstellungen kopiert) + Salt
- Dateien sind eigenständig — nur mit Passwort entschlüsselbar, keine Plugin-Abhängigkeit

<details>
<summary>Python-Entschlüsselungsskript (zum Erweitern klicken)</summary>

```python
#!/usr/bin/env python3
"""LLM Hub verschlüsselte Dateien ohne Plugin entschlüsseln."""
import base64, sys, re, getpass
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.asymmetric import padding

def decrypt_file(filepath: str, password: str) -> str:
    with open(filepath, 'r') as f:
        content = f.read()

    match = re.match(r'^---\n([\s\S]*?)\n---\n([\s\S]*)$', content)
    if not match:
        raise ValueError("Ungültiges verschlüsseltes Dateiformat")

    frontmatter, encrypted_data = match.groups()
    key_match = re.search(r'key:\s*(.+)', frontmatter)
    salt_match = re.search(r'salt:\s*(.+)', frontmatter)
    if not key_match or not salt_match:
        raise ValueError("Key oder Salt fehlt im Frontmatter")

    enc_private_key = base64.b64decode(key_match.group(1).strip())
    salt = base64.b64decode(salt_match.group(1).strip())
    data = base64.b64decode(encrypted_data.strip())

    kdf = PBKDF2HMAC(algorithm=hashes.SHA256(), length=32, salt=salt, iterations=100000)
    derived_key = kdf.derive(password.encode())

    iv, enc_priv = enc_private_key[:12], enc_private_key[12:]
    private_key_pem = AESGCM(derived_key).decrypt(iv, enc_priv, None)
    private_key = serialization.load_der_private_key(base64.b64decode(private_key_pem), None)

    key_len = (data[0] << 8) | data[1]
    enc_aes_key = data[2:2+key_len]
    content_iv = data[2+key_len:2+key_len+12]
    enc_content = data[2+key_len+12:]

    aes_key = private_key.decrypt(enc_aes_key, padding.OAEP(
        mgf=padding.MGF1(algorithm=hashes.SHA256()), algorithm=hashes.SHA256(), label=None))

    return AESGCM(aes_key).decrypt(content_iv, enc_content, None).decode('utf-8')

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(f"Verwendung: {sys.argv[0]} <verschlüsselte_datei>")
        sys.exit(1)
    password = getpass.getpass("Passwort: ")
    print(decrypt_file(sys.argv[1], password))
```

Benötigt: `pip install cryptography`

</details>

> **Warnung:** Wenn Sie Ihr Passwort vergessen, können verschlüsselte Dateien nicht wiederhergestellt werden. Bewahren Sie Ihr Passwort sicher auf.

> **Tipp:** Um alle Dateien in einem Verzeichnis auf einmal zu verschlüsseln, verwenden Sie einen Workflow. Siehe das Beispiel "Alle Dateien in einem Verzeichnis verschlüsseln" in [WORKFLOW_NODES_de.md](docs/WORKFLOW_NODES_de.md#obsidian-command).

![Dateiverschlüsselungs-Workflow](docs/images/enc.png)

**Sicherheitsvorteile:**
- **Geschützt vor AI-Chat** - Verschlüsselte Dateien können nicht von AI-Vault-Operationen (`read_note`-Tool) gelesen werden. Dies schützt sensible Daten wie API-Schlüssel vor versehentlicher Offenlegung während des Chats.
- **Workflow-Zugriff mit Passwort** - Workflows können verschlüsselte Dateien mit dem `note-read`-Knoten lesen. Beim Zugriff erscheint ein Passwort-Dialog, und das Passwort wird für die Sitzung zwischengespeichert.
- **Geheimnisse sicher speichern** - Anstatt API-Schlüssel direkt in Workflows zu schreiben, speichern Sie sie in verschlüsselten Dateien. Der Workflow liest den Schlüssel zur Laufzeit nach der Passwortverifizierung.

### Semantische Suche (RAG)

Lokale vektorbasierte Suche, die relevante Vault-Inhalte in LLM-Konversationen einfügt. Kein externer RAG-Server erforderlich — Embeddings werden lokal generiert und gespeichert.

**Einrichtung:**

1. Gehen Sie zu Einstellungen → RAG-Bereich
2. Erstellen Sie eine neue RAG-Einstellung (klicken Sie auf `+`)
3. Embedding konfigurieren:
   - **Standard (Gemini):** Lassen Sie die Embedding Base URL leer — verwendet die Gemini Embedding API mit Ihrem Gemini API-Schlüssel
   - **Benutzerdefinierter Server (Ollama etc.):** Setzen Sie die Embedding Base URL und wählen Sie ein Modell
4. Klicken Sie auf **Sync**, um den Vektorindex aus Ihrem Vault aufzubauen
5. Wählen Sie die RAG-Einstellung im Dropdown aus, um sie zu aktivieren

| Einstellung | Beschreibung | Standard |
|-------------|-------------|----------|
| **Embedding Base URL** | Benutzerdefinierte Embedding-Server-URL (leer = Gemini API) | leer |
| **Embedding API Key** | API-Schlüssel für benutzerdefinierten Server (leer = Gemini-Schlüssel) | leer |
| **Embedding Model** | Modellname für Embedding-Generierung | `gemini-embedding-2-preview` |
| **Chunk Size** | Zeichen pro Chunk | 500 |
| **Chunk Overlap** | Überlappung zwischen Chunks | 100 |
| **PDF-Seitenanzahl pro Chunk** | Anzahl der PDF-Seiten pro Embedding-Chunk (1–6) | 6 |
| **Top K** | Maximale Chunks pro Abfrage | 5 |
| **Score Threshold** | Minimaler Ähnlichkeitswert (0,0–1,0) für Ergebnisse | 0.5 |
| **Target Folders** | Indexierung auf bestimmte Ordner beschränken (leer = alle) | leer |
| **Exclude Patterns** | Regex-Muster zum Ausschließen von Dateien bei der Indexierung | leer |

> **Multimodale Indexierung** (Bilder, PDFs, Audio, Video) wird automatisch aktiviert, wenn Gemini-native Embedding-Modelle (`gemini-embedding-*`) verwendet werden. Keine manuelle Konfiguration erforderlich.

**Externer Index:**

Verwenden Sie einen vorgefertigten Index anstelle der Synchronisation aus dem Vault:

1. Aktivieren Sie den Schalter **Use external index**
2. Setzen Sie den absoluten Pfad zu einem Verzeichnis mit `index.json` und `vectors.bin`
3. Optional: Embedding Base URL für Query-Embedding setzen (leer = Gemini API)
4. Das Embedding-Modell wird automatisch aus der Indexdatei erkannt

**Funktionsweise:** Wenn RAG aktiv ist, löst jede Chat-Nachricht eine lokale Vektorsuche aus. Relevante Chunks werden als Kontext in den System-Prompt eingefügt. Quellen werden in der Chat-Oberfläche angezeigt — klicken Sie, um die referenzierte Notiz zu öffnen.

### RAG Such-Tab

Der **RAG Search**-Tab bietet eine dedizierte Oberfläche zum Suchen, Filtern, Bearbeiten und Senden von RAG-Ergebnissen an Chat oder Discussion.

![RAG Search](docs/images/rag-search.png)

- **Semantische Suche** mit einstellbarem Top K und Score-Schwellenwert
- **Stichwortfilter** zum Eingrenzen der Ergebnisse nach der Suche
- **Chunk-Editor** mit Laden benachbarter Chunks (vorheriger/nächster) und Überlappungsentfernung
- **An Chat oder Discussion senden** — ausgewählte Ergebnisse werden zu bearbeitbaren Anhängen
- **Indexeinstellungen** (Zahnrad-Symbol) — Chunk-Größe, Überlappung, Zielordner, Synchronisierung und mehr konfigurieren

> Weitere Details finden Sie in der [RAG Search Dokumentation](docs/RAG_SEARCH.md) ([日本語](docs/RAG_SEARCH_ja.md) | [中文](docs/RAG_SEARCH_zh.md) | [한국어](docs/RAG_SEARCH_ko.md) | [Français](docs/RAG_SEARCH_fr.md) | [Deutsch](docs/RAG_SEARCH_de.md) | [Español](docs/RAG_SEARCH_es.md) | [Português](docs/RAG_SEARCH_pt.md) | [Italiano](docs/RAG_SEARCH_it.md))

### AI Discussion

Der **Discussion**-Tab bietet eine Multi-Modell-Debattenarena, in der mehrere KI-Modelle ein Thema parallel diskutieren, Schlussfolgerungen ziehen und über die beste Antwort abstimmen.

![AI Discussion](docs/images/ai-discussion.png)

**So funktioniert es:**

1. Öffnen Sie den **Discussion**-Tab
2. Geben Sie ein Diskussionsthema ein
3. Fügen Sie Teilnehmer hinzu — wählen Sie ein beliebiges verfügbares Modell (API, CLI, Local LLM) oder User
4. Weisen Sie den Teilnehmern optional Rollen zu (z.B. "Befürworter", "Kritiker")
5. Legen Sie die Anzahl der Runden fest
6. Klicken Sie auf **Start Discussion**

![Discussion Setup](docs/images/ai-discussion-start.png)

**Diskussionsablauf:**

1. **Diskussionsrunden** — Alle Teilnehmer antworten parallel. Jede Runde baut auf vorherigen Antworten auf.
2. **Schlussfolgerung** — In der letzten Runde gibt jeder Teilnehmer seine Schlussfolgerung ab.
3. **Abstimmung** — Abstimmungsteilnehmer bewerten alle Schlussfolgerungen und stimmen für die beste ab.
4. **Ergebnis** — Der Gewinner (oder Unentschieden) wird bekannt gegeben. Speichern Sie das vollständige Transkript als Markdown-Notiz.

![Voting Results](docs/images/ai-discussion-voting.png)

**Funktionen:**

- **Jedes Modell als Teilnehmer** — Mischen Sie Modelle frei (z.B. Gemini vs Claude vs GPT)
- **Benutzerteilnahme** — Fügen Sie sich selbst als Teilnehmer oder Abstimmender für Human-in-the-Loop-Diskussionen hinzu
- **Rollenzuweisung** — Geben Sie jedem Teilnehmer eine Perspektive (z.B. "Optimist", "Skeptiker")
- **Separate Abstimmungsteilnehmer** — Abstimmungsteilnehmer werden automatisch von den Diskussionsteilnehmern synchronisiert, können aber unabhängig angepasst werden
- **Persistente Konfiguration** — Teilnehmer und Abstimmende werden sitzungsübergreifend gespeichert und wiederhergestellt
- **Einstellungs-Modal** — Klicken Sie auf das Zahnrad-Symbol, um System-Prompt, Schlussfolgerungs-Prompt, Abstimmungs-Prompt, Ausgabeordner und Standard-Runden zu konfigurieren
- **Als Notiz speichern** — Exportieren Sie die vollständige Diskussion (Runden, Schlussfolgerungen, Abstimmungen, Gewinner) als Markdown-Datei

### Slash-Befehle
- Benutzerdefinierte Prompt-Vorlagen definieren, die mit `/` ausgelöst werden
- Optionale Modell- und Suchüberschreibung pro Befehl

![Slash-Befehle](docs/images/setting_slash_command.png)

## Anforderungen

- Obsidian v0.15.0+
- Mindestens eines von: API-Schlüssel (Gemini, OpenAI, Anthropic, OpenRouter, Grok), lokaler LLM-Server oder CLI-Tool
- Nur Desktop (für Mobilgeräte siehe [Gemini Helper](https://github.com/takeshy/obsidian-gemini-helper))

## Datenschutz

**Lokal gespeicherte Daten:**
- API-Schlüssel (in Obsidian-Einstellungen gespeichert)
- Chat-Verlauf (als Markdown-Dateien, optional verschlüsselt)
- Workflow-Ausführungsverlauf (optional verschlüsselt)
- RAG-Vektorindex (im Workspace-Ordner gespeichert)
- Verschlüsselungsschlüssel (privater Schlüssel mit Ihrem Passwort verschlüsselt)

**An LLM-Anbieter gesendete Daten:**
- Chat-Nachrichten und Dateianhänge werden an den konfigurierten API-Anbieter gesendet (Gemini, OpenAI, Anthropic, OpenRouter, Grok oder benutzerdefinierter Endpunkt)
- Bei aktivierter Websuche (nur Gemini) werden Anfragen an Google Search gesendet
- Lokale LLM-Anbieter senden Daten nur an Ihren lokalen Server

**An Drittanbieter gesendete Daten:**
- Workflow-`http`-Nodes können Daten an jede im Workflow angegebene URL senden

**CLI-Anbieter (optional):**
- Bei aktiviertem CLI-Modus werden externe CLI-Tools (gemini, claude, codex) über child_process ausgeführt
- Dies geschieht nur, wenn es vom Benutzer explizit konfiguriert und verifiziert wurde
- Der CLI-Modus führt externe CLI-Tools über child_process aus

**Discord Bot (optional):**
- Bei Aktivierung verbindet sich das Plugin über WebSocket Gateway mit Discord und sendet Benutzernachrichten an den konfigurierten LLM-Anbieter
- Das Bot-Token wird in den Obsidian-Einstellungen gespeichert
- Nachrichteninhalte aus Discord-Kanälen werden vom LLM verarbeitet — konfigurieren Sie erlaubte Kanäle/Benutzer, um den Zugriff einzuschränken

**MCP-Server (optional):**
- MCP-Server (Model Context Protocol) können in den Plugin-Einstellungen für Workflow-`mcp`-Nodes konfiguriert werden
- MCP-Server sind externe Dienste, die zusätzliche Tools und Funktionen bereitstellen

**Sicherheitshinweise:**
- Überprüfen Sie Workflows vor der Ausführung - `http`-Nodes können Vault-Daten an externe Endpunkte übertragen
- Workflow-`note`-Nodes zeigen standardmäßig einen Bestätigungsdialog vor dem Schreiben von Dateien
- Slash-Befehle mit `confirmEdits: false` wenden Dateiänderungen automatisch an, ohne Anwenden/Verwerfen-Schaltflächen anzuzeigen
- Sensible Anmeldedaten: Speichern Sie API-Schlüssel oder Tokens nicht direkt im Workflow-YAML (`http`-Header, `mcp`-Einstellungen usw.). Speichern Sie diese stattdessen in verschlüsselten Dateien und verwenden Sie den `note-read`-Node, um sie zur Laufzeit abzurufen. Workflows können verschlüsselte Dateien mit Passwortabfrage lesen.

Siehe die Nutzungsbedingungen des jeweiligen Anbieters für Datenaufbewahrungsrichtlinien.

## Lizenz

MIT

## Links

- [Gemini API-Dokumentation](https://ai.google.dev/docs)
- [OpenAI API-Dokumentation](https://platform.openai.com/docs)
- [Anthropic API-Dokumentation](https://docs.anthropic.com)
- [OpenRouter-Dokumentation](https://openrouter.ai/docs)
- [Ollama](https://ollama.com)
- [Obsidian Plugin-Dokumentation](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)

## Unterstützung

Wenn Sie dieses Plugin nützlich finden, spendieren Sie mir einen Kaffee!

[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-support-yellow?logo=buymeacoffee)](https://buymeacoffee.com/takeshy)
