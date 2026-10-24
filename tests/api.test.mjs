import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createServer } from "../server/index.mjs";

const backend = createServer({ databasePath: ":memory:", demoAuthEnabled: true, adminToken: "test-maintainer-token" });
let baseUrl;
let token;
let userId;
let postId;
let serverHandle;

async function request(path, { method = "GET", body, bearer = token } = {}) {
  const response = await fetch(baseUrl + path, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(bearer ? { Authorization: `Bearer ${bearer}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await response.json();
  return { response, data };
}

async function adminRequest(path, { method = "GET", body, bearer = token } = {}) {
  const response = await fetch(baseUrl + path, {
    method,
    headers: {
      Authorization: `Bearer ${bearer}`,
      "X-Admin-Token": "test-maintainer-token",
      ...(body ? { "Content-Type": "application/json" } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  return { response, data: await response.json() };
}

before(async () => {
  await new Promise(resolve => backend.server.listen(0, "127.0.0.1", resolve));
  serverHandle = backend.server.address();
  baseUrl = `http://127.0.0.1:${serverHandle.port}`;
  const login = await request("/api/v1/auth/demo", { method: "POST", body: { display_name: "测试用户" }, bearer: null });
  assert.equal(login.response.status, 201);
  token = login.data.access_token;
  userId = login.data.user.id;
});

after(() => backend.close());

test("health endpoint reports SQLite storage", async () => {
  const { response, data } = await request("/api/v1/health", { bearer: null });
  assert.equal(response.status, 200);
  assert.equal(data.storage, "sqlite");
});

test("publishes a find post and never exposes phone in public reads", async () => {
  const created = await request("/api/v1/posts/find", {
    method: "POST",
    body: {
      pet_name: "测试猫",
      breed: "短毛猫",
      color_or_features: "白色胸口",
      lost_at: new Date().toISOString(),
      lost_location: "测试区域",
      description: "集成测试帖子",
      contact_phone: "13800138000"
    }
  });
  assert.equal(created.response.status, 201);
  postId = created.data.post.id;
  const list = await request("/api/v1/posts/find", { bearer: null });
  const item = list.data.items.find(post => post.id === postId);
  assert.ok(item);
  assert.equal(Object.hasOwn(item, "contact_phone"), false);
  assert.equal(item.can_contact, true);
});

test("requires authentication for creating a post", async () => {
  const { response, data } = await request("/api/v1/posts/goods", { method: "POST", bearer: null, body: {} });
  assert.equal(response.status, 401);
  assert.equal(data.error.code, "auth_required");
});

test("favorite is idempotent and appears in my favorites", async () => {
  const path = `/api/v1/favorites/find/${postId}`;
  assert.equal((await request(path, { method: "PUT" })).response.status, 200);
  assert.equal((await request(path, { method: "PUT" })).response.status, 200);
  const favorites = await request("/api/v1/me/favorites");
  assert.equal(favorites.data.items.filter(item => item.id === postId).length, 1);
  assert.equal((await request(path, { method: "DELETE" })).data.is_favorite, false);
});

test("owner can undo a soft delete within 24 hours", async () => {
  const path = `/api/v1/posts/find/${postId}`;
  assert.equal((await request(path, { method: "PATCH", body: { status: "deleted" } })).response.status, 200);
  const mine = await request("/api/v1/me/posts");
  assert.equal(mine.data.items.find(item => item.id === postId).status, "deleted");
  const hidden = await request("/api/v1/posts/find", { bearer: null });
  assert.equal(hidden.data.items.some(item => item.id === postId), false);
  assert.equal((await request(path, { method: "PATCH", body: { status: "active" } })).response.status, 200);
  const restored = await request("/api/v1/posts/find", { bearer: null });
  assert.equal(restored.data.items.some(item => item.id === postId), true);
});

test("contact endpoint is protected and rate limited", async () => {
  const path = `/api/v1/posts/find/${postId}/contact`;
  const selfContact = await request(path, { method: "POST", body: { confirmed: true } });
  assert.equal(selfContact.response.status, 403);
  const secondLogin = await request("/api/v1/auth/demo", { method: "POST", body: { display_name: "测试邻居" }, bearer: null });
  const otherToken = secondLogin.data.access_token;
  const contact = await request(path, { method: "POST", bearer: otherToken, body: { confirmed: true } });
  assert.equal(contact.response.status, 200);
  assert.equal(typeof contact.data.contact_token, "string");
  assert.equal(Object.hasOwn(contact.data, "contact_phone"), false);
  const redeemed = await request("/api/v1/contact-tickets/redeem", { method: "POST", bearer: otherToken, body: { contact_token: contact.data.contact_token } });
  assert.equal(redeemed.response.status, 200);
  assert.equal(redeemed.data.contact_phone, "13800138000");
  const reused = await request("/api/v1/contact-tickets/redeem", { method: "POST", bearer: otherToken, body: { contact_token: contact.data.contact_token } });
  assert.equal(reused.response.status, 410);
  for (let index = 0; index < 2; index += 1) assert.equal((await request(path, { method: "POST", bearer: otherToken, body: { confirmed: true } })).response.status, 200);
  const limited = await request(path, { method: "POST", bearer: otherToken, body: { confirmed: true } });
  assert.equal(limited.response.status, 429);
});

test("owner can mark a post resolved and public list removes it", async () => {
  const update = await request(`/api/v1/posts/find/${postId}`, { method: "PATCH", body: { status: "resolved" } });
  assert.equal(update.response.status, 200);
  const list = await request("/api/v1/posts/find", { bearer: null });
  assert.equal(list.data.items.some(item => item.id === postId), false);
});

test("publish restriction blocks new posts but keeps account access", async () => {
  const targetLogin = await request("/api/v1/auth/demo", { method: "POST", body: { display_name: "受限用户" }, bearer: null });
  const targetToken = targetLogin.data.access_token;
  const post = await request("/api/v1/posts/find", {
    method: "POST",
    bearer: targetToken,
    body: {
      pet_name: "待删除宠物",
      breed: "猫",
      color_or_features: "黑色",
      lost_at: new Date().toISOString(),
      lost_location: "测试地点",
      description: "测试限发账号管理已有内容",
      contact_phone: "13900139000"
    }
  });
  assert.equal(post.response.status, 201);
  const restriction = await adminRequest("/api/v1/admin/users/restrictions", {
    method: "POST",
    body: { user_id: targetLogin.data.user.id, action_type: "restrict_publish", duration_hours: 1, reason: "测试限发" }
  });
  assert.equal(restriction.response.status, 200);
  assert.equal((await request("/api/v1/auth/me", { bearer: targetToken })).response.status, 200);
  const denied = await request("/api/v1/posts/find", {
    method: "POST",
    bearer: targetToken,
    body: {
      pet_name: "第二条帖子",
      breed: "猫",
      color_or_features: "白色",
      lost_at: new Date().toISOString(),
      lost_location: "测试地点",
      description: "受限用户不能新增帖子",
      contact_phone: "13900139001"
    }
  });
  assert.equal(denied.response.status, 403);
  const canDelete = await request(`/api/v1/posts/find/${post.data.post.id}`, { method: "PATCH", bearer: targetToken, body: { status: "deleted" } });
  assert.equal(canDelete.response.status, 200);
});

test("moderator can review a report and remove its post", async () => {
  const reporter = await request("/api/v1/auth/demo", { method: "POST", body: { display_name: "举报用户" }, bearer: null });
  const submitted = await request(`/api/v1/posts/find/${postId}/reports`, {
    method: "POST",
    bearer: reporter.data.access_token,
    body: { reason: "false_information", description: "测试举报" }
  });
  assert.equal(submitted.response.status, 201);
  const pending = await adminRequest("/api/v1/admin/reports");
  assert.equal(pending.data.items.some(item => item.id === submitted.data.report_id), true);
  const handled = await adminRequest(`/api/v1/admin/reports/${submitted.data.report_id}`, {
    method: "PATCH",
    body: { outcome: "action_taken", note: "测试下架" }
  });
  assert.equal(handled.response.status, 200);
  const publicList = await request("/api/v1/posts/find", { bearer: null });
  assert.equal(publicList.data.items.some(item => item.id === postId), false);
});

test("events reject personal data and deduplicate event ids", async () => {
  const eventId = "evt-test-unique";
  const rejected = await request("/api/v1/events", { method: "POST", body: { event_id: "evt-pii", event_name: "favorite_change", properties: { phone_number: "13800138000" } } });
  assert.equal(rejected.response.status, 400);
  const event = { event_id: eventId, event_name: "favorite_change", properties: { post_type: "find", action: "add" } };
  assert.equal((await request("/api/v1/events", { method: "POST", body: event })).response.status, 202);
  const duplicate = await request("/api/v1/events", { method: "POST", body: event });
  assert.equal(duplicate.response.status, 200);
  assert.equal(duplicate.data.duplicate, true);
});

test("Wechat login reports missing configuration explicitly", async () => {
  const { response, data } = await request("/api/v1/auth/wechat", { method: "POST", body: { code: "test-code" }, bearer: null });
  assert.equal(response.status, 503);
  assert.equal(data.error.code, "wechat_auth_unconfigured");
});