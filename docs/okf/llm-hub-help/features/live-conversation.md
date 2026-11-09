---
type: Feature
title: Live Voice Conversation
description: Direct Gemini/OpenAI voice sessions with optional chat context, read-only Vault tools, RAG, and transcript history.
tags: [live, voice, audio, gemini, openai, rag]
timestamp: 2026-11-08T00:00:00Z
---

# Live voice conversation

Select a microphone and audio output, or keep System default. Use Allow microphone and refresh devices if devices or names are missing; this briefly opens the microphone locally without sending audio. Selections are saved on this device. Stop before changing devices. If output selection is unavailable, choose the output in system sound settings. If a saved device is disconnected, reconnect it or select another device. Check system microphone permission if access is denied.

Save a Gemini or OpenAI API key, then click the chat header microphone regardless of the normal chat model. Select the Live provider, model, and voice. Text-model verification/enabling is not required. Speak naturally, interrupt, or mute. Stop to switch provider/model and restart; transcripts are retained. End conversation or Return to chat finishes. API charges apply; the voice is AI generated. Live connects only to official Gemini/OpenAI APIs. speech-popup is not required.

Choose prior chat context (last 20 messages, up to 40,000 characters), read-only Vault access, and RAG independently. RAG works with Vault access off. Vault reads honor allowed folders and include unsaved editor text. RAG uses its own embedding key, or a saved Gemini key independently of voice/chat flags. Actual RAG counts/errors are shown. Index results ignore Vault tool folder limits. Writing, deletion, skills, scripts, MCP, and Web search are unavailable.

Finishing or closing adds the transcript to the same chat. History/encryption settings apply; automatic history off means no automatic disk save. Raw audio is not saved. Stopping releases microphone and playback resources.

Session setup uses the HTTP proxy setting; realtime audio connects directly to the provider. Disconnects do not silently reconnect.
