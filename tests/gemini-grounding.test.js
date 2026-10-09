import test from 'node:test';
import assert from 'node:assert/strict';
import { generateGroundedContent, mergeGrounding, responseGrounding } from '../functions/geminiGrounding.js';
import { generationFailure } from '../functions/assessment/generationErrors.js';
import geminiQueryRun, { createAgentGenerator, geminiSummaryRun } from '../functions/geminiQueryRun.js';
import { AiUsage } from '../models/telemetry.js';

const context = { user: '507f1f77bcf86cd799439011', team: '507f1f77bcf86cd799439012', testID: 'grounding-check' };
const schema = { type: 'array', items: { type: 'object', properties: { answer: { type: 'string' } }, required: ['answer'] } };
const jsonConfig = { temperature: 0.4, responseMimeType: 'application/json', responseJsonSchema: schema };
const source = { url: 'https://docs.example.test/topic', title: 'Primary source' };
const research = {
  text: 'Verified reference facts.',
  candidates: [{ groundingMetadata: {
    webSearchQueries: ['topic documentation'],
    groundingChunks: [{ web: { uri: source.url, title: source.title } }],
    searchEntryPoint: { renderedContent: '<div>Google Search suggestions</div>' },
  } }],
};
const json = { text: '[{"answer":"Verified fact"}]' };
const configuredTests = new WeakSet();

function setup(t, responses) {
  if (!configuredTests.has(t)) {
    configuredTests.add(t);
    const previous = process.env.GEMINI_WEB_SEARCH_ENABLED;
    t.after(() => {
      if (previous === undefined) delete process.env.GEMINI_WEB_SEARCH_ENABLED;
      else process.env.GEMINI_WEB_SEARCH_ENABLED = previous;
    });
  }
  process.env.GEMINI_WEB_SEARCH_ENABLED = 'true';
  const requests = [], records = [];
  return {
    requests, records,
    options: {
      model: 'gemini-3.8-flash', context, operation: 'questions', agent: 'assessment-author',
      contents: 'Author a question from current documentation.', config: jsonConfig,
      validate: (result) => assert.ok(Array.isArray(JSON.parse(result.text))),
      generate: async (request) => {
        requests.push(request);
        const response = responses.shift();
        if (response instanceof Error) throw response;
        assert.ok(response, 'No unexpected additional provider calls');
        return response;
      },
      meter: async (record) => {
        records.push(record);
        const response = await record.execute();
        record.validate?.(response);
        return response;
      },
    },
  };
}

test('Gemini 3.8 enables Search alongside the existing JSON schema', async (t) => {
  const run = setup(t, [{ ...research, text: json.text }]);
  let grounding;
  const result = await generateGroundedContent({ ...run.options, context: { ...context, onGrounding: (value) => { grounding = value; } } });
  assert.equal(result.text, json.text);
  assert.equal(run.requests.length, 1);
  assert.deepEqual(run.requests[0].config.tools, [{ googleSearch: {} }]);
  assert.equal(run.requests[0].config.responseJsonSchema, schema);
  assert.deepEqual(grounding.sources, [source]);
  assert.equal(grounding.searchSuggestions.length, 1);
  assert.equal(run.records[0].context.user, context.user);
});

test('Flash-Lite uses metered Search research before schema-constrained generation', async (t) => {
  const run = setup(t, [research, json]);
  let grounding;
  await generateGroundedContent({ ...run.options, model: 'gemini-3.5-flash-lite', context: { ...context, onGrounding: (value) => { grounding = value; } } });
  assert.equal(run.requests.length, 2);
  assert.deepEqual(run.requests[0].config.tools, [{ googleSearch: {} }]);
  assert.equal(run.requests[0].config.responseMimeType, undefined);
  assert.equal(run.requests[0].config.responseJsonSchema, undefined);
  assert.equal(run.requests[1].config.tools, undefined);
  assert.equal(run.requests[1].config.responseJsonSchema, schema);
  assert.match(run.requests[1].contents, /Verified reference facts/);
  assert.match(run.requests[1].contents, /untrusted source data/);
  assert.deepEqual(run.records.map((record) => record.agent), ['web-research', 'assessment-author']);
  assert.ok(run.records.every((record) => record.model === 'gemini-3.5-flash-lite' && record.context.team === context.team));
  assert.deepEqual(grounding.sources, [source]);
});

test('plain-text explanations enable Search on either Flash model without an extra research call', async (t) => {
  const run = setup(t, [research, research]);
  for (const model of ['gemini-3.8-flash', 'gemini-3.5-flash-lite']) {
    await generateGroundedContent({ ...run.options, model, operation: 'explanation', config: { temperature: 0.4 }, validate: (response) => assert.ok(response.text) });
  }
  assert.equal(run.requests.length, 2);
  assert.ok(run.requests.every((request) => request.config.tools[0].googleSearch));
});

test('only an explicit Search/JSON incompatibility selects separate research for Gemini 3.8', async (t) => {
  const conflict = Object.assign(new Error('Google Search tools are not supported with response_mime_type application/json'), { status: 400 });
  const run = setup(t, [conflict, research, json]);
  await generateGroundedContent(run.options);
  assert.equal(run.requests.length, 3);
  assert.equal(run.records.length, 3);
  assert.deepEqual(run.requests[1].config.tools, [{ googleSearch: {} }]);
  assert.equal(run.requests[2].config.responseJsonSchema, schema);
});

