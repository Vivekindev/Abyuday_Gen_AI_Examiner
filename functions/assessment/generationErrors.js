// Persist only application validation diagnostics, never provider request/response bodies.
export function generationFailure(error, stage) {
  return {
    stage: error.agent || stage || 'generation',
    message: error.generationValidation || error.unsupported
      ? String(error.message).slice(0, 1200)
      : error.status ? `AI provider request failed (HTTP ${error.status}). ${error.status >= 500 || error.status === 429 ? 'Retry when the provider is available.' : 'The provider rejected the request; check the model and output schema.'}`
        : 'Generation stopped unexpectedly. Retry the assessment; server logs contain diagnostic details.',
    at: new Date(),
  };
}
