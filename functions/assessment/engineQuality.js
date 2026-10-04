import { validateEngineDefinition } from '../../shared/dynamicEngine.js';
import { validateContentFormat } from './contentValidation.js';

// Generation-time checks do not invalidate immutable snapshots in existing attempts.
export function validateEngineForGeneration(definition) {
  try {
    validateEngineDefinition(definition);
    validateContentFormat(definition.description, 'Engine description');
    if (definition.metrics.length) {
      const referenced = new Set(definition.metrics.flatMap((m) => m.tokens));
      for (const control of definition.controls) {
        if (['choice', 'toggle'].includes(control.type) && !referenced.has(`$${control.id}`)) {
          throw new Error(`Control ${control.id}: a calculation engine cannot expose a mode/toggle that affects no measurements. Remove it; for answer-entry choices use metrics=[].`);
        }
      }
    }
    return definition;
  } catch (error) { error.generationValidation = true; throw error; }
}
