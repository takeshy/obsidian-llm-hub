import {
	useState,
	useEffect,
	useRef,
	useImperativeHandle,
	forwardRef,
	useCallback,
} from "react";
import { TFile, Notice, MarkdownView, Platform } from "obsidian";
import Plus from "lucide-react/dist/esm/icons/plus";
import History from "lucide-react/dist/esm/icons/history";
import ChevronDown from "lucide-react/dist/esm/icons/chevron-down";
import Lock from "lucide-react/dist/esm/icons/lock";
import FileText from "lucide-react/dist/esm/icons/file-text";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";
import Check from "lucide-react/dist/esm/icons/check";
import type { LlmHubPlugin } from "src/plugin";
import {
	DEFAULT_CLI_CONFIG,
	DEFAULT_LOCAL_LLM_CONFIG,
	CLI_MODEL,
	CLAUDE_CLI_MODEL,
	CODEX_CLI_MODEL,
	LOCAL_LLM_MODEL,
	isApiProviderModel,
	getApiProviderId,
	getApiProviderModelName,
	getGeminiApiKey,
	type Message,
	type ApiProviderConfig,
	type ModelType,
	type Attachment,
	type PendingEditInfo,
	type PendingDeleteInfo,
	type PendingRenameInfo,
	type SlashCommand,
	type GeneratedImage,
	type ChatProvider,
	type VaultToolNoneReason,
	type VaultToolMode,
	type McpServerConfig,
	type McpAppInfo,
	isImageGenerationModel,
	DEFAULT_WORKSPACE_FOLDER,
} from "src/types";
import { getGeminiClient, isThinkingRequired } from "src/core/gemini";
import { tracing } from "src/core/tracingHooks";
import { getEnabledTools, skillWorkflowTool, skillScriptTool } from "src/core/tools";
import { handleExecuteJavascriptTool, EXECUTE_JAVASCRIPT_TOOL } from "src/core/sandboxExecutor";
import { fetchMcpTools, createMcpToolExecutor, isMcpTool, type McpToolDefinition, type McpToolExecutor } from "src/core/mcpTools";
import { PersistentCliSession } from "src/core/cliProvider";
import { localLlmChatStream } from "src/core/localLlmProvider";
import { openaiChatWithToolsStream, openaiGenerateImageStream, isOpenAiImageModel } from "src/core/openaiProvider";
import { anthropicChatWithToolsStream } from "src/core/anthropicProvider";
import { searchLocalRag, loadRagMediaAttachments } from "src/core/localRagStore";
import { createToolExecutor } from "src/vault/toolExecutor";
import {
	getPendingEdit,
	applyEdit,
	discardEdit,
	getPendingDelete,
	applyDelete,
	discardDelete,
	getPendingRename,
	applyRename,
	discardRename,
	getPendingBulkEdit,
	applyBulkEdit,
	discardBulkEdit,
	getPendingBulkDelete,
	applyBulkDelete,
	discardBulkDelete,
	getPendingBulkRename,
	applyBulkRename,
	discardBulkRename,
} from "src/vault/notes";
import {
	promptForConfirmation,
	promptForDeleteConfirmation,
	promptForRenameConfirmation,
	promptForBulkEditConfirmation,
	promptForBulkDeleteConfirmation,
	promptForBulkRenameConfirmation,
} from "./workflow/EditConfirmationModal";
import MessageList from "./MessageList";
import InputArea, { type InputAreaHandle } from "./InputArea";
import {
	isEncryptedFile,
	decryptFileContent,
} from "src/core/crypto";
import { cryptoCache } from "src/core/cryptoCache";
import { formatError } from "src/utils/error";
import { discoverSkills, loadSkill, buildSkillSystemPrompt, collectSkillWorkflows, collectSkillScripts, type SkillMetadata, type LoadedSkill, type SkillWorkflowRef, type SkillScriptRef } from "src/core/skillsLoader";
import { DEFAULT_BUILTIN_SKILL_IDS, builtinFolderPath, getBuiltinSkillMetadata } from "src/core/builtinSkills";
import { getInterpreter, runScript } from "src/core/scriptRunner";
import { parseWorkflowFromMarkdown } from "src/workflow/parser";
import { WorkflowExecutor } from "src/workflow/executor";
import { WorkflowExecutionModal } from "./workflow/WorkflowExecutionModal";
import { promptForFile, promptForAnyFile, promptForNewFilePath } from "./workflow/FilePromptModal";
import { promptForValue } from "./workflow/ValuePromptModal";
import { promptForSelection } from "./workflow/SelectionPromptModal";
import { promptForDialog } from "./workflow/DialogPromptModal";
import { showMcpApp } from "./workflow/McpAppModal";
import { promptForPassword } from "src/ui/passwordPrompt";
import { t } from "src/i18n";
import {
	shouldUseImageModel,
	PAID_RATE_LIMIT_RETRY_DELAYS_MS,
	sleep,
	isRateLimitError,
	buildErrorMessage,
	type CliSessionInfo,
	type ChatHistory,
} from "./chat/chatUtils";
import {
	messagesToMarkdown,
	parseMarkdownToMessages,
	formatHistoryDate,
} from "./chat/chatHistory";

export interface ChatRef {
	getActiveChat: () => TFile | null;
	setActiveChat: (chat: TFile | null) => void;
	addAttachments: (attachments: Attachment[]) => void;
	clearRagSetting: () => void;
}

function didToolCallFail(result: Record<string, unknown>): boolean {
	return result.error !== undefined || result.success === false;
}

function getLatestPendingInfo<T>(items: T[]): T | undefined {
	return items.length > 0 ? items[items.length - 1] : undefined;
}

function getPendingInfos<T>(items: T[]): T[] | undefined {
	return items.length > 0 ? items : undefined;
}

const MAX_BACKGROUND_STREAMS = 3;

interface ChatProps {
	plugin: LlmHubPlugin;
}

