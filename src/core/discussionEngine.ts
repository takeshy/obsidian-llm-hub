/**
 * Discussion Engine for LLM Hub
 * Orchestrates parallel discussions between multiple AI models
 * Supports all providers: API (Gemini, OpenAI, Anthropic, OpenRouter, Grok, custom), CLI, Local LLM
 */

import { Platform } from "obsidian";
import type {
  ModelType,
  StreamChunk,
  Message,
  Attachment,
  LlmHubSettings,
  DiscussionSettings,
  DiscussionParticipant,
  DiscussionVoter,
  DiscussionTurn,
  DiscussionResponse,
  DiscussionConclusion,
  DiscussionVoteResult,
  DiscussionResult,
  DiscussionPhase,
} from "../types";
import {
  isApiProviderModel,
  getApiProviderId,
  getApiProviderModelName,
  DEFAULT_DISCUSSION_SETTINGS,
} from "../types";
import { t } from "../i18n";

export interface DiscussionUserInputRequest {
  type: "debate" | "vote";
  participantId: string;
  displayName: string;
  role?: string;
  candidates?: { id: string; displayName: string }[];
}

export interface DiscussionUserInputResponse {
  content: string;
  votedForId?: string;
  reason?: string;
}

export interface DiscussionEventCallbacks {
  onPhaseChange?: (phase: DiscussionPhase) => void;
  onTurnStart?: (turnNumber: number) => void;
  onResponseStream?: (participantId: string, content: string) => void;
  onResponseComplete?: (participantId: string, response: DiscussionResponse) => void;
  onTurnComplete?: (turn: DiscussionTurn) => void;
  onConclusionStream?: (participantId: string, content: string) => void;
  onConclusionComplete?: (conclusion: DiscussionConclusion) => void;
  onVoteComplete?: (vote: DiscussionVoteResult) => void;
  onDebateComplete?: (result: DiscussionResult) => void;
  onError?: (error: Error) => void;
  onUserInputRequest?: (request: DiscussionUserInputRequest) => Promise<DiscussionUserInputResponse>;
}

class AbortError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AbortError";
  }
}

/**
 * Stream a chat message to any model type.
 * Returns an AsyncGenerator<StreamChunk> for the response.
 */
export async function* streamChatForModel(
  model: ModelType,
  messages: Message[],
  systemPrompt: string,
  settings: LlmHubSettings,
  signal?: AbortSignal,
): AsyncGenerator<StreamChunk> {
  if (isApiProviderModel(model)) {
    const providerId = getApiProviderId(model);
    const modelName = getApiProviderModelName(model);
    const providerConfig = settings.apiProviders.find(p => p.id === providerId && p.enabled && p.verified);
    if (!providerConfig) {
      yield { type: "error", error: `Provider not found for model: ${model}` };
      return;
    }

    if (providerConfig.type === "gemini") {
      const { GeminiClient } = await import("./gemini");
      const client = new GeminiClient(providerConfig.apiKey, modelName as ModelType, settings.proxyUrl, settings.proxyBypass);
      // Gemini SDK doesn't accept AbortSignal, so check between chunks
      for await (const chunk of client.chatWithToolsStream(
        messages,
        [],  // no tools
        systemPrompt,
        (_n: string, _a: Record<string, unknown>) => Promise.resolve({}),
      )) {
        if (signal?.aborted) return;
        yield chunk;
      }
    } else if (providerConfig.type === "anthropic") {
      const { anthropicChatWithToolsStream } = await import("./anthropicProvider");
      yield* anthropicChatWithToolsStream(
        providerConfig.baseUrl,
        providerConfig.apiKey,
        modelName,
        messages,
        [],  // no tools
        systemPrompt,
        (_n: string, _a: Record<string, unknown>) => Promise.resolve({}),
        signal,
        undefined,
        settings.proxyUrl, settings.proxyBypass,
      );
    } else {
      // OpenAI, OpenRouter, Grok, custom - all OpenAI-compatible
      const { openaiChatWithToolsStream } = await import("./openaiProvider");
      yield* openaiChatWithToolsStream(
        providerConfig.baseUrl,
        providerConfig.apiKey,
        modelName,
        messages,
        [],
        systemPrompt,
        (_n: string, _a: Record<string, unknown>) => Promise.resolve({}),
        signal,
        undefined,
        settings.proxyUrl, settings.proxyBypass,
      );
    }
  } else if (model === "local-llm" && !Platform.isMobile) {
    const { localLlmChatStream } = await import("./localLlmProvider");
    yield* localLlmChatStream(settings.localLlmConfig, messages, systemPrompt, signal);
  } else if (!Platform.isMobile) {
    // CLI models
    const { GeminiCliProvider, ClaudeCliProvider, CodexCliProvider } = await import("./cliProvider");
    const provider = model === "claude-cli"
      ? new ClaudeCliProvider()
      : model === "codex-cli"
        ? new CodexCliProvider()
        : new GeminiCliProvider();

    // Resolve working directory
    const cliPaths: Record<string, string | undefined> = {
      "gemini-cli": settings.cliConfig.geminiCliPath,
      "claude-cli": settings.cliConfig.claudeCliPath,
      "codex-cli": settings.cliConfig.codexCliPath,
    };
    const customPath = cliPaths[model];
    if (customPath) {
      (provider as unknown as { customCliPath?: string }).customCliPath = customPath;
    }
    yield* provider.chatStream(messages, systemPrompt, "", signal);
  } else {
    yield { type: "error", error: `Unsupported model: ${model}` };
  }
}

