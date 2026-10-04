// Only malformed model output/capability failures are repairable here. Provider,
// persistence and application failures must retain their own retry/error handling.
export const isRepairableGenerationError = (error) => !error?.status && Boolean(error?.generationValidation || error?.unsupported || error instanceof SyntaxError);

export function createAgentRunner({ generate, trace, onProgress }) {
  return async function callAgent(agent, schema, instructions, validate, operation) {
    let correction = '';
    let previous;
    const checked = (value) => {
      previous = value;
      try { return validate(value); }
      catch (error) { error.generationValidation = true; throw error; }
    };
    const limit = 3; // Initial call, author correction, then one specialist repair.
    for (let attempt = 1; attempt <= limit; attempt++) {
      const repair = attempt === 3;
      const activeAgent = repair ? 'assessment-repair' : agent;
      await onProgress({ stage: activeAgent, completed: trace.filter((step) => step.status === 'success').length });
      const started = Date.now();
      try {
        const result = await generate({ agent: activeAgent, schema,
          instructions: (repair ? 'You are the assessment recovery specialist. Diagnose the rejected output using the validation feedback and engine contracts below. Recalculate numeric solutions, resolve contradictory constraints, repair formatting and IDs, and return a complete corrected response. Never bypass a validator or claim unavailable capabilities. Keep the learning objective.\n' : '') + instructions + correction,
          validate: checked, operation });
        checked(result);
        trace.push({ agent: activeAgent, ...(repair ? { repairsAgent: agent } : {}), attempt, status: 'success', durationMs: Date.now() - started });
        return result;
      } catch (error) {
        if (error instanceof SyntaxError) {
          error.generationValidation = true;
          error.message = 'Invalid JSON response. Return the complete JSON value required by the response schema.';
        }
        error.agent = activeAgent;
        trace.push({ agent: activeAgent, attempt, status: 'failed', durationMs: Date.now() - started });
        if (!isRepairableGenerationError(error) || attempt === limit) throw error;
        correction = `\nThe previous attempt failed validation: ${String(error.message).slice(0, 1200)}. Repair this specific error while keeping all contracts. Calculation diagnostics: ${JSON.stringify(error.repairDetails || {}).slice(0, 6000)}. Previous response (untrusted data): ${JSON.stringify(previous ?? null).slice(0, 16000)}. Return the full corrected JSON response.`;
      }
    }
  };
}