const Chat = forwardRef<ChatRef, ChatProps>(({ plugin }, ref) => {
	const [messages, setMessages] = useState<Message[]>([]);
	const [activeChat, setActiveChat] = useState<TFile | null>(null);
	const [currentChatId, setCurrentChatId] = useState<string | null>(null);
	const [cliSession, setCliSession] = useState<CliSessionInfo | null>(null);  // CLI session for resumption
	const [chatHistories, setChatHistories] = useState<ChatHistory[]>([]);
	const [showHistory, setShowHistory] = useState(false);
	const [saveNoteState, setSaveNoteState] = useState<"idle" | "saving" | "saved">("idle");
	const [isLoading, setIsLoading] = useState(false);
	const [isCompacting, setIsCompacting] = useState(false);
	const [streamingContent, setStreamingContent] = useState("");
	const [streamingThinking, setStreamingThinking] = useState("");
	const [currentModel, setCurrentModel] = useState<ModelType>(plugin.getSelectedModel());
	const ragEnabledState = true;  // RAG is always available; individual stores managed in settings
	const [ragSettingNames, setRagSettingNames] = useState<string[]>(plugin.getRagSettingNames());
	const [selectedRagSetting, setSelectedRagSetting] = useState<string | null>(
		plugin.workspaceState.selectedRagSetting
	);

	// Vault tool mode: "all" = use all tools, "noSearch" = exclude search_notes/list_notes, "none" = no vault tools
	// Gemma 4 + RAG/Web Search: must disable function calling tools (mutually exclusive)
	const initialModel = plugin.getSelectedModel();
	const isInitialCli = initialModel === "gemini-cli" || initialModel === "claude-cli" || initialModel === "codex-cli" || initialModel === "local-llm";
	const initialGemma4Rag = initialModel.toLowerCase().includes("gemma-4")
		&& plugin.workspaceState.selectedRagSetting != null;
	const [vaultToolMode, setVaultToolMode] = useState<"all" | "noSearch" | "none">(
		(isInitialCli || initialGemma4Rag) ? "none" : "all"
	);
	// Reason why vault tools are "none" - determines whether MCP should also be disabled
	const [vaultToolNoneReason, setVaultToolNoneReason] = useState<VaultToolNoneReason | null>(
		isInitialCli ? "cli" : initialGemma4Rag ? "manual" : null
	);
	// MCP servers state: local copy with per-server enabled state (for chat session)
	const [mcpServers, setMcpServers] = useState(() =>
		(isInitialCli || initialGemma4Rag)
			? plugin.settings.mcpServers.map(s => ({ ...s, enabled: false }))
			: [...plugin.settings.mcpServers]
	);
	const messagesContainerRef = useRef<HTMLDivElement>(null);
	const abortControllerRef = useRef<AbortController | null>(null);
	const inputAreaRef = useRef<InputAreaHandle>(null);
	const currentSlashCommandRef = useRef<SlashCommand | null>(null);
	const preSlashSettingsRef = useRef<{
		model: ModelType;
		ragSetting: string | null;
		vaultToolMode: VaultToolMode;
		vaultToolNoneReason: VaultToolNoneReason | null;
		mcpServers: McpServerConfig[];
	} | null>(null);
	const mcpExecutorRef = useRef<McpToolExecutor | null>(null);
	// Session ID to track which chat session owns the UI; incremented on startNewChat
	// so background streams can detect they've been detached from the UI.
	const activeSessionIdRef = useRef(0);
	// AbortControllers for background (detached) streams, capped at MAX_BACKGROUND_STREAMS.
	const backgroundAbortControllersRef = useRef<AbortController[]>([]);
	// Chat IDs that have been deleted — background streams check this to avoid
	// resurrecting a deleted chat when they complete.
	const deletedChatIdsRef = useRef<Set<string>>(new Set());
	// Preserve the plugin-level last active chat across the component's first render
	// so the mount-time restore effect can read it before sync-back starts.
	const initialLastActiveChatIdRef = useRef<string | null>(plugin.lastActiveChatId);
	const hasCompletedInitialRestoreRef = useRef(false);
	const persistentCliRef = useRef<PersistentCliSession | null>(null);
	const [vaultFiles, setVaultFiles] = useState<string[]>([]);
	const [hasSelection, setHasSelection] = useState(false);
	const [cliConfig, setCliConfig] = useState(plugin.settings.cliConfig || DEFAULT_CLI_CONFIG);
	const [decryptingChatId, setDecryptingChatId] = useState<string | null>(null);
	const [decryptPassword, setDecryptPassword] = useState("");
	// Pending feedback for edit rejection (to be sent after state update)
	const [pendingEditFeedback, setPendingEditFeedback] = useState<{ filePath: string; request: string } | null>(null);
	// Per-model always-think toggles (set of full model IDs, e.g. "api:gemini:gemini-2.5-flash-lite")
	const [alwaysThinkModels, setAlwaysThinkModels] = useState<Set<string>>(() => {
		// Load from workspace state if available
		const saved = plugin.workspaceState.alwaysThinkModels;
		if (saved && saved.length > 0) {
			return new Set(saved);
		}
		// Default: Flash Lite and thinking-required models have thinking on
		const defaults = new Set<string>();
		const providers = !Platform.isMobile ? plugin.settings.apiProviders.filter(p => p.enabled && p.verified) : [];
		for (const p of providers) {
			for (const m of p.enabledModels) {
				const modelId = `api:${p.id}:${m}`;
				if (m.toLowerCase().includes("flash-lite") || isThinkingRequired(modelId)) {
					defaults.add(modelId);
				}
			}
		}
		return defaults;
	});

	// Agent Skills state (initialise with built-in skills so they are available synchronously)
	const [availableSkills, setAvailableSkills] = useState<SkillMetadata[]>(getBuiltinSkillMetadata);
	const [activeSkillPaths, setActiveSkillPaths] = useState<string[]>(
		() => DEFAULT_BUILTIN_SKILL_IDS.map(builtinFolderPath)
	);

	// CLI provider state (CLI not available on mobile)
	const geminiCliVerified = !Platform.isMobile && cliConfig.cliVerified === true;
	const claudeCliVerified = !Platform.isMobile && cliConfig.claudeCliVerified === true;
	const codexCliVerified = !Platform.isMobile && cliConfig.codexCliVerified === true;
	const localLlmVerified = !Platform.isMobile && plugin.settings.localLlmVerified === true;
	const enabledApiProviders = !Platform.isMobile ? plugin.settings.apiProviders.filter(p => p.enabled && p.verified) : [];
	const hasEnabledApiProvider = enabledApiProviders.length > 0;
	const anyCliVerified = geminiCliVerified || claudeCliVerified || codexCliVerified || localLlmVerified;
	const isGeminiCliMode = !Platform.isMobile && currentModel === "gemini-cli";
	const isClaudeCliMode = !Platform.isMobile && currentModel === "claude-cli";
	const isCodexCliMode = !Platform.isMobile && currentModel === "codex-cli";
	const isLocalLlmMode = !Platform.isMobile && currentModel === "local-llm";
	const isApiProviderMode = !Platform.isMobile && isApiProviderModel(currentModel);
	const isCliMode = isGeminiCliMode || isClaudeCliMode || isCodexCliMode || isLocalLlmMode;

	// Resolve API provider config from current model name ("api:{providerId}")
	const getActiveApiProvider = (): ApiProviderConfig | null => {
		if (!isApiProviderModel(currentModel)) return null;
		const providerId = getApiProviderId(currentModel);
		return plugin.settings.apiProviders.find(p => p.id === providerId && p.enabled && p.verified) ?? null;
	};

	// Check if configuration is ready (any CLI verified OR API provider configured)
	const isConfigReady = anyCliVerified || hasEnabledApiProvider;

	// Web Search is only available for Gemini providers (uses Gemini's grounding with Google Search)
	const isGeminiProvider = (() => {
		if (isGeminiCliMode) return true;
		const provider = getActiveApiProvider();
		return provider?.type === "gemini";
	})();
	const allowWebSearch = !isCliMode && isGeminiProvider;
	// Server RAG needs API mode; local RAG works everywhere
	const allowRag = ragEnabledState;

	// Resolve thinking toggle for the current model
	const getThinkingToggle = (): boolean | undefined => {
		if (alwaysThinkModels.has(currentModel) || isThinkingRequired(currentModel)) return true;
		return undefined;
	};

	// Build available models list (API providers + CLI options)
	const availableModels = [
		...enabledApiProviders.flatMap(p =>
			p.enabledModels.map(m => ({
				name: `api:${p.id}:${m}` as ModelType,
				displayName: `${p.name} (${m})`,
				description: `${p.type} API provider`,
				isCliModel: false,
				providerName: p.name,
			}))
		),
		...(geminiCliVerified ? [CLI_MODEL] : []),
		...(claudeCliVerified ? [CLAUDE_CLI_MODEL] : []),
		...(codexCliVerified ? [CODEX_CLI_MODEL] : []),
		...(localLlmVerified ? [LOCAL_LLM_MODEL] : []),
	];

	useImperativeHandle(ref, () => ({
		getActiveChat: () => activeChat,
		setActiveChat: (chat: TFile | null) => setActiveChat(chat),
		addAttachments: (attachments: Attachment[]) => inputAreaRef.current?.addAttachments(attachments),
		clearRagSetting: () => {
			setSelectedRagSetting(null);
			plugin.workspaceState.selectedRagSetting = null;
		},
	}));

	// Generate chat ID
	const generateChatId = () => `chat_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

	// Get chat history folder path
	const getChatHistoryFolder = () => {
		return plugin.settings.workspaceFolder || DEFAULT_WORKSPACE_FOLDER;
	};

	// Get chat file path
	const getChatFilePath = (chatId: string) => {
		return `${getChatHistoryFolder()}/${chatId}.md`;
	};

	// Save current chat as a note file (in vault root)
	const handleSaveAsNote = useCallback(async () => {
		if (saveNoteState !== "idle" || messages.length === 0) return;
		setSaveNoteState("saving");
		try {
			const chatTitle = messages[0].content.slice(0, 50) + (messages[0].content.length > 50 ? "..." : "");
			const markdown = await messagesToMarkdown(messages, chatTitle, messages[0].timestamp, plugin.settings.encryption, cliSession ?? undefined);
			const now = new Date();
			const pad = (n: number) => String(n).padStart(2, "0");
			const fileName = `chat-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.md`;
			await plugin.app.vault.create(fileName, markdown);
			new Notice(t("chat.savedAsNote", { path: fileName }));
			setSaveNoteState("saved");
			setTimeout(() => setSaveNoteState("idle"), 3000);
		} catch (error) {
			new Notice(t("common.error") + ": " + formatError(error));
			setSaveNoteState("idle");
		}
	}, [saveNoteState, messages, plugin, cliSession]);

	// Load chat histories from folder
	const loadChatHistories = useCallback(async () => {
		if (!plugin.settings.saveChatHistory) {
			setChatHistories([]);
			return;
		}

		try {
			const folder = getChatHistoryFolder();
			const folderExists = await plugin.app.vault.adapter.exists(folder);

			if (!folderExists) {
				setChatHistories([]);
				return;
			}

			const listed = await plugin.app.vault.adapter.list(folder);
			const files = listed.files.filter(f => f.endsWith(".md") || f.endsWith(".md.encrypted"));
			const histories: ChatHistory[] = [];

			for (const filePath of files) {
				try {
					const content = await plugin.app.vault.adapter.read(filePath);
					const stat = await plugin.app.vault.adapter.stat(filePath);
					const fileName = filePath.split("/").pop() || "";
					const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

					// Extract chatId from filename (handles both .md and .md.encrypted)
					const chatId = fileName.replace(/\.md(\.encrypted)?$/, "");
					const ctime = stat?.ctime ?? 0;
					const mtime = stat?.mtime ?? 0;

					// Check if content is encrypted (YAML frontmatter format)
					if (isEncryptedFile(content)) {
						histories.push({
							id: chatId,
							title: t("chat.encryptedChat"),
							messages: [],
							createdAt: ctime,
							updatedAt: mtime,
							isEncrypted: true,
						});
					} else if (frontmatterMatch) {
						const titleMatch = frontmatterMatch[1].match(/title:\s*"([^"]+)"/);
						const createdAtMatch = frontmatterMatch[1].match(/createdAt:\s*(\d+)/);
						const updatedAtMatch = frontmatterMatch[1].match(/updatedAt:\s*(\d+)/);
						const title = titleMatch ? titleMatch[1] : chatId;
						const createdAt = createdAtMatch ? parseInt(createdAtMatch[1]) : ctime;
						const updatedAt = updatedAtMatch ? parseInt(updatedAtMatch[1]) : mtime;

						// Parse messages from content
						const parsed = parseMarkdownToMessages(content);

						histories.push({
							id: chatId,
							title,
							messages: parsed?.messages || [],
							createdAt,
							updatedAt,
							cliSession: parsed?.cliSession,
							isEncrypted: false,
						});
					}
				} catch {
					// Failed to load chat, skip
				}
			}

			setChatHistories(histories.sort((a, b) => b.updatedAt - a.updatedAt));
		} catch {
			setChatHistories([]);
		}
	}, [plugin]);

	// Write a chat to disk and update the history list.
	// When `foreground` is true, also sets currentChatId (normal save).
	// When false, uses setChatHistories functional updater to avoid stale-closure
	// races (background save – the foreground chat is not disturbed).
	const saveChatToDisk = useCallback(async (
		msgs: Message[],
		chatId: string,
		opts: { session?: CliSessionInfo | null; foreground?: boolean } = {},
	) => {
		if (msgs.length === 0) return;
		if (!plugin.settings.saveChatHistory) return;
		// Skip if this chat was deleted while the stream was running
		if (deletedChatIdsRef.current.has(chatId)) return;

		const { session, foreground = false } = opts;
		const title = msgs[0].content.slice(0, 50) + (msgs[0].content.length > 50 ? "..." : "");
		const folder = getChatHistoryFolder();

		try {
			if (!(await plugin.app.vault.adapter.exists(folder))) {
				await plugin.app.vault.adapter.mkdir(folder);
			}
		} catch {
			// Folder might already exist
		}

		// Use functional updater to read the latest chatHistories without
		// depending on the outer closure (avoids stale-closure races).
		// We capture the existing entry's createdAt and cliSession here
		// and write the file inside the updater so everything stays consistent.
		setChatHistories(prev => {
			const existing = prev.find(h => h.id === chatId);
			const createdAt = existing?.createdAt || Date.now();
			// session explicitly passed → use it; undefined → fall back to existing
			const effectiveSession = session === undefined
				? existing?.cliSession
				: session ?? undefined;

			// Fire-and-forget the async disk write; state update is synchronous
			void (async () => {
				try {
					const markdown = await messagesToMarkdown(msgs, title, createdAt, plugin.settings.encryption, effectiveSession);
					const basePath = getChatFilePath(chatId);
					const encrypted = isEncryptedFile(markdown);
					const filePath = encrypted ? basePath + ".encrypted" : basePath;
					const oldPath = encrypted ? basePath : basePath + ".encrypted";

					if (await plugin.app.vault.adapter.exists(oldPath)) {
						await plugin.app.vault.adapter.remove(oldPath);
					}
					await plugin.app.vault.adapter.write(filePath, markdown);
				} catch (e) {
					console.warn("Failed to write chat file:", chatId, e);
				}
			})();

			const newHistory: ChatHistory = {
				id: chatId,
				title,
				messages: msgs,
				createdAt,
				updatedAt: Date.now(),
				cliSession: effectiveSession,
			};

			const idx = prev.findIndex(h => h.id === chatId);
			let updated: ChatHistory[];
			if (idx >= 0) {
				updated = [...prev];
				updated[idx] = newHistory;
			} else {
				updated = [newHistory, ...prev];
			}
			return updated.slice(0, 50);
		});

		if (foreground) {
			setCurrentChatId(chatId);
		}
	}, [plugin]);

	// Save current (foreground) chat to Markdown file
	const saveCurrentChat = useCallback(async (msgs: Message[], session?: CliSessionInfo | null, overrideChatId?: string) => {
		const chatId = overrideChatId || currentChatId || generateChatId();
		await saveChatToDisk(msgs, chatId, { session, foreground: true });
	}, [currentChatId, saveChatToDisk]);

	// Create a stream session that tracks whether this stream still owns the UI.
	// Each provider function calls this once at the top; the returned helpers
	// centralise the isActive/save/finally logic that was previously duplicated.
	const createStreamSession = useCallback(() => {
		const mySessionId = activeSessionIdRef.current;
		const myChatId = currentChatId || generateChatId();
		const isActive = () => mySessionId === activeSessionIdRef.current;

		const saveResult = async (msgs: Message[], session?: CliSessionInfo | null) => {
			if (isActive()) {
				setMessages(msgs);
				await saveChatToDisk(msgs, myChatId, { session, foreground: true });
			} else {
				await saveChatToDisk(msgs, myChatId, { session });
			}
		};

		// Called in `finally` — cleans up UI state if still foreground.
		// Pass the stream's AbortController so it can be removed from
		// the background tracking list when the stream was backgrounded.
		const cleanup = (myAbortController?: AbortController | null) => {
			if (isActive()) {
				setIsLoading(false);
				setStreamingContent("");
				setStreamingThinking("");
				abortControllerRef.current = null;
			} else if (myAbortController) {
				const bgList = backgroundAbortControllersRef.current;
				backgroundAbortControllersRef.current = bgList.filter(ac => ac !== myAbortController);
			}
		};

		return { mySessionId, myChatId, isActive, saveResult, cleanup };
	}, [currentChatId, saveChatToDisk]);

	// Detach the currently running stream (if any) so it continues in the
	// background.  Moves its AbortController to the background list and
	// aborts the oldest background stream if we exceed the cap.
	const detachActiveStream = useCallback(() => {
		activeSessionIdRef.current += 1;

		// Move the foreground AbortController to the background list
		if (abortControllerRef.current) {
			backgroundAbortControllersRef.current.push(abortControllerRef.current);
			abortControllerRef.current = null;
			// Abort oldest if over the cap
			while (backgroundAbortControllersRef.current.length > MAX_BACKGROUND_STREAMS) {
				const oldest = backgroundAbortControllersRef.current.shift();
				oldest?.abort();
			}
		}

		// Detach MCP executor – background stream cleans up its own copy
		mcpExecutorRef.current = null;
		setIsLoading(false);
		setStreamingContent("");
		setStreamingThinking("");
	}, []);

	// Load chat histories on mount, and restore last active chat if available
	useEffect(() => {
		// Capture session ID at mount time so we can detect if the user
		// navigated elsewhere before the async restore completes.
		const mountSessionId = activeSessionIdRef.current;
		void loadChatHistories().then(async () => {
			try {
				// Skip restore if the user already started a new chat or loaded one
				if (activeSessionIdRef.current !== mountSessionId) return;

				const lastId = initialLastActiveChatIdRef.current;
				if (!lastId) return;

				const basePath = getChatFilePath(lastId);
				let filePath = basePath;
				let exists = await plugin.app.vault.adapter.exists(filePath);
				if (!exists) {
					filePath = basePath + ".encrypted";
					exists = await plugin.app.vault.adapter.exists(filePath);
				}
				if (!exists) return;
				// Re-check after async gap
				if (activeSessionIdRef.current !== mountSessionId) return;

				const content = await plugin.app.vault.adapter.read(filePath);
				if (isEncryptedFile(content)) return;

				const parsed = parseMarkdownToMessages(content);
				if (parsed?.messages && parsed.messages.length > 0) {
					// Final check before touching state
					if (activeSessionIdRef.current !== mountSessionId) return;
					setMessages(parsed.messages);
					setCurrentChatId(lastId);
					setCliSession(parsed.cliSession || null);
				}
			} catch (e) {
				console.warn("Failed to restore last active chat:", e);
			} finally {
				hasCompletedInitialRestoreRef.current = true;
			}
		});
	}, [loadChatHistories]);

	// Sync currentChatId → plugin.lastActiveChatId (in-memory, cleared on restart)
	useEffect(() => {
		if (!hasCompletedInitialRestoreRef.current) return;
		plugin.lastActiveChatId = currentChatId;
	}, [currentChatId, plugin]);

	// Discover skills (on mount + when skills-changed is emitted)
	const refreshSkills = useCallback(() => {
		void discoverSkills(plugin.app).then(setAvailableSkills);
	}, [plugin]);

	useEffect(() => {
		refreshSkills();
		plugin.settingsEmitter.on("skills-changed", refreshSkills);
		return () => {
			plugin.settingsEmitter.off("skills-changed", refreshSkills);
		};
	}, [plugin, refreshSkills]);

	// Cleanup MCP executor and persistent CLI session on unmount
	useEffect(() => {
		return () => {
			if (mcpExecutorRef.current) {
				void mcpExecutorRef.current.cleanup();
				mcpExecutorRef.current = null;
			}
			if (persistentCliRef.current) {
				persistentCliRef.current.terminate();
				persistentCliRef.current = null;
			}
		};
	}, []);

	// Load vault files for @ mention suggestions
	useEffect(() => {
		const updateVaultFiles = () => {
			const files = plugin.app.vault.getMarkdownFiles().map(f => f.path);
			setVaultFiles(files.sort());
		};
		updateVaultFiles();

		// Update on vault changes
		const onVaultChange = () => updateVaultFiles();
		plugin.app.vault.on("create", onVaultChange);
		plugin.app.vault.on("delete", onVaultChange);
		plugin.app.vault.on("rename", onVaultChange);

		return () => {
			plugin.app.vault.off("create", onVaultChange);
			plugin.app.vault.off("delete", onVaultChange);
			plugin.app.vault.off("rename", onVaultChange);
		};
	}, [plugin]);

	// Update hasSelection and focus input when chat gains focus
	useEffect(() => {
		const handleLeafChange = () => {
			// Small delay to let selection capture complete
			setTimeout(() => {
				const selection = plugin.getLastSelection();
				setHasSelection(!!selection);
				// Skip auto-focus on mobile - iOS doesn't allow programmatic focus without user interaction
				if (!Platform.isMobile) {
					inputAreaRef.current?.focus();
				}
			}, 50);
		};

		plugin.settingsEmitter.on("chat-activated", handleLeafChange);
		return () => {
			plugin.settingsEmitter.off("chat-activated", handleLeafChange);
		};
	}, [plugin]);

	// Auto-scroll to bottom when messages change
	useEffect(() => {
		// Delay scroll to ensure MarkdownRenderer has finished rendering
		const timer = setTimeout(() => {
			const container = messagesContainerRef.current;
			if (container) {
				container.scrollTop = container.scrollHeight;
			}
		}, 150);
		return () => clearTimeout(timer);
	}, [messages, streamingContent]);

	// Handle iOS keyboard visibility using focus events
	const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
	const [isDecryptInputFocused, setIsDecryptInputFocused] = useState(false);
	useEffect(() => {
		if (!Platform.isMobile) return;

		const handleFocusIn = (e: FocusEvent) => {
			const target = e.target as HTMLElement;
			// Track focus on textarea within our chat input area
			if (target.tagName === "TEXTAREA" && target.closest(".llm-hub-input-container")) {
				setIsKeyboardVisible(true);
				setIsDecryptInputFocused(false);
			}
			// Track focus on decrypt form password input
			if (target.tagName === "INPUT" && target.closest(".llm-hub-decrypt-form")) {
				setIsKeyboardVisible(true);
				setIsDecryptInputFocused(true);
			}
		};

		const handleFocusOut = (e: FocusEvent) => {
			const target = e.target as HTMLElement;
			// Track focusout from textarea within our chat input area
			if (target.tagName === "TEXTAREA" && target.closest(".llm-hub-input-container")) {
				// Small delay to avoid flickering
				setTimeout(() => {
					const active = document.activeElement as HTMLElement | null;
					const isStillInInput = active?.tagName === "TEXTAREA" && active?.closest(".llm-hub-input-container");
					const isInDecryptForm = active?.tagName === "INPUT" && active?.closest(".llm-hub-decrypt-form");
					if (!isStillInInput && !isInDecryptForm) {
						setIsKeyboardVisible(false);
					}
				}, 100);
			}
			// Track focusout from decrypt form password input
			if (target.tagName === "INPUT" && target.closest(".llm-hub-decrypt-form")) {
				setTimeout(() => {
					const active = document.activeElement as HTMLElement | null;
					const isStillInDecrypt = active?.tagName === "INPUT" && active?.closest(".llm-hub-decrypt-form");
					const isInChatInput = active?.tagName === "TEXTAREA" && active?.closest(".llm-hub-input-container");
					if (!isStillInDecrypt && !isInChatInput) {
						setIsKeyboardVisible(false);
						setIsDecryptInputFocused(false);
					} else if (isInChatInput) {
						setIsDecryptInputFocused(false);
					}
				}, 100);
			}
		};

		document.addEventListener("focusin", handleFocusIn);
		document.addEventListener("focusout", handleFocusOut);

		return () => {
			document.removeEventListener("focusin", handleFocusIn);
			document.removeEventListener("focusout", handleFocusOut);
		};
	}, []);

	// Listen for workspace state changes
	useEffect(() => {
		const handleWorkspaceStateLoaded = () => {
			setRagSettingNames(plugin.getRagSettingNames());
			setSelectedRagSetting(plugin.workspaceState.selectedRagSetting);
		};

		const handleRagSettingChanged = (name: string | null) => {
			setSelectedRagSetting(name);
		};

		plugin.settingsEmitter.on("workspace-state-loaded", handleWorkspaceStateLoaded);
		plugin.settingsEmitter.on("rag-setting-changed", handleRagSettingChanged);

		return () => {
			plugin.settingsEmitter.off("workspace-state-loaded", handleWorkspaceStateLoaded);
			plugin.settingsEmitter.off("rag-setting-changed", handleRagSettingChanged);
		};
	}, [plugin]);

	useEffect(() => {
		const handleSettingsUpdated = () => {
			setCurrentModel(plugin.getSelectedModel());
			setCliConfig(plugin.settings.cliConfig || DEFAULT_CLI_CONFIG);
			// Terminate persistent CLI session when settings change (model may have changed)
			if (persistentCliRef.current) {
				persistentCliRef.current.terminate();
				persistentCliRef.current = null;
			}
			// Sync MCP servers from settings
			setMcpServers([...plugin.settings.mcpServers]);
		};
		plugin.settingsEmitter.on("settings-updated", handleSettingsUpdated);
		return () => {
			plugin.settingsEmitter.off("settings-updated", handleSettingsUpdated);
		};
	}, [plugin, selectedRagSetting]);

	// Model validation is now handled by getSelectedModel() in WorkspaceStateManager

	// Handle pending edit feedback (send after state update to avoid closure issues)
	useEffect(() => {
		if (pendingEditFeedback && !isLoading) {
			const { filePath, request } = pendingEditFeedback;
			setPendingEditFeedback(null);

			// Build simple feedback message (chat already shows the original request and AI's proposal)
			const feedbackMessage = request.trim()
				? `${t("message.editFeedbackHeader", { filePath })}\n\n${t("message.editFeedbackUserRequest")}\n\n${request}`
				: `${t("message.editFeedbackHeader", { filePath })}\n\n${t("message.editFeedbackRetry")}`;

			void sendMessage(feedbackMessage);
		}
	}, [pendingEditFeedback, isLoading]);

	// Gemma 4 cannot combine Google Search with Function Calling in one request
	const isGemma4 = (model: string) => {
		if (isApiProviderModel(model)) {
			return getApiProviderModelName(model).toLowerCase().includes("gemma-4");
		}
		return model.toLowerCase().includes("gemma-4");
	};

	// Handle RAG setting change from UI
	const handleRagSettingChange = (name: string | null) => {
		setSelectedRagSetting(name);
		void plugin.selectRagSetting(name);
		// Gemma 4: RAG or Web Search selected → disable function calling tools
		if (isGemma4(currentModel) && name) {
			setVaultToolMode("none");
			setVaultToolNoneReason("manual");
			setMcpServers(servers => servers.map(s => ({ ...s, enabled: false })));
		}
	};

	// Handle vault tool mode change from UI
	const handleVaultToolModeChange = (mode: "all" | "noSearch" | "none") => {
		setVaultToolMode(mode);
		setVaultToolNoneReason(mode === "none" ? "manual" : null);
		// Gemma 4: vault tools enabled → clear RAG/Web Search
		if (isGemma4(currentModel) && mode !== "none" && selectedRagSetting) {
			setSelectedRagSetting(null);
			void plugin.selectRagSetting(null);
		}
	};

	// Handle per-server MCP toggle from UI
	const handleMcpServerToggle = (serverName: string, enabled: boolean) => {
		setMcpServers(servers => {
			const updated = servers.map(s => s.name === serverName ? { ...s, enabled } : s);
			plugin.settings.mcpServers = updated;
			void plugin.saveSettings();
			// Gemma 4: MCP server enabled → clear RAG/Web Search
			if (isGemma4(currentModel) && enabled && selectedRagSetting) {
				setSelectedRagSetting(null);
				void plugin.selectRagSetting(null);
			}
			return updated;
		});
	};

	// Handle model change from UI
	const handleModelChange = (model: ModelType) => {
		setCurrentModel(model);
		void plugin.selectModel(model);

		// Terminate persistent CLI session when switching away from CLI model
		if (persistentCliRef.current) {
			persistentCliRef.current.terminate();
			persistentCliRef.current = null;
		}

		const isNewModelCli = model === "gemini-cli" || model === "claude-cli" || model === "codex-cli" || model === "local-llm";
		const isNewModelApiProvider = isApiProviderModel(model);

		// Check if new model is a Gemini provider (for Web Search availability)
		const isNewModelGemini = (() => {
			if (model === "gemini-cli") return true;
			if (!isNewModelApiProvider) return false;
			const providerId = getApiProviderId(model);
			const provider = plugin.settings.apiProviders.find(p => p.id === providerId && p.enabled && p.verified);
			return provider?.type === "gemini";
		})();

		// If switching to non-Gemini model while Web Search is selected, clear it
		if (!isNewModelGemini && selectedRagSetting === "__websearch__") {
			handleRagSettingChange(null);
		}

		// Auto-adjust search setting and vault tool mode for CLI mode and special models
		if (isNewModelCli) {
			// CLI mode: disable vault tools and MCP
			setVaultToolMode("none");
			setVaultToolNoneReason("cli");
			setMcpServers(servers => servers.map(s => ({ ...s, enabled: false })));
		} else if (isImageGenerationModel(model)) {
			// Image models: Web Search only → keep if Web Search, else None
			if (selectedRagSetting !== null && selectedRagSetting !== "__websearch__") {
				handleRagSettingChange(null);
			}
			setVaultToolMode("all");
			setVaultToolNoneReason(null);
		} else if (isGemma4(model)) {
			// Gemma 4: RAG/Web Search and function calling are mutually exclusive
			if (selectedRagSetting) {
				// RAG or Web Search active → disable vault tools
				setVaultToolMode("none");
				setVaultToolNoneReason("manual");
				setMcpServers(servers => servers.map(s => ({ ...s, enabled: false })));
			}
		} else {
			// Normal models: restore vault tools
			setVaultToolMode("all");
			setVaultToolNoneReason(null);
		}
	};

	// Resolve slash command variables
	const resolveCommandVariables = async (template: string): Promise<string> => {
		let result = template;

		// Resolve {content} - active note content with file info
		if (result.includes("{content}")) {
			const activeFile = plugin.app.workspace.getActiveFile();
			if (activeFile) {
				const content = await plugin.app.vault.read(activeFile);
				const contentText = `From "${activeFile.path}":\n${content}`;
				result = result.replace(/\{content\}/g, contentText);
			} else {
				result = result.replace(/\{content\}/g, "[No active note]");
			}
		}

		// Resolve {selection} - selected text in editor with optional location info
		// Falls back to {content} if no selection
		if (result.includes("{selection}")) {
			let selection = "";
			let locationInfo: { filePath: string; startLine: number; endLine: number } | null = null;

			// First try to get selection from current active view
			const activeView = plugin.app.workspace.getActiveViewOfType(MarkdownView);
			if (activeView) {
				const editor = activeView.editor;
				selection = editor.getSelection();
				if (selection && activeView.file) {
					const fromPos = editor.getCursor("from");
					const toPos = editor.getCursor("to");
					locationInfo = {
						filePath: activeView.file.path,
						startLine: fromPos.line + 1,
						endLine: toPos.line + 1,
					};
				}
			}

			// Fallback to cached selection (captured before focus changed to chat)
			if (!selection) {
				selection = plugin.getLastSelection();
				locationInfo = plugin.getSelectionLocation();
			}

			// Build selection text with location info
			let selectionText: string;
			if (selection && locationInfo) {
				const lineInfo = locationInfo.startLine === locationInfo.endLine
					? `Line ${locationInfo.startLine}`
					: `Lines ${locationInfo.startLine}-${locationInfo.endLine}`;
				// Format as quote block for clear boundary
				const quotedSelection = selection.split("\n").map(line => `> ${line}`).join("\n");
				selectionText = `From "${locationInfo.filePath}" (${lineInfo}):\n${quotedSelection}`;
			} else {
				// Fallback to active note content if no selection
				const activeFile = plugin.app.workspace.getActiveFile();
				if (activeFile) {
					const content = await plugin.app.vault.read(activeFile);
					selectionText = `From "${activeFile.path}":\n${content}`;
				} else {
					selectionText = "[No selection or active note]";
				}
			}

			result = result.replace(/\{selection\}/g, selectionText);
		}

		return result;
	};

	// Resolve message variables (for regular messages)
	const resolveMessageVariables = async (content: string): Promise<string> => {
		let result = content;

		// Resolve {selection} and {content} using the same logic as slash commands
		result = await resolveCommandVariables(result);

		// Resolve file paths - read file content and insert it
		const filePathPattern = /(?:^|\s)([\w/-]+\.md)(?:\s|$)/g;
		const matches = [...result.matchAll(filePathPattern)];

		for (const match of matches) {
			const filePath = match[1];
			const file = plugin.app.vault.getAbstractFileByPath(filePath);
			if (file instanceof TFile) {
				try {
					const fileContent = await plugin.app.vault.read(file);
					const replacement = `\n\n--- Content of "${filePath}" ---\n${fileContent}\n--- End of "${filePath}" ---\n\n`;
					result = result.replace(filePath, replacement);
				} catch {
					// File couldn't be read, leave as-is
				}
			}
		}

		return result;
	};

	const decodeAttachmentText = (attachment: Attachment): string | null => {
		if (attachment.type !== "text") return null;
		try {
			return atob(attachment.data);
		} catch {
			return null;
		}
	};

	const buildLocalLlmAttachmentContext = (attachments?: Attachment[]): string => {
		if (!attachments || attachments.length === 0) return "";

		const sections = attachments.map((attachment) => {
			const header = `Attachment: ${attachment.name} (${attachment.mimeType || attachment.type})`;
			const decodedText = decodeAttachmentText(attachment);
			if (decodedText !== null) {
				const trimmed = decodedText.trim();
				const content = trimmed.length > 12000
					? `${trimmed.slice(0, 12000)}\n[Truncated]`
					: trimmed;
				return `--- ${header} ---\n${content || "[Empty text attachment]"}\n--- End Attachment ---`;
			}
			return `--- ${header} ---\nBinary attachment metadata only. The file contents are not directly available in Local LLM mode.\nType: ${attachment.type}\n--- End Attachment ---`;
		});

		return `\n\nAttached files:\n\n${sections.join("\n\n")}`;
	};

	// Handle slash command selection
	const handleSlashCommand = (command: SlashCommand): string => {
		// Track the current slash command for auto-apply logic
		currentSlashCommandRef.current = command;

		// Save current settings before applying overrides (restored after message processing)
		preSlashSettingsRef.current = {
			model: currentModel,
			ragSetting: selectedRagSetting,
			vaultToolMode,
			vaultToolNoneReason,
			mcpServers: mcpServers.map(s => ({ ...s })),
		};

		// Optionally change model
		const nextModel = command.model ? command.model : currentModel;
		if (nextModel !== currentModel) {
			setCurrentModel(nextModel);
			// Terminate persistent CLI session when model changes via slash command
			if (persistentCliRef.current) {
				persistentCliRef.current.terminate();
				persistentCliRef.current = null;
			}
		}

		// Optionally change search setting (null = keep current, "" = None, "__websearch__" = Web Search, other = RAG setting name)
		if (allowWebSearch && command.searchSetting !== null && command.searchSetting !== undefined) {
			const newSetting = command.searchSetting === "" ? null : command.searchSetting;
			handleRagSettingChange(newSetting);
		}

		// Optionally change vault tool mode (null = keep current)
		// Slash commands are input helpers, so vaultToolMode="none" uses "manual" reason (MCP unchanged)
		if (command.vaultToolMode !== null && command.vaultToolMode !== undefined) {
			setVaultToolMode(command.vaultToolMode);
			setVaultToolNoneReason(command.vaultToolMode === "none" ? "manual" : null);
		}

		// Optionally change MCP server enabled state (null = keep current)
		if (command.enabledMcpServers !== null && command.enabledMcpServers !== undefined) {
			const enabledSet = new Set(command.enabledMcpServers);
			setMcpServers(servers => servers.map(s => ({
				...s,
				enabled: enabledSet.has(s.name)
			})));
		}

		// Return template as-is, variables will be resolved on send
		return command.promptTemplate;
	};

	// Start new chat (works even while a stream is running – the old stream
	// continues in the background and saves its result to history when done).
	const startNewChat = () => {
		if (isLoading) {
			detachActiveStream();
		} else {
			// Bump session ID even without an active stream so that
			// pending async operations (e.g. mount-time restore) are cancelled.
			activeSessionIdRef.current += 1;
			if (mcpExecutorRef.current) {
				void mcpExecutorRef.current.cleanup();
				mcpExecutorRef.current = null;
			}
		}

		setMessages([]);
		setCurrentChatId(null);
		setActiveSkillPaths(DEFAULT_BUILTIN_SKILL_IDS.map(builtinFolderPath));
		setCliSession(null);
		setShowHistory(false);
		// Cleanup persistent CLI session
		if (persistentCliRef.current) {
			persistentCliRef.current.terminate();
			persistentCliRef.current = null;
		}
	};

	// Decrypt and load encrypted chat
	const decryptAndLoadChat = async (chatId: string, password: string) => {
		if (isLoading) {
			detachActiveStream();
		} else {
			activeSessionIdRef.current += 1;
		}
		try {
			// Try .md.encrypted first, then fall back to .md
			const basePath = getChatFilePath(chatId);
			let file = plugin.app.vault.getAbstractFileByPath(basePath + ".encrypted");
			if (!(file instanceof TFile)) {
				file = plugin.app.vault.getAbstractFileByPath(basePath);
			}
			if (!(file instanceof TFile)) {
				throw new Error("Chat file not found");
			}

			const content = await plugin.app.vault.read(file);

			// Decrypt using YAML frontmatter format
			if (!isEncryptedFile(content)) {
				throw new Error("Invalid encrypted content");
			}

			const decryptedContent = await decryptFileContent(content, password);

			// Cache the password for future decryptions in this session
			cryptoCache.setPassword(password);

			// Parse decrypted content
			const parsed = parseMarkdownToMessages(decryptedContent);
			if (!parsed) {
				throw new Error("Failed to parse decrypted content");
			}

			setMessages(parsed.messages);
			setCurrentChatId(chatId);
			setCliSession(parsed.cliSession || null);
			// Terminate persistent CLI session when loading a different chat
			if (persistentCliRef.current) {
				persistentCliRef.current.terminate();
				persistentCliRef.current = null;
			}
			setStreamingContent("");
			setStreamingThinking("");
			setDecryptingChatId(null);
			setDecryptPassword("");
			setShowHistory(false);
			new Notice(t("chat.decrypted"));
		} catch (error) {
			console.error("Decryption failed:", formatError(error));
			new Notice(t("chat.decryptFailed"));
		}
	};

	// Load a chat from history
	const loadChat = (history: ChatHistory) => {
		if (isLoading) {
			detachActiveStream();
		} else {
			activeSessionIdRef.current += 1;
		}
		if (history.isEncrypted) {
			// If password is cached, try to decrypt automatically
			const cachedPassword = cryptoCache.getPassword();
			if (cachedPassword) {
				void decryptAndLoadChat(history.id, cachedPassword);
				return;
			}
			// Show decryption UI
			setDecryptingChatId(history.id);
			setDecryptPassword("");
			return;
		}
		setMessages(history.messages);
		setCurrentChatId(history.id);
		setCliSession(history.cliSession || null);  // Restore CLI session
		// Terminate persistent CLI session when switching chats (will be recreated on next message)
		if (persistentCliRef.current) {
			persistentCliRef.current.terminate();
			persistentCliRef.current = null;
		}
		setStreamingContent("");
		setStreamingThinking("");
		setShowHistory(false);
	};

	// Delete a chat from history
	const deleteChat = async (chatId: string, e: React.MouseEvent) => {
		e.stopPropagation();

		// Prevent background streams from resurrecting this chat
		deletedChatIdsRef.current.add(chatId);

		// Delete the Markdown file (try both .md and .md.encrypted)
		const basePath = getChatFilePath(chatId);
		for (const path of [basePath, basePath + ".encrypted"]) {
			try {
				if (await plugin.app.vault.adapter.exists(path)) {
					await plugin.app.vault.adapter.remove(path);
				}
			} catch {
				// Failed to delete chat file
			}
		}

		const newHistories = chatHistories.filter(h => h.id !== chatId);
		setChatHistories(newHistories);

		if (currentChatId === chatId) {
			startNewChat();
		}
		new Notice(t("chat.chatDeleted"));
	};

	// Send message via CLI provider
	const sendMessageViaCli = async (content: string, attachments?: Attachment[], skillPath?: string) => {
		const { isActive, saveResult, cleanup: cleanupStream } = createStreamSession();

		const isClaudeCli = currentModel === "claude-cli";
		const isCodexCli = currentModel === "codex-cli";

		// Activate skill if invoked via slash command
		let effectiveSkillPaths = activeSkillPaths;
		if (skillPath && !effectiveSkillPaths.includes(skillPath)) {
			effectiveSkillPaths = [...effectiveSkillPaths, skillPath];
			setActiveSkillPaths(effectiveSkillPaths);
		}

		// Resolve variables in the content
		const resolvedContent = await resolveMessageVariables(content);

		// When skill is invoked without message, use skill name as trigger
		let displayContent = resolvedContent.trim();
		if (!displayContent && skillPath) {
			const skillMeta = availableSkills.find(s => s.folderPath === skillPath);
			displayContent = skillMeta ? `/${skillMeta.name}` : "/skill";
		}

		// Add user message
		const userMessage: Message = {
			role: "user",
			content: displayContent || (attachments ? `[${attachments.length} file(s) attached]` : ""),
			timestamp: Date.now(),
			attachments,
		};

		setMessages((prev) => [...prev, userMessage]);
		setIsLoading(true);
		setStreamingContent("");
		setStreamingThinking("");

		// Create abort controller for this request
		const abortController = new AbortController();
		abortControllerRef.current = abortController;

		const cliTraceId = tracing.traceStart("chat-message", {
			sessionId: currentChatId ?? undefined,
			input: resolvedContent,
			metadata: {
				model: currentModel,
				isCli: true,
				pluginVersion: plugin.manifest.version,
			},
		});

		try {
			const allMessages = [...messages, userMessage];

			// Build system prompt for CLI (read-only mode)
			const cliName = isClaudeCli ? "Claude CLI" : isCodexCli ? "Codex CLI" : "Gemini CLI";
			let systemPrompt = "You are a helpful AI assistant integrated with Obsidian.";
			systemPrompt += `\n\nNote: You are running in ${cliName} mode with limited capabilities. You can read and search vault files, but cannot modify them.`;
			systemPrompt += `\n\nIMPORTANT: File writing operations may fail in this environment. Always output results directly to standard output instead of attempting to write to files.`;
			systemPrompt += `\n\nVault location: ${(plugin.app.vault.adapter as unknown as { basePath?: string }).basePath || "."}`;

			if (plugin.settings.systemPrompt) {
				systemPrompt += `\n\nAdditional instructions: ${plugin.settings.systemPrompt}`;
			}

			// Inject active agent skills into system prompt
			let cliLoadedSkills: LoadedSkill[] = [];
			if (effectiveSkillPaths.length > 0) {
				const activeMetadata = availableSkills.filter(s => effectiveSkillPaths.includes(s.folderPath));
				if (activeMetadata.length > 0) {
					cliLoadedSkills = await Promise.all(
						activeMetadata.map(m => loadSkill(plugin.app, m))
					);
					const skillPrompt = buildSkillSystemPrompt(cliLoadedSkills, { cliMode: true });
					if (skillPrompt) {
						systemPrompt += skillPrompt;
					}
				}
			}

			// Local RAG: search and inject context into system prompt
			let localRagSources: string[] = [];
			if (selectedRagSetting && selectedRagSetting !== "__websearch__") {
				const ragSettingObj = plugin.getRagSetting(selectedRagSetting);
				if (ragSettingObj) {
					try {
						const localRag = await searchLocalRag(
							selectedRagSetting, resolvedContent,
							ragSettingObj, getGeminiApiKey(plugin.settings),
							plugin.settings.proxyUrl, plugin.settings.proxyBypass
						);
						if (localRag.sources.length > 0) {
							systemPrompt += localRag.context;
							localRagSources = localRag.sources;
							// Attach multimodal RAG files so the LLM can see actual content
							if (localRag.mediaReferences.length > 0) {
								const ragAttachments = await loadRagMediaAttachments(plugin.app, localRag.mediaReferences);
								if (ragAttachments.length > 0) {
									const existing = userMessage.attachments || [];
									(userMessage as { attachments?: import("src/types").Attachment[] }).attachments = [...existing, ...ragAttachments];
								}
							}
						}
					} catch (e) {
						console.error("Local RAG search failed:", formatError(e));
					}
				}
			}

			let fullContent = "";
			let stopped = false;
			let receivedSessionId: string | null = null;

			// Get vault base path for working directory
			const vaultBasePath = (plugin.app.vault.adapter as unknown as { basePath?: string }).basePath || ".";

			// Determine current provider name
			const currentProvider: ChatProvider = isClaudeCli ? "claude-cli" : isCodexCli ? "codex-cli" : "gemini-cli";

			// Get or create persistent CLI session
			const existingSession = persistentCliRef.current;
			let session: PersistentCliSession;
			if (existingSession && existingSession.isAlive && existingSession.provider === currentProvider) {
				// Reuse existing persistent session
				session = existingSession;
			} else {
				// Terminate old session if provider changed or session died
				existingSession?.terminate();
				// Create new persistent session, passing stored session ID for --resume
				const storedSessionId = cliSession?.provider === currentProvider
					? cliSession.sessionId
					: undefined;
				session = new PersistentCliSession(
					currentProvider, vaultBasePath,
					undefined, storedSessionId
				);
				session.start();
				persistentCliRef.current = session;
			}

			// === Agent loop ===
			// Each iteration: stream CLI → detect skill markers → execute → feed
			// results back as a follow-up user message → loop until no markers
			// or MAX_MARKER_AGENT_ITERATIONS reached. Uses the persistent /
			// --resume session so the CLI preserves context across iterations.
			let processedContent = "";
			let conversationHistory: Message[] = allMessages;
			let iterationUserContent = allMessages[allMessages.length - 1]?.role === "user"
				? allMessages[allMessages.length - 1].content
				: "";

			for (let iteration = 0; iteration < MAX_MARKER_AGENT_ITERATIONS; iteration++) {
				let iterationContent = "";
				const streamSep = fullContent ? "\n\n" : "";

				for await (const chunk of session.sendMessage(
					iterationUserContent,
					conversationHistory,
					systemPrompt,
					abortController.signal
				)) {
					if (abortController.signal.aborted) {
						stopped = true;
						break;
					}

					switch (chunk.type) {
						case "text":
							iterationContent += chunk.content || "";
							if (isActive()) setStreamingContent(fullContent + streamSep + iterationContent);
							break;

						case "session_id":
							if (chunk.sessionId) {
								receivedSessionId = chunk.sessionId;
							}
							break;

						case "error":
							throw new Error(chunk.error || "Unknown error");

						case "done":
							break;
					}
				}

				if (stopped) break;

				// Execute any skill markers in this iteration's output
				const markerResult = cliLoadedSkills.length > 0
					? await processSkillMarkers(plugin, iterationContent, cliLoadedSkills, abortController.signal)
					: { processedContent: iterationContent, followUpMessage: undefined, aborted: false };

				// Append this iteration's processed content to accumulated display
				fullContent += (fullContent && markerResult.processedContent ? "\n\n" : "") + markerResult.processedContent;
				processedContent = fullContent;
				if (isActive()) setStreamingContent(fullContent);

				// User cancelled mid-marker execution — stop the agent loop.
				if (markerResult.aborted) { stopped = true; break; }

				// If no markers were executed, the turn is complete
				if (!markerResult.followUpMessage) break;

				// Feed results back to the CLI on the next iteration
				conversationHistory = [
					...conversationHistory,
					{ role: "assistant", content: iterationContent, timestamp: Date.now() } as Message,
					{ role: "user", content: markerResult.followUpMessage, timestamp: Date.now() } as Message,
				];
				iterationUserContent = markerResult.followUpMessage;
			}

			if (stopped && fullContent) {
				fullContent += `\n\n${t("chat.generationStopped")}`;
				processedContent = fullContent;
			}

			// Update session state from persistent session
			const effectiveSessionId = receivedSessionId || session.currentSessionId;
			const newSession: CliSessionInfo | null = effectiveSessionId
				? { provider: currentProvider, sessionId: effectiveSessionId }
				: (cliSession?.provider === currentProvider ? cliSession : null);

			if (isActive() && (effectiveSessionId || cliSession?.provider !== currentProvider)) {
				setCliSession(newSession);
			}

			// Add assistant message with CLI model info
			const assistantMessage: Message = {
				role: "assistant",
				content: processedContent,
				timestamp: Date.now(),
				model: currentProvider,
				...(localRagSources.length > 0 ? { ragUsed: true, ragSources: localRagSources } : {}),
			};

			const newMessages = [...messages, userMessage, assistantMessage];
			await saveResult(newMessages, newSession || undefined);

			tracing.traceEnd(cliTraceId, { output: processedContent });
			tracing.score(cliTraceId, {
				name: "status",
				value: stopped ? 0.5 : 1,
				comment: stopped ? "stopped by user" : "completed",
			});
		} catch (error) {
			const errorMessageText = error instanceof Error ? error.message : t("chat.unknownError");
			const errorMessage: Message = {
				role: "assistant",
				content: t("chat.errorOccurred", { message: errorMessageText }),
				timestamp: Date.now(),
			};
			await saveResult([...messages, userMessage, errorMessage]);
			tracing.traceEnd(cliTraceId, { output: errorMessageText, metadata: { error: true } });
			tracing.score(cliTraceId, { name: "status", value: 0, comment: errorMessageText });
		} finally {
			cleanupStream(abortController);
		}
	};

	// Send message via Local LLM provider
	const sendMessageViaLocalLlm = async (content: string, attachments?: Attachment[], skillPath?: string) => {
		const { isActive, saveResult, cleanup: cleanupStream } = createStreamSession();

		const llmConfig = plugin.settings.localLlmConfig || DEFAULT_LOCAL_LLM_CONFIG;

		// Activate skill if invoked via slash command
		let effectiveSkillPaths = activeSkillPaths;
		if (skillPath && !effectiveSkillPaths.includes(skillPath)) {
			effectiveSkillPaths = [...effectiveSkillPaths, skillPath];
			setActiveSkillPaths(effectiveSkillPaths);
		}

		// Resolve variables in the content
		const resolvedContent = await resolveMessageVariables(content);
		// Separate image attachments (sent as multimodal) from non-image (text fallback)
		const imageAttachments = attachments?.filter(a => a.type === "image") ?? [];
		const nonImageAttachments = attachments?.filter(a => a.type !== "image") ?? [];
		const localLlmContent = `${resolvedContent}${buildLocalLlmAttachmentContext(nonImageAttachments.length > 0 ? nonImageAttachments : undefined)}`.trim();

		// When skill is invoked without message, use skill name as trigger
		let displayContent = resolvedContent.trim();
		if (!displayContent && skillPath) {
			const skillMeta = availableSkills.find(s => s.folderPath === skillPath);
			displayContent = skillMeta ? `/${skillMeta.name}` : "/skill";
		}

		// Add user message
		const userMessage: Message = {
			role: "user",
			content: displayContent || (attachments ? `[${attachments.length} file(s) attached]` : ""),
			llmContent: localLlmContent || undefined,
			timestamp: Date.now(),
			attachments,
		};

		setMessages((prev) => [...prev, userMessage]);
		setIsLoading(true);
		setStreamingContent("");
		setStreamingThinking("");

		// Create abort controller for this request
		const abortController = new AbortController();
		abortControllerRef.current = abortController;

		const llmTraceId = tracing.traceStart("chat-message", {
			sessionId: currentChatId ?? undefined,
			input: localLlmContent,
			metadata: {
				model: `local-llm:${llmConfig.model}`,
				isLocalLlm: true,
				pluginVersion: plugin.manifest.version,
			},
		});

		try {
			const allMessages = [...messages, userMessage];

			// Build system prompt for local LLM
			let systemPrompt = "You are a helpful AI assistant integrated with Obsidian.";
			systemPrompt += `\n\nNote: You are running in Local LLM mode with limited capabilities. You do not have direct vault tool access in this mode.`;
			systemPrompt += `\n\nUse only information already present in the conversation, text attachments inlined into the prompt, and any local RAG context that may be added below.`;
			systemPrompt += `\n\nIMPORTANT: Do not claim that you can open, search, or modify vault files unless their contents are already included in the prompt.`;
			systemPrompt += `\n\nVault location: ${(plugin.app.vault.adapter as unknown as { basePath?: string }).basePath || "."}`;

			if (plugin.settings.systemPrompt) {
				systemPrompt += `\n\nAdditional instructions: ${plugin.settings.systemPrompt}`;
			}

			// Inject active agent skills into system prompt
			let llmLoadedSkills: LoadedSkill[] = [];
			if (effectiveSkillPaths.length > 0) {
				const activeMetadata = availableSkills.filter(s => effectiveSkillPaths.includes(s.folderPath));
				if (activeMetadata.length > 0) {
					llmLoadedSkills = await Promise.all(
						activeMetadata.map(m => loadSkill(plugin.app, m))
					);
					const skillPrompt = buildSkillSystemPrompt(llmLoadedSkills, { cliMode: true });
					if (skillPrompt) {
						systemPrompt += skillPrompt;
					}
				}
			}

			// Local RAG: search and inject context into system prompt
			let localRagSources: string[] = [];
			if (selectedRagSetting && selectedRagSetting !== "__websearch__") {
				const ragSettingObj = plugin.getRagSetting(selectedRagSetting);
				if (ragSettingObj) {
					try {
						const localRag = await searchLocalRag(
							selectedRagSetting, resolvedContent,
							ragSettingObj, getGeminiApiKey(plugin.settings),
							plugin.settings.proxyUrl, plugin.settings.proxyBypass
						);
						if (localRag.sources.length > 0) {
							systemPrompt += localRag.context;
							localRagSources = localRag.sources;
							// Attach multimodal RAG files so the LLM can see actual content
							if (localRag.mediaReferences.length > 0) {
								const ragAttachments = await loadRagMediaAttachments(plugin.app, localRag.mediaReferences);
								if (ragAttachments.length > 0) {
									const existing = userMessage.attachments || [];
									(userMessage as { attachments?: import("src/types").Attachment[] }).attachments = [...existing, ...ragAttachments];
								}
							}
						}
					} catch (e) {
						console.error("Local RAG search failed:", formatError(e));
					}
				}
			}

			let fullContent = "";
			let fullThinking = "";
			let stopped = false;

			// === Agent loop ===
			// Local LLMs rely on text markers rather than function calls for skill
			// workflow/script invocation. Each iteration streams → detects markers
			// → executes → feeds results back as a follow-up user message. The
			// local LLM is re-prompted with updated history so it can continue
			// reasoning on tool outputs. Bounded by MAX_MARKER_AGENT_ITERATIONS.
			let processedContent = "";
			let conversationHistory: Message[] = allMessages;

			for (let iteration = 0; iteration < MAX_MARKER_AGENT_ITERATIONS; iteration++) {
				let iterationContent = "";
				const streamSep = fullContent ? "\n\n" : "";

				for await (const chunk of localLlmChatStream(
					llmConfig,
					conversationHistory,
					systemPrompt,
					abortController.signal,
					imageAttachments.length > 0 ? imageAttachments : undefined,
				)) {
					if (abortController.signal.aborted) {
						stopped = true;
						break;
					}

					switch (chunk.type) {
						case "text":
							iterationContent += chunk.content || "";
							if (isActive()) setStreamingContent(fullContent + streamSep + iterationContent);
							break;

						case "thinking":
							fullThinking += chunk.content || "";
							if (isActive()) setStreamingThinking(fullThinking);
							break;

						case "error":
							throw new Error(chunk.error || "Unknown error");

						case "done":
							break;
					}
				}

				if (stopped) break;

				const markerResult = llmLoadedSkills.length > 0
					? await processSkillMarkers(plugin, iterationContent, llmLoadedSkills, abortController.signal)
					: { processedContent: iterationContent, followUpMessage: undefined, aborted: false };

				fullContent += (fullContent && markerResult.processedContent ? "\n\n" : "") + markerResult.processedContent;
				processedContent = fullContent;
				if (isActive()) setStreamingContent(fullContent);

				if (markerResult.aborted) { stopped = true; break; }
				if (!markerResult.followUpMessage) break;

				conversationHistory = [
					...conversationHistory,
					{ role: "assistant", content: iterationContent, timestamp: Date.now() } as Message,
					{ role: "user", content: markerResult.followUpMessage, timestamp: Date.now() } as Message,
				];
			}

			if (stopped && fullContent) {
				fullContent += `\n\n${t("chat.generationStopped")}`;
				processedContent = fullContent;
			}

			// Add assistant message
			const assistantMessage: Message = {
				role: "assistant",
				content: processedContent,
				timestamp: Date.now(),
				model: "local-llm",
				...(fullThinking ? { thinking: fullThinking } : {}),
				...(localRagSources.length > 0 ? { ragUsed: true, ragSources: localRagSources } : {}),
			};

			const newMessages = [...messages, userMessage, assistantMessage];
			if (isActive()) setCliSession(null);
			await saveResult(newMessages, null);

			tracing.traceEnd(llmTraceId, { output: processedContent });
			tracing.score(llmTraceId, {
				name: "status",
				value: stopped ? 0.5 : 1,
				comment: stopped ? "stopped by user" : "completed",
			});
		} catch (error) {
			const errorMessageText = error instanceof Error ? error.message : t("chat.unknownError");
			const errorMessage: Message = {
				role: "assistant",
				content: t("chat.errorOccurred", { message: errorMessageText }),
				timestamp: Date.now(),
			};
			await saveResult([...messages, userMessage, errorMessage]);
			tracing.traceEnd(llmTraceId, { output: errorMessageText, metadata: { error: true } });
			tracing.score(llmTraceId, { name: "status", value: 0, comment: errorMessageText });
		} finally {
			cleanupStream(abortController);
		}
	};

	// Send message via API provider (OpenAI-compatible)
	const sendMessageViaApiProvider = async (content: string, attachments?: Attachment[], skillPath?: string) => {
		const { isActive, saveResult, cleanup: cleanupStream } = createStreamSession();

		const providerConfig = getActiveApiProvider();
		const resolvedModelName = getApiProviderModelName(currentModel) || providerConfig?.enabledModels[0] || "";
		if (!providerConfig) {
			new Notice(t("chat.noApiProvider"));
			return;
		}

		const resolvedContent = await resolveMessageVariables(content);

		let displayContent = resolvedContent.trim();
		if (!displayContent && skillPath) {
			const skillMeta = availableSkills.find(s => s.folderPath === skillPath);
			displayContent = skillMeta ? `/${skillMeta.name}` : "/skill";
		}

		const userMessage: Message = {
			role: "user",
			content: displayContent || (attachments ? `[${attachments.length} file(s) attached]` : ""),
			timestamp: Date.now(),
			attachments: attachments && attachments.length > 0 ? attachments : undefined,
		};
		setMessages((prev) => [...prev, userMessage]);
		setIsLoading(true);
		setStreamingContent("");
		setStreamingThinking("");

		const abortController = new AbortController();
		abortControllerRef.current = abortController;

		const apiTraceId = tracing.traceStart("api-provider-chat", {
			input: resolvedContent,
			metadata: { provider: providerConfig.name, model: resolvedModelName },
		});

		try {
			const settings = plugin.settings;
			let systemPrompt = `You are a helpful AI assistant in an Obsidian vault.
Always be helpful and provide clear, concise responses. When working with notes, confirm actions and provide relevant feedback.`;

			if (settings.systemPrompt) {
				systemPrompt += `\n\nAdditional instructions: ${settings.systemPrompt}`;
			}

			// Local RAG: search and inject context into system prompt
			let localRagSources: string[] = [];
			if (selectedRagSetting && selectedRagSetting !== "__websearch__") {
				const ragSettingObj = plugin.getRagSetting(selectedRagSetting);
				if (ragSettingObj) {
					try {
						const localRag = await searchLocalRag(
							selectedRagSetting, resolvedContent,
							ragSettingObj, getGeminiApiKey(plugin.settings),
							plugin.settings.proxyUrl, plugin.settings.proxyBypass
						);
						if (localRag.sources.length > 0) {
							systemPrompt += localRag.context;
							localRagSources = localRag.sources;
							// Attach multimodal RAG files so the LLM can see actual content
							if (localRag.mediaReferences.length > 0) {
								const ragAttachments = await loadRagMediaAttachments(plugin.app, localRag.mediaReferences);
								if (ragAttachments.length > 0) {
									const existing = userMessage.attachments || [];
									(userMessage as { attachments?: import("src/types").Attachment[] }).attachments = [...existing, ...ragAttachments];
								}
							}
						}
					} catch (e) {
						console.error("Local RAG search failed:", formatError(e));
					}
				}
			}

			// Build vault tools (same as Gemini path)
			const allMessages = [...messages, userMessage];
			let tools = getEnabledTools({ allowWrite: true, allowDelete: true, ragEnabled: false });
			const obsidianToolExecutor = createToolExecutor(plugin.app, {
				listNotesLimit: settings.listNotesLimit,
				maxNoteChars: settings.maxNoteChars,
			});

			// Fetch MCP tools
			let mcpToolExecutor: McpToolExecutor | null = null;
			const enabledMcpServers = settings.mcpServers.filter(s => s.enabled);
			if (enabledMcpServers.length > 0) {
				try {
					const mcpTools = await fetchMcpTools(enabledMcpServers);
					tools = [...tools, ...mcpTools];
					mcpToolExecutor = createMcpToolExecutor(mcpTools, apiTraceId);
				} catch (e) {
					console.error("Failed to fetch MCP tools:", e);
				}
			}

			// Add JavaScript sandbox tool
			tools.push(EXECUTE_JAVASCRIPT_TOOL);

			// Load skills for API provider mode
			let apiLoadedSkills: LoadedSkill[] = [];
			{
				let effectiveSkillPaths = activeSkillPaths;
				if (skillPath && !effectiveSkillPaths.includes(skillPath)) {
					effectiveSkillPaths = [...effectiveSkillPaths, skillPath];
				}
				if (effectiveSkillPaths.length > 0) {
					const activeMetadata = availableSkills.filter(s => effectiveSkillPaths.includes(s.folderPath));
					if (activeMetadata.length > 0) {
						apiLoadedSkills = await Promise.all(activeMetadata.map(m => loadSkill(plugin.app, m)));
					}
				}
			}
			if (apiLoadedSkills.length > 0) {
				systemPrompt += buildSkillSystemPrompt(apiLoadedSkills);
			}
			if (apiLoadedSkills.some(s => s.workflows.length > 0)) {
				tools.push(skillWorkflowTool);
			}
			if (apiLoadedSkills.some(s => s.scripts.length > 0)) {
				tools.push(skillScriptTool);
			}

			const apiSkillWorkflowMap = apiLoadedSkills.length > 0 ? collectSkillWorkflows(apiLoadedSkills) : new Map();
			const apiSkillScriptMap = apiLoadedSkills.length > 0 ? collectSkillScripts(apiLoadedSkills) : new Map();

			// Track processed edits/deletes/renames for message display
			const processedEdits: PendingEditInfo[] = [];
			const processedDeletes: PendingDeleteInfo[] = [];
			const processedRenames: PendingRenameInfo[] = [];

			const baseExecuteToolCall = async (name: string, args: Record<string, unknown>) => {
				if (name.startsWith("mcp_") && mcpToolExecutor) {
					const mcpResult = await mcpToolExecutor.execute(name, args);
					if (mcpResult.error) return { error: mcpResult.error };
					return { result: mcpResult.result };
				}
				if (name === "run_skill_workflow" && apiSkillWorkflowMap.size > 0) {
					return await executeSkillWorkflow(plugin, args.workflowId as string, args.variables as string | undefined, apiSkillWorkflowMap);
				}
				if (name === "run_skill_script" && apiSkillScriptMap.size > 0) {
					return await executeSkillScript(plugin, args.scriptId as string, args.args as string | undefined, apiSkillScriptMap);
				}
				if (name === "execute_javascript") {
					return await handleExecuteJavascriptTool(args);
				}
				return await obsidianToolExecutor(name, args);
			};

			// Wrap tool executor to handle propose_edit/propose_delete/rename with immediate confirmation
			const executeToolCall = async (name: string, args: Record<string, unknown>) => {
				const prevPendingEdit = getPendingEdit();
				const prevPendingDelete = getPendingDelete();
				const prevPendingRename = getPendingRename();
				const prevPendingBulkEdit = getPendingBulkEdit();
				const prevPendingBulkDelete = getPendingBulkDelete();
				const prevPendingBulkRename = getPendingBulkRename();
				const result = await baseExecuteToolCall(name, args) as Record<string, unknown>;
				const toolCallFailed = didToolCallFail(result);

				// Handle propose_edit with immediate confirmation
				if (name === "propose_edit") {
					const pending = getPendingEdit();
					const hasNewPending = pending && pending.createdAt !== prevPendingEdit?.createdAt;
					if (hasNewPending && !toolCallFailed) {
						const slashCommand = currentSlashCommandRef.current;
						const shouldAutoApply = slashCommand && slashCommand.confirmEdits === false;

						if (shouldAutoApply) {
							const applyResult = await applyEdit(plugin.app);
							if (applyResult.success) {
								processedEdits.push({ originalPath: pending.originalPath, status: "applied" });
								return { ...result, applied: true, message: `Applied changes to "${pending.originalPath}"` };
							} else {
								discardEdit(plugin.app);
								processedEdits.push({ originalPath: pending.originalPath, status: "failed" });
								return { ...result, applied: false, error: applyResult.error };
							}
						} else {
							const confirmResult = await promptForConfirmation(
								plugin.app,
								pending.originalPath,
								pending.newContent,
								"overwrite",
								pending.originalContent
							);

							if (confirmResult.confirmed) {
								const applyResult = await applyEdit(plugin.app);
								if (applyResult.success) {
									processedEdits.push({ originalPath: pending.originalPath, status: "applied" });
									return { ...result, applied: true, message: `Applied changes to "${pending.originalPath}"` };
								} else {
									discardEdit(plugin.app);
									processedEdits.push({ originalPath: pending.originalPath, status: "failed" });
									return { ...result, applied: false, error: applyResult.error };
								}
							} else if (confirmResult.additionalRequest !== undefined) {
								discardEdit(plugin.app);
								processedEdits.push({ originalPath: pending.originalPath, status: "discarded" });
								return { ...result, applied: false, message: "User requested changes" };
							} else {
								discardEdit(plugin.app);
								processedEdits.push({ originalPath: pending.originalPath, status: "discarded" });
								return { ...result, applied: false, message: "User cancelled the edit" };
							}
						}
					}
				}

				// Handle propose_delete with immediate confirmation
				if (name === "propose_delete") {
					const pending = getPendingDelete();
					const hasNewPending = pending && pending.createdAt !== prevPendingDelete?.createdAt;
					if (hasNewPending && !toolCallFailed) {
						const confirmed = await promptForDeleteConfirmation(
							plugin.app,
							pending.path,
							pending.content
						);

						if (confirmed) {
							const deleteResult = await applyDelete(plugin.app);
							if (deleteResult.success) {
								processedDeletes.push({ path: pending.path, status: "deleted" });
								return { ...result, deleted: true, message: `Deleted "${pending.path}"` };
							} else {
								discardDelete(plugin.app);
								processedDeletes.push({ path: pending.path, status: "failed" });
								return { ...result, deleted: false, error: deleteResult.error };
							}
						} else {
							discardDelete(plugin.app);
							processedDeletes.push({ path: pending.path, status: "cancelled" });
							return { ...result, deleted: false, message: "User cancelled the deletion" };
						}
					}
				}

				// Handle rename_note with confirmation
				if (name === "rename_note") {
					const pendingRn = getPendingRename();
					const hasNewPending = pendingRn && pendingRn.createdAt !== prevPendingRename?.createdAt;
					if (hasNewPending && !toolCallFailed) {
						const confirmed = await promptForRenameConfirmation(
							plugin.app,
							pendingRn.originalPath,
							pendingRn.newPath
						);

						if (confirmed) {
							const renameResult = await applyRename(plugin.app);
							if (renameResult.success) {
								processedRenames.push({ originalPath: pendingRn.originalPath, newPath: pendingRn.newPath, status: "applied" });
								return { ...result, applied: true, message: `Renamed "${pendingRn.originalPath}" to "${pendingRn.newPath}"` };
							} else {
								discardRename(plugin.app);
								processedRenames.push({ originalPath: pendingRn.originalPath, newPath: pendingRn.newPath, status: "failed" });
								return { ...result, applied: false, error: renameResult.error };
							}
						} else {
							discardRename(plugin.app);
							processedRenames.push({ originalPath: pendingRn.originalPath, newPath: pendingRn.newPath, status: "discarded" });
							return { ...result, applied: false, message: "User cancelled the rename" };
						}
					}
				}

				// Handle bulk_propose_edit with immediate confirmation
				if (name === "bulk_propose_edit") {
					const pendingBulk = getPendingBulkEdit();
					const hasNewPending = pendingBulk && pendingBulk.createdAt !== prevPendingBulkEdit?.createdAt;
					if (hasNewPending && !toolCallFailed && pendingBulk.items.length > 0) {
						const selectedPaths = await promptForBulkEditConfirmation(
							plugin.app,
							pendingBulk.items
						);

						if (selectedPaths.length > 0) {
							const applyResult = await applyBulkEdit(plugin.app, selectedPaths);
							for (const path of applyResult.applied) {
								processedEdits.push({ originalPath: path, status: "applied" });
							}
							for (const path of applyResult.failed) {
								processedEdits.push({ originalPath: path, status: "failed" });
							}
							return {
								...result,
								applied: applyResult.applied,
								failed: applyResult.failed,
								message: applyResult.message,
							};
						} else {
							discardBulkEdit();
							for (const item of pendingBulk.items) {
								processedEdits.push({ originalPath: item.path, status: "discarded" });
							}
							return { ...result, applied: [], message: "User cancelled all edits" };
						}
					}
				}

				// Handle bulk_propose_delete with immediate confirmation
				if (name === "bulk_propose_delete") {
					const pendingBulk = getPendingBulkDelete();
					const hasNewPending = pendingBulk && pendingBulk.createdAt !== prevPendingBulkDelete?.createdAt;
					if (hasNewPending && !toolCallFailed && pendingBulk.items.length > 0) {
						const selectedPaths = await promptForBulkDeleteConfirmation(
							plugin.app,
							pendingBulk.items
						);

						if (selectedPaths.length > 0) {
							const deleteResult = await applyBulkDelete(plugin.app, selectedPaths);
							for (const path of deleteResult.deleted) {
								processedDeletes.push({ path, status: "deleted" });
							}
							for (const path of deleteResult.failed) {
								processedDeletes.push({ path, status: "failed" });
							}
							return {
								...result,
								deleted: deleteResult.deleted,
								failed: deleteResult.failed,
								message: deleteResult.message,
							};
						} else {
							discardBulkDelete();
							for (const item of pendingBulk.items) {
								processedDeletes.push({ path: item.path, status: "cancelled" });
							}
							return { ...result, deleted: [], message: "User cancelled all deletions" };
						}
					}
				}

				// Handle bulk_propose_rename with immediate confirmation
				if (name === "bulk_propose_rename") {
					const pendingBulk = getPendingBulkRename();
					const hasNewPending = pendingBulk && pendingBulk.createdAt !== prevPendingBulkRename?.createdAt;
					if (hasNewPending && !toolCallFailed && pendingBulk.items.length > 0) {
						const selectedPaths = await promptForBulkRenameConfirmation(
							plugin.app,
							pendingBulk.items
						);

						if (selectedPaths.length > 0) {
							const renameResult = await applyBulkRename(plugin.app, selectedPaths);
							for (const path of renameResult.applied) {
								const item = pendingBulk.items.find(i => i.originalPath === path);
								if (item) {
									processedRenames.push({ originalPath: item.originalPath, newPath: item.newPath, status: "applied" });
								}
							}
							for (const path of renameResult.failed) {
								const item = pendingBulk.items.find(i => i.originalPath === path);
								if (item) {
									processedRenames.push({ originalPath: item.originalPath, newPath: item.newPath, status: "failed" });
								}
							}
							return {
								...result,
								applied: renameResult.applied,
								failed: renameResult.failed,
								message: renameResult.message,
							};
						} else {
							discardBulkRename();
							for (const item of pendingBulk.items) {
								processedRenames.push({ originalPath: item.originalPath, newPath: item.newPath, status: "discarded" });
							}
							return { ...result, applied: [], message: "User cancelled all renames" };
						}
					}
				}

				return result;
			};

			let fullContent = "";
			let thinkingContent = "";
			const toolsUsed: string[] = [];
			const generatedImages: GeneratedImage[] = [];
			let stopped = false;
			let streamUsage: Message["usage"] = undefined;
			const startTime = Date.now();

			// Route to correct provider implementation
			const apiEnableThinking = getThinkingToggle();
			const isImageGen = providerConfig.type === "openai" && isOpenAiImageModel(resolvedModelName);
			const streamFn = isImageGen
				? openaiGenerateImageStream(
					providerConfig.baseUrl, providerConfig.apiKey,
					resolvedModelName, resolvedContent,
					abortController.signal,
					plugin.settings.proxyUrl, plugin.settings.proxyBypass,
				)
				: providerConfig.type === "anthropic"
					? anthropicChatWithToolsStream(
						providerConfig.baseUrl, providerConfig.apiKey,
						resolvedModelName, allMessages, tools,
						systemPrompt, executeToolCall, abortController.signal,
						apiEnableThinking,
						plugin.settings.proxyUrl, plugin.settings.proxyBypass,
					)
					: openaiChatWithToolsStream(
						providerConfig.baseUrl, providerConfig.apiKey,
						resolvedModelName, allMessages, tools,
						systemPrompt, executeToolCall, abortController.signal,
						apiEnableThinking,
						plugin.settings.proxyUrl, plugin.settings.proxyBypass,
					);

			for await (const chunk of streamFn) {
				if (abortController.signal.aborted) {
					stopped = true;
					break;
				}

				switch (chunk.type) {
					case "text":
						fullContent += chunk.content || "";
						if (isActive()) setStreamingContent(fullContent);
						break;

					case "thinking":
						thinkingContent += chunk.content || "";
						if (isActive()) setStreamingThinking(thinkingContent);
						break;

					case "tool_call":
						if (chunk.toolCall) {
							toolsUsed.push(chunk.toolCall.name);
						}
						break;

					case "image_generated":
						if (chunk.generatedImage) {
							generatedImages.push(chunk.generatedImage);
						}
						break;

					case "error":
						throw new Error(chunk.error || "Unknown error");

					case "done":
						streamUsage = chunk.usage;
						break;
				}
			}

			if (stopped && fullContent) {
				fullContent += `\n\n${t("chat.generationStopped")}`;
			}

			// Cleanup MCP
			if (mcpToolExecutor) {
				try { await mcpToolExecutor.cleanup(); } catch (e) { console.warn("MCP cleanup failed:", e); }
			}

			// Get processed edit/delete/rename info from tool executor
			const pendingEditInfo = getLatestPendingInfo(processedEdits);
			const pendingDeleteInfo = getLatestPendingInfo(processedDeletes);
			const pendingRenameInfo = getLatestPendingInfo(processedRenames);
			const pendingEdits = getPendingInfos(processedEdits);
			const pendingDeletes = getPendingInfos(processedDeletes);
			const pendingRenames = getPendingInfos(processedRenames);

			const elapsedMs = Date.now() - startTime;
			const assistantMessage: Message = {
				role: "assistant",
				content: fullContent,
				timestamp: Date.now(),
				model: currentModel,
				toolsUsed: toolsUsed.length > 0 ? toolsUsed : undefined,
				thinking: thinkingContent || undefined,
				pendingEdit: pendingEditInfo,
				pendingEdits,
				pendingDelete: pendingDeleteInfo,
				pendingDeletes,
				pendingRename: pendingRenameInfo,
				pendingRenames,
				ragUsed: localRagSources.length > 0,
				ragSources: localRagSources.length > 0 ? localRagSources : undefined,
				generatedImages: generatedImages.length > 0 ? generatedImages : undefined,
				imageGenerationUsed: generatedImages.length > 0 || undefined,
				usage: streamUsage,
				elapsedMs,
			};
			const newMessages = [...messages, userMessage, assistantMessage];
			await saveResult(newMessages);

			tracing.traceEnd(apiTraceId, { output: fullContent });
			tracing.score(apiTraceId, {
				name: "status",
				value: stopped ? 0.5 : 1,
				comment: stopped ? "stopped by user" : "completed",
			});
		} catch (error) {
			const errorMessageText = error instanceof Error ? error.message : t("chat.unknownError");
			const errorMessage: Message = {
				role: "assistant",
				content: t("chat.errorOccurred", { message: errorMessageText }),
				timestamp: Date.now(),
			};
			await saveResult([...messages, userMessage, errorMessage]);
			tracing.traceEnd(apiTraceId, { output: errorMessageText, metadata: { error: true } });
			tracing.score(apiTraceId, { name: "status", value: 0, comment: errorMessageText });
		} finally {
			cleanupStream(abortController);
		}
	};

	// Send message to Gemini
	const sendMessage = async (content: string, attachments?: Attachment[], skillPath?: string) => {
		if ((!content.trim() && !skillPath && (!attachments || attachments.length === 0)) || isLoading) return;

		// Use API provider if in api-provider mode
		if (isApiProviderMode) {
			// Check if this is a Gemini provider → route to Gemini path
			const provider = getActiveApiProvider();
			if (provider?.type === "gemini") {
				await sendMessageViaGemini(content, attachments, skillPath, provider);
				return;
			}
			await sendMessageViaApiProvider(content, attachments, skillPath);
			return;
		}

		// Use Local LLM provider if in local LLM mode
		if (isLocalLlmMode) {
			await sendMessageViaLocalLlm(content, attachments, skillPath);
			return;
		}

		// Use CLI provider if in CLI mode
		if (isCliMode) {
			await sendMessageViaCli(content, attachments, skillPath);
			return;
		}

		// No provider matched - show error
		new Notice(t("chat.clientNotInitialized"));
	};

	// Send message via Gemini provider (uses @google/genai SDK)
	const sendMessageViaGemini = async (content: string, attachments?: Attachment[], skillPath?: string, providerConfig?: ApiProviderConfig) => {
		const { isActive, saveResult, cleanup: cleanupStream } = createStreamSession();

		const apiKey = providerConfig?.apiKey || getGeminiApiKey(plugin.settings);
		if (!apiKey) {
			new Notice(t("chat.clientNotInitialized"));
			return;
		}

		// Initialize a GeminiClient with this provider's API key
		const { GeminiClient } = await import("src/core/gemini");
		const modelName = getApiProviderModelName(currentModel) || providerConfig?.enabledModels[0] || "gemini-3-flash-preview";
		const client = new GeminiClient(apiKey, modelName as ModelType, plugin.settings.proxyUrl, plugin.settings.proxyBypass);

		let allowedModel = modelName as ModelType;

		// Auto-switch to image model when image generation keywords detected
		if (!isImageGenerationModel(allowedModel) && shouldUseImageModel(content)) {
			// Check provider's availableModels for an image model
			const imageModel = providerConfig?.availableModels?.find(m => isImageGenerationModel(m));
			if (imageModel) {
				allowedModel = imageModel as ModelType;
			}
		}

		client.setModel(allowedModel);

		// Resolve variables in the content ({selection}, {content}, file paths)
		const resolvedContent = await resolveMessageVariables(content);

		// When skill is invoked without message, use skill name as trigger
		let displayContent = resolvedContent.trim();
		if (!displayContent && skillPath) {
			const skillMeta = availableSkills.find(s => s.folderPath === skillPath);
			displayContent = skillMeta ? `/${skillMeta.name}` : "/skill";
		}

		// Add user message
		const userMessage: Message = {
			role: "user",
			content: displayContent || (attachments ? `[${attachments.length} file(s) attached]` : ""),
			timestamp: Date.now(),
			attachments,
		};

		setMessages((prev) => [...prev, userMessage]);
		setIsLoading(true);
		setStreamingContent("");
		setStreamingThinking("");

		// Create abort controller for this request
		const abortController = new AbortController();
		abortControllerRef.current = abortController;

		const traceId = tracing.traceStart("chat-message", {
			sessionId: currentChatId ?? undefined,
			metadata: {
				model: allowedModel,
				ragEnabled: allowRag,
				webSearchEnabled: selectedRagSetting === "__websearch__",
				toolsEnabled: !isImageGenerationModel(allowedModel),
				isImageGeneration: isImageGenerationModel(allowedModel),
				pluginVersion: plugin.manifest.version,
			},
			input: resolvedContent,
		});

		// Track MCP executor for background-stream cleanup (hoisted so the
		// outer finally block can reach it even though it's created inside
		// runStreamOnce).  Wrapped in an object to avoid TypeScript narrowing
		// issues with `let` variables reassigned inside nested closures.
		const mcpCleanupRef = { executor: null as McpToolExecutor | null };

		try {
			const runStreamOnce = async () => {
				const { settings } = plugin;
				const toolsEnabled = !isImageGenerationModel(allowedModel);
				const obsidianTools = toolsEnabled ? getEnabledTools({
					allowWrite: true,
					allowDelete: true,
					ragEnabled: allowRag,
				}) : [];

				// Activate skill if invoked via slash command
				let effectiveSkillPaths = activeSkillPaths;
				if (skillPath && !effectiveSkillPaths.includes(skillPath)) {
					effectiveSkillPaths = [...effectiveSkillPaths, skillPath];
					setActiveSkillPaths(effectiveSkillPaths);
				}

				// Load active skills (needed for both workflow tools and system prompt)
				let loadedSkillsList: LoadedSkill[] = [];
				if (effectiveSkillPaths.length > 0) {
					const activeMetadata = availableSkills.filter(s => effectiveSkillPaths.includes(s.folderPath));
					if (activeMetadata.length > 0) {
						loadedSkillsList = await Promise.all(
							activeMetadata.map(m => loadSkill(plugin.app, m))
						);
					}
				}

				// Fetch MCP tools from enabled servers only
				const enabledMcpServers = mcpServers.filter(s => s.enabled);
				const mcpTools: McpToolDefinition[] = toolsEnabled && enabledMcpServers.length > 0
					? await fetchMcpTools(enabledMcpServers)
					: [];

				// Cleanup previous MCP executor if exists
				if (mcpExecutorRef.current) {
					void mcpExecutorRef.current.cleanup();
					mcpExecutorRef.current = null;
				}

				// Create MCP tool executor
				const mcpToolExecutor = mcpTools.length > 0
					? createMcpToolExecutor(mcpTools, traceId)
					: undefined;

				// Store for session reuse and track for background-stream cleanup
				mcpExecutorRef.current = mcpToolExecutor ?? null;
				mcpCleanupRef.executor = mcpToolExecutor ?? null;

				// Merge Obsidian tools and MCP tools
				const allTools = [...obsidianTools, ...mcpTools];

				// Filter Obsidian tools based on vaultToolMode (MCP tools are not affected)
				const vaultToolNames = [
					"read_note", "create_note", "propose_edit", "propose_delete",
					"rename_note", "search_notes", "list_notes", "list_folders",
					"create_folder", "get_active_note", "check_rag_sync"
				];
				const searchToolNames = ["search_notes", "list_notes"];
				const tools = allTools.filter(tool => {
					// MCP tools are always included
					if (isMcpTool(tool)) {
						return true;
					}
					// Filter Obsidian tools based on mode
					if (vaultToolMode === "none") {
						return !vaultToolNames.includes(tool.name);
					}
					if (vaultToolMode === "noSearch") {
						return !searchToolNames.includes(tool.name);
					}
					return true; // "all" mode - keep all tools
				});

				// Add run_skill_workflow tool if any active skill has workflows
				if (toolsEnabled && loadedSkillsList.some(s => s.workflows.length > 0)) {
					tools.push(skillWorkflowTool);
				}

				// Add run_skill_script tool if any active skill has scripts
				if (toolsEnabled && loadedSkillsList.some(s => s.scripts.length > 0)) {
					tools.push(skillScriptTool);
				}

				// Add execute_javascript tool
				if (toolsEnabled) {
					tools.push(EXECUTE_JAVASCRIPT_TOOL);
				}

				// Create context for tools (Obsidian tools only)
				const obsidianToolExecutor = toolsEnabled
					? createToolExecutor(plugin.app, {
						listNotesLimit: settings.listNotesLimit,
						maxNoteChars: settings.maxNoteChars,
					})
					: undefined;

				// Track processed edits/deletes/renames for message display
				const processedEdits: PendingEditInfo[] = [];
				const processedDeletes: PendingDeleteInfo[] = [];
				const processedRenames: PendingRenameInfo[] = [];
				// Track MCP Apps with UI for message display
				const collectedMcpApps: McpAppInfo[] = [];
				// Track pending additional request for edit feedback (use container to bypass TS narrowing)
				const pendingAdditionalRequestRef: { current: { filePath: string; request: string } | null } = { current: null };

				// Build skill workflow/script maps for tool execution
				const skillWorkflowMap = loadedSkillsList.length > 0
					? collectSkillWorkflows(loadedSkillsList)
					: new Map();
				const skillScriptMap = loadedSkillsList.length > 0
					? collectSkillScripts(loadedSkillsList)
					: new Map();

				// Combined tool executor that routes to Obsidian, MCP, or Skill Workflow/Script based on tool name
				const baseToolExecutor = (obsidianToolExecutor || mcpToolExecutor || skillWorkflowMap.size > 0 || skillScriptMap.size > 0)
					? async (name: string, args: Record<string, unknown>) => {
						// MCP tools start with "mcp_"
						if (name.startsWith("mcp_") && mcpToolExecutor) {
							const mcpResult = await mcpToolExecutor.execute(name, args);
							// Collect MCP App info if available
							if (mcpResult.mcpApp) {
								collectedMcpApps.push(mcpResult.mcpApp);
							}
							// Return result in expected format for compatibility
							if (mcpResult.error) {
								return { error: mcpResult.error };
							}
							return { result: mcpResult.result };
						}
						// Skill workflow tool
						if (name === "run_skill_workflow" && skillWorkflowMap.size > 0) {
							return await executeSkillWorkflow(
								plugin,
								args.workflowId as string,
								args.variables as string | undefined,
								skillWorkflowMap,
							);
						}
						// Skill script tool
						if (name === "run_skill_script" && skillScriptMap.size > 0) {
							return await executeSkillScript(
								plugin,
								args.scriptId as string,
								args.args as string | undefined,
								skillScriptMap,
							);
						}
						// JavaScript sandbox tool
						if (name === "execute_javascript") {
							return await handleExecuteJavascriptTool(args);
						}
						// Otherwise use Obsidian tool executor
						if (obsidianToolExecutor) {
							return await obsidianToolExecutor(name, args);
						}
						return { error: `Unknown tool: ${name}` };
					}
					: undefined;

				// Wrap tool executor to handle propose_edit/propose_delete with immediate confirmation
				const toolExecutor = baseToolExecutor
					? async (name: string, args: Record<string, unknown>) => {
						const prevPendingEdit = getPendingEdit();
						const prevPendingDelete = getPendingDelete();
						const prevPendingRename = getPendingRename();
						const prevPendingBulkEdit = getPendingBulkEdit();
						const prevPendingBulkDelete = getPendingBulkDelete();
						const prevPendingBulkRename = getPendingBulkRename();
						const result = await baseToolExecutor(name, args) as Record<string, unknown>;
						const toolCallFailed = didToolCallFail(result);

						// Handle propose_edit with immediate confirmation
						if (name === "propose_edit") {
							const pending = getPendingEdit();
							const hasNewPending = pending && pending.createdAt !== prevPendingEdit?.createdAt;
							if (hasNewPending && !toolCallFailed) {
								// Check if auto-apply is enabled (slash command with confirmEdits=false)
								const slashCommand = currentSlashCommandRef.current;
								const shouldAutoApply = slashCommand && slashCommand.confirmEdits === false;

								if (shouldAutoApply) {
									const applyResult = await applyEdit(plugin.app);
									if (applyResult.success) {
										processedEdits.push({ originalPath: pending.originalPath, status: "applied" });
										return { ...result, applied: true, message: `Applied changes to "${pending.originalPath}"` };
									} else {
										discardEdit(plugin.app);
										processedEdits.push({ originalPath: pending.originalPath, status: "failed" });
										return { ...result, applied: false, error: applyResult.error };
									}
								} else {
									const confirmResult = await promptForConfirmation(
										plugin.app,
										pending.originalPath,
										pending.newContent,
										"overwrite",
										pending.originalContent
									);

									if (confirmResult.confirmed) {
										const applyResult = await applyEdit(plugin.app);
										if (applyResult.success) {
											processedEdits.push({ originalPath: pending.originalPath, status: "applied" });
											return { ...result, applied: true, message: `Applied changes to "${pending.originalPath}"` };
										} else {
											discardEdit(plugin.app);
											processedEdits.push({ originalPath: pending.originalPath, status: "failed" });
											return { ...result, applied: false, error: applyResult.error };
										}
									} else if (confirmResult.additionalRequest !== undefined) {
										// User requested changes with feedback
										discardEdit(plugin.app);
										processedEdits.push({ originalPath: pending.originalPath, status: "discarded" });
										pendingAdditionalRequestRef.current = {
											filePath: pending.originalPath,
											request: confirmResult.additionalRequest,
										};
										return { ...result, applied: false, message: "User requested changes" };
									} else {
										discardEdit(plugin.app);
										processedEdits.push({ originalPath: pending.originalPath, status: "discarded" });
										return { ...result, applied: false, message: "User cancelled the edit" };
									}
								}
							}
						}

						// Handle propose_delete with immediate confirmation
						if (name === "propose_delete") {
							const pending = getPendingDelete();
							const hasNewPending = pending && pending.createdAt !== prevPendingDelete?.createdAt;
							if (hasNewPending && !toolCallFailed) {
								const confirmed = await promptForDeleteConfirmation(
									plugin.app,
									pending.path,
									pending.content
								);

								if (confirmed) {
									const deleteResult = await applyDelete(plugin.app);
									if (deleteResult.success) {
										processedDeletes.push({ path: pending.path, status: "deleted" });
										return { ...result, deleted: true, message: `Deleted "${pending.path}"` };
									} else {
										discardDelete(plugin.app);
										processedDeletes.push({ path: pending.path, status: "failed" });
										return { ...result, deleted: false, error: deleteResult.error };
									}
								} else {
									discardDelete(plugin.app);
									processedDeletes.push({ path: pending.path, status: "cancelled" });
									return { ...result, deleted: false, message: "User cancelled the deletion" };
								}
							}
						}

						// Handle rename_note (now proposeRename) with confirmation
						if (name === "rename_note") {
							const pendingRn = getPendingRename();
							const hasNewPending = pendingRn && pendingRn.createdAt !== prevPendingRename?.createdAt;
							if (hasNewPending && !toolCallFailed) {
								const confirmed = await promptForRenameConfirmation(
									plugin.app,
									pendingRn.originalPath,
									pendingRn.newPath
								);

								if (confirmed) {
									const renameResult = await applyRename(plugin.app);
									if (renameResult.success) {
										processedRenames.push({ originalPath: pendingRn.originalPath, newPath: pendingRn.newPath, status: "applied" });
										return { ...result, applied: true, message: `Renamed "${pendingRn.originalPath}" to "${pendingRn.newPath}"` };
									} else {
										discardRename(plugin.app);
										processedRenames.push({ originalPath: pendingRn.originalPath, newPath: pendingRn.newPath, status: "failed" });
										return { ...result, applied: false, error: renameResult.error };
									}
								} else {
									discardRename(plugin.app);
									processedRenames.push({ originalPath: pendingRn.originalPath, newPath: pendingRn.newPath, status: "discarded" });
									return { ...result, applied: false, message: "User cancelled the rename" };
								}
							}
						}

						// Handle bulk_propose_edit with immediate confirmation
						if (name === "bulk_propose_edit") {
							const pendingBulk = getPendingBulkEdit();
							const hasNewPending = pendingBulk && pendingBulk.createdAt !== prevPendingBulkEdit?.createdAt;
							if (hasNewPending && !toolCallFailed && pendingBulk.items.length > 0) {
								const selectedPaths = await promptForBulkEditConfirmation(
									plugin.app,
									pendingBulk.items
								);

								if (selectedPaths.length > 0) {
									const applyResult = await applyBulkEdit(plugin.app, selectedPaths);
									// Track each applied edit
									for (const path of applyResult.applied) {
										processedEdits.push({ originalPath: path, status: "applied" });
									}
									for (const path of applyResult.failed) {
										processedEdits.push({ originalPath: path, status: "failed" });
									}
									return {
										...result,
										applied: applyResult.applied,
										failed: applyResult.failed,
										message: applyResult.message,
									};
								} else {
									discardBulkEdit();
									// Track all as discarded
									for (const item of pendingBulk.items) {
										processedEdits.push({ originalPath: item.path, status: "discarded" });
									}
									return { ...result, applied: [], message: "User cancelled all edits" };
								}
							}
						}

						// Handle bulk_propose_delete with immediate confirmation
						if (name === "bulk_propose_delete") {
							const pendingBulk = getPendingBulkDelete();
							const hasNewPending = pendingBulk && pendingBulk.createdAt !== prevPendingBulkDelete?.createdAt;
							if (hasNewPending && !toolCallFailed && pendingBulk.items.length > 0) {
								const selectedPaths = await promptForBulkDeleteConfirmation(
									plugin.app,
									pendingBulk.items
								);

								if (selectedPaths.length > 0) {
									const deleteResult = await applyBulkDelete(plugin.app, selectedPaths);
									// Track each deleted file
									for (const path of deleteResult.deleted) {
										processedDeletes.push({ path, status: "deleted" });
									}
									for (const path of deleteResult.failed) {
										processedDeletes.push({ path, status: "failed" });
									}
									return {
										...result,
										deleted: deleteResult.deleted,
										failed: deleteResult.failed,
										message: deleteResult.message,
									};
								} else {
									discardBulkDelete();
									// Track all as cancelled
									for (const item of pendingBulk.items) {
										processedDeletes.push({ path: item.path, status: "cancelled" });
									}
									return { ...result, deleted: [], message: "User cancelled all deletions" };
								}
							}
						}

						// Handle bulk_propose_rename with immediate confirmation
						if (name === "bulk_propose_rename") {
							const pendingBulk = getPendingBulkRename();
							const hasNewPending = pendingBulk && pendingBulk.createdAt !== prevPendingBulkRename?.createdAt;
							if (hasNewPending && !toolCallFailed && pendingBulk.items.length > 0) {
								const selectedPaths = await promptForBulkRenameConfirmation(
									plugin.app,
									pendingBulk.items
								);

								if (selectedPaths.length > 0) {
									const renameResult = await applyBulkRename(plugin.app, selectedPaths);
									// Track each renamed file
									for (const path of renameResult.applied) {
										const item = pendingBulk.items.find(i => i.originalPath === path);
										if (item) {
											processedRenames.push({ originalPath: item.originalPath, newPath: item.newPath, status: "applied" });
										}
									}
									for (const path of renameResult.failed) {
										const item = pendingBulk.items.find(i => i.originalPath === path);
										if (item) {
											processedRenames.push({ originalPath: item.originalPath, newPath: item.newPath, status: "failed" });
										}
									}
									return {
										...result,
										applied: renameResult.applied,
										failed: renameResult.failed,
										message: renameResult.message,
									};
								} else {
									discardBulkRename();
									// Track all as discarded
									for (const item of pendingBulk.items) {
										processedRenames.push({ originalPath: item.originalPath, newPath: item.newPath, status: "discarded" });
									}
									return { ...result, applied: [], message: "User cancelled all renames" };
								}
							}
						}

						return result;
					}
					: undefined;

					// Check if Web Search or Image Generation model is selected
				const isWebSearch = allowWebSearch && selectedRagSetting === "__websearch__"
					&& (toolsEnabled || isImageGenerationModel(allowedModel));
				const isImageGeneration = isImageGenerationModel(allowedModel);

				let systemPrompt = "You are a helpful AI assistant integrated with Obsidian.";

				if (toolsEnabled) {
					systemPrompt += `

Available tools allow you to:
- Read notes from the vault
- Create new notes
- Update existing notes
- Search for notes by name or content
- List notes and folders
- Get information about the active note`;
				}


				systemPrompt += `

Always be helpful and provide clear, concise responses. When working with notes, confirm actions and provide relevant feedback.`;

				if (settings.systemPrompt) {
					systemPrompt += `\n\nAdditional instructions: ${settings.systemPrompt}`;
				}

				// Inject active agent skills into system prompt
				let skillsUsedNames: string[] = [];
				if (loadedSkillsList.length > 0) {
					const skillPrompt = buildSkillSystemPrompt(loadedSkillsList);
					if (skillPrompt) {
						systemPrompt += skillPrompt;
						skillsUsedNames = loadedSkillsList.map(s => s.name);
					}
				}

				// Local RAG: search and inject context into system prompt
				let localRagSources: string[] = [];
				if (selectedRagSetting && selectedRagSetting !== "__websearch__") {
					const ragSettingObj = plugin.getRagSetting(selectedRagSetting);
					if (ragSettingObj) {
						try {
							const localRag = await searchLocalRag(
								selectedRagSetting, resolvedContent,
								ragSettingObj, getGeminiApiKey(plugin.settings),
								plugin.settings.proxyUrl, plugin.settings.proxyBypass
							);
							if (localRag.sources.length > 0) {
								systemPrompt += localRag.context;
								localRagSources = localRag.sources;
								// Attach multimodal RAG files so the LLM can see actual content
								if (localRag.mediaReferences.length > 0) {
									const ragAttachments = await loadRagMediaAttachments(plugin.app, localRag.mediaReferences);
									if (ragAttachments.length > 0) {
										const existing = userMessage.attachments || [];
										(userMessage as { attachments?: import("src/types").Attachment[] }).attachments = [...existing, ...ragAttachments];
									}
								}
							}
						} catch (e) {
							console.error("Local RAG search failed:", formatError(e));
						}
					}
				}

				const allMessages = [...messages, userMessage];

				// Use streaming with tools
				let fullContent = "";
				let thinkingContent = "";
				const toolCalls: Message["toolCalls"] = [];
				const toolResults: Message["toolResults"] = [];
				const toolsUsed: string[] = [];
				let ragUsed = localRagSources.length > 0;
				const ragSources: string[] = [...localRagSources];
				let webSearchUsed = false;
				let imageGenerationUsed = false;
				const generatedImages: GeneratedImage[] = [];
				let streamUsage: Message["usage"] = undefined;
				let streamInteractionId: string | undefined;
				const startTime = Date.now();

				// Resolve previous interaction ID for Interactions API conversation chaining.
				// Only chain when the most recent assistant message (array tail) carries an
				// interactionId.  If it doesn't (old chat history, image generation response,
				// CLI response, etc.) we fall back to local history replay in gemini.ts.
				const previousInteractionId = (() => {
					for (let i = messages.length - 1; i >= 0; i--) {
						if (messages[i].role === "assistant") {
							return messages[i].interactionId;  // undefined if absent → fallback
						}
					}
					return undefined;
				})();

				let stopped = false;

				// Gemma 4: RAG/Web Search and function calling are mutually exclusive
				const effectiveTools = isGemma4(allowedModel) && (isWebSearch || localRagSources.length > 0) ? [] : tools;

				// Use image generation stream or regular chat stream
				const chunkStream = isImageGeneration
					? client.generateImageStream(allMessages, allowedModel, systemPrompt, isWebSearch, undefined, traceId)
					: client.chatWithToolsStream(
						allMessages,
						effectiveTools,
						systemPrompt,
						toolsEnabled ? toolExecutor : undefined,
						undefined,
						isWebSearch,
						{
							functionCallLimits: {
								maxFunctionCalls: settings.maxFunctionCalls,
								functionCallWarningThreshold: settings.functionCallWarningThreshold,
							},
							disableTools: !toolsEnabled,
							enableThinking: getThinkingToggle(),
							traceId,
							previousInteractionId,
						}
					);

				for await (const chunk of chunkStream) {
					// Check if stopped
					if (abortController.signal.aborted) {
						stopped = true;
						break;
					}

				switch (chunk.type) {
					case "text":
						fullContent += chunk.content || "";
						if (isActive()) setStreamingContent(fullContent);
						break;

					case "thinking":
						thinkingContent += chunk.content || "";
						if (isActive()) setStreamingThinking(thinkingContent);
						break;

					case "tool_call":
						if (chunk.toolCall) {
							toolCalls.push(chunk.toolCall);
							if (!toolsUsed.includes(chunk.toolCall.name)) {
								toolsUsed.push(chunk.toolCall.name);
							}
						}
						break;

					case "tool_result":
						if (chunk.toolResult) {
							toolResults.push(chunk.toolResult);
						}
						break;

					case "rag_used":
						ragUsed = true;
						if (chunk.ragSources) {
							for (const s of chunk.ragSources) {
								if (!ragSources.includes(s)) {
									ragSources.push(s);
								}
							}
						}
						break;

					case "web_search_used":
						webSearchUsed = true;
						break;

					case "image_generated":
						imageGenerationUsed = true;
						if (chunk.generatedImage) {
							generatedImages.push(chunk.generatedImage);
						}
						break;

					case "error":
						throw new Error(chunk.error || "Unknown error");

					case "done":
						// Capture usage data and interaction ID from the final chunk
						if (chunk.usage) {
							streamUsage = chunk.usage;
						}
						if (chunk.interactionId) {
							streamInteractionId = chunk.interactionId;
						}
						break;
				}
			}

				// If stopped, add partial message if any content was received
				if (stopped && fullContent) {
					fullContent += `\n\n${t("chat.generationStopped")}`;
				}

				// Get processed edit/delete/rename info from tool executor (already confirmed during tool execution)
				const pendingEditInfo = getLatestPendingInfo(processedEdits);
				const pendingDeleteInfo = getLatestPendingInfo(processedDeletes);
				const pendingRenameInfo = getLatestPendingInfo(processedRenames);
				const pendingEdits = getPendingInfos(processedEdits);
				const pendingDeletes = getPendingInfos(processedDeletes);
				const pendingRenames = getPendingInfos(processedRenames);

				// Always clear the slash command ref after message processing
				currentSlashCommandRef.current = null;

				// Restore chat settings that were overridden by the slash command
				if (isActive() && preSlashSettingsRef.current) {
					const saved = preSlashSettingsRef.current;
					preSlashSettingsRef.current = null;
					setCurrentModel(saved.model);
					// Terminate persistent CLI session when restoring model after slash command
					if (persistentCliRef.current) {
						persistentCliRef.current.terminate();
						persistentCliRef.current = null;
					}
					handleRagSettingChange(saved.ragSetting);
					setVaultToolMode(saved.vaultToolMode);
					setVaultToolNoneReason(saved.vaultToolNoneReason);
					setMcpServers(saved.mcpServers);
				}

				// Add assistant message
				const assistantMessage: Message = {
					role: "assistant",
					content: fullContent,
					timestamp: Date.now(),
					model: allowedModel,
					toolsUsed: toolsUsed.length > 0 ? toolsUsed : undefined,
					skillsUsed: skillsUsedNames.length > 0 ? skillsUsedNames : undefined,
					pendingEdit: pendingEditInfo,
					pendingEdits,
					pendingDelete: pendingDeleteInfo,
					pendingDeletes,
					pendingRename: pendingRenameInfo,
					pendingRenames,
					toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
					toolResults: toolResults.length > 0 ? toolResults : undefined,
					ragUsed: ragUsed || undefined,
					ragSources: ragSources.length > 0 ? ragSources : undefined,
					webSearchUsed: webSearchUsed || undefined,
					imageGenerationUsed: imageGenerationUsed || undefined,
					generatedImages: generatedImages.length > 0 ? generatedImages : undefined,
					thinking: thinkingContent || undefined,
					mcpApps: collectedMcpApps.length > 0 ? collectedMcpApps : undefined,
					usage: streamUsage,
					interactionId: streamInteractionId,
					elapsedMs: Date.now() - startTime,
				};

				const newMessages = [...messages, userMessage, assistantMessage];
				await saveResult(newMessages);

				tracing.traceEnd(traceId, {
					output: fullContent,
					metadata: {
						toolsUsed: toolsUsed.length > 0 ? toolsUsed : undefined,
						ragUsed,
						ragSources: ragSources.length > 0 ? ragSources : undefined,
						webSearchUsed,
						imageGenerationUsed,
						stopped,
					},
				});
				tracing.score(traceId, {
					name: "status",
					value: stopped ? 0.5 : 1,
					comment: stopped ? "stopped by user" : "completed",
				});

				// Check if user requested changes with feedback - use state to trigger send after re-render
				if (isActive() && pendingAdditionalRequestRef.current) {
					const requestInfo = pendingAdditionalRequestRef.current;
					pendingAdditionalRequestRef.current = null;
					setPendingEditFeedback(requestInfo);
				}
			};

			const retryDelays = PAID_RATE_LIMIT_RETRY_DELAYS_MS;
			let retryCount = 0;

			while (true) {
				try {
					await runStreamOnce();
					break;
				} catch (error) {
					if (abortController.signal.aborted) {
						if (isActive()) {
							setStreamingContent("");
							setStreamingThinking("");
						}
						tracing.traceEnd(traceId, { metadata: { status: "aborted" } });
						tracing.score(traceId, { name: "status", value: 0.5, comment: "aborted during retry" });
						return;
					}
					if (isRateLimitError(error) && retryCount < retryDelays.length) {
						const delayMs = retryDelays[retryCount];
						retryCount += 1;
						if (isActive()) {
							setStreamingContent("");
							setStreamingThinking("");
						}
						new Notice(
							t("chat.rateLimitRetrying", {
								seconds: String(Math.ceil(delayMs / 1000)),
								attempt: String(retryCount),
								max: String(retryDelays.length),
							})
						);
						await sleep(delayMs);
						continue;
					}
					throw error;
				}
			}
		} catch (error) {
			const errorMessageText = buildErrorMessage(error);
			const errorMessage: Message = {
				role: "assistant",
				content: errorMessageText,
				timestamp: Date.now(),
			};
			await saveResult([...messages, userMessage, errorMessage]);
			tracing.traceEnd(traceId, {
				output: errorMessageText,
				metadata: { error: true },
			});
			tracing.score(traceId, {
				name: "status",
				value: 0,
				comment: errorMessageText,
			});
		} finally {
			cleanupStream(abortController);
			// Stream was backgrounded – clean up our own MCP executor since
			// the ref was detached when the stream was backgrounded.
			if (!isActive() && mcpCleanupRef.executor) {
				try { await mcpCleanupRef.executor.cleanup(); } catch (e) { console.warn("Background MCP cleanup failed:", e); }
			}
		}
	};

	// Stop message generation
	const stopMessage = () => {
		if (abortControllerRef.current) {
			abortControllerRef.current.abort();
		}
		// Always reset loading state to ensure user can continue
		// even if abort signal is not properly handled by the stream
		setIsLoading(false);
		abortControllerRef.current = null;
	};

	// Compact/compress conversation history
	// Saves current chat as-is, then starts a new chat with the summary as context
	const handleCompact = async () => {
		if (messages.length < 2 || isLoading || isCompacting) return;

		// CLI mode does not support compact
		if (isCliMode) {
			new Notice(t("chat.compactNotAvailable"));
			return;
		}

		const client = getGeminiClient();
		if (!client) {
			new Notice(t("chat.clientNotInitialized"));
			return;
		}

		setIsCompacting(true);

		try {
			// Save current chat first (preserves full history)
			await saveCurrentChat(messages, cliSession || undefined);

			// Build conversation text for summarization
			const conversationText = messages.map(msg => {
				const role = msg.role === "user" ? "User" : "Assistant";
				return `${role}: ${msg.content}`;
			}).join("\n\n");

			// Create summarization request
			const summaryPrompt: Message = {
				role: "user",
				content: `Summarize the following conversation concisely. Preserve key information, decisions, file paths, and context that would be needed to continue the conversation. Output the summary in the same language as the conversation.\n\n---\n${conversationText}\n---`,
				timestamp: Date.now(),
			};

			const compactTraceId = tracing.traceStart("chat-compact", {
				sessionId: currentChatId ?? undefined,
				input: `Compacting ${messages.length} messages`,
				metadata: { messageCount: messages.length, pluginVersion: plugin.manifest.version },
			});
			const summary = await client.chat([summaryPrompt], "You are a conversation summarizer. Output only the summary without any preamble.", compactTraceId);

			if (!summary.trim()) {
				tracing.traceEnd(compactTraceId, { metadata: { error: "empty summary" } });
				tracing.score(compactTraceId, { name: "status", value: 0, comment: "empty summary" });
				new Notice(t("chat.compactFailed"));
				return;
			}

			tracing.traceEnd(compactTraceId, { output: summary });
			tracing.score(compactTraceId, { name: "status", value: 1, comment: "completed" });

			// Start a new chat with user's compact request and AI's summary
			const now = Date.now();
			const userMessage: Message = {
				role: "user",
				content: "/compact",
				timestamp: now,
			};
			const compactedMessage: Message = {
				role: "assistant",
				content: `[${t("chat.compactedContext")}]\n\n${summary}`,
				timestamp: now + 1,
			};

			const newMessages = [userMessage, compactedMessage];
			const newChatId = generateChatId();
			setCurrentChatId(newChatId);
			setCliSession(null);
			// Terminate persistent CLI session on compact (new chat context)
			if (persistentCliRef.current) {
				persistentCliRef.current.terminate();
				persistentCliRef.current = null;
			}
			setMessages(newMessages);

			// Save as a new chat with explicit new ID (avoids stale closure of currentChatId)
			await saveCurrentChat(newMessages, undefined, newChatId);

			new Notice(t("chat.compacted", { before: String(messages.length), after: "2" }));
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : t("chat.unknownError");
			new Notice(t("chat.compactFailed") + ": " + errorMsg);
		} finally {
			setIsCompacting(false);
		}
	};

	// Handle apply edit button click
	const handleApplyEdit = async (messageIndex: number) => {
		try {
			const result = await applyEdit(plugin.app);

			if (result.success) {
				// Update message status
				setMessages((prev) => {
					const newMessages = [...prev];
					const pendingEdit = newMessages[messageIndex].pendingEdit;
					if (pendingEdit) {
						newMessages[messageIndex] = {
							...newMessages[messageIndex],
							pendingEdit: {
								...pendingEdit,
								status: "applied",
							},
						};
					}
					return newMessages;
				});
				new Notice(result.message || t("message.appliedChanges"));
			} else {
				new Notice(result.error || t("message.applyChanges"));
			}
		} catch {
			new Notice(t("message.applyChanges"));
		}
	};

	// Handle discard edit button click
	const handleDiscardEdit = (messageIndex: number) => {
		try {
			const result = discardEdit(plugin.app);

			if (result.success) {
				// Update message status
				setMessages((prev) => {
					const newMessages = [...prev];
					const pendingEdit = newMessages[messageIndex].pendingEdit;
					if (pendingEdit) {
						newMessages[messageIndex] = {
							...newMessages[messageIndex],
							pendingEdit: {
								...pendingEdit,
								status: "discarded",
							},
						};
					}
					return newMessages;
				});
				new Notice(result.message || t("message.discardedChanges"));
			} else {
				new Notice(result.error || t("message.discardChanges"));
			}
		} catch {
			new Notice(t("message.discardChanges"));
		}
	};

	const chatClassName = `llm-hub-chat${isKeyboardVisible ? " keyboard-visible" : ""}${isDecryptInputFocused ? " decrypt-input-focused" : ""}`;

	return (
		<div className={chatClassName}>
			<div className="llm-hub-chat-header">
				<h3>{t("chat.title")}</h3>
				<div className="llm-hub-header-actions">
					<button
						className="llm-hub-icon-btn"
						onClick={() => { void handleSaveAsNote(); }}
						disabled={saveNoteState === "saving" || messages.length === 0}
						title={saveNoteState === "saved" ? t("chat.savedAsNote", { path: "" }) : t("chat.saveAsNote")}
					>
						{saveNoteState === "idle" && <FileText size={18} />}
						{saveNoteState === "saving" && <Loader2 size={18} className="llm-hub-spinner" />}
						{saveNoteState === "saved" && <Check size={18} />}
					</button>
					<button
						className="llm-hub-icon-btn"
						onClick={startNewChat}
						title={t("chat.newChat")}
					>
						<Plus size={18} />
					</button>
					<button
						className="llm-hub-icon-btn"
						onClick={() => setShowHistory(!showHistory)}
						title={t("chat.chatHistory")}
					>
						<History size={18} />
						{showHistory && <ChevronDown size={14} className="llm-hub-chevron" />}
					</button>
				</div>
			</div>

			{showHistory && chatHistories.length > 0 && (
				<div className="llm-hub-history-dropdown">
					{chatHistories.map((history) => (
						<div key={history.id}>
							<div
								className={`llm-hub-history-item ${currentChatId === history.id ? "active" : ""} ${history.isEncrypted ? "encrypted" : ""}`}
								onClick={() => loadChat(history)}
							>
								<div className="llm-hub-history-title">
									{history.isEncrypted && <Lock size={14} className="llm-hub-lock-icon" />}
									{history.title}
								</div>
								<div className="llm-hub-history-meta">
									<span className="llm-hub-history-date">
										{formatHistoryDate(history.updatedAt)}
									</span>
									<button
										className="llm-hub-history-delete"
										onClick={(e) => {
											void deleteChat(history.id, e);
										}}
										title={t("common.delete")}
									>
										×
									</button>
								</div>
							</div>
							{decryptingChatId === history.id && (
								<div className="llm-hub-decrypt-form">
									<input
										type="password"
										placeholder={t("chat.decryptPassword.placeholder")}
										value={decryptPassword}
										onChange={(e) => setDecryptPassword(e.target.value)}
										onKeyDown={(e) => {
											if (e.key === "Enter" && decryptPassword) {
												void decryptAndLoadChat(history.id, decryptPassword);
											}
										}}
									/>
									<button
										onClick={() => {
											if (decryptPassword) {
												void decryptAndLoadChat(history.id, decryptPassword);
											}
										}}
									>
										{t("chat.decrypt")}
									</button>
									<button
										onClick={() => {
											setDecryptingChatId(null);
											setDecryptPassword("");
										}}
										title={t("common.cancel")}
										className="llm-hub-decrypt-cancel"
									>
										×
									</button>
								</div>
							)}
						</div>
					))}
				</div>
			)}

			{showHistory && chatHistories.length === 0 && (
				<div className="llm-hub-history-dropdown">
					<div className="llm-hub-history-empty">{t("chat.noChatHistory")}</div>
				</div>
			)}

			{isConfigReady ? (
				<>
					<MessageList
						ref={messagesContainerRef}
						messages={messages}
						streamingContent={streamingContent}
						streamingThinking={streamingThinking}
						isLoading={isLoading}
						onApplyEdit={handleApplyEdit}
						onDiscardEdit={handleDiscardEdit}
						alwaysThink={getThinkingToggle() === true}
						app={plugin.app}
					/>

					<InputArea
						ref={inputAreaRef}
						onSend={(content, attachments, skillPath) => {
							void sendMessage(content, attachments, skillPath);
						}}
						onStop={stopMessage}
						isLoading={isLoading}
						model={currentModel}
						onModelChange={handleModelChange}
						availableModels={availableModels}
						allowWebSearch={allowWebSearch}
						ragEnabled={allowRag}
						ragSettings={allowRag ? ragSettingNames : []}
						selectedRagSetting={selectedRagSetting}
						onRagSettingChange={handleRagSettingChange}
						vaultToolMode={vaultToolMode}
						onVaultToolModeChange={handleVaultToolModeChange}
						vaultToolModeOnlyNone={isCliMode}
						alwaysThinkModels={alwaysThinkModels}
						onAlwaysThinkModelToggle={(modelId, enabled) => {
							setAlwaysThinkModels(prev => {
								const next = new Set(prev);
								if (enabled) next.add(modelId); else next.delete(modelId);
								plugin.workspaceState.alwaysThinkModels = Array.from(next);
								void plugin.saveWorkspaceState();
								return next;
							});
						}}
						mcpServers={mcpServers}
						onMcpServerToggle={handleMcpServerToggle}
						slashCommands={plugin.settings.slashCommands}
						onSlashCommand={handleSlashCommand}
						availableSkills={availableSkills}
						activeSkillPaths={activeSkillPaths}
						onToggleSkill={(folderPath) => {
							setActiveSkillPaths(prev =>
								prev.includes(folderPath)
									? prev.filter(p => p !== folderPath)
									: [...prev, folderPath]
							);
						}}
						onCompact={() => { void handleCompact(); }}
						messageCount={messages.length}
						isCompacting={isCompacting}
						vaultFiles={vaultFiles}
						hasSelection={hasSelection}
						app={plugin.app}
					/>
				</>
			) : (
				<div className="llm-hub-config-required">
					<div className="llm-hub-config-message">
						<h4>{t("chat.configRequired")}</h4>
						<p>{t("chat.configRequiredDesc")}</p>
						<ul>
							<li><strong>{t("chat.configApiKey")}</strong> - {t("chat.configApiKeyDesc")}</li>
							<li><strong>{t("chat.configGeminiCli")}</strong> - {t("chat.configGeminiCliDesc")}</li>
							<li><strong>{t("chat.configClaudeCli")}</strong> - {t("chat.configClaudeCliDesc")}</li>
							<li><strong>{t("chat.configLocalLlm")}</strong> - {t("chat.configLocalLlmDesc")}</li>
						</ul>
						<p>{t("chat.openSettings")}</p>
					</div>
				</div>
			)}
		</div>
	);
});

Chat.displayName = "Chat";

/**
 * Maximum number of marker-driven agent iterations for CLI / Local-LLM paths.
 * Protects against infinite loops where the model keeps emitting markers.
 */
const MAX_MARKER_AGENT_ITERATIONS = 5;

/**
 * Detect [RUN_WORKFLOW] / [RUN_SCRIPT] markers in an LLM response, execute
 * each matched workflow/script, and return both:
 *   - processedContent: the response with markers replaced by result blocks
 *     (for display in the assistant message), and
 *   - followUpMessage: a user-style message containing the results that can
 *     be fed back to the LLM so it can continue based on tool outputs.
 *     Undefined when no markers were matched — the agent loop should then
 *     terminate.
 */
async function processSkillMarkers(
	plugin: LlmHubPlugin,
	content: string,
	skills: LoadedSkill[],
	signal?: AbortSignal,
): Promise<{ processedContent: string; followUpMessage?: string; aborted?: boolean }> {
	if (skills.length === 0) return { processedContent: content };

	let processedContent = content;
	const resultSections: string[] = [];

	const workflowMarkerRegex = /\[RUN_WORKFLOW:\s*(.+?)\](?:\((\{[\s\S]*?\})\))?/g;
	const skillWorkflowMap = collectSkillWorkflows(skills);
	const workflowMatches: RegExpExecArray[] = [];
	let wm: RegExpExecArray | null;
	while ((wm = workflowMarkerRegex.exec(content)) !== null) {
		workflowMatches.push(wm);
	}
	for (const match of workflowMatches) {
		if (signal?.aborted) return { processedContent, aborted: true };
		const workflowId = match[1].trim();
		const variablesJson = match[2] || undefined;
		const result = await executeSkillWorkflow(plugin, workflowId, variablesJson, skillWorkflowMap);
		const resultText = JSON.stringify(result, null, 2);
		processedContent = processedContent.replace(match[0],
			`**Workflow executed: ${workflowId}**\n\`\`\`json\n${resultText}\n\`\`\``
		);
		resultSections.push(`Workflow "${workflowId}" result:\n\`\`\`json\n${resultText}\n\`\`\``);
	}

	const scriptMarkerRegex = /\[RUN_SCRIPT:\s*(.+?)\](?:\(([\s\S]*?)\))?/g;
	const skillScriptMap = collectSkillScripts(skills);
	const scriptMatches: RegExpExecArray[] = [];
	let sm: RegExpExecArray | null;
	while ((sm = scriptMarkerRegex.exec(content)) !== null) {
		scriptMatches.push(sm);
	}
	for (const match of scriptMatches) {
		if (signal?.aborted) return { processedContent, aborted: true };
		const scriptId = match[1].trim();
		const argsJson = match[2] || undefined;
		const result = await executeSkillScript(plugin, scriptId, argsJson, skillScriptMap);
		const resultText = JSON.stringify(result, null, 2);
		processedContent = processedContent.replace(match[0],
			`**Script executed: ${scriptId}**\n\`\`\`json\n${resultText}\n\`\`\``
		);
		resultSections.push(`Script "${scriptId}" result:\n\`\`\`json\n${resultText}\n\`\`\``);
	}

	if (resultSections.length === 0) return { processedContent };

	const followUpMessage = `Tool execution results:\n\n${resultSections.join("\n\n")}\n\nPlease continue based on these results. You may call more tools if needed, or give the user your final answer.`;
	return { processedContent, followUpMessage };
}

