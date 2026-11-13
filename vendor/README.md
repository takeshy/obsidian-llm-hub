# Shared library package

The active dependency is `obsidian-llm-hub-common-0.1.18.tgz`, shared by LLM Hub
and Gemini Helper. Version 0.1.18 extends decisions with Noul probability, Score
thresholds, named Choice destinations, and mixed-question batches sharing one
API request. Batch output is saved as named JSON values for subsequent conditions.

It builds on the decision node support from 0.1.17. It adds the `decision` workflow node, its visual editor,
true/false routing, YAML round trips, Mermaid rendering, execution history,
AI authoring documentation, and the optional decision-model/handler host hooks.
The shared `requestBooleanDecision` API calls Jev, OpenRouter, or Gemini
(`gemini-decision-1`) with strict choice validation, cancellation, rate-limit
retry, and a 20-second deadline.

Source: [takeshy/obsidian-llm-hub-common commit 9f9bc2f](https://github.com/takeshy/obsidian-llm-hub-common/commit/9f9bc2fa237fe16443f9cd974724f1cb6adba1e6),
version 0.1.18, committed and pushed to `main`. The archive was created with
`npm pack --ignore-scripts` after building and passing the shared tests.
It includes prebuilt JavaScript, TypeScript declarations, and the MIT license.

Archive integrity:

```text
sha512-2oNGu1gXCWCFbBpMcJa3X98V3cg3xBwmbqwa+k8XlJkYgJSte4kOMz4JPEIYVijPhowjnUgJuu0L2cYS3uyj+Q==
```

Previous package notes follow.

`obsidian-llm-hub-common-0.1.16.tgz` contains prebuilt JavaScript and TypeScript declarations for `npm ci --ignore-scripts`.

Source: [takeshy/obsidian-llm-hub-common commit 3176799](https://github.com/takeshy/obsidian-llm-hub-common/commit/317679917d7984721c50c909e2800bf99a6fb333), version 0.1.16, on branch `feat/hybrid-rag-search`.

Version 0.1.16 adds retrieval-source metadata to fused candidates, shared search-mode
and source badges, and explicit RRF score display. Both hosts use the same UI and
all nine translations. Ordinary vector results retain cosine percentage display;
fused results show `RRF` scores and a Vector / BM25 / Both label. The mode badge
reflects current settings, while existing results retain their retrieval metadata.

Includes the shared tokenizer, incremental BM25 index, chunk cache adapter and RRF
candidate selection from 0.1.15. Hybrid retrieval remains opt-in. Existing cached
text builds BM25 without new document embeddings.

Archive integrity:

```text
sha512-uXRYdbZVP9W8YuVK5/Ri4NmQY2ZZQGrnTpw4jb59ybAtGCI0Uc8+EvLbrkgaVek1+ie4IJrUwOgY7DXJ5Bp14g==
```

Created with `npm pack --ignore-scripts` after the build and full shared-library
test suite passed. The MIT license is included. Previous archives are retained.
