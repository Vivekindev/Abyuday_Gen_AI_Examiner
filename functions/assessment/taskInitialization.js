import { validateDynamicQuestion, initialDynamicState, dynamicMeasurements, gradeDynamicQuestion } from '../../shared/dynamicEngine.js';

// Registry defaults are useful in previews, but can accidentally solve a new task.
// Adjust only the unpublished question's snapshot; targets and registry stay intact.
export function initializeDynamicTask(question) {
  try { validateDynamicQuestion(question); return question; }
  catch (error) {
    if (error.code !== 'DYNAMIC_START_SOLVED') throw error;
    const snapshot = structuredClone(question);
    const engine = snapshot.config.engine;
    for (const control of engine.controls) {
      const original = control.initial;
      let candidates;
      if (control.type === 'number') {
        const last = Math.floor((control.max - control.min) / control.step + 1e-8);
        const current = Math.round((Number(original) - control.min) / control.step);
        candidates = [current - 1, current + 1, 0, last, Math.floor(last / 2)]
          .filter((n) => n >= 0 && n <= last)
          .map((n) => String(Number((control.min + n * control.step).toPrecision(15))));
      } else if (control.type === 'toggle') candidates = ['false', 'true'];
      else if (control.type === 'choice') candidates = control.options;
      else candidates = [''];
      for (const value of new Set(candidates)) {
        if (value === original) continue;
        control.initial = value;
        const start = initialDynamicState(engine);
        if (!Object.values(dynamicMeasurements(engine, start)).every(Number.isFinite) || gradeDynamicQuestion(snapshot, start)) continue;
        // Recheck bounds, steps, the private solution and every grading constraint.
        try { validateDynamicQuestion(snapshot); return snapshot; }
        catch { /* Try the next bounded candidate; never weaken validation. */ }
      }
      control.initial = original;
    }
    error.message += ': no valid unsolved starting state found. Choose meaningful targets/tolerances and a task with a reachable passing solution and a finite failing start.';
    throw error;
  }
}