export interface DiscussionOptions {
  ragContext?: string;
  attachments?: Attachment[];
}

export class DiscussionEngine {
  private settings: LlmHubSettings;
  private discussionSettings: DiscussionSettings;
  private abortController: AbortController | null = null;
  private callbacks: DiscussionEventCallbacks = {};
  private ragContext: string;
  private attachments: Attachment[];

  constructor(settings: LlmHubSettings, discussionSettings?: DiscussionSettings, options?: DiscussionOptions) {
    this.settings = settings;
    this.discussionSettings = discussionSettings || DEFAULT_DISCUSSION_SETTINGS;
    this.ragContext = options?.ragContext || "";
    this.attachments = options?.attachments || [];
  }

  setCallbacks(callbacks: DiscussionEventCallbacks): void {
    this.callbacks = callbacks;
  }

  async runDiscussion(
    theme: string,
    turns: number,
    participants: DiscussionParticipant[],
    voters: DiscussionVoter[],
  ): Promise<DiscussionResult> {
    this.abortController = new AbortController();
    const startTime = Date.now();

    if (participants.length < 1) {
      throw new Error(t("discussion.needOneParticipant"));
    }

    const allTurns: DiscussionTurn[] = [];
    const conclusions: DiscussionConclusion[] = [];
    const votes: DiscussionVoteResult[] = [];

    try {
      // Run discussion turns
      for (let turn = 1; turn <= turns; turn++) {
        this.callbacks.onPhaseChange?.("thinking");
        this.callbacks.onTurnStart?.(turn);

        const isLastTurn = turn === turns;
        const turnResult = await this.runTurn(theme, turn, allTurns, participants, isLastTurn);
        allTurns.push(turnResult);
        this.callbacks.onTurnComplete?.(turnResult);
        this.callbacks.onPhaseChange?.("turn_complete");
      }

      // Collect conclusions
      this.callbacks.onPhaseChange?.("concluding");
      const lastTurn = allTurns[allTurns.length - 1];
      for (const response of lastTurn.responses) {
        if (response.isConclusion && !response.error && response.content) {
          const conclusion: DiscussionConclusion = {
            participantId: response.participantId,
            displayName: response.displayName,
            content: response.content,
          };
          conclusions.push(conclusion);
          this.callbacks.onConclusionComplete?.(conclusion);
        }
      }

      // Get explicit conclusions if needed
      if (conclusions.length === 0) {
        const explicit = await this.getConclusions(theme, allTurns, participants);
        conclusions.push(...explicit);
      }

      // Skip voting if no valid conclusions
      if (conclusions.length === 0) {
        const result: DiscussionResult = {
          theme, turns: allTurns, conclusions: [], votes: [],
          winnerId: null, winnerIds: [], isDraw: false,
          finalConclusion: "No valid conclusions were produced. All participants may have encountered errors.",
          startTime, endTime: Date.now(), participants, voters,
        };
        this.callbacks.onPhaseChange?.("complete");
        this.callbacks.onDebateComplete?.(result);
        return result;
      }

      // Voting phase
      this.callbacks.onPhaseChange?.("voting");
      const voteResults = await this.runVoting(theme, conclusions, voters);
      votes.push(...voteResults);

      // Determine winner(s)
      const { winnerIds, isDraw } = this.determineWinners(votes, conclusions);
      const winnerId = isDraw ? null : winnerIds[0] || null;

      let finalConclusion = "";
      if (isDraw) {
        finalConclusion = winnerIds
          .map(id => conclusions.find(c => c.participantId === id)?.content || "")
          .join("\n\n---\n\n");
      } else if (winnerId) {
        finalConclusion = conclusions.find(c => c.participantId === winnerId)?.content || "";
      }

      const result: DiscussionResult = {
        theme, turns: allTurns, conclusions, votes,
        winnerId, winnerIds, isDraw, finalConclusion,
        startTime, endTime: Date.now(),
        participants, voters,
      };

      this.callbacks.onPhaseChange?.("complete");
      this.callbacks.onDebateComplete?.(result);
      return result;
    } catch (error) {
      if (this.abortController?.signal.aborted) {
        throw new AbortError("Discussion aborted");
      }
      this.callbacks.onPhaseChange?.("error");
      this.callbacks.onError?.(error as Error);
      throw error;
    }
  }

