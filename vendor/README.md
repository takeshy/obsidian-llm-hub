# Shared library package

`obsidian-llm-hub-common-0.1.11.tgz` contains prebuilt JavaScript and TypeScript declarations for `npm ci --ignore-scripts`.

Source: [takeshy/obsidian-llm-hub-common commit 726b38f](https://github.com/takeshy/obsidian-llm-hub-common/commit/726b38f), version 0.1.11, committed and pushed to main with a clean working tree.

This version adds the optional `WorkflowHost.getRagSearchOptions` hook, the Jev command-node search-until-found checkbox, translations, YAML normalization, and specification text. Hosts without Jev support omit the hook. Jev credentials, API requests, and search behavior remain in this plugin.

The shared file-reference resolver handles wikilinks, @ references, and vault paths. Chat messages preserve the original references. Only model requests annotate each tool-readable reference with path, type, and byte size; file contents are fetched on demand and reading instructions stay in the system prompt. Hosts retain their inline fallback policy, vault tool scope, PDF reader, and character limit.

Archive integrity:

```text
sha512-T8mdo5e705Wx19K4pq4hbkYWQ5h4FfW6sK1ayDGXbhcT0TnXvbv4B9zBkb35tTrFyFfxOIjxtmXGQKsRi2LS8Q==
```

Created with `npm pack`, whose prepack script runs the build and all 784 shared-library tests. The MIT license is included.
