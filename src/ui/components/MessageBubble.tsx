import { useState, useEffect, useRef, useCallback } from "react";
import { type App, MarkdownRenderer, Component, Notice, Platform } from "obsidian";
import Copy from "lucide-react/dist/esm/icons/copy";
import Check from "lucide-react/dist/esm/icons/check";
import CheckCircle from "lucide-react/dist/esm/icons/check-circle";
import XCircle from "lucide-react/dist/esm/icons/x-circle";
import Download from "lucide-react/dist/esm/icons/download";
import Eye from "lucide-react/dist/esm/icons/eye";
import type { Message, ToolCall } from "src/types";
import { isApiProviderModel } from "src/types";
import { HTMLPreviewModal, extractHtmlFromCodeBlock } from "./HTMLPreviewModal";
import { McpAppRenderer } from "./McpAppRenderer";
import { t } from "src/i18n";
import { formatError } from "src/utils/error";

interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
  sourceFileName?: string | null;
  onApplyEdit?: () => Promise<void>;
  onDiscardEdit?: () => void;
  app: App;
}

export default function MessageBubble({
  message,
  isStreaming,
  sourceFileName,
  onApplyEdit,
  onDiscardEdit,
  app,
}: MessageBubbleProps) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);
  const [expandedMcpApps, setExpandedMcpApps] = useState<Set<number>>(new Set());
  const contentRef = useRef<HTMLDivElement>(null);
  const componentRef = useRef<Component | null>(null);
  const editStatuses = message.pendingEdits ?? (message.pendingEdit ? [message.pendingEdit] : []);
  const deleteStatuses = message.pendingDeletes ?? (message.pendingDelete ? [message.pendingDelete] : []);
  const renameStatuses = message.pendingRenames ?? (message.pendingRename ? [message.pendingRename] : []);

  // Toggle MCP App expansion
  const toggleMcpAppExpand = useCallback((index: number) => {
    setExpandedMcpApps(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  // Render markdown content using Obsidian's MarkdownRenderer
  useEffect(() => {
    if (!contentRef.current) return;

    // Clear previous content
    contentRef.current.empty();

    // Create a new Component for managing child components
    if (componentRef.current) {
      componentRef.current.unload();
    }
    componentRef.current = new Component();
    componentRef.current.load();

    // Render markdown
    void MarkdownRenderer.render(
      app,
      message.content,
      contentRef.current,
      "/",
      componentRef.current
    ).then(() => {
      // Add click handlers for internal links
      const container = contentRef.current;
      if (!container) return;

      container.querySelectorAll("a.internal-link").forEach((link) => {
        link.addEventListener("click", (e) => {
          e.preventDefault();
          const href = link.getAttribute("href");
          if (href) {
            void app.workspace.openLinkText(href, "", false);
          }
        });
      });

      // Handle external links
      container.querySelectorAll("a.external-link").forEach((link) => {
        link.addEventListener("click", (e) => {
          e.preventDefault();
          const href = link.getAttribute("href");
          if (href) {
            window.open(href, "_blank");
          }
        });
      });
    });

    return () => {
      if (componentRef.current) {
        componentRef.current.unload();
        componentRef.current = null;
      }
    };
  }, [message.content, app]);

  // Get model display name
  const getModelDisplayName = () => {
    if (isUser) return t("message.you");
    if (!message.model) return t("message.assistant");
    // Strip "api:" prefix for display
    if (isApiProviderModel(message.model)) {
      return message.model.slice(4); // Remove "api:" prefix
    }
    return message.model;
  };

  // Convert tool call to display info
  const getToolDisplayInfo = (toolName: string): { icon: string; label: string } => {
    // Handle MCP tools (format: mcp_{serverName}_{toolName})
    if (toolName.startsWith("mcp_")) {
      const parts = toolName.split("_");
      // Remove "mcp" prefix and extract server name and tool name
      if (parts.length >= 3) {
        const serverName = parts[1];
        const mcpToolName = parts.slice(2).join("_");
        return { icon: "🔌", label: `${serverName}:${mcpToolName}` };
      }
      return { icon: "🔌", label: toolName.replace("mcp_", "") };
    }

    const toolDisplayMap: Record<string, { icon: string; label: string }> = {
      read_note: { icon: "📖", label: t("tool.read") },
      create_note: { icon: "📝", label: t("tool.created") },
      update_note: { icon: "✏️", label: t("tool.updated") },
      delete_note: { icon: "🗑️", label: t("tool.deleted") },
      rename_note: { icon: "📋", label: t("tool.renamed") },
      search_notes: { icon: "🔍", label: t("tool.searched") },
      list_notes: { icon: "📂", label: t("tool.listed") },
      list_folders: { icon: "📁", label: t("tool.listedFolders") },
      create_folder: { icon: "📁", label: t("tool.createdFolder") },
      get_active_note_info: { icon: "📄", label: t("tool.gotActiveNote") },
      propose_edit: { icon: "✏️", label: t("tool.editing") },
      apply_edit: { icon: "✅", label: t("tool.applied") },
      discard_edit: { icon: "❌", label: t("tool.discarded") },
    };
    return toolDisplayMap[toolName] || { icon: "🔧", label: toolName };
  };

  // Get detail string from tool args for toast
  const getToolDetail = (toolCall: ToolCall): string => {
    const args = toolCall.args;
    const { label } = getToolDisplayInfo(toolCall.name);
    const parts: string[] = [label];

    // Handle MCP tools - show all arguments
    if (toolCall.name.startsWith("mcp_")) {
      const argEntries = Object.entries(args);
      if (argEntries.length > 0) {
        const argStrings = argEntries.map(([key, value]) => {
          if (typeof value === "string") {
            // Truncate long strings
            const displayValue = value.length > 50 ? value.slice(0, 50) + "..." : value;
            return `${key}: "${displayValue}"`;
          } else if (typeof value === "object" && value !== null) {
            return `${key}: ${JSON.stringify(value).slice(0, 50)}...`;
          }
          return `${key}: ${String(value)}`;
        });
        parts.push(argStrings.join(", "));
      }
      return parts.join("\n");
    }

    // Handle built-in tools
    if (args.fileName && typeof args.fileName === "string") {
      parts.push(args.fileName);
    } else if (args.path && typeof args.path === "string") {
      parts.push(args.path);
    } else if (args.name && typeof args.name === "string") {
      parts.push(args.name);
    } else if (typeof args.old_path === "string" && typeof args.new_path === "string") {
      parts.push(args.old_path + " → " + args.new_path);
    } else if (args.query && typeof args.query === "string") {
      parts.push(`"${args.query}"`);
    } else if (args.folder && typeof args.folder === "string") {
      parts.push(args.folder);
    } else if (args.activeNote === true) {
      parts.push("(active note)");
    }

    return parts.join(": ");
  };


  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Failed to copy
    }
  };

  // Copy image to clipboard
  const handleCopyImage = async (mimeType: string, base64Data: string) => {
    try {
      let pngBlob: Blob;

      if (mimeType === "image/png") {
        // Already PNG - convert base64 to blob directly
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        pngBlob = new Blob([byteArray], { type: "image/png" });
      } else {
        // Clipboard API typically only supports image/png
        // Convert image to PNG using canvas
        const img = new Image();
        const loadPromise = new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error("Failed to load image"));
        });
        img.src = `data:${mimeType};base64,${base64Data}`;
        await loadPromise;

        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Failed to get canvas context");
        ctx.drawImage(img, 0, 0);

        pngBlob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error("Failed to convert to PNG"));
          }, "image/png");
        });
      }

      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": pngBlob })
      ]);
      new Notice(t("message.imageCopied"));
    } catch {
      new Notice(t("message.imageCopyFailed"));
    }
  };

  // Download image - vault save on mobile, download on desktop
  const handleDownloadImage = async (mimeType: string, base64Data: string, index: number) => {
    const extension = mimeType.split("/")[1] || "png";
    const fileName = `generated-image-${Date.now()}-${index}.${extension}`;

    if (Platform.isMobile) {
      // Mobile: Save to vault (download doesn't work on mobile)
      try {
        const folderPath = "LLMHub/images";

        // Convert base64 to ArrayBuffer
        const byteCharacters = atob(base64Data);
        const byteArray = new Uint8Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteArray[i] = byteCharacters.charCodeAt(i);
        }

        const folder = app.vault.getAbstractFileByPath(folderPath);
        if (!folder) {
          await app.vault.createFolder(folderPath);
        }

        const filePath = `${folderPath}/${fileName}`;
        await app.vault.createBinary(filePath, byteArray.buffer);

        new Notice(t("message.savedTo", { path: filePath }));
      } catch (error) {
        new Notice(t("message.saveFailed", { error: formatError(error) }));
      }
    } else {
      // PC: Download file
      const link = document.createElement("a");
      link.href = `data:${mimeType};base64,${base64Data}`;
      link.download = fileName;
      link.click();
    }
  };

  // Check for HTML code block
  const htmlContent = extractHtmlFromCodeBlock(message.content);

  const stripControlChars = (value: string): string => {
    let result = "";
    for (let i = 0; i < value.length; i++) {
      const code = value.charCodeAt(i);
      if (code >= 0x20 && code !== 0x7f) {
        result += value[i];
      }
    }
    return result;
  };

  // Sanitize filename to remove characters not allowed in file systems
  const sanitizeFileName = (name: string): string => {
    return stripControlChars(name)
      .replace(/[<>:"/\\|?*]/g, "") // Remove Windows-forbidden chars
      .trim()
      .slice(0, 50) || "output";    // Limit length and provide fallback
  };

  // Get base name for file save
  const getBaseName = () => {
    if (sourceFileName) return sanitizeFileName(sourceFileName);
    // First 10 chars, keeping alphanumeric and Japanese characters
    const raw = message.content.slice(0, 10).replace(/[^a-zA-Z0-9\u3040-\u30ff\u4e00-\u9faf]/g, "") || "output";
    return sanitizeFileName(raw);
  };

  // Preview HTML in modal
  const handlePreviewHtml = () => {
    if (htmlContent) {
      new HTMLPreviewModal(app, htmlContent, getBaseName()).open();
    }
  };

  // Save HTML - vault save on mobile, download on desktop
  const handleSaveHtml = async () => {
    if (!htmlContent) return;

    if (Platform.isMobile) {
      // Mobile: Save as .md file with code block (download doesn't work on mobile)
      try {
        const fileName = `infographic-${getBaseName()}-${Date.now()}.md`;
        const folderPath = "LLMHub/infographics";
        const mdContent = `\`\`\`html\n${htmlContent}\n\`\`\``;

        const folder = app.vault.getAbstractFileByPath(folderPath);
        if (!folder) {
          await app.vault.createFolder(folderPath);
        }

        const filePath = `${folderPath}/${fileName}`;
        await app.vault.create(filePath, mdContent);

        new Notice(t("message.savedTo", { path: filePath }));
      } catch (error) {
        new Notice(t("message.saveFailed", { error: formatError(error) }));
      }
    } else {
      // PC: Download file
      const blob = new Blob([htmlContent], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `infographic-${getBaseName()}-${Date.now()}.html`;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div
      className={`llm-hub-message ${
        isUser ? "llm-hub-message-user" : "llm-hub-message-assistant"
      } ${isStreaming ? "llm-hub-message-streaming" : ""}`}
    >
      <div className="llm-hub-message-header">
        <span className="llm-hub-message-role">
          {getModelDisplayName()}
        </span>
        <span className="llm-hub-message-time">
          {formatTime(message.timestamp)}
        </span>
        {!isStreaming && (
          <button
            className="llm-hub-copy-btn"
            onClick={() => {
              void handleCopy();
            }}
            title={t("message.copyToClipboard")}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
        )}
      </div>

      {/* Web search indicator */}
      {message.webSearchUsed && (
        <div className="llm-hub-rag-used">
          <span className="llm-hub-rag-indicator">
            🌐 {t("message.webSearchUsed")}
          </span>
        </div>
      )}

      {/* Image generation indicator */}
      {message.imageGenerationUsed && (
        <div className="llm-hub-rag-used">
          <span className="llm-hub-rag-indicator">
            🎨 {t("message.imageGenerated")}
          </span>
        </div>
      )}

      {/* Skills used indicator */}
      {message.skillsUsed && message.skillsUsed.length > 0 && (
        <div className="llm-hub-skills-used">
          <span className="llm-hub-skills-indicator">
            ✨ {t("message.skillsUsed")}: {message.skillsUsed.join(", ")}
          </span>
        </div>
      )}

      {/* Semantic search indicator with sources and citations */}
      {message.ragUsed && (
        <div className="llm-hub-rag-used">
          <span className="llm-hub-rag-indicator">
            📚 {t("message.rag")}
          </span>
          {message.ragCitations && message.ragCitations.length > 0 ? (
            <div className="llm-hub-rag-sources">
              {message.ragCitations.map((citation, index) => (
                <div
                  key={index}
                  className="llm-hub-rag-citation llm-hub-tool-clickable"
                  onClick={() => {
                    if (app.vault.getAbstractFileByPath(citation.filePath)) {
                      void app.workspace.openLinkText(citation.filePath, "", false);
                    } else {
                      new Notice(`Source: ${citation.filePath}`, 3000);
                    }
                  }}
                  title={`${citation.filePath} (score: ${citation.score.toFixed(3)})\n${citation.text}`}
                >
                  <span className="llm-hub-rag-citation-file">
                    📄 {citation.filePath.split("/").pop() || citation.filePath}
                    <span className="llm-hub-rag-citation-score">
                      {(citation.score * 100).toFixed(0)}%
                    </span>
                  </span>
                  <span className="llm-hub-rag-citation-text">
                    {citation.text}
                  </span>
                </div>
              ))}
            </div>
          ) : message.ragSources && message.ragSources.length > 0 ? (
            <div className="llm-hub-rag-sources">
              {message.ragSources.map((source, index) => (
                <span
                  key={index}
                  className="llm-hub-rag-source llm-hub-tool-clickable"
                  onClick={() => {
                    if (app.vault.getAbstractFileByPath(source)) {
                      void app.workspace.openLinkText(source, "", false);
                    } else {
                      new Notice(`Source: ${source}`, 3000);
                    }
                  }}
                  title={t("message.clickToOpen", { source })}
                >
                  📄 {source.split("/").pop() || source}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      )}

      {/* Tools used indicator */}
      {message.toolCalls && message.toolCalls.length > 0 && (
        <div className="llm-hub-tools-used">
          {message.toolCalls.map((toolCall, index) => {
            const { icon, label } = getToolDisplayInfo(toolCall.name);
            return (
              <span
                key={index}
                className="llm-hub-tool-indicator llm-hub-tool-clickable"
                onClick={() => new Notice(getToolDetail(toolCall), 3000)}
                title={t("message.clickToSeeDetails")}
              >
                {icon} {label}
              </span>
            );
          })}
        </div>
      )}

      {/* Attachments display */}
      {message.attachments && message.attachments.length > 0 && (
        <div className="llm-hub-attachments">
          {message.attachments.map((attachment, index) => (
            <span key={index} className="llm-hub-attachment">
              {attachment.type === "image" && "🖼️"}
              {attachment.type === "pdf" && "📄"}
              {attachment.type === "text" && "📃"}
              {attachment.type === "audio" && "🎵"}
              {attachment.type === "video" && "🎬"}
              {" "}{attachment.name}
            </span>
          ))}
        </div>
      )}

      {/* Thinking content (collapsible) */}
      {message.thinking && (
        <details className="llm-hub-thinking">
          <summary className="llm-hub-thinking-summary">
            💭 {t("message.thinking")}
          </summary>
          <div className="llm-hub-thinking-content">
            {message.thinking}
          </div>
        </details>
      )}

      <div className="llm-hub-message-content" ref={contentRef} />

      {/* Usage info (tokens, cost, response time) */}
      {!isUser && !isStreaming && (message.usage || message.elapsedMs) && (
        <div className="llm-hub-usage-info">
          {message.elapsedMs !== undefined && (
            <span>{formatElapsed(message.elapsedMs)}</span>
          )}
          {message.usage && message.usage.inputTokens !== undefined && message.usage.outputTokens !== undefined && (
            <span>
              {formatNumber(message.usage.inputTokens)} → {formatNumber(message.usage.outputTokens)} {t("message.tokens")}
              {message.usage.thinkingTokens ? ` (${t("message.thinkingTokens")} ${formatNumber(message.usage.thinkingTokens)})` : ""}
            </span>
          )}
          {message.usage?.totalCost !== undefined && (
            <span>${message.usage.totalCost.toFixed(4)}</span>
          )}
        </div>
      )}

      {/* HTML code block actions */}
      {htmlContent && !isStreaming && (
        <div className="llm-hub-html-actions">
          <span className="llm-hub-html-indicator">
            📊 {t("message.htmlInfographic")}
          </span>
          <div className="llm-hub-html-buttons">
            <button
              className="llm-hub-html-btn"
              onClick={handlePreviewHtml}
              title={t("message.previewHtml")}
            >
              <Eye size={14} />
              <span>{t("message.preview")}</span>
            </button>
            <button
              className="llm-hub-html-btn"
              onClick={() => void handleSaveHtml()}
              title={Platform.isMobile ? t("message.saveHtml") : t("message.downloadHtml")}
            >
              <Download size={14} />
              <span>{t("common.save")}</span>
            </button>
          </div>
        </div>
      )}

      {/* Generated images display */}
      {message.generatedImages && message.generatedImages.length > 0 && (
        <div className="llm-hub-generated-images">
          {message.generatedImages.map((image, index) => (
            <div key={index} className="llm-hub-generated-image-container">
              <img
                src={`data:${image.mimeType};base64,${image.data}`}
                alt={`Generated image ${index + 1}`}
                className="llm-hub-generated-image"
              />
              <div className="llm-hub-image-actions">
                <button
                  className="llm-hub-image-btn"
                  onClick={() => void handleCopyImage(image.mimeType, image.data)}
                  title={t("message.copyImage")}
                >
                  <Copy size={14} />
                  <span>{t("message.copy")}</span>
                </button>
                <button
                  className="llm-hub-image-btn"
                  onClick={() => void handleDownloadImage(image.mimeType, image.data, index)}
                  title={t("message.downloadImage")}
                >
                  <Download size={14} />
                  <span>{t("common.save")}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MCP Apps display */}
      {message.mcpApps && message.mcpApps.length > 0 && (
        <div className="llm-hub-mcp-apps">
          {message.mcpApps.map((mcpApp, index) => (
            <McpAppRenderer
              key={index}
              serverUrl={mcpApp.serverUrl}
              serverHeaders={mcpApp.serverHeaders}
              serverConfig={mcpApp.serverConfig}
              toolResult={mcpApp.toolResult}
              uiResource={mcpApp.uiResource}
              expanded={expandedMcpApps.has(index)}
              onToggleExpand={() => toggleMcpAppExpand(index)}
            />
          ))}
        </div>
      )}

      {/* Edit preview buttons */}
      {message.pendingEdit && message.pendingEdit.status === "pending" && (
        <div className="llm-hub-pending-edit">
          <div className="llm-hub-pending-edit-info">
            📄 {t("message.edited")} <strong>{message.pendingEdit.originalPath}</strong>
          </div>
          <div className="llm-hub-pending-edit-actions">
            <button
              className="llm-hub-edit-btn llm-hub-edit-apply"
              onClick={() => {
                void onApplyEdit?.();
              }}
              title={t("message.applyChanges")}
            >
              <CheckCircle size={16} />
              {t("message.apply")}
            </button>
            <button
              className="llm-hub-edit-btn llm-hub-edit-discard"
              onClick={() => {
                void onDiscardEdit?.();
              }}
              title={t("message.discardChanges")}
            >
              <XCircle size={16} />
              {t("message.discard")}
            </button>
          </div>
        </div>
      )}

      {/* Edit applied status */}
      {editStatuses
        .filter((edit) => edit.status === "applied")
        .map((edit) => (
          <div key={`edit-applied-${edit.originalPath}`} className="llm-hub-edit-status llm-hub-edit-applied">
            ✅ {t("message.appliedChanges")} <strong>{edit.originalPath}</strong>
          </div>
        ))}

      {/* Edit discarded status */}
      {editStatuses
        .filter((edit) => edit.status === "discarded")
        .map((edit) => (
          <div key={`edit-discarded-${edit.originalPath}`} className="llm-hub-edit-status llm-hub-edit-discarded">
            ❌ {t("message.discardedChanges")} <strong>{edit.originalPath}</strong>
          </div>
        ))}

      {/* Edit failed status */}
      {editStatuses
        .filter((edit) => edit.status === "failed")
        .map((edit) => (
          <div key={`edit-failed-${edit.originalPath}`} className="llm-hub-edit-status llm-hub-edit-discarded">
            ❌ {t("message.applyChanges")} <strong>{edit.originalPath}</strong>
          </div>
        ))}

      {/* Delete status */}
      {deleteStatuses
        .filter((del) => del.status === "deleted")
        .map((del) => (
          <div key={`delete-deleted-${del.path}`} className="llm-hub-edit-status llm-hub-delete-applied">
            🗑️ {t("message.deleted")} <strong>{del.path}</strong>
          </div>
        ))}

      {/* Delete cancelled status */}
      {deleteStatuses
        .filter((del) => del.status === "cancelled")
        .map((del) => (
          <div key={`delete-cancelled-${del.path}`} className="llm-hub-edit-status llm-hub-delete-cancelled">
            ↩️ {t("message.cancelledDeletion")} <strong>{del.path}</strong>
          </div>
        ))}

      {/* Delete failed status */}
      {deleteStatuses
        .filter((del) => del.status === "failed")
        .map((del) => (
          <div key={`delete-failed-${del.path}`} className="llm-hub-edit-status llm-hub-edit-discarded">
            ❌ {t("message.failedToDelete")} <strong>{del.path}</strong>
          </div>
        ))}

      {/* Rename applied status */}
      {renameStatuses
        .filter((rename) => rename.status === "applied")
        .map((rename) => (
          <div key={`rename-applied-${rename.originalPath}`} className="llm-hub-edit-status llm-hub-edit-applied">
            📁 {t("message.renamed")} <strong>{rename.originalPath}</strong> → <strong>{rename.newPath}</strong>
          </div>
        ))}

      {/* Rename discarded status */}
      {renameStatuses
        .filter((rename) => rename.status === "discarded")
        .map((rename) => (
          <div key={`rename-discarded-${rename.originalPath}`} className="llm-hub-edit-status llm-hub-edit-discarded">
            ❌ {t("message.cancelledRename")} <strong>{rename.originalPath}</strong>
          </div>
        ))}

      {/* Rename failed status */}
      {renameStatuses
        .filter((rename) => rename.status === "failed")
        .map((rename) => (
          <div key={`rename-failed-${rename.originalPath}`} className="llm-hub-edit-status llm-hub-edit-discarded">
            ❌ {t("message.failedToRename")} <strong>{rename.originalPath}</strong>
          </div>
        ))}
    </div>
  );
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatElapsed(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatNumber(n: number): string {
  return n.toLocaleString();
}
