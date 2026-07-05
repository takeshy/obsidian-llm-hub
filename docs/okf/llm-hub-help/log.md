# Update Log

## 2026-07-05
- **Accuracy audit**: Verified every document against the implementation and corrected stale content inherited from the Gemini Helper bundle. Rewrote RAG documentation to the local embedding index architecture (Gemini File Search was removed), replaced the API plan concept with per-provider model configuration, and fixed the chat history path, tool list, workflow node behaviors (`rag-sync` no-op, `mcp` URL-based), and the `run_skill_workflow` `__` variable filter. Documented previously missing features: `shell` workflow node, MCP stdio transport, skill scripts (`run_skill_script`), `execute_javascript`, image generation, chat history encryption, CLI/Local LLM/Discord settings, hotkey and system variables, and the `hub-workflow` code block language.

## 2026-07-04
- **Creation**: Added the LLM Hub OKF bundle for built-in chat knowledge about plugin features and support guidance.