/**
 * Execute a skill script via child_process.spawn and return results.
 * Desktop only — returns error on mobile.
 */
async function executeSkillScript(
	plugin: LlmHubPlugin,
	scriptId: string,
	argsJson: string | undefined,
	skillScriptMap: Map<string, {
		skill: LoadedSkill;
		scriptRef: SkillScriptRef;
		vaultPath: string;
	}>,
): Promise<Record<string, unknown>> {
	const entry = skillScriptMap.get(scriptId);
	if (!entry) {
		const available = [...skillScriptMap.keys()].join(", ");
		return { error: `Unknown script ID: ${scriptId}. Available: ${available}` };
	}

	// Restrict execution to files under the skill's scripts/ directory
	if (
		!entry.scriptRef.path.startsWith("scripts/") ||
		entry.scriptRef.path.startsWith("/") ||
		entry.scriptRef.path.includes("\\") ||
		entry.scriptRef.path.split("/").includes("..")
	) {
		return { error: "Skill scripts must be located under the scripts/ directory" };
	}

	// Parse args
	let scriptArgs: string[] = [];
	if (argsJson) {
		try {
			const parsed = JSON.parse(argsJson);
			if (Array.isArray(parsed)) {
				scriptArgs = parsed.map(String);
			}
		} catch {
			return { error: `Invalid args JSON: ${argsJson}` };
		}
	}

	// Resolve absolute paths
	const vaultBasePath = (plugin.app.vault.adapter as { basePath?: string }).basePath || ".";
	const absoluteScriptPath = `${vaultBasePath}/${entry.vaultPath}`;
	const skillDir = `${vaultBasePath}/${entry.skill.folderPath}`;
	const scriptFile = plugin.app.vault.getAbstractFileByPath(entry.vaultPath);
	if (!(scriptFile instanceof TFile)) {
		return { error: `Script file not found: ${entry.vaultPath}` };
	}

	// Determine interpreter from file extension
	const interpreter = getInterpreter(absoluteScriptPath);
	let command: string;
	let commandArgs: string[];
	if (interpreter) {
		command = interpreter.command;
		commandArgs = [...interpreter.args, ...scriptArgs];
	} else {
		command = absoluteScriptPath;
		commandArgs = scriptArgs;
	}

	const result = await runScript({
		command,
		args: commandArgs,
		cwd: skillDir,
		env: {
			SKILL_DIR: skillDir,
			VAULT_PATH: vaultBasePath,
		},
	});
	return { ...result };
}

