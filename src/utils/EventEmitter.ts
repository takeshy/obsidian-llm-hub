export * from "obsidian-llm-hub-common/core";

declare module "obsidian-llm-hub-common/core" {
  interface EventMap {
    "rag-filter-changed": [name: string];
  }
}
