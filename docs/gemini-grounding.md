# Gemini Search grounding

Google Search is enabled by default for Gemini 3.5 Flash-Lite and Gemini 3.8
Flash. This applies to assessment questions, interactive assessment agents,
and answer explanations. Set `GEMINI_WEB_SEARCH_ENABLED=false` on the backend
and worker to disable it; `true` explicitly enables it.

The SDK parameter is `config.tools: [{ googleSearch: {} }]`. Gemini chooses
whether the subject needs a search. Enabling the tool does not guarantee that
every request performs one. See [Google Search grounding](https://ai.google.dev/gemini-api/docs/generate-content/google-search).

## Structured assessments

| Model | Request flow |
| --- | --- |
| Gemini 3.8 Flash | Search and structured JSON in the same request |
| Gemini 3.5 Flash-Lite | Search-enabled research, then schema-constrained JSON using the research notes |
| Either model, plain-text explanation | One Search-enabled request |

Google explicitly documents combined tools and structured output for 3.8.
Flash-Lite uses separate research and formatting calls to avoid depending on
an undocumented combination. A 400 error that specifically rejects Search
with JSON also selects the research flow for 3.8. Other 400 errors, provider
overload, quota failures, and authentication errors remain errors and retain
normal retry handling. Search is never silently disabled to work around them.
See [structured outputs with tools](https://ai.google.dev/gemini-api/docs/generate-content/structured-output#structured-outputs-with-tools).

All research and formatting calls use existing AI usage metering. Their tokens
are tracked individually; research appears as the `web-research` agent. Existing
question, answer, engine, and content validators still run before publication.

Source links and up to five Google Search suggestion widgets accompany the
generated assessment in review and newly generated explanations. The worker
checkpoints attribution alongside its private generation state so retries can
retain references. Review attribution is only returned after an attempt ends.
Provider HTML is sanitized with DOMPurify and displayed in a shadow root so its
styles stay local. No source-link click tracking is added.

## Deployment and provider limits

Set the same grounding flag on the API and separately hosted worker, then
restart/redeploy both. Grounding has its own quota and billing requirements;
consult [Google’s pricing](https://ai.google.dev/gemini-api/docs/pricing) and
[API rate limits](https://ai.google.dev/gemini-api/docs/rate-limits).

During the implementation checks, both models returned HTTP 429 when Search
was requested. The configured project must regain quota or have its billing
and applicable limits adjusted before live grounding can succeed. Earlier
3.8 requests returned HTTP 503 for high demand. The worker retains its existing
backoff and fallback to Flash-Lite for repeated 3.8 overload failures.
