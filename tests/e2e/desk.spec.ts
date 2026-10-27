import { test, expect, type Page } from '@playwright/test';
const proof = process.env.WANTED_PROOF_DIR;
const endpoint = '/api/artist/maya-ortiz/desk';
async function click(page: Page, name: string) {
  const response = page.waitForResponse(r => r.url().includes(endpoint) && r.request().method() === 'POST');
  await page.getByRole('button', { name, exact: true }).click();
  const r = await response;
  expect(r.status(), await r.text()).toBe(200);
  return r.json();
}
async function read(page: Page) { const r = await page.request.get(endpoint); expect(r.ok()).toBeTruthy(); return r.json(); }
async function noOverflow(page: Page) {
  const overflow = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
  expect(overflow.width).toBe(393);
  expect(overflow.scroll).toBeLessThanOrEqual(394);
  const controls = page.getByRole('button');
  for (let i = 0; i < await controls.count(); i++) {
    const el = controls.nth(i);
    if (!await el.isVisible()) continue;
    const box = await el.boundingBox();
    if (box) { expect(box.height, await el.innerText()).toBeGreaterThanOrEqual(44); expect(box.x, await el.innerText()).toBeGreaterThanOrEqual(-1); expect(box.x + box.width, await el.innerText()).toBeLessThanOrEqual(394); }
  }
}