test('quota, overload, authentication and unrelated schema errors never bypass Search', async (t) => {
  for (const model of ['gemini-3.8-flash', 'gemini-3.5-flash-lite']) {
    for (const status of [400, 401, 403, 429, 503]) {
      const failure = Object.assign(new Error('Provider rejected the request'), { status });
      const run = setup(t, [failure]);
      await assert.rejects(generateGroundedContent({ ...run.options, model }), (error) => error === failure);
      assert.equal(run.requests.length, 1);
      assert.ok(run.requests[0].config.tools);
    }
  }
});

test('invalid generated JSON retains validation and is never published as grounded content', async (t) => {
  const run = setup(t, [research, { text: 'Not JSON' }]);
  let published = false;
  await assert.rejects(generateGroundedContent({ ...run.options, model: 'gemini-3.5-flash-lite', context: { ...context, onGrounding: () => { published = true; } } }), SyntaxError);
  assert.equal(published, false);
});

test('disabling Search preserves a single structured generation call', async (t) => {
  const run = setup(t, [json]);
  process.env.GEMINI_WEB_SEARCH_ENABLED = 'false';
  await generateGroundedContent({ ...run.options, model: 'gemini-3.5-flash-lite' });
  assert.equal(run.requests.length, 1);
  assert.deepEqual(run.requests[0].config, jsonConfig);
});

test('an enabled tool without grounding metadata never claims Search was used', async (t) => {
  const run = setup(t, [json]);
  let published = false;
  await generateGroundedContent({ ...run.options, context: { ...context, onGrounding: () => { published = true; } } });
  assert.equal(published, false);
  assert.equal(responseGrounding(json), null);
});

test('attribution deduplicates references and rejects unsafe source links', () => {
  const response = structuredClone(research);
  response.candidates[0].groundingMetadata.groundingChunks.push(...[
    'javascript:alert(1)', 'data:text/html,unsafe', 'https://user:password@example.test', source.url,
  ].map((uri) => ({ web: { uri, title: 'Reference' } })));
  const grounding = responseGrounding(response);
  assert.equal(grounding.sources.length, 1);
  const merged = mergeGrounding(grounding, grounding);
  assert.equal(merged.sources.length, 1);
  assert.equal(merged.searchSuggestions.length, 1);
  assert.equal(mergeGrounding(null), null);
  assert.equal(mergeGrounding({ searchSuggestions: Array.from({ length: 8 }, (_, i) => `<div>${i}</div>`) }).searchSuggestions.length, 5);
});

test('provider failure feedback distinguishes quota and overload without leaking provider bodies', () => {
  const secret = 'private-provider-diagnostic';
  assert.match(generationFailure({ status: 429, message: secret }, 'planning').message, /quota/);
  assert.match(generationFailure({ status: 503, message: secret }, 'planning').message, /overloaded/);
  assert.ok(!generationFailure({ status: 429, message: secret }, 'planning').message.includes(secret));
});

test('the actual Google SDK sends Search parameters for MCQs, agents and explanations', async (t) => {
  setup(t, []);
  const previousKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = 'unit-test-only-api-key';
  t.after(() => {
    if (previousKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = previousKey;
  });
  const requests = [], records = [], replies = [];
  t.mock.method(AiUsage, 'create', async (record) => {
    records.push(record);
    return { _id: context.user };
  });
  t.mock.method(AiUsage, 'updateOne', async () => ({ acknowledged: true }));
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    assert.match(String(url), /^https:\/\/generativelanguage\.googleapis\.com\//);
    requests.push(JSON.parse(init.body));
    const text = replies.shift();
    assert.equal(typeof text, 'string', 'All provider responses are mocked');
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] }, finishReason: 'STOP' }], usageMetadata: { totalTokenCount: 10 } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  });
  const questions = JSON.stringify([{ questionText: 'What is 2 + 2?', options: ['1', '2', '3', '4'], answer: '4', tag: ['arithmetic'] }]);

  replies.push(questions);
  assert.equal(await geminiQueryRun('Arithmetic', 1, 2, 'gemini-3.8-flash', context), questions);
  assert.deepEqual(requests[0].tools, [{ googleSearch: {} }]);
  assert.equal(requests[0].generationConfig.responseMimeType, 'application/json');
  assert.ok(requests[0].generationConfig.responseSchema);

  replies.push('Addition rules.', questions);
  await geminiQueryRun('Arithmetic', 1, 2, 'gemini-3.5-flash-lite', context);
  assert.deepEqual(requests[1].tools, [{ googleSearch: {} }]);
  assert.equal(requests[1].generationConfig.responseMimeType, undefined);
  assert.equal(requests[2].tools, undefined);
  assert.equal(requests[2].generationConfig.responseMimeType, 'application/json');

  replies.push('Verified planning reference.', '{"answer":"Planning result"}');
  const author = createAgentGenerator('gemini-3.5-flash-lite', context);
  const result = await author({ agent: 'assessment-planner', operation: 'planning', instructions: 'Plan the question.', schema: schema.items, validate: (value) => assert.equal(value.answer, 'Planning result') });
  assert.equal(result.answer, 'Planning result');
  assert.deepEqual(requests[3].tools, [{ googleSearch: {} }]);
  assert.ok(requests[4].generationConfig.responseJsonSchema);

  for (const model of ['gemini-3.8-flash', 'gemini-3.5-flash-lite']) {
    replies.push('Adding two and two gives four.');
    await geminiSummaryRun('What is 2 + 2?', '4', model, context);
    assert.deepEqual(requests.at(-1).tools, [{ googleSearch: {} }]);
  }
  assert.equal(requests.length, 7);
  assert.equal(records.length, 7);
  assert.equal(records.filter((record) => record.agent === 'web-research').length, 2);
  assert.equal(replies.length, 0);
});
