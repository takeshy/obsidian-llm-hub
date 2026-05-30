import * as React from "react";
import { useState, useCallback, useRef, useEffect, forwardRef, useImperativeHandle, type ChangeEvent } from "react";
import { Platform, Notice } from "obsidian";
import { Settings, X, Paperclip } from "lucide-react";
import type { LlmHubPlugin } from "src/plugin";
import type {
  ModelType,
  ModelInfo,
  Attachment,
  DiscussionParticipant,
  DiscussionVoter,
  DiscussionTurn,
  DiscussionState,
  DiscussionPhase,
  DiscussionSettings,
  DiscussionResult,
} from "src/types";
import {
  CLI_MODEL,
  CLAUDE_CLI_MODEL,
  CODEX_CLI_MODEL,
  DEFAULT_DISCUSSION_SETTINGS,
  getGeminiApiKey,
  localLlmDisplayName,
} from "src/types";
import { DiscussionEngine, DiscussionUserInputRequest, DiscussionUserInputResponse } from "src/core/discussionEngine";
import { searchLocalRag, loadRagMediaAttachments } from "src/core/localRagStore";
import { RagSourceModal } from "./RagSourceModal";
import { DiscussionSettingsModal } from "./DiscussionSettingsModal";
import { t } from "src/i18n";

const SUPPORTED_TYPES = {
  image: ["image/png", "image/jpeg", "image/gif", "image/webp"],
  pdf: ["application/pdf"],
  text: ["text/plain", "text/markdown", "text/csv", "application/json"],
  audio: ["audio/mpeg", "audio/wav", "audio/flac", "audio/aac", "audio/mp4", "audio/opus", "audio/ogg"],
  video: ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo", "video/x-matroska"],
};

const MAX_ATTACHMENT_SIZE = 20 * 1024 * 1024; // 20MB

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function processFile(file: File): Promise<Attachment | null> {
  const mimeType = file.type;

  if (file.size > MAX_ATTACHMENT_SIZE) {
    new Notice(t("input.fileTooLarge", { name: file.name }));
    return null;
  }

  if (SUPPORTED_TYPES.image.includes(mimeType)) {
    const data = await fileToBase64(file);
    return { name: file.name, type: "image", mimeType, data };
  }
  if (SUPPORTED_TYPES.pdf.includes(mimeType)) {
    const data = await fileToBase64(file);
    return { name: file.name, type: "pdf", mimeType, data };
  }
  if (SUPPORTED_TYPES.text.includes(mimeType) || file.name.endsWith(".md") || file.name.endsWith(".txt")) {
    const data = await fileToBase64(file);
    return { name: file.name, type: "text", mimeType: mimeType || "text/plain", data };
  }
  if (SUPPORTED_TYPES.audio.includes(mimeType)) {
    const data = await fileToBase64(file);
    return { name: file.name, type: "audio", mimeType, data };
  }
  if (SUPPORTED_TYPES.video.includes(mimeType)) {
    const data = await fileToBase64(file);
    return { name: file.name, type: "video", mimeType, data };
  }
  return null;
}

function getAttachmentEmoji(type: Attachment["type"]): string {
  switch (type) {
    case "image": return "🖼️";
    case "pdf": return "📄";
    case "text": return "📃";
    case "audio": return "🎵";
    case "video": return "🎬";
    default: return "📎";
  }
}

export interface DiscussionPanelRef {
  addAttachments: (attachments: Attachment[]) => void;
}

interface DiscussionPanelProps {
  plugin: LlmHubPlugin;
}

function getAvailableModels(plugin: LlmHubPlugin): ModelInfo[] {
  const cliConfig = plugin.settings.cliConfig;
  const antigravityCliVerified = !Platform.isMobile && cliConfig.cliVerified === true;
  const claudeCliVerified = !Platform.isMobile && cliConfig.claudeCliVerified === true;
  const codexCliVerified = !Platform.isMobile && cliConfig.codexCliVerified === true;
  const activeLocalLlmConfigs = !Platform.isMobile
    ? (plugin.settings.localLlmConfigs ?? []).filter(c => c.verified && c.enabled !== false)
    : [];
  const enabledApiProviders = !Platform.isMobile ? plugin.settings.apiProviders.filter(p => p.enabled && p.verified) : [];

  return [
    ...enabledApiProviders.flatMap(p =>
      p.enabledModels.map(m => ({
        name: `api:${p.id}:${m}` as ModelType,
        displayName: `${p.name} (${m})`,
        description: `${p.type} API provider`,
        isCliModel: false,
        providerName: p.name,
      }))
    ),
    ...(antigravityCliVerified ? [CLI_MODEL] : []),
    ...(claudeCliVerified ? [CLAUDE_CLI_MODEL] : []),
    ...(codexCliVerified ? [CODEX_CLI_MODEL] : []),
    ...activeLocalLlmConfigs.flatMap(c => {
      const models = (c.enabledModels && c.enabledModels.length > 0)
        ? c.enabledModels
        : (c.model ? [c.model] : []);
      return models.map(m => ({
        name: `local-llm:${c.id}:${m}` as ModelType,
        displayName: localLlmDisplayName(c, m),
        description: `Local LLM (${c.framework})`,
        isCliModel: true,
      }));
    }),
  ];
}

