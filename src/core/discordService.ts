/**
 * Discord Bot Service
 *
 * Lightweight Discord bot using REST API + Gateway WebSocket directly.
 * Receives messages from Discord, routes them through the configured LLM provider,
 * and sends responses back.
 *
 * Inspired by OpenClaw's channel architecture but simplified for Obsidian plugin use.
 */

import { App, Notice, requestUrl } from "obsidian";
import type { LlmHubPlugin } from "../plugin";
import type { DiscordSettings, Message, ToolDefinition, ModelType, SlashCommand } from "../types";
import { isApiProviderModel, getApiProviderId, getApiProviderModelName, getDefaultModel, getGeminiApiKey, isLocalLlmModel, getLocalLlmConfig, localLlmDisplayName } from "../types";
import { getEnabledTools, skillScriptTool, skillWorkflowTool } from "./tools";
import { GET_WORKFLOW_SPEC_TOOL, GET_WORKFLOW_SPEC_TOOL_NAME, handleGetWorkflowSpec } from "../workflow/workflowSpec";
import { createToolExecutor } from "../vault/toolExecutor";
import { discoverSkills, loadSkill, buildSkillSystemPrompt, collectSkillScripts, collectSkillWorkflows, type LoadedSkill, type SkillScriptRef, type SkillWorkflowRef } from "./skillsLoader";
import { getInterpreter, runScript } from "./scriptRunner";
import { parseWorkflowFromMarkdown } from "../workflow/parser";
import { WorkflowExecutor } from "../workflow/executor";
import type { PromptCallbacks } from "../workflow/types";
import type { EditConfirmationResult } from "../ui/components/workflow/EditConfirmationModal";
import { TFile } from "obsidian";
import { openaiChatWithToolsStream } from "./openaiProvider";
import { anthropicChatWithToolsStream } from "./anthropicProvider";
import { GeminiClient, getGeminiClient, shouldEnableThinkingByKeyword } from "./gemini";
import { localLlmChatStream } from "./localLlmProvider";
import { CliProviderManager } from "./cliProvider";
import { searchLocalRag } from "./localRagStore";
import { formatError } from "../utils/error";
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
	getPendingBulkDelete,
	applyBulkDelete,
	getPendingBulkRename,
	applyBulkRename,
} from "../vault/notes";

// Discord API constants
const DISCORD_API_BASE = "https://discord.com/api/v10";
const DISCORD_GATEWAY_URL = "wss://gateway.discord.gg/?v=10&encoding=json";
const DISCORD_USER_AGENT = "DiscordBot (https://github.com/obsidian-llm-hub, 1.0)";

// Gateway Opcodes
const GatewayOp = {
  DISPATCH: 0,
  HEARTBEAT: 1,
  IDENTIFY: 2,
  RESUME: 6,
  RECONNECT: 7,
  INVALID_SESSION: 9,
  HELLO: 10,
  HEARTBEAT_ACK: 11,
} as const;

// Gateway Intents
const GatewayIntents = {
  GUILDS: 1 << 0,
  GUILD_MESSAGES: 1 << 9,
  DIRECT_MESSAGES: 1 << 12,
  MESSAGE_CONTENT: 1 << 15,
};

interface DiscordMessage {
  id: string;
  channel_id: string;
  guild_id?: string;
  author: {
    id: string;
    username: string;
    discriminator: string;
    bot?: boolean;
  };
  content: string;
  timestamp: string;
  mentions: Array<{ id: string }>;
  type: number;
}

interface GatewayPayload {
  op: number;
  d: unknown;
  s?: number | null;
  t?: string | null;
}

// Per-channel conversation history (kept in memory, limited)
interface ChannelConversation {
  messages: Message[];
  lastActivity: number;
  model: ModelType | null;       // Per-channel model override
  ragSetting: string | null;     // Per-channel RAG setting name
  webSearch: boolean;            // Per-channel web search toggle (Gemini only)
  activeSkillPaths: string[];    // Active folder skill paths
  lastInteractionId?: string;    // Interactions API chaining (Gemini only)
}

const MAX_CONVERSATION_MESSAGES = 20;
const CONVERSATION_TTL_MS = 30 * 60 * 1000; // 30 minutes
const SNOWFLAKE_RE = /^\d{17,20}$/;

export class DiscordService {
  private ws: WebSocket | null = null;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private lastSequence: number | null = null;
  private sessionId: string | null = null;
  private resumeGatewayUrl: string | null = null;
  private botUserId: string | null = null;
  private isConnected = false;
  private shouldReconnect = true;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private conversations = new Map<string, ChannelConversation>();
  private channelQueues = new Map<string, Array<{ content: string; messageId: string }>>();
  private processingChannels = new Set<string>();
  private runningDiscussions = new Map<string, { stop: () => void }>();
  private heartbeatAcked = true;

  constructor(
    private app: App,
    private plugin: LlmHubPlugin,
  ) {}

  get settings(): DiscordSettings {
    return this.plugin.settings.discord;
  }

  /**
   * Start the Discord bot
   */
  start(): void {
    if (!this.settings.botToken) {
      throw new Error("Discord bot token is not configured");
    }

    if (this.isConnected) {
      console.log("Discord bot is already connected");
      return;
    }

    this.shouldReconnect = true;
    this.reconnectAttempts = 0;
    this.connect();
  }

  /**
   * Stop the Discord bot
   */
  stop(): void {
    this.shouldReconnect = false;
    this.cleanup();
    this.conversations.clear();
    // Stop all running discussions
    for (const [, handle] of this.runningDiscussions) {
      handle.stop();
    }
    this.runningDiscussions.clear();
    console.log("LLM Hub: Discord bot stopped");
  }

  /**
   * Check if the bot is currently connected
   */
  get connected(): boolean {
    return this.isConnected;
  }

  /**
   * Verify the bot token by fetching the bot user info
   */
  async verifyToken(token: string): Promise<{ success: boolean; username?: string; error?: string }> {
    try {
      const response = await requestUrl({
        url: `${DISCORD_API_BASE}/users/@me`,
        headers: { Authorization: `Bot ${token}`, "User-Agent": DISCORD_USER_AGENT },
      });
      if (response.status >= 400) {
        return { success: false, error: `HTTP ${response.status}: ${response.text}` };
      }
      const data = response.json as { username: string; id: string };
      return { success: true, username: data.username };
    } catch (e) {
      return { success: false, error: formatError(e) };
    }
  }

  // ========================================
  // WebSocket Gateway
  // ========================================

