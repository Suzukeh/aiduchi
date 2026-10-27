import { test, expect, type Page, type APIRequestContext } from '@playwright/test';

async function setup(page: Page, request: APIRequestContext) {
  const api = 'http://localhost:5181';
  const r = await request.post(`${api}/api/rooms`, { data: { name: 'isolated-replan-audit', adapterKind: 'code' } });
  expect(r.ok()).toBeTruthy();
  const { id, joinToken } = await r.json();
  const headers = { 'x-room-token': joinToken };
  const nodes: string[] = [];
  for (const label of ['branch-A', 'branch-B']) {
    const result = await request.post(`${api}/api/rooms/${id}/snapshots`, {
      headers, data: { parentNodeId: null, files: { 'README.md': label }, label },
    });
    expect(result.ok()).toBeTruthy();
    nodes.push((await result.json()).id);
  }
  await page.goto(`/?room=${id}&token=${joinToken}`);
  await expect(page.locator('[title="同期中"]')).toBeVisible();
  await expect(page.getByText('branch-B', { exact: true })).toBeVisible();
  const open = async (nodeId: string) => {
    await page.evaluate(async (target) => {
      const { useStore } = await import('/src/store.ts');
      useStore.getState().openWindow(target);
    }, nodeId);
    await page.getByRole('button', { name: 'ファイル', exact: true }).click();
  };
  return { api, id, headers, nodes, open };
}

test('保存済み内容は編集開始時にも表示される', async ({ page, request }) => {
  const { nodes, open } = await setup(page, request);
  await open(nodes[0]);
  await expect(page.locator('pre')).toHaveText('branch-A');
  await page.getByRole('button', { name: '編集', exact: true }).click();
  await expect(page.locator('.cm-content')).toHaveText('branch-A', { timeout: 2000 });
});

test('分岐Bの編集保存に分岐Aの内容が混入しない', async ({ page, request }) => {
  const { api, id, headers, nodes, open } = await setup(page, request);
  await open(nodes[0]);
  await page.getByRole('button', { name: '編集', exact: true }).click();
  await expect(page.locator('.cm-content')).toBeVisible();
  const sharedA = await page.evaluate(async () => {
    const { getYFiles } = await import('/src/store.ts');
    return getYFiles()?.get('README.md')?.toString();
  });
  await page.getByTitle('閉じる', { exact: true }).click();
  await open(nodes[1]);
  await expect(page.locator('pre')).toHaveText('branch-B');
  await page.getByRole('button', { name: '編集', exact: true }).click();
  await expect(page.locator('.cm-content')).toBeVisible();
  const sharedB = await page.evaluate(async () => {
    const { getYFiles } = await import('/src/store.ts');
    return getYFiles()?.get('README.md')?.toString();
  });
  console.log(JSON.stringify({ sharedA, sharedB }));
  await page.getByRole('button', { name: '保存', exact: true }).click();
  await expect(page.getByText(/手動編集: README.md/).first()).toBeVisible();
  const all = await (await request.get(`${api}/api/rooms/${id}/nodes`, { headers })).json();
  const child = all.find((n: { parentId: string }) => n.parentId === nodes[1]);
  expect(child).toBeTruthy();
  const saved = await (await request.get(`${api}/api/rooms/${id}/snapshots/${child.id}`, { headers })).json();
  console.log(JSON.stringify({ branchBExpected: 'branch-B', branchBActuallySaved: saved.files['README.md'] }));
  expect(saved.files['README.md']).toBe('branch-B');
});