function getModelDisplayName(model: ModelType, models: ModelInfo[]): string {
  return models.find(m => m.name === model)?.displayName || model;
}

function getPhaseLabel(phase: DiscussionPhase): string {
  switch (phase) {
    case "thinking": return t("discussion.thinking");
    case "turn_complete": return t("discussion.turnComplete");
    case "concluding": return t("discussion.concluding");
    case "voting": return t("discussion.voting");
    case "complete": return t("discussion.complete");
    case "error": return t("discussion.error");
    default: return t("discussion.ready");
  }
}

const DiscussionPanel = forwardRef<DiscussionPanelRef, DiscussionPanelProps>(({ plugin }, ref) => {
  const [state, setState] = useState<DiscussionState>({
    phase: "idle",
    currentTurn: 0,
    totalTurns: 2,
    theme: "",
    turns: [],
    conclusions: [],
    votes: [],
    winnerId: null,
    winnerIds: [],
    isDraw: false,
    finalConclusion: "",
    streamingResponses: new Map(),
    participants: [],
    voters: [],
  });

  const [theme, setTheme] = useState("");
  const [turns, setTurns] = useState(() => {
    const ds = plugin.workspaceState.discussionSettings;
    return ds?.defaultTurns ?? DEFAULT_DISCUSSION_SETTINGS.defaultTurns;
  });
  const [participants, setParticipants] = useState<DiscussionParticipant[]>(() => {
    return plugin.workspaceState.discussionSettings?.participants ?? [];
  });
  const [voters, setVoters] = useState<DiscussionVoter[]>(() => {
    return plugin.workspaceState.discussionSettings?.voters ?? [];
  });

  // RAG
  const [ragSettingNames, setRagSettingNames] = useState<string[]>(plugin.getRagSettingNames());
  const [selectedRagSetting, setSelectedRagSetting] = useState<string | null>(null);
  const ragEnabled = ragSettingNames.length > 0;

  useEffect(() => {
    const handler = () => setRagSettingNames(plugin.getRagSettingNames());
    plugin.settingsEmitter.on("rag-setting-changed", handler);
    return () => { plugin.settingsEmitter.off("rag-setting-changed", handler); };
  }, [plugin]);

  // Attachments
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({
    addAttachments: (attachments: Attachment[]) => {
      setPendingAttachments(prev => [...prev, ...attachments]);
    },
  }));

  // Add participant dialog
  const [showAddParticipant, setShowAddParticipant] = useState(false);
  const [newModel, setNewModel] = useState<ModelType>("" as ModelType);
  const [newRole, setNewRole] = useState("");

  // Add voter dialog
  const [showAddVoter, setShowAddVoter] = useState(false);
  const [newVoterModel, setNewVoterModel] = useState<ModelType>("" as ModelType);

  // User input
  const [userInput, setUserInput] = useState("");
  const [userVoteTarget, setUserVoteTarget] = useState("");
  const [userVoteReason, setUserVoteReason] = useState("");

  const engineRef = useRef<DiscussionEngine | null>(null);
  const userInputResolverRef = useRef<((response: DiscussionUserInputResponse) => void) | null>(null);
  const stateRef = useRef(state);

  useEffect(() => { stateRef.current = state; }, [state]);

  const availableModels = getAvailableModels(plugin);

  // Persist participants/voters to workspace state
  const persistConfig = useCallback((newParticipants: DiscussionParticipant[], newVoters: DiscussionVoter[]) => {
    const ds = plugin.workspaceState.discussionSettings || { ...DEFAULT_DISCUSSION_SETTINGS };
    plugin.workspaceState.discussionSettings = { ...ds, participants: newParticipants, voters: newVoters };
    void plugin.saveWorkspaceState();
  }, [plugin]);

  // Add participant + corresponding voter
  const addParticipant = useCallback(() => {
    if (!newModel) return;
    const displayName = getModelDisplayName(newModel, availableModels);
    const roleSuffix = newRole ? `（${newRole}）` : "";
    const participant: DiscussionParticipant = {
      id: `p-${Date.now()}`,
      model: newModel,
      displayName: `${displayName}${roleSuffix}`,
      role: newRole || undefined,
    };
    const newParticipants = [...participants, participant];
    const correspondingVoter: DiscussionVoter = {
      id: `voter-${participant.id}`,
      model: newModel,
      displayName,
    };
    const newVoters = [...voters, correspondingVoter];
    setParticipants(newParticipants);
    setVoters(newVoters);
    persistConfig(newParticipants, newVoters);
    setNewRole("");
    setShowAddParticipant(false);
  }, [newModel, newRole, participants, voters, availableModels, persistConfig]);

  // Remove participant + its corresponding voter (if exists)
  const removeParticipant = useCallback((id: string) => {
    const newParticipants = participants.filter(p => p.id !== id);
    const correspondingVoterId = `voter-${id}`;
    const newVoters = voters.filter(v => v.id !== correspondingVoterId);
    setParticipants(newParticipants);
    setVoters(newVoters);
    persistConfig(newParticipants, newVoters);
  }, [participants, voters, persistConfig]);

  // Update role — only affects participants, never touches voters
  const updateRole = useCallback((id: string, role: string) => {
    const newParticipants = participants.map(p => {
      if (p.id === id) {
        const base = getModelDisplayName(p.model, availableModels);
        const displayName = role ? `${base}（${role}）` : base;
        return { ...p, role: role || undefined, displayName };
      }
      return p;
    });
    setParticipants(newParticipants);
    persistConfig(newParticipants, voters);
  }, [participants, voters, availableModels, persistConfig]);

  const addVoter = useCallback(() => {
    if (!newVoterModel) return;
    const voter: DiscussionVoter = {
      id: `v-${Date.now()}`,
      model: newVoterModel,
      displayName: getModelDisplayName(newVoterModel, availableModels),
    };
    setVoters(prev => {
      const updated = [...prev, voter];
      persistConfig(participants, updated);
      return updated;
    });
    setShowAddVoter(false);
  }, [newVoterModel, availableModels, participants, persistConfig]);

  const removeVoter = useCallback((id: string) => {
    setVoters(prev => {
      const updated = prev.filter(v => v.id !== id);
      persistConfig(participants, updated);
      return updated;
    });
  }, [participants, persistConfig]);

  const handleFileSelect = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      const attachment = await processFile(file);
      if (attachment) {
        setPendingAttachments(prev => [...prev, attachment]);
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const removeAttachment = useCallback((index: number) => {
    setPendingAttachments(prev => prev.filter((_, i) => i !== index));
  }, []);

  const getDiscussionSettings = useCallback((): DiscussionSettings => {
    return plugin.workspaceState.discussionSettings || DEFAULT_DISCUSSION_SETTINGS;
  }, [plugin]);

  const openSettings = useCallback(() => {
    const currentSettings = getDiscussionSettings();
    const modal = new DiscussionSettingsModal(plugin.app, currentSettings, (newSettings) => {
      // Preserve participants/voters that the modal doesn't edit
      const existing = plugin.workspaceState.discussionSettings;
      plugin.workspaceState.discussionSettings = {
        ...newSettings,
        participants: existing?.participants,
        voters: existing?.voters,
      };
      void plugin.saveWorkspaceState();
      setTurns(newSettings.defaultTurns);
    });
    modal.open();
  }, [plugin, getDiscussionSettings]);

  const startDiscussion = useCallback(async () => {
    if (!theme.trim()) {
      new Notice(t("discussion.enterTheme"));
      return;
    }
    if (participants.length < 1) {
      new Notice(t("discussion.needOneParticipant"));
      return;
    }
    if (voters.length < 1) {
      new Notice(t("discussion.needOneVoter"));
      return;
    }

    const ds = getDiscussionSettings();

    // Build RAG context from text attachments provided by SearchPanel
    let ragContext = "";
    let allAttachments = [...pendingAttachments];
    const textAttachments = pendingAttachments.filter(a => a.type === "text" && a.sourcePath);
    if (textAttachments.length > 0) {
      const texts = textAttachments.map(a => {
        try { return decodeURIComponent(escape(atob(a.data))); } catch { return atob(a.data); }
      });
      ragContext = "\n\n# Reference Materials\n\n" + texts.join("\n\n---\n\n");
    }

    // RAG search (if selected and no SearchPanel attachments)
    if (selectedRagSetting && !ragContext) {
      const ragSettingObj = plugin.getRagSearchSetting(selectedRagSetting);
      if (ragSettingObj) {
        try {
          const localRag = await searchLocalRag(
            selectedRagSetting, theme,
            ragSettingObj, getGeminiApiKey(plugin.settings),
            plugin.settings.proxyUrl, plugin.settings.proxyBypass
          );
          if (localRag.sources.length > 0) {
            ragContext = localRag.context;
            if (localRag.mediaReferences.length > 0) {
              const ragAttachments = await loadRagMediaAttachments(plugin.app, localRag.mediaReferences);
              allAttachments = [...allAttachments, ...ragAttachments];
            }
          }
        } catch (e) {
          console.error("Discussion RAG search failed:", e);
        }
      }
    }

    const engine = new DiscussionEngine(plugin.settings, ds, {
      ragContext,
      attachments: allAttachments.length > 0 ? allAttachments : undefined,
    });
    engineRef.current = engine;

    setState(prev => ({
      ...prev,
      phase: "thinking",
      theme,
      totalTurns: turns,
      currentTurn: 1,
      turns: [],
      conclusions: [],
      votes: [],
      winnerId: null,
      winnerIds: [],
      isDraw: false,
      finalConclusion: "",
      error: undefined,
      streamingResponses: new Map(),
      startTime: undefined,
      endTime: undefined,
      participants,
      voters,
    }));

    engine.setCallbacks({
      onPhaseChange: (phase) => {
        setState(prev => ({ ...prev, phase }));
      },
      onTurnStart: (turnNumber) => {
        setState(prev => ({ ...prev, currentTurn: turnNumber, streamingResponses: new Map() }));
      },
      onResponseStream: (participantId, content) => {
        setState(prev => {
          const newMap = new Map(prev.streamingResponses);
          newMap.set(participantId, content);
          return { ...prev, streamingResponses: newMap };
        });
      },
      onTurnComplete: (turn) => {
        setState(prev => ({
          ...prev,
          turns: [...prev.turns, turn],
          streamingResponses: new Map(),
        }));
      },
      onConclusionStream: (participantId, content) => {
        setState(prev => {
          const newMap = new Map(prev.streamingResponses);
          newMap.set(participantId, content);
          return { ...prev, streamingResponses: newMap };
        });
      },
      onConclusionComplete: (conclusion) => {
        setState(prev => ({ ...prev, conclusions: [...prev.conclusions, conclusion] }));
      },
      onVoteComplete: (vote) => {
        setState(prev => ({ ...prev, votes: [...prev.votes, vote] }));
      },
      onDebateComplete: (result) => {
        setState(prev => ({
          ...prev,
          phase: "complete",
          winnerId: result.winnerId,
          winnerIds: result.winnerIds,
          isDraw: result.isDraw,
          finalConclusion: result.finalConclusion,
          startTime: result.startTime,
          endTime: result.endTime,
        }));
      },
      onError: (error) => {
        if (error.name === "AbortError") return;
        setState(prev => ({ ...prev, phase: "error", error: error.message }));
        new Notice(t("discussion.discussionError", { error: error.message }));
      },
      onUserInputRequest: async (request: DiscussionUserInputRequest): Promise<DiscussionUserInputResponse> => {
        return new Promise((resolve) => {
          userInputResolverRef.current = resolve;
          setState(prev => ({
            ...prev,
            pendingUserInput: {
              type: request.type,
              participantId: request.participantId,
              role: request.role,
            },
          }));
        });
      },
    });

    try {
      await engine.runDiscussion(theme, turns, participants, voters);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      console.error("Discussion failed:", error);
    }
  }, [theme, turns, participants, voters, plugin, getDiscussionSettings]);

  const stopDiscussion = useCallback(() => {
    engineRef.current?.stop();
    // Resolve pending user input promise to unblock the engine
    if (userInputResolverRef.current) {
      userInputResolverRef.current({ content: "" });
      userInputResolverRef.current = null;
    }
    setState(prev => ({ ...prev, phase: "idle", pendingUserInput: undefined }));
    new Notice(t("discussion.stopped"));
  }, []);

  const resetDiscussion = useCallback(() => {
    engineRef.current?.stop();
    userInputResolverRef.current = null;
    // Restore persisted participants/voters
    const ds = plugin.workspaceState.discussionSettings;
    const savedParticipants = ds?.participants ?? [];
    const savedVoters = ds?.voters ?? [];
    setState({
      phase: "idle",
      currentTurn: 0,
      totalTurns: turns,
      theme: "",
      turns: [],
      conclusions: [],
      votes: [],
      winnerId: null,
      winnerIds: [],
      isDraw: false,
      finalConclusion: "",
      streamingResponses: new Map(),
      participants: savedParticipants,
      voters: savedVoters,
    });
    setTheme("");
    setParticipants(savedParticipants);
    setVoters(savedVoters);
  }, [turns, plugin]);

  const saveNote = useCallback(async () => {
    if (state.phase !== "complete") {
      new Notice(t("discussion.notComplete"));
      return;
    }
    const result: DiscussionResult = {
      theme: state.theme,
      turns: state.turns,
      conclusions: state.conclusions,
      votes: state.votes,
      winnerId: state.winnerId,
      winnerIds: state.winnerIds,
      isDraw: state.isDraw,
      finalConclusion: state.finalConclusion,
      startTime: state.startTime ?? Date.now(),
      endTime: state.endTime ?? Date.now(),
      participants: state.participants,
      voters: state.voters,
    };

    const markdown = DiscussionEngine.generateMarkdownNote(result);
    const ds = getDiscussionSettings();
    const folder = ds.outputFolder;
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const sanitizedTheme = state.theme.slice(0, 50).replace(/[\\/:*?"<>|]/g, "_");
    const fileName = `${folder}/${timestamp}-${sanitizedTheme}.md`;

    try {
      const folderExists = plugin.app.vault.getAbstractFileByPath(folder);
      if (!folderExists) await plugin.app.vault.createFolder(folder);
      await plugin.app.vault.create(fileName, markdown);
      new Notice(t("discussion.saved", { path: fileName }));

      const file = plugin.app.vault.getAbstractFileByPath(fileName);
      if (file) {
        await plugin.app.workspace.getLeaf().openFile(file as import("obsidian").TFile);
      }
      resetDiscussion();
    } catch (error) {
      new Notice(t("discussion.saveFailed", { error: (error as Error).message }));
    }
  }, [state, plugin, getDiscussionSettings, resetDiscussion]);

  const handleSubmitUserDebate = useCallback(() => {
    if (userInput.trim() && userInputResolverRef.current) {
      userInputResolverRef.current({ content: userInput });
      userInputResolverRef.current = null;
      setUserInput("");
      setState(prev => ({ ...prev, pendingUserInput: undefined }));
    }
  }, [userInput]);

  const handleSubmitUserVote = useCallback(() => {
    if (userVoteTarget && userInputResolverRef.current) {
      userInputResolverRef.current({ content: "", votedForId: userVoteTarget, reason: userVoteReason });
      userInputResolverRef.current = null;
      setUserVoteTarget("");
      setUserVoteReason("");
      setState(prev => ({ ...prev, pendingUserInput: undefined }));
    }
  }, [userVoteTarget, userVoteReason]);

  const isRunning = state.phase !== "idle" && state.phase !== "complete" && state.phase !== "error";
  const hasActiveDiscussion = state.phase !== "idle";
  const isPendingUserDebate = state.pendingUserInput?.type === "debate";
  const isPendingUserVote = state.pendingUserInput?.type === "vote";

  return (
    <div className="llm-hub-discussion-panel">
      {/* Header */}
      <div className="llm-hub-discussion-header">
        <div className="llm-hub-discussion-header-left">
          <h3>{t("discussion.title")}</h3>
          <span className="llm-hub-discussion-subtitle">{t("discussion.subtitle")}</span>
        </div>
        <button
          className="llm-hub-discussion-settings-btn clickable-icon"
          onClick={openSettings}
          title={t("discussion.settings")}
        >
          <Settings size={16} />
        </button>
      </div>

      {hasActiveDiscussion && state.theme && (
        <div className="llm-hub-discussion-active-theme">
          <strong>{t("discussion.theme")}:</strong> {state.theme}
        </div>
      )}

      {/* Setup (idle phase) */}
      {state.phase === "idle" && (
        <div className="llm-hub-discussion-setup">
          <div className="llm-hub-discussion-field">
            <label>{t("discussion.theme")}</label>
            <textarea
              className="llm-hub-discussion-theme-input"
              placeholder={t("discussion.themePlaceholder")}
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              rows={3}
            />
          </div>

          <div className="llm-hub-discussion-field">
            <label>{t("discussion.numberOfTurns")}</label>
            <input
              type="number"
              min={1}
              max={10}
              value={turns}
              onChange={(e) => setTurns(parseInt(e.target.value) || 2)}
            />
          </div>

          {/* RAG Setting */}
          {ragEnabled && (
            <div className="llm-hub-discussion-field">
              <label>{t("discussion.ragSetting")}</label>
              <select
                value={pendingAttachments.length > 0 ? "" : (selectedRagSetting || "")}
                onChange={(e) => setSelectedRagSetting(e.target.value || null)}
                disabled={pendingAttachments.length > 0}
              >
                <option value="">{t("discussion.ragNone")}</option>
                {ragSettingNames.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
          )}

          {/* File Attachments */}
          <div className="llm-hub-discussion-field">
            <label>{t("discussion.attachments")}</label>
            <div className="llm-hub-discussion-attachments">
              <button
                className="llm-hub-discussion-attach-btn clickable-icon"
                onClick={() => fileInputRef.current?.click()}
                title={t("discussion.addAttachment")}
              >
                <Paperclip size={16} />
                {t("discussion.addAttachment")}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                style={{ display: "none" }}
                accept={[
                  ...SUPPORTED_TYPES.image,
                  ...SUPPORTED_TYPES.pdf,
                  ...SUPPORTED_TYPES.text,
                  ...SUPPORTED_TYPES.audio,
                  ...SUPPORTED_TYPES.video,
                ].join(",")}
                onChange={(e) => { void handleFileSelect(e); }}
              />
              {pendingAttachments.length > 0 && (
                <div className="llm-hub-discussion-attachment-list">
                  {pendingAttachments.map((att, i) => (
                    <span
                      key={i}
                      className={`llm-hub-discussion-attachment-pill${att.sourcePath ? " llm-hub-clickable" : ""}`}
                      onClick={() => {
                        if (!att.sourcePath) return;
                        new RagSourceModal(plugin.app, att, (result) => {
                          setPendingAttachments(prev => {
                            const next = [...prev];
                            next[i] = result.attachment;
                            return next;
                          });
                        }).open();
                      }}
                      title={att.sourcePath ? t("ragSource.clickToView") : undefined}
                    >
                      {getAttachmentEmoji(att.type)} {att.name}
                      <button
                        className="llm-hub-discussion-remove-btn clickable-icon"
                        onClick={(e) => { e.stopPropagation(); removeAttachment(i); }}
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Debate Participants */}
          <ParticipantSection
            title={t("discussion.debateParticipants")}
            participants={participants}
            onRemove={removeParticipant}
            onUpdateRole={updateRole}
            showRole={true}
            showAddDialog={showAddParticipant}
            onToggleAdd={() => setShowAddParticipant(!showAddParticipant)}
            availableModels={availableModels}
            newModel={newModel}
            onNewModelChange={setNewModel}
            newRole={newRole}
            onNewRoleChange={setNewRole}
            onAdd={addParticipant}
          />

          {/* Vote Participants */}
          <VoterSection
            title={t("discussion.voteParticipants")}
            voters={voters}
            onRemove={removeVoter}
            showAddDialog={showAddVoter}
            onToggleAdd={() => setShowAddVoter(!showAddVoter)}
            availableModels={availableModels}
            newModel={newVoterModel}
            onNewModelChange={setNewVoterModel}
            onAdd={addVoter}
          />

          <button
            className="llm-hub-discussion-start-btn mod-cta"
            onClick={() => { void startDiscussion(); }}
            disabled={!theme.trim() || participants.length < 1 || voters.length < 1}
          >
            {t("discussion.startDiscussion")}
          </button>
          {participants.length < 1 && (
            <p className="llm-hub-discussion-warning">{t("discussion.needOneParticipant")}</p>
          )}
          {participants.length >= 1 && voters.length < 1 && (
            <p className="llm-hub-discussion-warning">{t("discussion.needOneVoter")}</p>
          )}
        </div>
      )}

      {/* User Debate Input */}
      {isPendingUserDebate && state.pendingUserInput && (
        <div className="llm-hub-discussion-user-input">
          <h4>{t("discussion.yourTurn")}</h4>
          {state.pendingUserInput.role && (
            <p className="llm-hub-discussion-user-role">
              <strong>{t("discussion.yourRole")}:</strong> {state.pendingUserInput.role}
            </p>
          )}
          <textarea
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            rows={5}
            placeholder={t("discussion.themePlaceholder")}
          />
          <button className="mod-cta" onClick={handleSubmitUserDebate} disabled={!userInput.trim()}>
            {t("discussion.submitResponse")}
          </button>
        </div>
      )}

      {/* User Vote Input */}
      {isPendingUserVote && state.conclusions.length > 0 && (
        <div className="llm-hub-discussion-user-vote">
          <h4>{t("discussion.selectVote")}</h4>
          <select value={userVoteTarget} onChange={(e) => setUserVoteTarget(e.target.value)}>
            <option value="">{t("discussion.selectVote")}</option>
            {state.conclusions.map(c => (
              <option key={c.participantId} value={c.participantId}>{c.displayName}</option>
            ))}
          </select>
          <input
            type="text"
            value={userVoteReason}
            onChange={(e) => setUserVoteReason(e.target.value)}
            placeholder={t("discussion.voteReason")}
          />
          <button className="mod-cta" onClick={handleSubmitUserVote} disabled={!userVoteTarget}>
            {t("discussion.submitVote")}
          </button>
        </div>
      )}

      {/* Progress */}
      {isRunning && !isPendingUserDebate && !isPendingUserVote && (
        <div className="llm-hub-discussion-progress">
          <div className="llm-hub-discussion-status">
            <span className="llm-hub-discussion-phase">{getPhaseLabel(state.phase)}</span>
            <span className="llm-hub-discussion-turn-info">
              {t("discussion.turn")} {state.currentTurn} / {state.totalTurns}
            </span>
          </div>
          <button className="llm-hub-discussion-stop-btn" onClick={stopDiscussion}>
            {t("discussion.stopDiscussion")}
          </button>
        </div>
      )}

      {/* Streaming responses */}
      {state.streamingResponses.size > 0 && (
        <div className="llm-hub-discussion-streaming">
          <h4>{t("discussion.currentResponses")}</h4>
          <div className="llm-hub-discussion-response-grid">
            {Array.from(state.streamingResponses.entries()).map(([participantId, content]) => {
              const participant = state.participants.find(p => p.id === participantId);
              return (
                <div key={participantId} className="llm-hub-discussion-response-card">
                  <div className="llm-hub-discussion-response-header">
                    <span className="llm-hub-discussion-badge">{participant?.displayName || participantId}</span>
                    <span className="llm-hub-discussion-thinking-indicator">...</span>
                  </div>
                  <div className="llm-hub-discussion-response-content">
                    {content || <span className="llm-hub-discussion-waiting">{t("discussion.thinking")}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Completed turns */}
      {(() => {
        const lastTurn = state.turns[state.turns.length - 1];
        const lastTurnIsConclusion = lastTurn?.responses.some(r => r.isConclusion && !r.error && r.content);
        const turnsToShow = lastTurnIsConclusion && state.conclusions.length > 0
          ? state.turns.filter((turn) => turn.turnNumber !== state.totalTurns)
          : state.turns;
        return turnsToShow.length > 0 ? (
          <div className="llm-hub-discussion-turns">
            <h4>{t("discussion.discussion")}</h4>
            {turnsToShow.map((turn) => (
              <TurnDisplay key={turn.turnNumber} turn={turn} />
            ))}
          </div>
        ) : null;
      })()}

      {/* Conclusions */}
      {state.conclusions.length > 0 && (
        <div className="llm-hub-discussion-conclusions">
          <h4>{t("discussion.conclusions")}</h4>
          <div className="llm-hub-discussion-response-grid">
            {state.conclusions.map((conclusion) => (
              <div key={conclusion.participantId} className="llm-hub-discussion-response-card conclusion">
                <div className="llm-hub-discussion-response-header">
                  <span className="llm-hub-discussion-badge">{conclusion.displayName}</span>
                  <span className="llm-hub-discussion-conclusion-badge">{t("discussion.conclusion")}</span>
                </div>
                <div className="llm-hub-discussion-response-content">{conclusion.content}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Votes */}
      {state.votes.length > 0 && (
        <div className="llm-hub-discussion-votes">
          <h4>{t("discussion.votingResults")}</h4>
          <div className="llm-hub-discussion-votes-list">
            {state.votes.map((vote, i) => (
              <div key={i} className="llm-hub-discussion-vote-item">
                <div className="llm-hub-discussion-vote-row">
                  <span className="llm-hub-discussion-badge small">{vote.voterDisplayName}</span>
                  <span className="llm-hub-discussion-vote-label">→</span>
                  <span className="llm-hub-discussion-badge small">{vote.votedForDisplayName}</span>
                </div>
                {vote.reason && <div className="llm-hub-discussion-vote-reason">{vote.reason}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Winner */}
      {state.phase === "complete" && state.isDraw && state.winnerIds.length > 0 && (
        <div className="llm-hub-discussion-winner">
          <h4>{t("discussion.draw")}</h4>
          <div className="llm-hub-discussion-draw-cards">
            {state.winnerIds.map((winnerId) => {
              const conclusion = state.conclusions.find(c => c.participantId === winnerId);
              return (
                <div key={winnerId} className="llm-hub-discussion-winner-card">
                  <span className="llm-hub-discussion-badge large">{conclusion?.displayName || winnerId}</span>
                  <div className="llm-hub-discussion-final-conclusion">{conclusion?.content || ""}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {state.phase === "complete" && !state.isDraw && state.winnerId && (
        <div className="llm-hub-discussion-winner">
          <h4>{t("discussion.winner")}</h4>
          <div className="llm-hub-discussion-winner-card">
            <span className="llm-hub-discussion-badge large">
              {state.conclusions.find(c => c.participantId === state.winnerId)?.displayName || state.winnerId}
            </span>
            <div className="llm-hub-discussion-final-conclusion">{state.finalConclusion}</div>
          </div>
        </div>
      )}

      {/* Error */}
      {state.phase === "error" && state.error && (
        <div className="llm-hub-discussion-error">
          <h4>{t("discussion.error")}</h4>
          <p>{state.error}</p>
        </div>
      )}

      {/* Actions */}
      {(state.phase === "complete" || state.phase === "error") && (
        <div className="llm-hub-discussion-actions">
          {state.phase === "complete" && (
            <button className="mod-cta" onClick={() => { void saveNote(); }}>
              {t("discussion.saveAsNote")}
            </button>
          )}
          <button onClick={resetDiscussion}>
            {t("discussion.newDiscussion")}
          </button>
        </div>
      )}
    </div>
  );
});

DiscussionPanel.displayName = "DiscussionPanel";

export default DiscussionPanel;

// ---- Sub-components ----

interface ParticipantSectionProps {
  title: string;
  participants: DiscussionParticipant[];
  onRemove: (id: string) => void;
  onUpdateRole: (id: string, role: string) => void;
  showRole: boolean;
  showAddDialog: boolean;
  onToggleAdd: () => void;
  availableModels: ModelInfo[];
  newModel: ModelType;
  onNewModelChange: (model: ModelType) => void;
  newRole: string;
  onNewRoleChange: (role: string) => void;
  onAdd: () => void;
}

function ParticipantSection({
  title, participants, onRemove, onUpdateRole, showRole,
  showAddDialog, onToggleAdd, availableModels,
  newModel, onNewModelChange, newRole, onNewRoleChange, onAdd,
}: ParticipantSectionProps): React.ReactElement {
  return (
    <div className="llm-hub-discussion-section">
      <div className="llm-hub-discussion-section-header">
        <label>{title}</label>
        <button className="llm-hub-discussion-add-btn" onClick={onToggleAdd}>
          + {t("discussion.addParticipant")}
        </button>
      </div>

      {showAddDialog && (
        <div className="llm-hub-discussion-add-dialog">
          <h5>{t("discussion.addDebateParticipant")}</h5>
          <div className="llm-hub-discussion-field">
            <label>{t("discussion.model")}</label>
            <select
              value={newModel}
              onChange={(e) => onNewModelChange(e.target.value as ModelType)}
            >
              <option value="">{t("discussion.model")}</option>
              {availableModels.map(m => (
                <option key={m.name} value={m.name}>{m.displayName}</option>
              ))}
              <option value={"user" as ModelType}>{t("discussion.user")}</option>
            </select>
          </div>
          {showRole && (
            <div className="llm-hub-discussion-field">
              <label>{t("discussion.role")}</label>
              <input
                type="text"
                value={newRole}
                onChange={(e) => onNewRoleChange(e.target.value)}
                placeholder={t("discussion.rolePlaceholder")}
              />
            </div>
          )}
          <div className="llm-hub-discussion-dialog-buttons">
            <button onClick={onToggleAdd}>{t("common.cancel")}</button>
            <button className="mod-cta" onClick={onAdd} disabled={!newModel}>
              {t("discussion.addParticipant")}
            </button>
          </div>
        </div>
      )}

      <div className="llm-hub-discussion-participants-list">
        {participants.map((p) => (
          <div key={p.id} className="llm-hub-discussion-participant-item">
            <div className="llm-hub-discussion-participant-header">
              <span className="llm-hub-discussion-badge">{getModelDisplayName(p.model, availableModels)}</span>
              <button className="llm-hub-discussion-remove-btn clickable-icon" onClick={() => onRemove(p.id)}>
                <X size={14} />
              </button>
            </div>
            {showRole && (
              <div className="llm-hub-discussion-role-field">
                <label className="llm-hub-discussion-role-label">Role:</label>
                <textarea
                  className="llm-hub-discussion-role-input"
                  value={p.role || ""}
                  onChange={(e) => onUpdateRole(p.id, e.target.value)}
                  placeholder={t("discussion.rolePlaceholder")}
                  rows={2}
                />
              </div>
            )}
          </div>
        ))}
        {participants.length === 0 && (
          <p className="llm-hub-discussion-empty">{t("discussion.needOneParticipant")}</p>
        )}
      </div>
    </div>
  );
}

interface VoterSectionProps {
  title: string;
  voters: DiscussionVoter[];
  onRemove: (id: string) => void;
  showAddDialog: boolean;
  onToggleAdd: () => void;
  availableModels: ModelInfo[];
  newModel: ModelType;
  onNewModelChange: (model: ModelType) => void;
  onAdd: () => void;
}

function VoterSection({
  title, voters, onRemove,
  showAddDialog, onToggleAdd, availableModels,
  newModel, onNewModelChange, onAdd,
}: VoterSectionProps): React.ReactElement {
  return (
    <div className="llm-hub-discussion-section">
      <div className="llm-hub-discussion-section-header">
        <label>{title}</label>
        <button className="llm-hub-discussion-add-btn" onClick={onToggleAdd}>
          + {t("discussion.addParticipant")}
        </button>
      </div>

      {showAddDialog && (
        <div className="llm-hub-discussion-add-dialog">
          <h5>{t("discussion.addVoter")}</h5>
          <div className="llm-hub-discussion-field">
            <label>{t("discussion.model")}</label>
            <select
              value={newModel}
              onChange={(e) => onNewModelChange(e.target.value as ModelType)}
            >
              <option value="">{t("discussion.model")}</option>
              {availableModels.map(m => (
                <option key={m.name} value={m.name}>{m.displayName}</option>
              ))}
              <option value={"user" as ModelType}>{t("discussion.user")}</option>
            </select>
          </div>
          <div className="llm-hub-discussion-dialog-buttons">
            <button onClick={onToggleAdd}>{t("common.cancel")}</button>
            <button className="mod-cta" onClick={onAdd} disabled={!newModel}>
              {t("discussion.addParticipant")}
            </button>
          </div>
        </div>
      )}

      <div className="llm-hub-discussion-participants-list">
        {voters.map((v) => (
          <div key={v.id} className="llm-hub-discussion-participant-item">
            <span className="llm-hub-discussion-badge">{v.displayName}</span>
            <button className="llm-hub-discussion-remove-btn clickable-icon" onClick={() => onRemove(v.id)}>
              <X size={14} />
            </button>
          </div>
        ))}
        {voters.length === 0 && (
          <p className="llm-hub-discussion-empty">{t("discussion.needOneVoter")}</p>
        )}
      </div>
    </div>
  );
}

interface TurnDisplayProps {
  turn: DiscussionTurn;
}

function TurnDisplay({ turn }: TurnDisplayProps): React.ReactElement {
  const [expanded, setExpanded] = useState(true);
  return (
    <div className="llm-hub-discussion-turn">
      <div className="llm-hub-discussion-turn-header" onClick={() => setExpanded(!expanded)}>
        <span>{t("discussion.turn")} {turn.turnNumber}</span>
        <span>{expanded ? "▼" : "▶"}</span>
      </div>
      {expanded && (
        <div className="llm-hub-discussion-response-grid">
          {turn.responses.map((response) => {
            return (
              <div key={response.participantId} className="llm-hub-discussion-response-card">
                <div className="llm-hub-discussion-response-header">
                  <span className="llm-hub-discussion-badge">{response.displayName}</span>
                </div>
                <div className="llm-hub-discussion-response-content">
                  {response.error ? (
                    <span className="llm-hub-discussion-error-text">{response.error}</span>
                  ) : response.content}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