  private async runTurn(
    theme: string,
    turnNumber: number,
    previousTurns: DiscussionTurn[],
    participants: DiscussionParticipant[],
    isLastTurn: boolean,
  ): Promise<DiscussionTurn> {
    const responseMap = new Map<string, DiscussionResponse>();
    const baseContext = this.buildTurnContext(theme, previousTurns, isLastTurn);

    const userParticipants = participants.filter(p => p.model === ("user" as ModelType));
    const aiParticipants = participants.filter(p => p.model !== ("user" as ModelType));

    // User participants run sequentially (shared UI resolver)
    for (const participant of userParticipants) {
      await this.getUserTurnInput(participant, isLastTurn, responseMap);
    }

    // AI participants run in parallel
    const isFirstTurn = turnNumber === 1;
    const aiPromises: Promise<DiscussionResponse | null>[] = [];
    for (const participant of aiParticipants) {
      aiPromises.push(this.getAiTurnResponse(participant, baseContext, isLastTurn, responseMap, isFirstTurn));
    }
    await Promise.all(aiPromises);

    const responses: DiscussionResponse[] = [];
    for (const participant of participants) {
      const response = responseMap.get(participant.id);
      if (response) responses.push(response);
    }

    return { turnNumber, responses, timestamp: Date.now() };
  }

  private async getUserTurnInput(
    participant: DiscussionParticipant,
    isLastTurn: boolean,
    responseMap: Map<string, DiscussionResponse>,
  ): Promise<DiscussionResponse | null> {
    if (this.abortController?.signal.aborted) throw new AbortError("Discussion aborted");

    if (this.callbacks.onUserInputRequest) {
      const userResponse = await this.callbacks.onUserInputRequest({
        type: "debate",
        participantId: participant.id,
        displayName: participant.displayName,
        role: participant.role,
      });

      const debateResponse: DiscussionResponse = {
        participantId: participant.id,
        displayName: participant.displayName,
        content: userResponse.content,
        isConclusion: isLastTurn,
        timestamp: Date.now(),
      };

      responseMap.set(participant.id, debateResponse);
      this.callbacks.onResponseComplete?.(participant.id, debateResponse);
      return debateResponse;
    }
    return null;
  }

