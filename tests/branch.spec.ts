import { test, expect } from "@playwright/test";

const API = "http://localhost:5181";

test.describe("分岐の独立性", () => {
  test("root分岐は兄弟の変更を含まない", async ({ request }) => {
    // room作成
    const room = await request.post(`${API}/api/rooms`, {
      data: { name: "branch-api", adapterKind: "code" },
    });
    const { id, joinToken } = await room.json();
    const headers = { "x-room-token": joinToken };

    // node1: rootから
    const n1 = await (await request.post(`${API}/api/rooms/${id}/nodes`, {
      headers, data: { parentId: null, prompt: "alpha file" },
    })).json();
    expect(n1.status).toBe("review");

    const snap1 = await (await request.get(`${API}/api/rooms/${id}/snapshots/${n1.id}`, { headers })).json();
    const files1 = Object.keys(snap1.files);

    // node2: rootから分岐（兄弟）
    const n2 = await (await request.post(`${API}/api/rooms/${id}/nodes`, {
      headers, data: { parentId: null, prompt: "bravo file" },
    })).json();
    const snap2 = await (await request.get(`${API}/api/rooms/${id}/snapshots/${n2.id}`, { headers })).json();
    const files2 = Object.keys(snap2.files);

    // node1で追加されたファイルがnode2に含まれない（独立している）
    const added1 = files1.filter((f) => !["README.md"].includes(f));
    expect(added1.length).toBeGreaterThan(0);
    for (const f of added1) {
      expect(files2).not.toContain(f);
    }
    console.log(`branch OK: node1 added ${added1.join(",")}, node2 files=${files2.join(",")}`);
  });
});
