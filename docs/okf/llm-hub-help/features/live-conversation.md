---
type: Feature
title: Live Voice Conversation
description: Direct Gemini/OpenAI voice sessions with optional chat context, read-only Vault tools, RAG, and transcript history.
tags: [live, voice, audio, gemini, openai, rag]
timestamp: 2026-11-09T00:00:00Z
---

# Live voice conversation

Select a microphone and audio output, or keep System default. Use Allow microphone and refresh devices if devices or names are missing; this briefly opens the microphone locally without sending audio. Selections are saved on this device. Stop before changing devices. If output selection is unavailable, choose the output in system sound settings. If a saved device is disconnected, reconnect it or select another device. Check system microphone permission if access is denied.

Save a Gemini or OpenAI API key, then click the chat header microphone regardless of the normal chat model. Select the Live provider, model, and voice in the setup dialog. Starting a call closes setup and shows speech directly in the existing chat sidebar. The normal text composer is replaced by microphone mute, Stop, and End conversation controls; a draft in the composer is preserved. Text-model verification/enabling is not required. API charges apply; the voice is AI generated. Live connects only to official Gemini/OpenAI APIs. speech-popup is not required.

Speak naturally, interrupt, or mute. Stop releases the microphone and playback while keeping the transcript in chat. Use Call settings while stopped to change provider, model, voice, devices, or file/RAG access, then restart. End conversation or Return to chat restores the text composer so you can continue the same conversation by text. Starting or loading a different chat is disabled until you finish the call.

Editing notes, hiding the sidebar, or switching to the Search/Workflow tab keeps the call running. The Obsidian status bar shows the call state, a button to return to the chat, and Stop. Closing the LLM Hub view or unloading the plugin releases the call resources and flushes the transcript to history.

Choose prior chat context (last 20 messages, up to 40,000 characters), read-only Vault access, and RAG independently. RAG works with Vault access off. Vault reads honor allowed folders and include unsaved editor text. RAG uses its own embedding key, or a saved Gemini key independently of voice/chat flags. Actual RAG counts/errors are shown. Index results ignore Vault tool folder limits. Writing, deletion, skills, scripts, MCP, and Web search are unavailable.

Partial transcripts update existing chat messages rather than adding a new message for each fragment. History checkpoints are saved after a pause in transcription, and finishing or closing saves the final transcript after any pending write. History/encryption settings apply; automatic history off means no automatic disk save. Raw audio is not saved.

Session setup uses the HTTP proxy setting; realtime audio connects directly to the provider. Disconnects do not silently reconnect.