  private async getAiTurnResponse(
    participant: DiscussionParticipant,
    baseContext: string,
    isLastTurn: boolean,
    responseMap: Map<string, DiscussionResponse>,
    includeRag = true,
  ): Promise<DiscussionResponse | null> {
    if (this.abortController?.signal.aborted) throw new AbortError("Discussion aborted");

    let context = baseContext;
    if (participant.role) {
      context += `\n\n${t("discussion.yourPosition")}: ${participant.role}`;
    }

    try {
      const userMessage: Message = { role: "user", content: context, timestamp: Date.now() };
      if (includeRag && this.attachments.length > 0) {
        userMessage.attachments = [...this.attachments];
      }
      const messages: Message[] = [userMessage];

      let systemPrompt = this.discussionSettings.systemPrompt;
      if (includeRag && this.ragContext) {
        systemPrompt += this.ragContext;
      }
      if (participant.role) {
        systemPrompt += `\n\n${t("discussion.yourPosition")}: ${participant.role}`;
      }

      let response = "";
      const signal = this.abortController?.signal;

      for await (const chunk of streamChatForModel(
        participant.model, messages, systemPrompt, this.settings, signal,
      )) {
        if (chunk.type === "text" && chunk.content) {
          response += chunk.content;
          this.callbacks.onResponseStream?.(participant.id, response);
        } else if (chunk.type === "error" && chunk.error) {
          throw new Error(chunk.error);
        }
      }

      const debateResponse: DiscussionResponse = {
        participantId: participant.id,
        displayName: participant.displayName,
        content: response,
        isConclusion: isLastTurn,
        timestamp: Date.now(),
      };

      responseMap.set(participant.id, debateResponse);
      this.callbacks.onResponseComplete?.(participant.id, debateResponse);
      return debateResponse;
    } catch (error) {
      if (this.abortController?.signal.aborted) throw new AbortError("Discussion aborted");
      const errorResponse: DiscussionResponse = {
        participantId: participant.id,
        displayName: participant.displayName,
        content: "",
        isConclusion: false,
        timestamp: Date.now(),
        error: (error as Error).message,
      };
      responseMap.set(participant.id, errorResponse);
      return errorResponse;
    }
  }

  private buildTurnContext(theme: string, previousTurns: DiscussionTurn[], isLastTurn: boolean): string {
    let context = `# ${t("discussion.themeHeader")}\n${theme}\n\n`;

    if (previousTurns.length > 0) {
      context += `# ${t("discussion.previousDiscussion")}\n\n`;
      for (const turn of previousTurns) {
        context += `## ${t("discussion.turn")} ${turn.turnNumber}\n\n`;
        for (const response of turn.responses) {
          context += `### ${response.displayName}\n${response.content}\n\n`;
        }
      }
      context += `# ${t("discussion.yourTask")}\n`;
      context += `${t("discussion.yourTaskInstruction")}\n\n`;
    }

    if (isLastTurn) {
      context += `\n${this.discussionSettings.conclusionPrompt}\n`;
    }

    return context;
  }

  private async getConclusions(
    theme: string,
    turns: DiscussionTurn[],
    participants: DiscussionParticipant[],
  ): Promise<DiscussionConclusion[]> {
    const conclusionMap = new Map<string, DiscussionConclusion>();
    const baseContext = this.buildConclusionContext(theme, turns);

    const userParticipants = participants.filter(p => p.model === ("user" as ModelType));
    const aiParticipants = participants.filter(p => p.model !== ("user" as ModelType));

    // User participants run sequentially (shared UI resolver)
    for (const participant of userParticipants) {
      if (this.abortController?.signal.aborted) throw new AbortError("Discussion aborted");
      if (this.callbacks.onUserInputRequest) {
        const userResponse = await this.callbacks.onUserInputRequest({
          type: "debate", participantId: participant.id,
          displayName: participant.displayName, role: participant.role,
        });
        const conclusion: DiscussionConclusion = {
          participantId: participant.id, displayName: participant.displayName,
          content: userResponse.content,
        };
        conclusionMap.set(participant.id, conclusion);
        this.callbacks.onConclusionComplete?.(conclusion);
      }
    }

    // AI participants run in parallel
    const aiPromises: Promise<DiscussionConclusion | null>[] = [];
    for (const participant of aiParticipants) {
      aiPromises.push((async () => {
        if (this.abortController?.signal.aborted) throw new AbortError("Discussion aborted");

        let context = baseContext;
        if (participant.role) {
          context += `\n\n${t("discussion.yourPosition")}: ${participant.role}`;
        }

        try {
          const userMessage: Message = { role: "user", content: context, timestamp: Date.now() };
          const messages: Message[] = [userMessage];
          let systemPrompt = this.discussionSettings.systemPrompt;
          if (participant.role) {
            systemPrompt += `\n\n${t("discussion.yourPosition")}: ${participant.role}`;
          }

          let response = "";
          for await (const chunk of streamChatForModel(
            participant.model, messages, systemPrompt, this.settings, this.abortController?.signal,
          )) {
            if (chunk.type === "text" && chunk.content) {
              response += chunk.content;
              this.callbacks.onConclusionStream?.(participant.id, response);
            } else if (chunk.type === "error" && chunk.error) {
              throw new Error(chunk.error);
            }
          }

          // Skip empty responses
          if (!response.trim()) return null;
          const conclusion: DiscussionConclusion = {
            participantId: participant.id, displayName: participant.displayName, content: response,
          };
          conclusionMap.set(participant.id, conclusion);
          this.callbacks.onConclusionComplete?.(conclusion);
          return conclusion;
        } catch {
          if (this.abortController?.signal.aborted) throw new AbortError("Discussion aborted");
          // Don't create a conclusion for errored participants
          return null;
        }
      })());
    }

    await Promise.all(aiPromises);

    const conclusions: DiscussionConclusion[] = [];
    for (const participant of participants) {
      const conclusion = conclusionMap.get(participant.id);
      if (conclusion) conclusions.push(conclusion);
    }
    return conclusions;
  }

