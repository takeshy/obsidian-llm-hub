/** LLM Connect Hub protocol v1. Keep the copies in the two plugins identical. */
export interface ConnectMessage {
  role: "user" | "assistant" | "tool";
  content: string;
  timestamp: number;
  webSearchUsed?: boolean;
  webSearchSources?: unknown;
  providerContinuation?: unknown;
}
export interface ConversationState {
  messages: ConnectMessage[];
  lastActivity: number;
  model: string | null;
  ragSetting: string | null;
  webSearch: boolean;
  activeSkillPaths: string[];
  lastInteractionId?: string;
  cliSession?: { provider: "antigravity-cli" | "claude-cli" | "codex-cli"; sessionId: string };
}
export interface AnswerResult {
  content: string;
  webSearchUsed?: boolean;
  webSearchSources?: unknown;
  providerContinuation?: unknown;
}
export interface PromptTemplate {
  name: string;
  description?: string;
  model?: string | null;
  promptTemplate: string;
  searchSelection?: { ragSetting: string | null; webSearch: boolean } | null;
}
export interface DiscordSettings {
  enabled: boolean;
  botToken: string;
  respondToDMs: boolean;
  requireMention: boolean;
  allowedChannelIds: string;
  allowedUserIds: string;
  model: string;
  systemPrompt: string;
  maxResponseLength: number;
}
export interface PersonaProfile {
  model: string;
  vaultFolders: string[];
  ragSetting: string | null;
  skillPaths: string[];
}
export interface KakerattaSettings {
  enabled: boolean;
  model: string;
  url: string;
  headers: Record<string, string>;
  personas: Record<string, PersonaProfile>;
}
export interface LegacyConnections {
  discord: DiscordSettings;
  kakeratta: KakerattaSettings;
  credentialStorage: "plaintext" | "secretStorage";
}
export interface DiscussionPerson { id: string; providerId: string; modelId: string; displayName: string; role?: string }
export interface DiscussionApi {
  getConfiguration(): { defaultTurns: number; participants: DiscussionPerson[]; voters: DiscussionPerson[] };
  runDiscussion(request: { theme: string; turns?: number; participants?: DiscussionPerson[]; voters?: DiscussionPerson[]; abortSignal?: AbortSignal }): Promise<{
    theme: string;
    turns: Array<{ turnNumber: number; responses: Array<{ displayName: string; content: string; error?: string }> }>;
    conclusions: Array<{ displayName: string; content: string }>;
    votes: Array<{ voterDisplayName: string; votedForDisplayName: string; reason?: string }>;
    finalConclusion: string;
  }>;
}
export interface ConnectBackend {
  protocolVersion: 1;
  id: string;
  name: string;
  listModels(): Array<{ name: string; displayName: string }>;
  getDefaultModel(): string;
  listRagSettings(): string[];
  supportsWebSearch(model: string): boolean;
  listSkills(): Promise<{ prompts: PromptTemplate[]; folders: Array<{ name: string; description?: string; folderPath: string }> }>;
  generate(request: { conversation: ConversationState; model: string; systemPrompt: string; signal: AbortSignal; vaultFolders?: string[]; ragQuery?: string }): Promise<{ answer: AnswerResult; conversation: ConversationState }>;
  generateText(request: { model: string; messages: ConnectMessage[]; systemPrompt: string; signal: AbortSignal }): Promise<string>;
  research(request: { query: string; previousInteractionId?: string; signal: AbortSignal }): Promise<{ content: string; interactionId?: string }>;
  getDiscussionApi(): DiscussionApi | null;
  getLegacyConnections(): LegacyConnections;
  completeMigration(): Promise<void>;
}
export const CONNECT_READY = "llm-connect-hub:ready";
export const CONNECT_REGISTER = "llm-connect-hub:register-backend";
export const CONNECT_UNREGISTER = "llm-connect-hub:unregister-backend";