test('iPhone 16: live same-roster decision, exact approval, lost receipt and current-version recovery', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('/a/maya-ortiz/desk');
  await expect(page.getByText('Who’s on the bill?', { exact: false })).toBeVisible();
  await noOverflow(page);
  if (proof) await page.screenshot({ path: `${proof}/booking-desk-iphone16-start.png` });
  await click(page, 'Find my bill');
  await click(page, 'Compare the bill myself');
  let data = await read(page);
  const pressure = data.desk.pressure;
  expect(pressure.views.act.scores).toHaveLength(4);
  expect(pressure.views.scene.scores).toHaveLength(4);
  expect(pressure.views.joint.scores).toHaveLength(4);
  expect(pressure.selectedId).not.toBeNull();
  const name = pressure.rows.find((r: { id: string }) => r.id === pressure.selectedId).name;
  await expect(page.getByText(`I’d ask ${name}.`, { exact: true })).toBeVisible();
  await noOverflow(page);
  await page.getByText(`I’d ask ${name}.`, { exact: true }).scrollIntoViewIfNeeded();
  if (proof) await page.screenshot({ path: `${proof}/booking-desk-iphone16-fit.png` });
  await click(page, `Write to ${name}`);
  await click(page, 'These terms look good');
  await page.getByRole('button', { name: 'Test a show change', exact: true }).click();
  await click(page, 'Test a missing send result');
  await expect(page.getByText('Did that go through?', { exact: true })).toBeVisible();
  await click(page, 'Check the original receipt');
  await expect(page.getByText('Saved in the test inbox', { exact: true })).toBeVisible();
  await expect(page.getByText('No artist reply. The show is not confirmed.', { exact: false })).toBeVisible();
  data = await read(page);
  const action = data.desk.actions[0];
  expect(action.state).toBe('provider_accepted');
  expect(action.receipt.acknowledgment).toBeNull();
  await noOverflow(page);
  await page.getByText('Saved in the test inbox', { exact: true }).scrollIntoViewIfNeeded();
  if (proof) await page.screenshot({ path: `${proof}/booking-desk-iphone16-receipt.png` });
  // Prepare a separate current-version action, then change the show facts.
  const other = data.desk.opportunity.roster.find((c: { id: string }) => c.id !== action.candidateId);
  const prep = await page.request.post(endpoint, { data: { kind: 'prepare', candidateId: other.id, version: 1 } }); expect(prep.ok()).toBeTruthy();
  let pending = (await prep.json()).desk.actions.find((a: { candidateId: string }) => a.candidateId === other.id);
  data = await read(page);
  const approved = await page.request.post(endpoint, { data: { kind: 'approve', actionId: pending.id, version: 1, payloadHash: data.hashes[pending.id], yes: true } }); expect(approved.ok()).toBeTruthy();
  pending = (await approved.json()).desk.actions.find((a: { id: string }) => a.id === pending.id);
  const oldToken = pending.approval.token;
  await click(page, 'Move the date one day');
  const version = (await read(page)).desk.opportunity.version;
  await click(page, 'Receive the same reply again');
  data = await read(page); expect(data.desk.opportunity.version).toBe(version);
  expect(data.desk.actions.find((a: { id: string }) => a.id === pending.id).state).toBe('invalidated');
  const denied = await page.request.post(endpoint, { data: { kind: 'execute', actionId: pending.id, token: oldToken } }); expect(denied.status()).toBe(409);
  await page.reload();
  await expect(page.getByText('The date moved.')).toBeVisible();
  await noOverflow(page);
  await click(page, 'Check the new date');
  await click(page, 'Compare the bill myself');
  await expect(page.getByText(`I’d ask ${name}.`, { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
  // Keep a clean ranked case for the final screenshot, without discarding any other visitor's fixture.
  await page.getByRole('button', { name: 'Test a show change', exact: true }).click();
  await page.getByRole('button', { name: 'Start over', exact: true }).click();
  await click(page, 'Yes, start over');
  await click(page, 'Compare the bill myself');
  await page.getByRole('button', { name: 'Close Booking desk', exact: true }).scrollIntoViewIfNeeded();
  await noOverflow(page);
  if (proof) await page.screenshot({ path: `${proof}/booking-desk-iphone16-final.png` });
});

test('fixture API rejects missing browser authority and malformed approval', async ({ request }) => {
  expect((await request.post(endpoint, { data: { kind: 'execute', actionId: 'outside', token: 'outside' } })).status()).toBe(403);
  expect((await request.post(endpoint, { data: { kind: 'approve', actionId: 'outside', version: 1, payloadHash: 'hash', yes: 'true' } })).status()).toBe(400);
});

test('reply review stays local until explicit confirmation and sends only reviewed fields', async ({ page }) => {
  await page.goto('/a/maya-ortiz/desk');
  await click(page, 'Find my bill');
  const initial = (await read(page)).desk;
  const next = new Date(`${initial.opportunity.date}T12:00:00Z`); next.setUTCDate(next.getUTCDate() + 1);
  const date = next.toISOString().slice(0, 10);
  await page.getByRole('button', { name: 'Work through a booker’s reply', exact: true }).click();
  const posts: string[] = [];
  page.on('request', r => { if (r.url().includes(endpoint) && r.method() === 'POST') posts.push(r.postData() ?? ''); });
  await page.getByRole('textbox', { name: 'Booker’s reply', exact: true }).fill(`Move to ${date}. The support budget is now $150. LOCAL_ONLY_TEST_NOTE`);
  await page.getByRole('button', { name: 'Review this reply', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'New show date', exact: true })).toHaveValue(date);
  await expect(page.getByRole('textbox', { name: 'New support budget in USD', exact: true })).toHaveValue('150');
  await expect(page.getByRole('button', { name: 'Update show', exact: true })).toBeDisabled();
  expect(posts).toEqual([]);
  const confirmation = page.getByRole('checkbox', { name: 'I checked these changes against the reply', exact: true });
  await confirmation.click(); await expect(page.getByRole('button', { name: 'Update show', exact: true })).toBeEnabled();
  await page.getByRole('textbox', { name: 'New support budget in USD', exact: true }).fill('175');
  await expect(page.getByRole('button', { name: 'Update show', exact: true })).toBeDisabled();
  await noOverflow(page);
  await confirmation.click();
  const updated = await click(page, 'Update show');
  expect(updated.desk.opportunity.date).toBe(date); expect(updated.desk.opportunity.maxFee).toBe(175);
  expect(updated.desk.opportunity.version).toBe(initial.opportunity.version + 1);
  expect(posts).toHaveLength(1);
  const sent = JSON.parse(posts[0]);
  expect(Object.keys(sent).sort()).toEqual(['contactId', 'kind', 'patch', 'sourceMessageId', 'version']);
  expect(sent.patch).toEqual({ date, maxFee: 175 }); expect(sent.sourceMessageId).toMatch(/^reviewed:/);
  expect(posts[0]).not.toContain('LOCAL_ONLY_TEST_NOTE');
  await noOverflow(page);
});

test('a saved reply with a lost response requires refresh, preserves the excerpt and does not reapply', async ({ page }) => {
  await page.goto('/a/maya-ortiz/desk');
  await click(page, 'Find my bill');
  const initial = (await read(page)).desk;
  await page.getByRole('button', { name: 'Work through a booker’s reply', exact: true }).click();
  const excerpt = 'The support budget is now $175. LOST_REPLY_LOCAL_ONLY';
  await page.getByRole('textbox', { name: 'Booker’s reply', exact: true }).fill(excerpt);
  await page.getByRole('button', { name: 'Review this reply', exact: true }).click();
  await page.getByRole('checkbox', { name: 'I checked these changes against the reply', exact: true }).click();
  let replies = 0;
  await page.route(`**${endpoint}`, async route => {
    const request = route.request();
    if (request.method() === 'POST' && request.postDataJSON()?.kind === 'reply') {
      replies++;
      const accepted = await route.fetch();
      expect(accepted.ok()).toBeTruthy();
      await route.abort('failed'); // Commit succeeded; only its response is lost.
    } else await route.continue();
  });
  await page.getByRole('button', { name: 'Update show', exact: true }).click();
  await expect(page.getByText('I couldn’t confirm the update', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Update show', exact: true })).toHaveCount(0);
  const saved = (await read(page)).desk;
  expect(saved.opportunity.maxFee).toBe(175);
  expect(saved.opportunity.version).toBe(initial.opportunity.version + 1);
  await page.getByRole('button', { name: 'Refresh the current show', exact: true }).last().click();
  await expect(page.getByText('The show changed while you were reviewing.', { exact: true })).toBeVisible();
  await expect(page.getByText('I couldn’t confirm the update', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Review against the current show', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Booker’s reply', exact: true })).toHaveValue(excerpt);
  expect(replies).toBe(1);
  expect((await read(page)).desk.opportunity.version).toBe(saved.opportunity.version);
  await noOverflow(page);
});