  private buildConclusionContext(theme: string, turns: DiscussionTurn[]): string {
    let context = `# ${t("discussion.themeHeader")}\n${theme}\n\n`;
    context += `# ${t("discussion.completeDiscussion")}\n\n`;
    for (const turn of turns) {
      context += `## ${t("discussion.turn")} ${turn.turnNumber}\n\n`;
      for (const response of turn.responses) {
        context += `### ${response.displayName}\n${response.content}\n\n`;
      }
    }
    context += `\n${this.discussionSettings.conclusionPrompt}\n`;
    return context;
  }

  private async runVoting(
    theme: string,
    conclusions: DiscussionConclusion[],
    voters: DiscussionVoter[],
  ): Promise<DiscussionVoteResult[]> {
    const voteMap = new Map<string, DiscussionVoteResult>();
    const context = this.buildVotingContext(theme, conclusions);

    const userVoters = voters.filter(v => v.model === ("user" as ModelType));
    const aiVoters = voters.filter(v => v.model !== ("user" as ModelType));

    // User voters run sequentially (shared UI resolver)
    for (const voter of userVoters) {
      if (this.abortController?.signal.aborted) throw new AbortError("Discussion aborted");
      if (this.callbacks.onUserInputRequest) {
        const candidates = conclusions.map(c => ({ id: c.participantId, displayName: c.displayName }));
        const userResponse = await this.callbacks.onUserInputRequest({
          type: "vote", participantId: voter.id, displayName: voter.displayName, candidates,
        });
        const votedFor = conclusions.find(c => c.participantId === userResponse.votedForId);
        const vote: DiscussionVoteResult = {
          voterId: voter.id, voterDisplayName: voter.displayName,
          votedForId: userResponse.votedForId || "",
          votedForDisplayName: votedFor?.displayName || "",
          reason: userResponse.reason,
        };
        voteMap.set(voter.id, vote);
        this.callbacks.onVoteComplete?.(vote);
      }
    }

    // AI voters run in parallel
    const aiPromises: Promise<DiscussionVoteResult | null>[] = [];
    for (const voter of aiVoters) {
      aiPromises.push((async () => {
        if (this.abortController?.signal.aborted) throw new AbortError("Discussion aborted");

        try {
          const messages: Message[] = [
            { role: "user", content: context, timestamp: Date.now() },
          ];

          let response = "";
          for await (const chunk of streamChatForModel(
            voter.model, messages, this.discussionSettings.systemPrompt,
            this.settings, this.abortController?.signal,
          )) {
            if (chunk.type === "text" && chunk.content) {
              response += chunk.content;
            } else if (chunk.type === "error" && chunk.error) {
              throw new Error(chunk.error);
            }
          }

          const vote = this.parseVote(voter, response, conclusions);
          voteMap.set(voter.id, vote);
          this.callbacks.onVoteComplete?.(vote);
          return vote;
        } catch (error) {
          if (this.abortController?.signal.aborted) throw new AbortError("Discussion aborted");
          const vote: DiscussionVoteResult = {
            voterId: voter.id, voterDisplayName: voter.displayName,
            votedForId: "",
            votedForDisplayName: "(error)",
            reason: `Error: ${(error as Error).message}`,
          };
          voteMap.set(voter.id, vote);
          return vote;
        }
      })());
    }

    await Promise.all(aiPromises);

    const votes: DiscussionVoteResult[] = [];
    for (const voter of voters) {
      const vote = voteMap.get(voter.id);
      if (vote) votes.push(vote);
    }
    return votes;
  }

