import test from 'node:test';
import assert from 'node:assert/strict';
import { difficultyRating, difficultyValue, difficultyLabel } from '../shared/difficulty.js';
import { renderNotification } from '../functions/emailing/templates.js';
import { sealPayload, openPayload } from '../functions/emailing/payload.js';

test('difficulty labels and numeric API values have one 0–10 mapping', () => {
  for (const [value, rating] of [['easy', 2], [' Easy ', 2], ['MEDIUM', 5], ['hard', 8], [0, 0], ['0', 0], [10, 10], ['10', 10]]) assert.equal(difficultyRating(value), rating);
  for (const value of [null, undefined, '', ' ', false, true, {}, [], '2.5', 2.5, -1, 11, 'extreme', NaN, Infinity]) assert.equal(difficultyRating(value), null);
  for (const [value, expected] of [[0, 'easy'], [3, 'easy'], [4, 'medium'], [6, 'medium'], [7, 'hard'], [10, 'hard']]) assert.equal(difficultyValue(value), expected);
  assert.equal(difficultyLabel('hard'), 'Hard');
});

test('email templates escape user content and constrain action links to this application', () => {
  const payload = { name: '<script>name</script>', title: 'Team <img src=x>\r\nBcc: fake', message: '<a href="evil">Join</a>', details: [['Role', '<b>admin</b>']], actionLabel: 'Join <team>', actionPath: '/join?token=example&source=email' };
  const mail = renderNotification(payload, 'https://app.example.test');
  assert.ok(mail.html.includes('&lt;script&gt;name&lt;/script&gt;'));
  assert.ok(mail.html.includes('https://app.example.test/join?token=example&amp;source=email'));
  assert.ok(!mail.html.includes('<script>'));
  assert.ok(!mail.subject.includes('\n'));
  assert.ok(mail.text.includes('https://app.example.test/join?token=example&source=email'));
  for (const path of ['https://evil.example/', '//evil.example/', 'javascript:alert(1)', 'relative/path']) assert.throws(() => renderNotification({ ...payload, actionPath: path }, 'https://app.example.test'));
});

test('queued invitation content is encrypted and tampering is rejected', () => {
  process.env.EMAIL_ENCRYPTION_KEY = 'unit-test-only-mail-encryption-key';
  const payload = { title: 'Invitation', actionPath: '/join?token=private-invitation-token' };
  const sealed = sealPayload(payload);
  assert.ok(!JSON.stringify(sealed).includes('private-invitation-token'));
  assert.deepEqual(openPayload(sealed), payload);
  const tampered = { ...sealed, tag: Buffer.alloc(16).toString('base64') };
  assert.throws(() => openPayload(tampered));
  assert.notDeepEqual(sealPayload(payload), sealed);
});