  private connect(): void {
    const url = this.resumeGatewayUrl || DISCORD_GATEWAY_URL;

    try {
      this.ws = new WebSocket(url);
    } catch (e) {
      console.error("LLM Hub: Failed to create Discord WebSocket:", formatError(e));
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      console.log("LLM Hub: Discord Gateway WebSocket opened");
    };

    this.ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data as string) as GatewayPayload;
        this.handleGatewayPayload(payload);
      } catch (e) {
        console.error("LLM Hub: Failed to parse Discord gateway message:", formatError(e));
      }
    };

    this.ws.onclose = (event) => {
      this.isConnected = false;
      this.stopHeartbeat();

      const code = event.code;
      console.log(`LLM Hub: Discord Gateway closed (code: ${code})`);

      // Non-recoverable close codes
      if (code === 4004) {
        console.error("LLM Hub: Discord authentication failed - invalid bot token");
        new Notice("Discord: Invalid bot token");
        this.shouldReconnect = false;
        return;
      }
      if (code === 4014) {
        console.error("LLM Hub: Discord: Disallowed intents - enable MESSAGE_CONTENT intent in Discord Developer Portal");
        new Notice("Discord: Enable MESSAGE_CONTENT intent in Developer Portal");
        this.shouldReconnect = false;
        return;
      }

      if (this.shouldReconnect) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = (event) => {
      console.error("LLM Hub: Discord Gateway WebSocket error:", event);
    };
  }

  private handleGatewayPayload(payload: GatewayPayload): void {
    if (payload.s !== null && payload.s !== undefined) {
      this.lastSequence = payload.s;
    }

    switch (payload.op) {
      case GatewayOp.HELLO: {
        const data = payload.d as { heartbeat_interval: number };
        this.startHeartbeat(data.heartbeat_interval);

        // Resume or identify
        if (this.sessionId && this.lastSequence !== null) {
          this.sendResume();
        } else {
          this.sendIdentify();
        }
        break;
      }

      case GatewayOp.HEARTBEAT_ACK:
        this.heartbeatAcked = true;
        break;

      case GatewayOp.RECONNECT:
        console.log("LLM Hub: Discord Gateway requested reconnect");
        this.ws?.close();
        break;

      case GatewayOp.INVALID_SESSION: {
        const canResume = payload.d as boolean;
        if (!canResume) {
          this.sessionId = null;
          this.lastSequence = null;
        }
        // Close existing WebSocket before reconnecting
        this.cleanup();
        setTimeout(() => {
          if (this.shouldReconnect) {
            this.connect();
          }
        }, canResume ? 1000 : 5000);
        break;
      }

      case GatewayOp.DISPATCH:
        this.handleDispatch(payload.t || "", payload.d);
        break;
    }
  }

  private handleDispatch(event: string, data: unknown): void {
    switch (event) {
      case "READY": {
        const readyData = data as {
          session_id: string;
          resume_gateway_url: string;
          user: { id: string; username: string };
        };
        this.sessionId = readyData.session_id;
        this.resumeGatewayUrl = readyData.resume_gateway_url;
        this.botUserId = readyData.user.id;
        this.isConnected = true;
        this.reconnectAttempts = 0;
        console.log(`LLM Hub: Discord bot connected as ${readyData.user.username}`);
        new Notice(`Discord bot connected as ${readyData.user.username}`);
        break;
      }

      case "RESUMED":
        this.isConnected = true;
        this.reconnectAttempts = 0;
        console.log("LLM Hub: Discord session resumed");
        break;

      case "MESSAGE_CREATE": {
        const message = data as DiscordMessage;
        void this.handleMessage(message);
        break;
      }
    }
  }

  private sendIdentify(): void {
    const intents =
      GatewayIntents.GUILDS |
      GatewayIntents.GUILD_MESSAGES |
      GatewayIntents.DIRECT_MESSAGES |
      GatewayIntents.MESSAGE_CONTENT;

    this.send({
      op: GatewayOp.IDENTIFY,
      d: {
        token: this.settings.botToken,
        intents,
        properties: {
          os: "obsidian",
          browser: "obsidian-llm-hub",
          device: "obsidian-llm-hub",
        },
      },
    });
  }

  private sendResume(): void {
    this.send({
      op: GatewayOp.RESUME,
      d: {
        token: this.settings.botToken,
        session_id: this.sessionId,
        seq: this.lastSequence,
      },
    });
  }

  private startHeartbeat(intervalMs: number): void {
    this.stopHeartbeat();
    this.heartbeatAcked = true;
    // Send first heartbeat after jitter
    setTimeout(() => {
      this.sendHeartbeat();
      this.heartbeatInterval = setInterval(() => {
        if (!this.heartbeatAcked) {
          // Zombie connection — no ACK received since last heartbeat
          console.warn("LLM Hub: Discord heartbeat ACK not received, reconnecting");
          this.ws?.close(4000);
          return;
        }
        this.sendHeartbeat();
      }, intervalMs);
    }, intervalMs * Math.random());
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private sendHeartbeat(): void {
    this.heartbeatAcked = false;
    this.send({ op: GatewayOp.HEARTBEAT, d: this.lastSequence });
  }

  private send(payload: { op: number; d: unknown }): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("LLM Hub: Discord max reconnect attempts reached");
      new Notice("Discord bot: max reconnect attempts reached, stopped");
      this.shouldReconnect = false;
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;
    console.log(`LLM Hub: Discord reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    setTimeout(() => {
      if (this.shouldReconnect) {
        this.connect();
      }
    }, delay);
  }

  private cleanup(): void {
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.onclose = null; // Prevent reconnect handler
      this.ws.close(1000);
      this.ws = null;
    }
    this.isConnected = false;
  }

  // ========================================
  // Message Handling
  // ========================================

  private async handleMessage(message: DiscordMessage): Promise<void> {
    // Ignore bot messages (including own)
    if (message.author.bot) return;

    // Check if this is a DM (no guild_id)
    const isDM = !message.guild_id;

    // DM policy
    if (isDM && !this.settings.respondToDMs) return;

    // In channels, check if bot is mentioned (when requireMention is enabled)
    if (!isDM && this.settings.requireMention) {
      const isMentioned = message.mentions.some(m => m.id === this.botUserId);
      if (!isMentioned) return;
    }

    // Check allowed channels
    if (this.settings.allowedChannelIds) {
      const allowedChannels = this.settings.allowedChannelIds.split(",").map(s => s.trim()).filter(Boolean);
      if (allowedChannels.length > 0 && !allowedChannels.includes(message.channel_id)) return;
    }

    // Check allowed users
    if (this.settings.allowedUserIds) {
      const allowedUsers = this.settings.allowedUserIds.split(",").map(s => s.trim()).filter(Boolean);
      if (allowedUsers.length > 0 && !allowedUsers.includes(message.author.id)) return;
    }

    // Extract message content (remove bot mention if present)
    let content = message.content;
    if (this.botUserId) {
      content = content.replace(new RegExp(`<@!?${this.botUserId}>`, "g"), "").trim();
    }

    if (!content) return;

    // Handle ! commands (model, rag, skill, reset)
    const commandResult = await this.handleCommand(content, message.channel_id);
    if (commandResult !== null) {
      if (commandResult.reply) {
        await this.sendResponse(message.channel_id, commandResult.reply, message.id);
      }
      if (commandResult.overrideContent) {
        // Skill without variables — use template as the message content
        content = commandResult.overrideContent;
      } else {
        return;
      }
    }

    // Queue message if channel is already being processed
    if (this.processingChannels.has(message.channel_id)) {
      const queue = this.channelQueues.get(message.channel_id) || [];
      queue.push({ content, messageId: message.id });
      this.channelQueues.set(message.channel_id, queue);
      return;
    }

    await this.processMessage(message.channel_id, content, message.id);
  }

  private async processMessage(channelId: string, content: string, messageId: string): Promise<void> {
    this.processingChannels.add(channelId);

    try {
      // Show typing indicator
      await this.sendTyping(channelId);

      // Get or create conversation history for this channel
      const conversation = this.getConversation(channelId);

      // Check if a skill is being applied — resolve template
      const skillCommand = this.pendingSkills.get(channelId);
      if (skillCommand) {
        this.pendingSkills.delete(channelId);
        content = skillCommand.promptTemplate.replace(/\{selection\}/g, content).replace(/\{content\}/g, content);
      }

      // Add user message
      conversation.messages.push({
        role: "user",
        content,
        timestamp: Date.now(),
      });

      // Trim conversation history
      if (conversation.messages.length > MAX_CONVERSATION_MESSAGES) {
        conversation.messages = conversation.messages.slice(-MAX_CONVERSATION_MESSAGES);
      }
      conversation.lastActivity = Date.now();

      // Generate response
      const response = await this.generateResponse(conversation);

      // Add assistant message to conversation
      conversation.messages.push({
        role: "assistant",
        content: response,
        timestamp: Date.now(),
      });

      // Append model footer to display
      const modelLabel = this.getModelDisplayName(conversation);
      const displayResponse = response + `\n-# ${modelLabel}`;

      // Send response (split if too long)
      await this.sendResponse(channelId, displayResponse, messageId);
    } catch (e) {
      console.error("LLM Hub: Discord message handling failed:", formatError(e));
      try {
        await this.sendDiscordMessage(channelId, "Sorry, an error occurred while processing your message.");
      } catch { /* ignore */ }
    } finally {
      this.processingChannels.delete(channelId);

      // Process next queued message
      const queue = this.channelQueues.get(channelId);
      if (queue && queue.length > 0) {
        const next = queue.shift()!;
        if (queue.length === 0) this.channelQueues.delete(channelId);
        void this.processMessage(channelId, next.content, next.messageId);
      }
    }
  }

  // ========================================
  // Command Handling
  // ========================================

  private pendingSkills = new Map<string, SlashCommand>();

  /**
   * Handle ! commands. Returns { reply, overrideContent } if handled, null if not a command.
   * reply is the message to send back (empty = no reply).
   * overrideContent replaces the message content for LLM processing (for immediate skill execution).
   */
  private async handleCommand(content: string, channelId: string): Promise<{ reply: string; overrideContent?: string } | null> {
    if (!content.startsWith("!")) return null;

    const spaceIdx = content.indexOf(" ");
    const cmd = (spaceIdx >= 0 ? content.slice(1, spaceIdx) : content.slice(1)).toLowerCase();
    const arg = spaceIdx >= 0 ? content.slice(spaceIdx + 1).trim() : "";

    switch (cmd) {
      case "model": return { reply: this.handleModelCommand(arg, channelId) };
      case "rag": return { reply: this.handleRagCommand(arg, channelId) };
      case "websearch": return { reply: this.handleWebSearchCommand(channelId) };
      case "skill": return await this.handleSkillCommand(arg, channelId);
      case "research": return this.handleResearchCommand(arg, channelId);
      case "discuss": return this.handleDiscussCommand(arg, channelId);
      case "reset": return { reply: this.handleResetCommand(channelId) };
      case "help": return { reply: this.handleHelpCommand(channelId) };
      default: return null;
    }
  }

  private handleModelCommand(arg: string, channelId: string): string {
    const models = this.getAvailableModels();
    const conversation = this.getConversation(channelId);

    if (!arg) {
      const currentModel = conversation.model || this.settings.model || null;
      const lines = ["**Available models:**"];
      for (const m of models) {
        const marker = m.name === currentModel ? " ✅" : "";
        lines.push(`- \`${m.name}\` — ${m.displayName}${marker}`);
      }
      lines.push("");
      lines.push("Usage: `!model <name>` to switch");
      if (currentModel) {
        lines.push(`Current: \`${currentModel}\``);
      } else {
        lines.push("Current: (default)");
      }
      return lines.join("\n");
    }

    // Find matching model
    const match = models.find(m =>
      m.name === arg || m.displayName.toLowerCase() === arg.toLowerCase()
    );
    if (!match) {
      return `Model \`${arg}\` not found. Use \`!model\` to see available models.`;
    }

    conversation.model = match.name;

    // Clear webSearch if new model is not Gemini API
    if (conversation.webSearch && !this.isGeminiApiModel(match.name)) {
      conversation.webSearch = false;
    }

    return `Model switched to **${match.displayName}** (\`${match.name}\`)`;
  }

  private handleRagCommand(arg: string, channelId: string): string {
    const ragNames = this.plugin.getRagSettingNames();
    const conversation = this.getConversation(channelId);

    if (!arg) {
      if (ragNames.length === 0) {
        return "No RAG settings configured. Configure RAG in Obsidian settings.";
      }
      const lines = ["**Available RAG settings:**"];
      for (const name of ragNames) {
        const marker = name === conversation.ragSetting ? " ✅" : "";
        lines.push(`- \`${name}\`${marker}`);
      }
      lines.push(`- \`off\` — Disable RAG${!conversation.ragSetting ? " ✅" : ""}`);
      lines.push("");
      lines.push("Usage: `!rag <name>` to switch, `!rag off` to disable");
      return lines.join("\n");
    }

    if (arg.toLowerCase() === "off") {
      conversation.ragSetting = null;
      return "RAG disabled for this channel.";
    }

    if (!ragNames.includes(arg)) {
      return `RAG setting \`${arg}\` not found. Use \`!rag\` to see available settings.`;
    }

    conversation.ragSetting = arg;
    return `RAG switched to **${arg}**`;
  }

  private handleWebSearchCommand(channelId: string): string {
    const conversation = this.getConversation(channelId);

    // Check if current model is a Gemini provider
    const model: ModelType = conversation.model
      || (this.settings.model ? (this.settings.model as ModelType) : null)
      || getDefaultModel(this.plugin.settings);

    if (!this.isGeminiApiModel(model)) {
      return "Web Search is only available with Gemini API models. Current model does not support it.";
    }

    conversation.webSearch = !conversation.webSearch;
    return conversation.webSearch
      ? "Web Search **enabled** for this channel."
      : "Web Search **disabled** for this channel.";
  }

  private async handleSkillCommand(arg: string, channelId: string): Promise<{ reply: string; overrideContent?: string }> {
    const slashCommands = this.plugin.settings.slashCommands || [];
    const folderSkills = await discoverSkills(this.app);
    const conversation = this.getConversation(channelId);

    if (!arg) {
      if (slashCommands.length === 0 && folderSkills.length === 0) {
        return { reply: "No skills configured." };
      }
      const lines = ["**Available skills:**"];
      for (const s of slashCommands) {
        const desc = s.description ? ` — ${s.description}` : "";
        lines.push(`- \`${s.name}\`${desc}`);
      }
      for (const s of folderSkills) {
        const isActive = conversation.activeSkillPaths.includes(s.folderPath);
        const desc = s.description ? ` — ${s.description}` : "";
        const marker = isActive ? " ✅" : "";
        lines.push(`- \`${s.name}\`${desc}${marker}`);
      }
      lines.push("");
      lines.push("Usage: `!skill <name>` to activate, `!skill off` to deactivate all");
      return { reply: lines.join("\n") };
    }

    if (arg.toLowerCase() === "off") {
      conversation.activeSkillPaths = [];
      this.pendingSkills.delete(channelId);
      return { reply: "All skills deactivated." };
    }

    // Try slash command first
    const slashCommand = slashCommands.find(s => s.name.toLowerCase() === arg.toLowerCase());
    if (slashCommand) {
      if (slashCommand.model) {
        conversation.model = slashCommand.model;
        if (conversation.webSearch && !this.isGeminiApiModel(slashCommand.model)) {
          conversation.webSearch = false;
        }
      }
      if (slashCommand.searchSetting !== null && slashCommand.searchSetting !== undefined) {
        if (slashCommand.searchSetting === "__websearch__") {
          const model: ModelType = conversation.model
            || (this.settings.model ? (this.settings.model as ModelType) : null)
            || getDefaultModel(this.plugin.settings);
          if (!this.isGeminiApiModel(model)) {
            return { reply: "Web Search is only available with Gemini API models. Current model does not support it." };
          }
          conversation.ragSetting = null;
          conversation.webSearch = true;
        } else {
          conversation.ragSetting = slashCommand.searchSetting === "" ? null : slashCommand.searchSetting;
          conversation.webSearch = false;
        }
      }
      if (slashCommand.promptTemplate.includes("{selection}") || slashCommand.promptTemplate.includes("{content}")) {
        this.pendingSkills.set(channelId, slashCommand);
        return { reply: `Skill **${slashCommand.name}** activated. Send the text to apply it to.` };
      }
      return { reply: "", overrideContent: slashCommand.promptTemplate };
    }

    // Try folder skill (toggle on/off)
    const folderSkill = folderSkills.find(s => s.name.toLowerCase() === arg.toLowerCase());
    if (folderSkill) {
      const idx = conversation.activeSkillPaths.indexOf(folderSkill.folderPath);
      if (idx >= 0) {
        conversation.activeSkillPaths.splice(idx, 1);
        return { reply: `Skill **${folderSkill.name}** deactivated.` };
      }
      conversation.activeSkillPaths.push(folderSkill.folderPath);
      return { reply: `Skill **${folderSkill.name}** activated.` };
    }

    return { reply: `Skill \`${arg}\` not found. Use \`!skill\` to see available skills.` };
  }

  private handleResearchCommand(query: string, channelId: string): { reply: string } {
    if (!query) {
      return { reply: "Usage: `!research <query>` — Run Gemini Deep Research on a topic." };
    }

    // Verify Gemini client is available
    const client = getGeminiClient();
    if (!client) {
      return { reply: "Gemini API is not configured. Deep Research requires a Gemini API key." };
    }

    const conversation = this.getConversation(channelId);

    // Fire-and-forget: run research in background so the channel stays responsive
    void (async () => {
      try {
        let fullText = "";
        let interactionId: string | undefined;
        const stream = client.deepResearchStream(
          query,
          conversation.lastInteractionId,
        );
        for await (const chunk of stream) {
          if (chunk.type === "text") fullText += chunk.content;
          else if (chunk.type === "error") {
            await this.sendDiscordMessage(channelId, `Deep Research failed: ${chunk.error}`);
            return;
          } else if (chunk.type === "done") {
            interactionId = chunk.interactionId;
            break;
          }
        }

        if (interactionId) {
          conversation.lastInteractionId = interactionId;
        }

        // Add to conversation history so follow-up messages have context
        conversation.messages.push(
          { role: "user", content: `[Deep Research] ${query}`, timestamp: Date.now() },
          { role: "assistant", content: fullText, timestamp: Date.now() },
        );
        if (conversation.messages.length > MAX_CONVERSATION_MESSAGES) {
          conversation.messages = conversation.messages.slice(-MAX_CONVERSATION_MESSAGES);
        }
        conversation.lastActivity = Date.now();

        await this.sendResponse(channelId, fullText || "Deep Research returned no results.");
      } catch (e) {
        try {
          await this.sendDiscordMessage(channelId, `Deep Research error: ${formatError(e)}`);
        } catch { /* ignore */ }
      }
    })();

    return { reply: `Deep Research started for: **${query}**\nThis may take several minutes. You can continue chatting in the meantime.` };
  }

  private handleDiscussCommand(theme: string, channelId: string): { reply: string } {
    if (!theme) {
      return { reply: "Usage: `!discuss <theme>` — Start an AI Discussion on a topic.\nConfigure participants in the Discussion tab settings." };
    }

    if (this.runningDiscussions.has(channelId) && this.runningDiscussions.get(channelId)) {
      return { reply: "A discussion is already running in this channel. Please wait for it to complete." };
    }

    const ds = this.plugin.workspaceState.discussionSettings;
    if (!ds) {
      return { reply: "No Discussion settings found. Open the Discussion tab in Obsidian and configure participants first." };
    }

    // Filter out "user" type — no UI to collect user input from Discord
    const participants = (ds.participants || []).filter(p => p.model !== ("user" as ModelType));
    const voters = (ds.voters || []).filter(v => v.model !== ("user" as ModelType));

    if (participants.length < 1) {
      return { reply: "No AI participants configured (user participants are excluded in Discord). Open the Discussion tab in Obsidian and add AI participants." };
    }
    if (voters.length < 1) {
      return { reply: "No AI voters configured (user voters are excluded in Discord). Open the Discussion tab in Obsidian and add AI voters." };
    }

    const turns = ds.defaultTurns || 2;

    // Fire-and-forget: run discussion in background
    // Placeholder — will be replaced once engine is created
    this.runningDiscussions.set(channelId, { stop: () => {} });
    void (async () => {
      try {
        const { DiscussionEngine } = await import("./discussionEngine");
        const engine = new DiscussionEngine(this.plugin.settings, ds);
        this.runningDiscussions.set(channelId, { stop: () => engine.stop() });

        // Notify on each turn completion
        engine.setCallbacks({
          onTurnStart: (turnNumber: number) => {
            void this.sendDiscordMessage(channelId, `**Turn ${turnNumber}/${turns}** — Participants are responding...`);
          },
          onPhaseChange: (phase: string) => {
            if (phase === "concluding") {
              void this.sendDiscordMessage(channelId, "**Drawing conclusions...**");
            } else if (phase === "voting") {
              void this.sendDiscordMessage(channelId, "**Voting phase started...**");
            }
          },
        });

        const result = await engine.runDiscussion(theme, turns, participants, voters);

        // Format result for Discord
        const markdown = DiscussionEngine.generateMarkdownNote(result);

        // Send result (may be split across multiple messages)
        await this.sendResponse(channelId, markdown);
      } catch (e) {
        try {
          await this.sendDiscordMessage(channelId, `Discussion error: ${formatError(e)}`);
        } catch { /* ignore */ }
      } finally {
        this.runningDiscussions.delete(channelId);
      }
    })();

    const participantNames = participants.map(p => p.displayName).join(", ");
    return { reply: `**AI Discussion started:** ${theme}\n**Participants:** ${participantNames}\n**Turns:** ${turns}\nThis may take several minutes.` };
  }

  private handleResetCommand(channelId: string): string {
    this.conversations.delete(channelId);
    this.pendingSkills.delete(channelId);
    return "Conversation history cleared.";
  }

  private handleHelpCommand(_channelId: string): string {
    const lines = [
      "**LLM Hub Discord Bot Commands:**",
      "- `!model` — List available models",
      "- `!model <name>` — Switch model",
      "- `!rag` — List RAG settings",
      "- `!rag <name>` — Switch RAG setting",
      "- `!rag off` — Disable RAG",
      "- `!websearch` — Toggle Web Search on/off (Gemini only)",
      "- `!skill` — List available skills",
      "- `!skill <name>` — Activate a skill",
      "- `!research <query>` — Run Deep Research (runs in background, may take several minutes)",
      "- `!discuss <theme>` — Start AI Discussion (uses configured participants from Discussion tab)",
      "- `!reset` — Clear conversation history",
      "- `!help` — Show this help",
    ];
    return lines.join("\n");
  }

  private getAvailableModels(): Array<{ name: ModelType; displayName: string }> {
    const settings = this.plugin.settings;
    const models: Array<{ name: ModelType; displayName: string }> = [];

    // API providers
    const enabledProviders = settings.apiProviders.filter(p => p.enabled && p.verified);
    for (const p of enabledProviders) {
      for (const m of p.enabledModels) {
        models.push({
          name: `api:${p.id}:${m}` as ModelType,
          displayName: `${p.name} (${m})`,
        });
      }
    }

    // CLI models
    const cli = settings.cliConfig;
    if (cli?.cliVerified) models.push({ name: "antigravity-cli", displayName: "Antigravity CLI" });
    if (cli?.claudeCliVerified) models.push({ name: "claude-cli", displayName: "Claude CLI" });
    if (cli?.codexCliVerified) models.push({ name: "codex-cli", displayName: "Codex CLI" });

    // Local LLM — one entry per (verified config × enabled model)
    const localConfigs = (settings.localLlmConfigs ?? []).filter(c => c.verified && c.enabled !== false);
    for (const config of localConfigs) {
      const localModels = (config.enabledModels && config.enabledModels.length > 0)
        ? config.enabledModels
        : (config.model ? [config.model] : []);
      for (const m of localModels) {
        models.push({
          name: `local-llm:${config.id}:${m}`,
          displayName: localLlmDisplayName(config, m),
        });
      }
    }

    return models;
  }

  private getConversation(channelId: string): ChannelConversation {
    // Clean up stale conversations
    const now = Date.now();
    for (const [id, conv] of this.conversations) {
      if (now - conv.lastActivity > CONVERSATION_TTL_MS) {
        this.conversations.delete(id);
      }
    }

    let conv = this.conversations.get(channelId);
    if (!conv) {
      conv = { messages: [], lastActivity: now, model: null, ragSetting: null, webSearch: false, activeSkillPaths: [] };
      this.conversations.set(channelId, conv);
    }
    return conv;
  }

  private getModelDisplayName(conversation: ChannelConversation): string {
    const model: ModelType = conversation.model
      || (this.settings.model ? (this.settings.model as ModelType) : null)
      || getDefaultModel(this.plugin.settings);
    const models = this.getAvailableModels();
    const found = models.find(m => m.name === model);
    const label = found ? found.displayName : model;
    const extras: string[] = [];
    if (conversation.ragSetting) extras.push(`RAG: ${conversation.ragSetting}`);
    if (conversation.webSearch) extras.push("WebSearch");
    return extras.length > 0 ? `${label} | ${extras.join(" | ")}` : label;
  }

  private isGeminiApiModel(model: ModelType): boolean {
    if (model === "antigravity-cli") return false;
    if (!isApiProviderModel(model)) return false;
    const providerId = getApiProviderId(model);
    const provider = this.plugin.settings.apiProviders.find(
      p => p.id === providerId && p.enabled && p.verified
    );
    return provider?.type === "gemini";
  }

  // ========================================
  // LLM Integration
  // ========================================

  private async generateResponse(conversation: ChannelConversation): Promise<string> {
    const settings = this.plugin.settings;
    const discordSettings = this.settings;
    const messages = conversation.messages;

    // Resolve model: per-channel > discord setting > default
    const model: ModelType = conversation.model
      || (discordSettings.model ? (discordSettings.model as ModelType) : null)
      || getDefaultModel(settings);

    // Build system prompt
    let systemPrompt = discordSettings.systemPrompt || settings.systemPrompt ||
      "You are a helpful AI assistant connected via Discord. Be concise and helpful.";

    // RAG context injection
    const ragSettingName = conversation.ragSetting;
    const ragEnabled = !!ragSettingName;
    if (ragSettingName) {
      const ragSetting = this.plugin.getRagSetting(ragSettingName);
      if (ragSetting) {
        const lastUserMsg = [...messages].reverse().find(m => m.role === "user");
        if (lastUserMsg?.content) {
          try {
            const ragResult = await searchLocalRag(
              ragSettingName, lastUserMsg.content,
              ragSetting, getGeminiApiKey(settings),
              this.plugin.settings.proxyUrl, this.plugin.settings.proxyBypass
            );
            if (ragResult.sources.length > 0) {
              systemPrompt += ragResult.context;
            }
          } catch (e) {
            console.error("LLM Hub: Discord RAG search failed:", formatError(e));
          }
        }
      }
    }

    // Load active folder skills
    const loadedSkills: LoadedSkill[] = [];
    const activeSkillPaths = conversation.activeSkillPaths || [];
    if (activeSkillPaths.length > 0) {
      const allSkills = await discoverSkills(this.app);
      for (const path of activeSkillPaths) {
        const meta = allSkills.find(s => s.folderPath === path);
        if (meta) {
          loadedSkills.push(loadSkill(this.app, meta));
        }
      }
    }

    // Route to correct provider
    const isCliModel = model === "antigravity-cli" || model === "claude-cli" || model === "codex-cli";

    // Inject skill system prompt
    if (loadedSkills.length > 0) {
      systemPrompt += buildSkillSystemPrompt(loadedSkills, { cliMode: isCliModel || isLocalLlmModel(model) });
    }

    // Build vault tools
    const tools = getEnabledTools({ allowWrite: true, allowDelete: true, ragEnabled });

    // Add skill tools if any active skill has scripts/workflows
    const scriptMap = collectSkillScripts(loadedSkills);
    const workflowMap = collectSkillWorkflows(loadedSkills);
    if (scriptMap.size > 0) {
      tools.push(skillScriptTool);
    }
    if (workflowMap.size > 0) {
      tools.push(skillWorkflowTool);
    }
    tools.push(GET_WORKFLOW_SPEC_TOOL);

    const toolExecutor = createToolExecutor(this.app, {
      listNotesLimit: settings.listNotesLimit,
      maxNoteChars: settings.maxNoteChars,
    });

    const vaultBasePath = (this.app.vault.adapter as { basePath?: string }).basePath || ".";

    const baseExecuteToolCall = async (name: string, args: Record<string, unknown>) => {
      if (name === "run_skill_script" && scriptMap.size > 0) {
        return await this.executeSkillScript(
          args.scriptId as string, args.args as string | undefined, scriptMap, vaultBasePath,
        );
      }
      if (name === "run_skill_workflow" && workflowMap.size > 0) {
        return await this.executeSkillWorkflow(
          args.workflowId as string, args.variables as string | undefined, workflowMap,
        );
      }
      if (name === GET_WORKFLOW_SPEC_TOOL_NAME) {
        return handleGetWorkflowSpec(args, this.plugin);
      }
      return await toolExecutor(name, args);
    };

    // Wrap tool executor to auto-apply propose_edit/propose_delete/rename (no UI in Discord)
    const executeToolCall = async (name: string, args: Record<string, unknown>) => {
      const prevPendingEdit = getPendingEdit();
      const prevPendingDelete = getPendingDelete();
      const prevPendingRename = getPendingRename();
      const prevPendingBulkEdit = getPendingBulkEdit();
      const prevPendingBulkDelete = getPendingBulkDelete();
      const prevPendingBulkRename = getPendingBulkRename();
      const result = await baseExecuteToolCall(name, args) as Record<string, unknown>;
      const toolCallFailed = result.error !== undefined || result.success === false;

      if (name === "propose_edit") {
        const pending = getPendingEdit();
        const hasNewPending = pending && pending.createdAt !== prevPendingEdit?.createdAt;
        if (hasNewPending && !toolCallFailed) {
          const applyResult = await applyEdit(this.app);
          if (applyResult.success) {
            return { ...result, applied: true, message: `Applied changes to "${pending.originalPath}"` };
          } else {
            discardEdit(this.app);
            return { ...result, applied: false, error: applyResult.error };
          }
        }
      }

      if (name === "propose_delete") {
        const pending = getPendingDelete();
        const hasNewPending = pending && pending.createdAt !== prevPendingDelete?.createdAt;
        if (hasNewPending && !toolCallFailed) {
          const deleteResult = await applyDelete(this.app);
          if (deleteResult.success) {
            return { ...result, deleted: true, message: `Deleted "${pending.path}"` };
          } else {
            discardDelete(this.app);
            return { ...result, deleted: false, error: deleteResult.error };
          }
        }
      }

      if (name === "rename_note") {
        const pendingRn = getPendingRename();
        const hasNewPending = pendingRn && pendingRn.createdAt !== prevPendingRename?.createdAt;
        if (hasNewPending && !toolCallFailed) {
          const renameResult = await applyRename(this.app);
          if (renameResult.success) {
            return { ...result, applied: true, message: `Renamed "${pendingRn.originalPath}" to "${pendingRn.newPath}"` };
          } else {
            discardRename(this.app);
            return { ...result, applied: false, error: renameResult.error };
          }
        }
      }

      if (name === "bulk_propose_edit") {
        const pendingBulk = getPendingBulkEdit();
        const hasNewPending = pendingBulk && pendingBulk.createdAt !== prevPendingBulkEdit?.createdAt;
        if (hasNewPending && !toolCallFailed && pendingBulk.items.length > 0) {
          const allPaths = pendingBulk.items.map(i => i.path);
          const applyResult = await applyBulkEdit(this.app, allPaths);
          return { ...result, applied: applyResult.applied, failed: applyResult.failed, message: applyResult.message };
        }
      }

      if (name === "bulk_propose_delete") {
        const pendingBulk = getPendingBulkDelete();
        const hasNewPending = pendingBulk && pendingBulk.createdAt !== prevPendingBulkDelete?.createdAt;
        if (hasNewPending && !toolCallFailed && pendingBulk.items.length > 0) {
          const allPaths = pendingBulk.items.map(i => i.path);
          const deleteResult = await applyBulkDelete(this.app, allPaths);
          return { ...result, deleted: deleteResult.deleted, failed: deleteResult.failed, message: deleteResult.message };
        }
      }

      if (name === "bulk_propose_rename") {
        const pendingBulk = getPendingBulkRename();
        const hasNewPending = pendingBulk && pendingBulk.createdAt !== prevPendingBulkRename?.createdAt;
        if (hasNewPending && !toolCallFailed && pendingBulk.items.length > 0) {
          const allPaths = pendingBulk.items.map(i => i.originalPath);
          const renameResult = await applyBulkRename(this.app, allPaths);
          return { ...result, applied: renameResult.applied, failed: renameResult.failed, message: renameResult.message };
        }
      }

      return result;
    };

    if (isCliModel) {
      conversation.lastInteractionId = undefined;
      return await this.generateViaCli(model, messages, systemPrompt, scriptMap, workflowMap, vaultBasePath);
    }

    if (isLocalLlmModel(model)) {
      conversation.lastInteractionId = undefined;
      return await this.generateViaLocalLlm(model, messages, systemPrompt, scriptMap, workflowMap, vaultBasePath);
    }

    const webSearchEnabled = conversation.webSearch;

    if (isApiProviderModel(model)) {
      const providerId = getApiProviderId(model);
      const providerConfig = this.plugin.settings.apiProviders.find(
        p => p.id === providerId && p.enabled && p.verified
      );
      // Gemini-type API providers use Interactions API chaining
      if (providerConfig?.type === "gemini") {
        const { response, interactionId } = await this.generateViaGemini(
          messages, tools, systemPrompt, executeToolCall,
          getApiProviderModelName(model) || providerConfig.enabledModels[0] || "",
          shouldEnableThinkingByKeyword(
            ([...messages].reverse().find(m => m.role === "user")?.content || ""),
          ),
          conversation.lastInteractionId,
          webSearchEnabled,
        );
        conversation.lastInteractionId = interactionId;
        return response;
      }
      conversation.lastInteractionId = undefined;
      return await this.generateViaApiProvider(model, messages, tools, systemPrompt, executeToolCall);
    }

    // Default: Gemini
    const { response, interactionId } = await this.generateViaGemini(
      messages, tools, systemPrompt, executeToolCall,
      undefined, undefined,
      conversation.lastInteractionId,
      webSearchEnabled,
    );
    conversation.lastInteractionId = interactionId;
    return response;
  }

  private async generateViaCli(
    model: ModelType,
    messages: Message[],
    systemPrompt: string,
    scriptMap: Map<string, { skill: LoadedSkill; scriptRef: SkillScriptRef; vaultPath: string }>,
    workflowMap: Map<string, { skill: LoadedSkill; workflowRef: SkillWorkflowRef; vaultPath: string }>,
    vaultBasePath: string,
  ): Promise<string> {
    const cliManager = new CliProviderManager();
    const providerName = model === "claude-cli" ? "claude-cli" : model === "codex-cli" ? "codex-cli" : "antigravity-cli";
    const provider = cliManager.getProvider(providerName);
    if (!provider) throw new Error(`CLI provider ${providerName} not available`);

    let fullResponse = "";
    const stream = provider.chatStream(messages, systemPrompt, vaultBasePath);
    for await (const chunk of stream) {
      if (chunk.type === "text") fullResponse += chunk.content;
      else if (chunk.type === "error") throw new Error(chunk.error);
    }

    // Process text markers from CLI response
    fullResponse = await this.processTextMarkers(fullResponse, scriptMap, workflowMap, vaultBasePath);

    return fullResponse;
  }

  private async generateViaApiProvider(
    model: ModelType,
    messages: Message[],
    tools: ToolDefinition[],
    systemPrompt: string,
    executeToolCall: (name: string, args: Record<string, unknown>) => Promise<unknown>,
  ): Promise<string> {
    const providerId = getApiProviderId(model);
    const providerConfig = this.plugin.settings.apiProviders.find(
      p => p.id === providerId && p.enabled && p.verified
    );
    if (!providerConfig) throw new Error("No enabled API provider configured");

    const modelName = getApiProviderModelName(model) || providerConfig.enabledModels[0] || "";
    const lastUserMessage = [...messages].reverse().find(message => message.role === "user");
    const enableThinking = shouldEnableThinkingByKeyword(lastUserMessage?.content || "");

    // For Gemini-type API providers, fall through to Gemini client
    // (normally handled in generateResponse for Interactions API chaining, but kept as safety fallback)
    if (providerConfig.type === "gemini") {
      const { response } = await this.generateViaGemini(messages, tools, systemPrompt, executeToolCall, modelName, enableThinking);
      return response;
    }

    const streamFn = providerConfig.type === "anthropic"
      ? anthropicChatWithToolsStream(
          providerConfig.baseUrl, providerConfig.apiKey,
          modelName, messages, tools,
          systemPrompt, executeToolCall,
          undefined,
          enableThinking,
          this.plugin.settings.proxyUrl, this.plugin.settings.proxyBypass,
        )
      : openaiChatWithToolsStream(
          providerConfig.baseUrl, providerConfig.apiKey,
          modelName, messages, tools,
          systemPrompt, executeToolCall,
          undefined,
          enableThinking,
          this.plugin.settings.proxyUrl, this.plugin.settings.proxyBypass,
        );

    let fullResponse = "";
    for await (const chunk of streamFn) {
      if (chunk.type === "text") fullResponse += chunk.content;
      else if (chunk.type === "error") throw new Error(chunk.error || "Unknown API error");
      else if (chunk.type === "done") break;
    }
    return fullResponse;
  }

  private async generateViaLocalLlm(
    model: string,
    messages: Message[],
    systemPrompt: string,
    scriptMap: Map<string, { skill: LoadedSkill; scriptRef: SkillScriptRef; vaultPath: string }>,
    workflowMap: Map<string, { skill: LoadedSkill; workflowRef: SkillWorkflowRef; vaultPath: string }>,
    vaultBasePath: string,
  ): Promise<string> {
    const llmConfig = getLocalLlmConfig(model, this.plugin.settings);
    if (!llmConfig || !llmConfig.verified || !llmConfig.model) {
      throw new Error(`Local LLM "${model}" is not configured or not verified`);
    }

    const localSystemPrompt = [
      "You are a helpful AI assistant connected via Discord.",
      "You are running in Local LLM mode with limited capabilities.",
      "Do not claim that you can open, search, or modify vault files unless their contents are already included in the conversation.",
      `Vault location: ${vaultBasePath}`,
      systemPrompt,
    ].join("\n\n");

    let fullResponse = "";
    for await (const chunk of localLlmChatStream(llmConfig, messages, localSystemPrompt)) {
      if (chunk.type === "text") fullResponse += chunk.content || "";
      else if (chunk.type === "error") throw new Error(chunk.error || "Unknown local LLM error");
      else if (chunk.type === "done") break;
    }

    // Process text markers from response
    fullResponse = await this.processTextMarkers(fullResponse, scriptMap, workflowMap, vaultBasePath);

    return fullResponse;
  }

  private async generateViaGemini(
    messages: Message[],
    tools: ToolDefinition[],
    systemPrompt: string,
    executeToolCall: (name: string, args: Record<string, unknown>) => Promise<unknown>,
    modelOverride?: string,
    enableThinking?: boolean,
    previousInteractionId?: string,
    webSearchEnabled?: boolean,
  ): Promise<{ response: string; interactionId?: string }> {
    // Use a separate client instance to avoid race conditions with the shared singleton
    let client: GeminiClient;
    if (modelOverride) {
      const apiKey = getGeminiApiKey(this.plugin.settings);
      if (!apiKey) throw new Error("Gemini API key not configured");
      client = new GeminiClient(apiKey, modelOverride as ModelType, this.plugin.settings.proxyUrl, this.plugin.settings.proxyBypass);
    } else {
      const shared = getGeminiClient();
      if (!shared) throw new Error("Gemini client not initialized");
      client = shared;
    }

    let fullResponse = "";
    let interactionId: string | undefined;
    const stream = client.chatWithToolsStream(
      messages, tools, systemPrompt, executeToolCall, undefined,
      webSearchEnabled,
      { enableThinking, previousInteractionId },
    );
    for await (const chunk of stream) {
      if (chunk.type === "text") fullResponse += chunk.content;
      else if (chunk.type === "error") throw new Error(chunk.error || "Unknown Gemini error");
      else if (chunk.type === "done") {
        interactionId = chunk.interactionId;
        break;
      }
    }
    return { response: fullResponse, interactionId };
  }

  // ========================================
  // Skill Text Marker Processing (CLI/Local LLM)
  // ========================================

  private async processTextMarkers(
    content: string,
    scriptMap: Map<string, { skill: LoadedSkill; scriptRef: SkillScriptRef; vaultPath: string }>,
    workflowMap: Map<string, { skill: LoadedSkill; workflowRef: SkillWorkflowRef; vaultPath: string }>,
    vaultBasePath: string,
  ): Promise<string> {
    let result = content;

    // Process [RUN_SCRIPT: id](args)
    if (scriptMap.size > 0) {
      const scriptRegex = /\[RUN_SCRIPT:\s*(.+?)\](?:\(([\s\S]*?)\))?/g;
      let match;
      while ((match = scriptRegex.exec(content)) !== null) {
        const scriptResult = await this.executeSkillScript(match[1].trim(), match[2]?.trim(), scriptMap, vaultBasePath);
        result = result.replace(match[0], `**Script: ${match[1].trim()}**\n\`\`\`json\n${JSON.stringify(scriptResult, null, 2)}\n\`\`\``);
      }
    }

    // Process [RUN_WORKFLOW: id](variables)
    if (workflowMap.size > 0) {
      const workflowRegex = /\[RUN_WORKFLOW:\s*(.+?)\](?:\(([\s\S]*?)\))?/g;
      let match;
      while ((match = workflowRegex.exec(content)) !== null) {
        const wfResult = await this.executeSkillWorkflow(match[1].trim(), match[2]?.trim(), workflowMap);
        result = result.replace(match[0], `**Workflow: ${match[1].trim()}**\n\`\`\`json\n${JSON.stringify(wfResult, null, 2)}\n\`\`\``);
      }
    }

    return result;
  }

  private async executeSkillScript(
    scriptId: string,
    argsJson: string | undefined,
    scriptMap: Map<string, { skill: LoadedSkill; scriptRef: SkillScriptRef; vaultPath: string }>,
    vaultBasePath: string,
  ): Promise<Record<string, unknown>> {
    const entry = scriptMap.get(scriptId);
    if (!entry) {
      const available = [...scriptMap.keys()].join(", ");
      return { error: `Unknown script ID: ${scriptId}. Available: ${available}` };
    }

    if (
      !entry.scriptRef.path.startsWith("scripts/") ||
      entry.scriptRef.path.startsWith("/") ||
      entry.scriptRef.path.includes("\\") ||
      entry.scriptRef.path.split("/").includes("..")
    ) {
      return { error: "Skill scripts must be located under the scripts/ directory" };
    }

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

    const absoluteScriptPath = `${vaultBasePath}/${entry.vaultPath}`;
    const skillDir = `${vaultBasePath}/${entry.skill.folderPath}`;

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

  private async executeSkillWorkflow(
    workflowId: string,
    variablesJson: string | undefined,
    workflowMap: Map<string, { skill: LoadedSkill; workflowRef: SkillWorkflowRef; vaultPath: string }>,
  ): Promise<Record<string, unknown>> {
    const entry = workflowMap.get(workflowId);
    if (!entry) {
      const available = [...workflowMap.keys()].join(", ");
      return { error: `Unknown workflow ID: ${workflowId}. Available: ${available}` };
    }

    const file = this.app.vault.getAbstractFileByPath(entry.vaultPath);
    if (!(file instanceof TFile)) {
      return { error: `Workflow file not found: ${entry.vaultPath}` };
    }

    const content = await this.app.vault.read(file);

    let workflow;
    try {
      workflow = parseWorkflowFromMarkdown(content);
    } catch (e) {
      return { error: `Failed to parse workflow: ${e instanceof Error ? e.message : String(e)}` };
    }

    const variables = new Map<string, string | number>();
    if (variablesJson) {
      try {
        const parsed = JSON.parse(variablesJson) as Record<string, string | number>;
        for (const [key, value] of Object.entries(parsed)) {
          variables.set(key, value);
        }
      } catch {
        return { error: `Invalid variables JSON: ${variablesJson}` };
      }
    }

    // Headless callbacks for Discord (no UI interaction)
    const callbacks: PromptCallbacks = {
      promptForFile: () => Promise.resolve(null),
      promptForSelection: () => Promise.resolve(null),
      promptForValue: (_prompt: string, defaultValue?: string) => Promise.resolve(defaultValue || null),
      promptForConfirmation: () => Promise.resolve({ confirmed: true } as EditConfirmationResult),
      promptForDialog: () => Promise.resolve(null),
    };

    const executor = new WorkflowExecutor(this.app, this.plugin);
    try {
      const result = await executor.execute(
        workflow,
        { variables },
        undefined,
        { workflowName: entry.vaultPath.substring(entry.vaultPath.lastIndexOf("/") + 1).replace(/\.md$/, "") || workflowId },
        callbacks,
      );

      // Collect output variables from execution context
      const outputVars: Record<string, string | number> = {};
      for (const [key, value] of result.context.variables) {
        if (!key.startsWith("_")) {
          outputVars[key] = value;
        }
      }

      // Check logs for errors
      const errorLog = result.context.logs.find(l => l.status === "error");
      return {
        success: !errorLog,
        variables: outputVars,
        ...(errorLog ? { error: errorLog.message } : {}),
      };
    } catch (e) {
      return { error: `Workflow execution failed: ${e instanceof Error ? e.message : String(e)}` };
    }
  }

  // ========================================
  // Discord REST API
  // ========================================

  private async sendResponse(channelId: string, content: string, replyToId?: string): Promise<void> {
    const maxLen = Math.min(this.settings.maxResponseLength, 2000);

    if (content.length <= maxLen) {
      await this.sendDiscordMessage(channelId, content, replyToId);
      return;
    }

    // Split long messages
    const chunks = this.splitMessage(content, maxLen);
    for (let i = 0; i < chunks.length; i++) {
      await this.sendDiscordMessage(
        channelId,
        chunks[i],
        i === 0 ? replyToId : undefined,
      );
    }
  }

  private splitMessage(content: string, maxLen: number): string[] {
    const chunks: string[] = [];
    let remaining = content;

    while (remaining.length > 0) {
      if (remaining.length <= maxLen) {
        chunks.push(remaining);
        break;
      }

      // Try to split at newline
      let splitIdx = remaining.lastIndexOf("\n", maxLen);
      if (splitIdx < maxLen * 0.5) {
        // Try to split at space
        splitIdx = remaining.lastIndexOf(" ", maxLen);
      }
      if (splitIdx < maxLen * 0.3) {
        splitIdx = maxLen;
      }

      chunks.push(remaining.slice(0, splitIdx));
      remaining = remaining.slice(splitIdx).trimStart();
    }

    return chunks;
  }

  private async sendDiscordMessage(
    channelId: string,
    content: string,
    replyToId?: string,
  ): Promise<void> {
    if (!SNOWFLAKE_RE.test(channelId)) {
      throw new Error("Invalid Discord channel ID");
    }
    const body: Record<string, unknown> = { content };
    if (replyToId) {
      body.message_reference = { message_id: replyToId };
      body.allowed_mentions = { replied_user: false };
    }

    const response = await requestUrl({
      url: `${DISCORD_API_BASE}/channels/${channelId}/messages`,
      method: "POST",
      headers: {
        Authorization: `Bot ${this.settings.botToken}`,
        "User-Agent": DISCORD_USER_AGENT,
      },
      contentType: "application/json",
      body: JSON.stringify(body),
      throw: false,
    });

    // Handle rate limiting
    if (response.status === 429) {
      const retryAfter = response.json?.retry_after as number | undefined;
      const waitMs = retryAfter ? retryAfter * 1000 : 5000;
      console.warn(`LLM Hub: Discord rate limited, retrying in ${waitMs}ms`);
      await new Promise(resolve => setTimeout(resolve, waitMs));
      return this.sendDiscordMessage(channelId, content, replyToId);
    }

    if (response.status >= 400) {
      console.error(`LLM Hub: Discord API ${response.status}:`, response.text);
      throw new Error(`Discord API error: ${response.status} ${response.text}`);
    }
  }

  private async sendTyping(channelId: string): Promise<void> {
    if (!SNOWFLAKE_RE.test(channelId)) return;
    try {
      await requestUrl({
        url: `${DISCORD_API_BASE}/channels/${channelId}/typing`,
        method: "POST",
        headers: {
          Authorization: `Bot ${this.settings.botToken}`,
          "User-Agent": DISCORD_USER_AGENT,
        },
      });
    } catch {
      // Typing indicator is non-critical, ignore errors
    }
  }
}

// ========================================
// Singleton management
// ========================================

let discordServiceInstance: DiscordService | null = null;

export function initDiscordService(app: App, plugin: LlmHubPlugin): DiscordService {
  if (discordServiceInstance) {
    discordServiceInstance.stop();
  }
  discordServiceInstance = new DiscordService(app, plugin);
  return discordServiceInstance;
}

export function getDiscordService(): DiscordService | null {
  return discordServiceInstance;
}

export function resetDiscordService(): void {
  if (discordServiceInstance) {
    discordServiceInstance.stop();
    discordServiceInstance = null;
  }
}