  private buildVotingContext(theme: string, conclusions: DiscussionConclusion[]): string {
    let context = `# ${t("discussion.themeHeader")}\n${theme}\n\n`;
    context += `# ${t("discussion.finalConclusions")}\n\n`;
    for (const conclusion of conclusions) {
      context += `## ${conclusion.displayName}\n${conclusion.content}\n\n`;
    }
    const participantNames = conclusions.map(c => c.displayName).join(", ");
    context += `\n${this.discussionSettings.votePrompt}\n`;
    context += `\nParticipants: ${participantNames}\n`;
    context += `${t("discussion.voteFormatInstruction")}\n`;
    return context;
  }

  private parseVote(
    voter: DiscussionVoter,
    response: string,
    conclusions: DiscussionConclusion[],
  ): DiscussionVoteResult {
    const responseLower = response.toLowerCase();

    const extractReason = (): string | undefined => {
      const patterns = [
        /理由[：:は]\s*([\s\S]+)/i,
        /[Rr]eason[：:]\s*([\s\S]+)/i,
        /なぜなら[、,]?\s*([\s\S]+)/i,
        /because\s+([\s\S]+)/i,
        /[-–—]\s*([\s\S]+)/,
      ];
      for (const pattern of patterns) {
        const match = response.match(pattern);
        if (match) {
          const reason = match[1].trim().replace(/^(以下の通りです。?\s*)/i, "");
          if (reason.length > 0) return reason;
        }
      }
      const lines = response.split("\n").filter(l => l.trim());
      if (lines.length > 1) return lines.slice(1).join("\n").trim();
      return undefined;
    };

    const escapeRegex = (str: string): string => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    // Strategy 1: VOTE: Name format
    for (const participant of conclusions) {
      const displayName = participant.displayName;
      const baseName = displayName.replace(/[（(].+[）)]/, "").trim();
      const patterns = [
        new RegExp(`(?:VOTE|投票)[：:]\\s*${escapeRegex(displayName)}`, "i"),
        new RegExp(`(?:VOTE|投票)[：:]\\s*${escapeRegex(baseName)}`, "i"),
        new RegExp(`^\\s*${escapeRegex(displayName)}\\s*$`, "im"),
        new RegExp(`^\\s*${escapeRegex(baseName)}\\s*$`, "im"),
      ];
      for (const pattern of patterns) {
        if (pattern.test(response)) {
          return {
            voterId: voter.id, voterDisplayName: voter.displayName,
            votedForId: participant.participantId, votedForDisplayName: participant.displayName,
            reason: extractReason(),
          };
        }
      }
    }

    // Strategy 2: Name anywhere (longer names first)
    const sorted = [...conclusions].sort((a, b) => b.displayName.length - a.displayName.length);
    for (const participant of sorted) {
      const displayName = participant.displayName;
      const baseName = displayName.replace(/[（(].+[）)]/, "").trim();
      if (responseLower.includes(displayName.toLowerCase()) || responseLower.includes(baseName.toLowerCase())) {
        return {
          voterId: voter.id, voterDisplayName: voter.displayName,
          votedForId: participant.participantId, votedForDisplayName: participant.displayName,
          reason: extractReason(),
        };
      }
    }

    // Mark as invalid vote — votedForId="" so it won't count in tallying
    return {
      voterId: voter.id, voterDisplayName: voter.displayName,
      votedForId: "",
      votedForDisplayName: "(invalid vote)",
      reason: "Unable to parse vote",
    };
  }