/**
 * Execute a skill workflow with interactive modal and return results.
 */
async function executeSkillWorkflow(
	plugin: LlmHubPlugin,
	workflowId: string,
	variablesJson: string | undefined,
	skillWorkflowMap: Map<string, {
		skill: LoadedSkill;
		workflowRef: SkillWorkflowRef;
		vaultPath: string;
	}>,
): Promise<Record<string, unknown>> {
	const entry = skillWorkflowMap.get(workflowId);
	if (!entry) {
		const available = [...skillWorkflowMap.keys()].join(", ");
		return { error: `Unknown workflow ID: ${workflowId}. Available: ${available}` };
	}

	const { workflowRef, vaultPath } = entry;

	// Read workflow file
	const file = plugin.app.vault.getAbstractFileByPath(vaultPath);
	if (!(file instanceof TFile)) {
		return { error: `Workflow file not found: ${vaultPath}`, workflowId, workflowPath: vaultPath };
	}

	const content = await plugin.app.vault.read(file);

	// Parse workflow
	let workflow;
	try {
		workflow = parseWorkflowFromMarkdown(content, workflowRef.name);
	} catch (e) {
		return { error: `Failed to parse workflow: ${e instanceof Error ? e.message : String(e)}`, workflowId, workflowPath: vaultPath };
	}

	// Build input variables
	const variables = new Map<string, string | number>();
	if (variablesJson) {
		try {
			const parsed = JSON.parse(variablesJson) as Record<string, string | number>;
			for (const [key, value] of Object.entries(parsed)) {
				variables.set(key, value);
			}
		} catch {
			return { error: `Invalid variables JSON: ${variablesJson}`, workflowId, workflowPath: vaultPath };
		}
	}

	// Execute with the same execution modal as the normal workflow panel
	const executor = new WorkflowExecutor(plugin.app, plugin);
	const abortController = new AbortController();

	const modal = new WorkflowExecutionModal(
		plugin.app, workflow, workflowRef.name || workflowId, abortController, () => {},
	);
	modal.open();

	let executionModalRef: WorkflowExecutionModal | null = modal;

	const callbacks = {
		promptForFile: (_defaultPath?: string, title?: string) => promptForFile(plugin.app, title || "Select a file"),
		promptForAnyFile: (extensions?: string[], _defaultPath?: string, title?: string) =>
			promptForAnyFile(plugin.app, extensions, title),
		promptForNewFilePath: (extensions?: string[], defaultPath?: string, title?: string) =>
			promptForNewFilePath(plugin.app, extensions, defaultPath, title),
		promptForSelection: () => promptForSelection(plugin.app, "Select text"),
		promptForValue: (prompt: string, defaultValue?: string, multiline?: boolean) =>
			promptForValue(plugin.app, prompt, defaultValue || "", multiline || false),
		promptForConfirmation: (filePath: string, content: string, mode: string, originalContent?: string) =>
			promptForConfirmation(plugin.app, filePath, content, mode, originalContent),
		promptForDialog: (title: string, message: string, options: string[], multiSelect: boolean, button1: string, button2?: string, markdown?: boolean, inputTitle?: string, defaults?: { input?: string; selected?: string[] }, multiline?: boolean) =>
			promptForDialog(plugin.app, title, message, options, multiSelect, button1, button2, markdown, inputTitle, defaults, multiline),
		openFile: async (notePath: string) => {
			const noteFile = plugin.app.vault.getAbstractFileByPath(notePath);
			if (noteFile instanceof TFile) {
				await plugin.app.workspace.getLeaf().openFile(noteFile);
			}
		},
		promptForPassword: async () => {
			const cached = cryptoCache.getPassword();
			if (cached) return cached;
			return promptForPassword(plugin.app);
		},
		showMcpApp: async (mcpApp: McpAppInfo) => {
			if (executionModalRef) {
				await showMcpApp(plugin.app, mcpApp);
			}
		},
		onThinking: (nodeId: string, thinking: string) => {
			executionModalRef?.updateThinking(nodeId, thinking);
		},
	};

	try {
		const result = await executor.execute(
			workflow,
			{ variables },
			(log) => executionModalRef?.updateFromLog(log),
			{
				workflowPath: vaultPath,
				workflowName: workflowRef.name,
				recordHistory: true,
				abortSignal: abortController.signal,
			},
			callbacks,
		);

		modal.setComplete(true);

		// Collect output variables
		const outputVars: Record<string, string | number> = {};
		result.context.variables.forEach((value, key) => {
			// Skip internal variables
			if (!key.startsWith("__")) {
				outputVars[key] = value;
			}
		});

		// Collect log summaries
		const logs = result.context.logs.map(log => ({
			node: log.nodeType,
			status: log.status,
			message: log.message,
		}));

		// Extract saved files from successful note/file operations
		const fileNodeTypes = new Set(["note", "file-save"]);
		const savedFiles = result.context.logs
			.filter(log => fileNodeTypes.has(log.nodeType) && log.status === "success" && typeof log.output === "string")
			.map(log => log.output as string);

		return {
			success: true,
			workflowId,
			variables: outputVars,
			logs,
			...(savedFiles.length > 0 ? { savedFiles } : {}),
		};
	} catch (e) {
		modal.setComplete(false);
		return {
			error: `Workflow execution failed: ${e instanceof Error ? e.message : String(e)}. Do not retry automatically — report the error to the user and ask how to proceed.`,
			workflowId,
			workflowPath: vaultPath,
		};
	} finally {
		executionModalRef = null;
	}
}

export default Chat;