  private determineWinners(
    votes: DiscussionVoteResult[],
    conclusions: DiscussionConclusion[],
  ): { winnerIds: string[]; isDraw: boolean } {
    const voteCounts = new Map<string, number>();
    for (const conclusion of conclusions) voteCounts.set(conclusion.participantId, 0);
    for (const vote of votes) {
      // Skip invalid/unparseable votes (empty votedForId)
      if (!vote.votedForId) continue;
      const current = voteCounts.get(vote.votedForId) || 0;
      voteCounts.set(vote.votedForId, current + 1);
    }

    let maxVotes = 0;
    for (const count of voteCounts.values()) {
      if (count > maxVotes) maxVotes = count;
    }

    // If no valid votes were cast (maxVotes=0), no winner
    if (maxVotes === 0) {
      return { winnerIds: [], isDraw: false };
    }

    const winnerIds: string[] = [];
    for (const [participantId, count] of voteCounts) {
      if (count === maxVotes) winnerIds.push(participantId);
    }

    return { winnerIds, isDraw: winnerIds.length > 1 };
  }

  stop(): void {
    this.abortController?.abort();
  }

  static generateMarkdownNote(result: DiscussionResult): string {
    const lines: string[] = [];

    const getDisplayName = (id: string): string => {
      return result.participants.find(p => p.id === id)?.displayName || id;
    };

    lines.push(`# AI Discussion: ${result.theme}`);
    lines.push("");
    lines.push(`**Date:** ${new Date(result.startTime).toLocaleString()}`);
    lines.push(`**Duration:** ${Math.round((result.endTime - result.startTime) / 1000)} seconds`);
    if (result.isDraw) {
      const names = result.winnerIds.map(id => getDisplayName(id)).join(" & ");
      lines.push(`**Result:** Draw (${names})`);
    } else {
      lines.push(`**Winner:** ${result.winnerId ? getDisplayName(result.winnerId) : "No winner"}`);
    }
    lines.push("");

    // Participants
    lines.push("## Participants");
    lines.push("");
    for (const p of result.participants) {
      const roleStr = p.role ? ` (${p.role})` : "";
      lines.push(`- ${p.displayName}${roleStr}`);
    }
    lines.push("");

    // Discussion turns (exclude last if same as conclusions)
    // Only filter out the last turn if its responses were used as conclusions
    const totalTurns = result.turns.length;
    const lastTurn = result.turns[totalTurns - 1];
    const lastTurnIsConclusion = lastTurn?.responses.some(r => r.isConclusion && !r.error && r.content);
    const turnsToShow = lastTurnIsConclusion && result.conclusions.length > 0
      ? result.turns.filter(turn => turn.turnNumber !== totalTurns)
      : result.turns;

    if (turnsToShow.length > 0) {
      lines.push("## Discussion");
      lines.push("");
      for (const turn of turnsToShow) {
        lines.push(`### Turn ${turn.turnNumber}`);
        lines.push("");
        for (const response of turn.responses) {
          lines.push(`#### ${response.displayName}`);
          lines.push("");
          lines.push(response.error ? `> Error: ${response.error}` : response.content);
          lines.push("");
        }
      }
    }

    // Conclusions
    lines.push("## Conclusions");
    lines.push("");
    for (const conclusion of result.conclusions) {
      lines.push(`### ${conclusion.displayName}`);
      lines.push("");
      lines.push(conclusion.content);
      lines.push("");
    }

    // Voting
    lines.push("## Voting Results");
    lines.push("");
    for (const vote of result.votes) {
      lines.push(`- **${vote.voterDisplayName}** voted for **${vote.votedForDisplayName}**${vote.reason ? `: ${vote.reason}` : ""}`);
    }
    lines.push("");

    // Final
    lines.push("## Final Conclusion");
    lines.push("");
    if (result.isDraw) {
      const names = result.winnerIds.map(id => getDisplayName(id)).join(" & ");
      lines.push(`> **Draw:** ${names}`);
      lines.push("");
      for (const winnerId of result.winnerIds) {
        const name = getDisplayName(winnerId);
        const conclusion = result.conclusions.find(c => c.participantId === winnerId);
        if (conclusion) {
          lines.push(`### ${name}`);
          lines.push("");
          lines.push(conclusion.content);
          lines.push("");
        }
      }
    } else if (result.winnerId) {
      lines.push(`> Winner: **${getDisplayName(result.winnerId)}**`);
      lines.push("");
      lines.push(result.finalConclusion);
    } else {
      lines.push(result.finalConclusion);
    }

    return lines.join("\n");
  }
}
