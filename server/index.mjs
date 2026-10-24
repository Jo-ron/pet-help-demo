import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { createServer as createHttpServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { mkdirSync } from "node:fs";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { seedIfEmpty } from "./seed.mjs";

const ROOT = resolve(fileURLToPath(new URL("../", import.meta.url)));
const DEFAULT_DB = resolve(ROOT, ".data", "pet-help.sqlite");
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const CONTACT_WINDOW_MS = 60 * 60 * 1000;
const CONTENT_TERMS = ["刷单", "刷流水", "高额返利", "私下转账", "保证找回", "辱骂", "身份证号码"];
const POST_TABLES = Object.freeze({ find: "find_posts", help: "help_posts", goods: "goods_posts" });
const MIME_TYPES = Object.freeze({
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp"
});

function createDatabase(path) {
  const db = new DatabaseSync(path);
  db.exec("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;");
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      wechat_openid TEXT UNIQUE,
      wechat_unionid TEXT,
      display_name TEXT NOT NULL DEFAULT '社区用户',
      avatar_url TEXT,
      account_status TEXT NOT NULL DEFAULT 'normal',
      restriction_type TEXT,
      restricted_until TEXT,
      account_status_reason TEXT,
      real_name_status TEXT NOT NULL DEFAULT 'unverified',
      real_name_verified_at TEXT,
      last_login_at TEXT,
      deleted_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS find_posts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      pet_name TEXT NOT NULL,
      breed TEXT NOT NULL,
      color_or_features TEXT NOT NULL,
      age TEXT,
      lost_at TEXT NOT NULL,
      lost_location TEXT NOT NULL,
      location_detail TEXT,
      description TEXT NOT NULL,
      reward TEXT,
      contact_note TEXT,
      image_refs TEXT NOT NULL DEFAULT '[]',
      contact_phone TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      expires_at TEXT NOT NULL,
      resolved_at TEXT,
      removed_reason TEXT,
      deleted_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS help_posts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      help_type TEXT NOT NULL,
      pet_type TEXT NOT NULL,
      pet_description TEXT,
      start_at TEXT NOT NULL,
      end_at TEXT NOT NULL,
      location_area TEXT NOT NULL,
      description TEXT NOT NULL,
      image_refs TEXT NOT NULL DEFAULT '[]',
      contact_phone TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      expires_at TEXT NOT NULL,
      removed_reason TEXT,
      deleted_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS goods_posts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      price REAL,
      is_free INTEGER NOT NULL DEFAULT 0,
      condition_level TEXT NOT NULL,
      description TEXT NOT NULL,
      location_area TEXT NOT NULL,
      image_refs TEXT NOT NULL DEFAULT '[]',
      contact_phone TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      expires_at TEXT NOT NULL,
      removed_reason TEXT,
      deleted_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS favorites (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      post_type TEXT NOT NULL,
      post_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(user_id, post_type, post_id)
    );

    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      reporter_user_id TEXT NOT NULL REFERENCES users(id),
      post_type TEXT NOT NULL,
      post_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      handler_id TEXT REFERENCES users(id),
      handled_at TEXT,
      handling_note TEXT,
      created_at TEXT NOT NULL,
      UNIQUE(reporter_user_id, post_type, post_id)
    );

    CREATE TABLE IF NOT EXISTS moderation_actions (
      id TEXT PRIMARY KEY,
      target_user_id TEXT NOT NULL REFERENCES users(id),
      target_post_type TEXT,
      target_post_id TEXT,
      action_type TEXT NOT NULL,
      reason TEXT NOT NULL,
      evidence_summary TEXT,
      start_at TEXT NOT NULL,
      end_at TEXT,
      operator_id TEXT NOT NULL REFERENCES users(id),
      appeal_status TEXT,
      appeal_note TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS contact_accesses (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      post_type TEXT NOT NULL,
      post_id TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS contact_tickets (
      token_hash TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      post_type TEXT NOT NULL,
      post_id TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      redeemed_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS analytics_events (
      event_id TEXT PRIMARY KEY,
      event_name TEXT NOT NULL,
      user_id TEXT REFERENCES users(id),
      properties_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_find_public ON find_posts(status, expires_at, created_at);
    CREATE INDEX IF NOT EXISTS idx_help_public ON help_posts(status, expires_at, created_at);
    CREATE INDEX IF NOT EXISTS idx_goods_public ON goods_posts(status, expires_at, created_at);
    CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status, created_at);
    CREATE INDEX IF NOT EXISTS idx_contact_user_time ON contact_accesses(user_id, created_at);
  `);
  return db;
}

function jsonResponse(response, status, body, extraHeaders = {}) {
  response.writeHead(status, {
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
    ...extraHeaders
  });
  response.end(JSON.stringify(body));
}

function errorResponse(response, status, code, message, details) {
  jsonResponse(response, status, { error: { code, message, ...(details ? { details } : {}) } });
}

function nowIso() {
  return new Date().toISOString();
}

function id() {
  return randomBytes(16).toString("hex");
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function sameSecret(left, right) {
  const a = Buffer.from(left || "");
  const b = Buffer.from(right || "");
  return a.length === b.length && timingSafeEqual(a, b);
}

function normalizeText(value) {
  return String(value || "").normalize("NFKC").toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, "");
}

function text(value, field, { required = false, max = 2000 } = {}) {
  if (typeof value !== "string") {
    if (required) throw new ApiError(400, "invalid_field", `${field} 必须为文本`);
    return null;
  }
  const result = value.trim();
  if (required && !result) throw new ApiError(400, "required_field", `${field} 为必填项`);
  if (result.length > max) throw new ApiError(400, "field_too_long", `${field} 超出长度限制`);
  return result || null;
}

function dateTime(value, field, { required = false } = {}) {
  const result = text(value, field, { required, max: 40 });
  if (!result) return null;
  const date = new Date(result);
  if (Number.isNaN(date.getTime())) throw new ApiError(400, "invalid_datetime", `${field} 日期格式不正确`);
  return date.toISOString();
}

function phoneNumber(value) {
  const result = text(value, "contact_phone", { required: true, max: 24 });
  if (!/^\+?[0-9][0-9 -]{6,19}$/.test(result)) throw new ApiError(400, "invalid_contact", "联系方式格式不正确");
  return result;
}

function imageRefs(value) {
  if (value === undefined) return "[]";
  if (!Array.isArray(value) || value.length > 8 || value.some(item => typeof item !== "string" || item.length > 500)) {
    throw new ApiError(400, "invalid_images", "图片资源列表格式不正确");
  }
  return JSON.stringify(value);
}

function validateContent(values) {
  const content = normalizeText(Object.values(values).filter(value => typeof value === "string").join(" "));
  if (CONTENT_TERMS.some(term => content.includes(normalizeText(term)))) {
    throw new ApiError(422, "content_rejected", "内容包含不适宜信息，请修改后重试");
  }
}

function publicUser(user) {
  return { id: user.id, display_name: user.display_name, avatar_url: user.avatar_url };
}

function postTable(type) {
  const table = POST_TABLES[type];
  if (!table) throw new ApiError(400, "invalid_post_type", "帖子类型不支持");
  return table;
}

function postFromRow(type, row, owner = null) {
  if (!row) return null;
  const result = {
    id: row.id,
    post_type: type,
    status: row.status,
    expires_at: row.expires_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    images: JSON.parse(row.image_refs || "[]"),
    owner: owner ? publicUser(owner) : undefined,
    can_contact: row.status === "active" && new Date(row.expires_at).getTime() > Date.now()
  };
  const hidden = new Set(["contact_phone", "image_refs", "user_id"]);
  for (const [key, value] of Object.entries(row)) {
    if (!hidden.has(key) && !["id", "status", "expires_at", "created_at", "updated_at"].includes(key)) result[key] = value;
  }
  return result;
}

class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function activeUser(db, userId) {
  const user = db.prepare("SELECT * FROM users WHERE id = ? AND deleted_at IS NULL").get(userId);
  if (!user) throw new ApiError(401, "user_not_found", "账号不存在或不可用");
  return user;
}

function assertCanPublish(user) {
  if (user.account_status === "banned") throw new ApiError(403, "account_banned", "账号当前不可发布");
  if (user.account_status === "restricted" && user.restricted_until && new Date(user.restricted_until).getTime() > Date.now()) {
    throw new ApiError(403, "account_restricted", "账号暂时受限", { restricted_until: user.restricted_until });
  }
}

function assertNotBanned(user) {
  if (user.account_status === "banned") throw new ApiError(403, "account_banned", "账号当前不可使用该功能");
}

function authUser(db, request) {
  const header = request.headers.authorization || "";
  const match = /^Bearer\s+([A-Za-z0-9_-]{32,})$/.exec(header);
  if (!match) throw new ApiError(401, "auth_required", "请先登录");
  const tokenHash = sha256(match[1]);
  const session = db.prepare("SELECT user_id, expires_at FROM sessions WHERE token_hash = ?").get(tokenHash);
  if (!session || new Date(session.expires_at).getTime() <= Date.now()) {
    if (session) db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(tokenHash);
    throw new ApiError(401, "invalid_session", "登录已失效，请重新登录");
  }
  return activeUser(db, session.user_id);
}

async function readBody(request, maxBytes = 64 * 1024) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxBytes) throw new ApiError(413, "payload_too_large", "请求内容过大");
    chunks.push(chunk);
  }
  if (!size) return {};
  try {
    const value = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!value || Array.isArray(value) || typeof value !== "object") throw new Error("object required");
    return value;
  } catch {
    throw new ApiError(400, "invalid_json", "请求必须是有效的 JSON 对象");
  }
}

function issueSession(db, userId) {
  const token = randomBytes(32).toString("base64url");
  const createdAt = nowIso();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  db.prepare("INSERT INTO sessions(token_hash, user_id, expires_at, created_at) VALUES(?, ?, ?, ?)")
    .run(sha256(token), userId, expiresAt, createdAt);
  return { access_token: token, token_type: "Bearer", expires_at: expiresAt };
}

function createOrUpdateUser(db, { openid = null, unionid = null, displayName = "社区用户", avatarUrl = null }) {
  const existing = openid ? db.prepare("SELECT * FROM users WHERE wechat_openid = ?").get(openid) : null;
  const timestamp = nowIso();
  if (existing) {
    db.prepare("UPDATE users SET wechat_unionid = COALESCE(?, wechat_unionid), last_login_at = ?, updated_at = ? WHERE id = ?")
      .run(unionid, timestamp, timestamp, existing.id);
    return db.prepare("SELECT * FROM users WHERE id = ?").get(existing.id);
  }
  const userId = id();
  db.prepare(`INSERT INTO users(id, wechat_openid, wechat_unionid, display_name, avatar_url, last_login_at, created_at, updated_at)
    VALUES(?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(userId, openid, unionid, displayName.slice(0, 80), avatarUrl, timestamp, timestamp, timestamp);
  return db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
}

function createPost(db, user, type, body, duplicateState) {
  const now = nowIso();
  const postId = id();
  const contact = phoneNumber(body.contact_phone);
  let values;
  let columns;
  let expiresAt;
  let title;

  if (type === "find") {
    values = {
      pet_name: text(body.pet_name, "pet_name", { required: true, max: 80 }),
      breed: text(body.breed, "breed", { required: true, max: 100 }),
      color_or_features: text(body.color_or_features, "color_or_features", { required: true, max: 500 }),
      age: text(body.age, "age", { max: 80 }),
      lost_at: dateTime(body.lost_at, "lost_at", { required: true }),
      lost_location: text(body.lost_location, "lost_location", { required: true, max: 180 }),
      location_detail: text(body.location_detail, "location_detail", { max: 250 }),
      description: text(body.description, "description", { required: true, max: 3000 }),
      reward: text(body.reward, "reward", { max: 300 }),
      contact_note: text(body.contact_note, "contact_note", { max: 300 }),
      image_refs: imageRefs(body.image_refs)
    };
    title = values.pet_name;
    expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    columns = ["pet_name", "breed", "color_or_features", "age", "lost_at", "lost_location", "location_detail", "description", "reward", "contact_note", "image_refs"];
  } else if (type === "help") {
    const startAt = dateTime(body.start_at, "start_at", { required: true });
    const endAt = dateTime(body.end_at, "end_at", { required: true });
    if (new Date(startAt).getTime() >= new Date(endAt).getTime()) throw new ApiError(400, "invalid_time_range", "互助开始时间必须早于结束时间");
    if (new Date(endAt).getTime() <= Date.now()) throw new ApiError(400, "help_already_ended", "已结束的互助需求不能发布为有效内容");
    values = {
      help_type: text(body.help_type, "help_type", { required: true, max: 40 }),
      pet_type: text(body.pet_type, "pet_type", { required: true, max: 100 }),
      pet_description: text(body.pet_description, "pet_description", { max: 1000 }),
      start_at: startAt,
      end_at: endAt,
      location_area: text(body.location_area, "location_area", { required: true, max: 180 }),
      description: text(body.description, "description", { required: true, max: 3000 }),
      image_refs: imageRefs(body.image_refs)
    };
    title = values.pet_type + " " + values.start_at;
    expiresAt = endAt;
    columns = ["help_type", "pet_type", "pet_description", "start_at", "end_at", "location_area", "description", "image_refs"];
  } else {
    const isFree = body.is_free === true;
    const price = isFree ? null : body.price;
    if (!isFree && (typeof price !== "number" || !Number.isFinite(price) || price < 0 || price > 10000000)) throw new ApiError(400, "invalid_price", "商品价格不正确");
    values = {
      title: text(body.title, "title", { required: true, max: 120 }),
      category: text(body.category, "category", { required: true, max: 60 }),
      price,
      is_free: isFree ? 1 : 0,
      condition_level: text(body.condition_level, "condition_level", { required: true, max: 40 }),
      description: text(body.description, "description", { required: true, max: 3000 }),
      location_area: text(body.location_area, "location_area", { required: true, max: 180 }),
      image_refs: imageRefs(body.image_refs)
    };
    title = values.title;
    expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    columns = ["title", "category", "price", "is_free", "condition_level", "description", "location_area", "image_refs"];
  }

  validateContent(values);
  const duplicateTitle = normalizeText(title);
  const recent = db.prepare(`SELECT ${type === "find" ? "pet_name" : type === "help" ? "pet_type" : "title"} AS title
    FROM ${postTable(type)} WHERE user_id = ? AND status = 'active' AND created_at >= ?`).all(user.id, new Date(Date.now() - 10 * 60 * 1000).toISOString());
  if (recent.some(item => normalizeText(item.title) === duplicateTitle)) throw new ApiError(409, "duplicate_post", "检测到近期相似帖子，请检查已有内容");
  const count = db.prepare(`SELECT COUNT(*) AS count FROM ${postTable(type)} WHERE user_id = ? AND created_at >= ?`)
    .get(user.id, new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()).count;
  if (count >= 3) throw new ApiError(429, "publish_limit", "该类型帖子已达到每日发布上限");

  const insertColumns = ["id", "user_id", ...columns, "contact_phone", "status", "expires_at", "created_at", "updated_at"];
  const insertValues = [postId, user.id, ...columns.map(column => values[column]), contact, "active", expiresAt, now, now];
  const placeholders = insertColumns.map(() => "?").join(", ");
  db.prepare(`INSERT INTO ${postTable(type)}(${insertColumns.join(", ")}) VALUES(${placeholders})`).run(...insertValues);
  return { id: postId, post_type: type, status: "active", created_at: now, expires_at: expiresAt };
}

function getPost(db, type, postId) {
  const table = postTable(type);
  const row = db.prepare(`SELECT * FROM ${table} WHERE id = ? AND deleted_at IS NULL`).get(postId);
  if (!row) throw new ApiError(404, "post_not_found", "帖子不存在或已删除");
  return row;
}

function expirePostIfNeeded(db, type, row) {
  if (row.status === "active" && new Date(row.expires_at).getTime() <= Date.now()) {
    const timestamp = nowIso();
    db.prepare(`UPDATE ${postTable(type)} SET status = 'expired', updated_at = ? WHERE id = ? AND status = 'active'`).run(timestamp, row.id);
    row.status = "expired";
    row.updated_at = timestamp;
  }
  return row;
}

function parseLimit(value) {
  const number = Number(value || 20);
  return Number.isInteger(number) ? Math.max(1, Math.min(number, 50)) : 20;
}

function requireAdmin(request, adminToken) {
  const supplied = request.headers["x-admin-token"];
  if (!adminToken || typeof supplied !== "string" || !sameSecret(supplied, adminToken)) throw new ApiError(403, "admin_required", "需要维护者权限");
}

function safeEventProperties(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new ApiError(400, "invalid_event_properties", "事件属性格式不正确");
  const forbidden = /phone|openid|token|secret|address|location_detail|description|content|body|image|avatar|email|name/i;
  const result = {};
  for (const [key, value] of Object.entries(input)) {
    if (forbidden.test(key)) throw new ApiError(400, "sensitive_event_property", "事件中不能包含个人信息或内容原文");
    if (!/^[a-z][a-z0-9_]{0,39}$/i.test(key)) throw new ApiError(400, "invalid_event_property", "事件属性名不合法");
    if (!(typeof value === "string" || typeof value === "number" || typeof value === "boolean" || value === null)) {
      throw new ApiError(400, "invalid_event_property", "事件属性值必须是基础类型");
    }
    result[key] = typeof value === "string" ? value.slice(0, 120) : value;
  }
  return result;
}

function createBackend(options = {}) {
  const databasePath = options.databasePath || process.env.PET_HELP_DB || DEFAULT_DB;
  if (databasePath !== ":memory:") {
    const directory = resolve(databasePath, "..");
    mkdirSync(directory, { recursive: true });
  }
  const db = createDatabase(databasePath);
  if (databasePath !== ":memory:") seedIfEmpty(db);
  const demoAuthEnabled = options.demoAuthEnabled ?? process.env.NODE_ENV !== "production";
  const adminToken = options.adminToken ?? process.env.PET_HELP_ADMIN_TOKEN ?? "";
  const wechatAppId = options.wechatAppId ?? process.env.WECHAT_APP_ID ?? "";
  const wechatAppSecret = options.wechatAppSecret ?? process.env.WECHAT_APP_SECRET ?? "";

  async function handler(request, response) {
    const requestUrl = new URL(request.url, "http://localhost");
    const path = requestUrl.pathname.replace(/\/$/, "") || "/";
    const method = request.method || "GET";
    try {
      if (path === "/api/v1/health" && method === "GET") {
        return jsonResponse(response, 200, { status: "ok", storage: "sqlite", wechat_auth_configured: Boolean(wechatAppId && wechatAppSecret) });
      }

      if (path === "/api/v1/auth/demo" && method === "POST") {
        if (!demoAuthEnabled) throw new ApiError(404, "not_found", "接口不存在");
        const body = await readBody(request);
        const displayName = text(body.display_name, "display_name", { max: 80 }) || "本机演示用户";
        const user = createOrUpdateUser(db, { displayName });
        return jsonResponse(response, 201, { ...issueSession(db, user.id), user: publicUser(user), auth_mode: "development_demo" });
      }

      if (path === "/api/v1/auth/wechat" && method === "POST") {
        if (!wechatAppId || !wechatAppSecret) throw new ApiError(503, "wechat_auth_unconfigured", "微信登录尚未配置 AppID 和 AppSecret");
        const body = await readBody(request);
        const code = text(body.code, "code", { required: true, max: 256 });
        const wxUrl = new URL("https://api.weixin.qq.com/sns/jscode2session");
        wxUrl.search = new URLSearchParams({ appid: wechatAppId, secret: wechatAppSecret, js_code: code, grant_type: "authorization_code" }).toString();
        const wxResponse = await fetch(wxUrl, { signal: AbortSignal.timeout(8000) });
        if (!wxResponse.ok) throw new ApiError(502, "wechat_upstream_error", "微信登录服务暂不可用");
        const result = await wxResponse.json();
        if (result.errcode || !result.openid) throw new ApiError(401, "wechat_code_invalid", "微信登录凭证无效或已过期");
        const user = createOrUpdateUser(db, { openid: result.openid, unionid: result.unionid || null });
        return jsonResponse(response, 200, { ...issueSession(db, user.id), user: publicUser(user), auth_mode: "wechat" });
      }

      if (path === "/api/v1/auth/me" && method === "GET") {
        const user = authUser(db, request);
        return jsonResponse(response, 200, { user: publicUser(user), account_status: user.account_status, real_name_status: user.real_name_status });
      }

      if (path === "/api/v1/auth/logout" && method === "POST") {
        authUser(db, request);
        const token = request.headers.authorization.slice(7);
        db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(sha256(token));
        return jsonResponse(response, 200, { logged_out: true });
      }

      if (path === "/api/v1/events" && method === "POST") {
        const body = await readBody(request);
        const eventName = text(body.event_name, "event_name", { required: true, max: 60 });
        const eventId = text(body.event_id, "event_id", { required: true, max: 80 });
        const allowed = new Set(["login_start", "login_result", "publish_result", "duplicate_post_detected", "keyword_filter_result", "favorite_change", "contact_flow", "report_submit", "report_handled", "post_status_change", "account_restriction_change"]);
        if (!allowed.has(eventName)) throw new ApiError(400, "unknown_event", "事件名称不在允许列表中");
        const user = request.headers.authorization ? authUser(db, request) : null;
        const properties = safeEventProperties(body.properties || {});
        try {
          db.prepare("INSERT INTO analytics_events(event_id, event_name, user_id, properties_json, created_at) VALUES(?, ?, ?, ?, ?)")
            .run(eventId, eventName, user?.id || null, JSON.stringify(properties), nowIso());
        } catch (error) {
          if (String(error).includes("UNIQUE")) return jsonResponse(response, 200, { accepted: true, duplicate: true });
          throw error;
        }
        return jsonResponse(response, 202, { accepted: true });
      }

      const postCollection = /^\/api\/v1\/posts\/(find|help|goods)$/.exec(path);
      if (postCollection && method === "GET") {
        const type = postCollection[1];
        const table = postTable(type);
        const limit = parseLimit(requestUrl.searchParams.get("limit"));
        const offset = Math.max(0, Number.parseInt(requestUrl.searchParams.get("offset") || "0", 10) || 0);
        const category = requestUrl.searchParams.get("category");
        const parameters = [nowIso()];
        let filter = "status = 'active' AND deleted_at IS NULL AND expires_at > ?";
        if (category && type === "goods") { filter += " AND category = ?"; parameters.push(category); }
        const rows = db.prepare(`SELECT * FROM ${table} WHERE ${filter} ORDER BY created_at DESC LIMIT ? OFFSET ?`).all(...parameters, limit + 1, offset);
        const hasMore = rows.length > limit;
        const items = rows.slice(0, limit).map(row => {
          const owner = db.prepare("SELECT id, display_name, avatar_url FROM users WHERE id = ?").get(row.user_id);
          return postFromRow(type, row, owner);
        });
        return jsonResponse(response, 200, { items, page: { limit, offset, has_more: hasMore, next_offset: hasMore ? offset + limit : null } });
      }

      const postDetail = /^\/api\/v1\/posts\/(find|help|goods)\/([a-f0-9-]+)$/.exec(path);
      if (postDetail && method === "GET") {
        const [, type, postId] = postDetail;
        const row = expirePostIfNeeded(db, type, getPost(db, type, postId));
        const user = request.headers.authorization ? authUser(db, request) : null;
        if (row.status !== "active" && (!user || row.user_id !== user.id)) throw new ApiError(404, "post_not_found", "帖子不存在或不可见");
        const owner = db.prepare("SELECT id, display_name, avatar_url FROM users WHERE id = ?").get(row.user_id);
        return jsonResponse(response, 200, { post: postFromRow(type, row, owner) });
      }

      const postCreate = /^\/api\/v1\/posts\/(find|help|goods)$/.exec(path);
      if (postCreate && method === "POST") {
        const user = authUser(db, request);
        assertCanPublish(user);
        const body = await readBody(request);
        const result = createPost(db, user, postCreate[1], body);
        return jsonResponse(response, 201, { post: result });
      }

      const postUpdate = /^\/api\/v1\/posts\/(find|help|goods)\/([a-f0-9-]+)$/.exec(path);
      if (postUpdate && method === "PATCH") {
        const user = authUser(db, request);
        const [, type, postId] = postUpdate;
        const row = getPost(db, type, postId);
        if (row.user_id !== user.id) throw new ApiError(403, "not_post_owner", "只能管理自己发布的帖子");
        const body = await readBody(request);
        const allowedStatuses = type === "find" ? ["active", "resolved", "closed", "deleted"] : ["active", "closed", "deleted"];
        if (!allowedStatuses.includes(body.status)) throw new ApiError(400, "invalid_status", "帖子状态不支持");
        if (body.status === "active") {
          if (new Date(row.expires_at).getTime() <= Date.now()) throw new ApiError(409, "post_expired", "帖子已过期，不能恢复");
          if (!["deleted", "resolved", "closed"].includes(row.status)) throw new ApiError(409, "invalid_transition", "当前帖子状态不能恢复");
          if (Date.now() - new Date(row.updated_at).getTime() > 24 * 60 * 60 * 1000) throw new ApiError(409, "undo_window_expired", "撤销期限已过");
        }
        const timestamp = nowIso();
        db.prepare(`UPDATE ${postTable(type)} SET status = ?, resolved_at = ?, updated_at = ? WHERE id = ?`)
          .run(body.status, body.status === "resolved" ? timestamp : body.status === "active" && type === "find" ? null : row.resolved_at, timestamp, postId);
        return jsonResponse(response, 200, { post_id: postId, status: body.status, updated_at: timestamp });
      }

      const contactRoute = /^\/api\/v1\/posts\/(find|help|goods)\/([a-f0-9-]+)\/contact$/.exec(path);
      if (contactRoute && method === "POST") {
        const user = authUser(db, request);
        assertNotBanned(user);
        const [, type, postId] = contactRoute;
        const row = expirePostIfNeeded(db, type, getPost(db, type, postId));
        if (row.status !== "active" || new Date(row.expires_at).getTime() <= Date.now()) throw new ApiError(409, "post_unavailable", "帖子已失效，无法联系");
        if (row.user_id === user.id) throw new ApiError(403, "self_contact_denied", "不能获取自己发布帖子的联系方式");
        const body = await readBody(request);
        if (body.confirmed !== true) throw new ApiError(400, "contact_consent_required", "请先确认联系方式用途");
        const attempts = db.prepare("SELECT COUNT(*) AS count FROM contact_accesses WHERE user_id = ? AND created_at >= ?").get(user.id, new Date(Date.now() - CONTACT_WINDOW_MS).toISOString()).count;
        const postAttempts = db.prepare("SELECT COUNT(*) AS count FROM contact_accesses WHERE user_id = ? AND post_type = ? AND post_id = ? AND created_at >= ?")
          .get(user.id, type, postId, new Date(Date.now() - CONTACT_WINDOW_MS).toISOString()).count;
        if (attempts >= 10 || postAttempts >= 3) throw new ApiError(429, "contact_rate_limited", "联系次数已达上限，请稍后再试");
        const recordId = id();
        const timestamp = nowIso();
        const contactToken = randomBytes(32).toString("base64url");
        const ticketExpiry = new Date(Date.now() + 30 * 1000).toISOString();
        db.prepare("INSERT INTO contact_accesses(id, user_id, post_type, post_id, created_at) VALUES(?, ?, ?, ?, ?)")
          .run(recordId, user.id, type, postId, timestamp);
        db.prepare("INSERT INTO contact_tickets(token_hash, user_id, post_type, post_id, expires_at, created_at) VALUES(?, ?, ?, ?, ?, ?)")
          .run(sha256(contactToken), user.id, type, postId, ticketExpiry, timestamp);
        return jsonResponse(response, 200, { post_type: type, post_id: postId, contact_token: contactToken, expires_at: ticketExpiry });
      }

      if (path === "/api/v1/contact-tickets/redeem" && method === "POST") {
        const user = authUser(db, request);
        const body = await readBody(request);
        const contactToken = text(body.contact_token, "contact_token", { required: true, max: 100 });
        const ticketHash = sha256(contactToken);
        const timestamp = nowIso();
        db.exec("BEGIN IMMEDIATE");
        try {
          const ticket = db.prepare(`SELECT * FROM contact_tickets WHERE token_hash = ? AND user_id = ? AND redeemed_at IS NULL AND expires_at > ?`)
            .get(ticketHash, user.id, timestamp);
          if (!ticket) throw new ApiError(410, "contact_ticket_expired", "联系凭证无效、已过期或已使用");
          const row = expirePostIfNeeded(db, ticket.post_type, getPost(db, ticket.post_type, ticket.post_id));
          if (row.status !== "active" || new Date(row.expires_at).getTime() <= Date.now()) throw new ApiError(409, "post_unavailable", "帖子已失效，无法联系");
          const redeemed = db.prepare("UPDATE contact_tickets SET redeemed_at = ? WHERE token_hash = ? AND user_id = ? AND redeemed_at IS NULL AND expires_at > ?")
            .run(timestamp, ticketHash, user.id, timestamp);
          if (redeemed.changes !== 1) throw new ApiError(410, "contact_ticket_expired", "联系凭证无效、已过期或已使用");
          db.exec("COMMIT");
          return jsonResponse(response, 200, { post_type: ticket.post_type, post_id: ticket.post_id, contact_phone: row.contact_phone, redeemed_at: timestamp });
        } catch (error) {
          db.exec("ROLLBACK");
          throw error;
        }
      }

      const favoriteItem = /^\/api\/v1\/favorites\/(find|help|goods)\/([a-f0-9-]+)$/.exec(path);
      if (favoriteItem && (method === "PUT" || method === "DELETE")) {
        const user = authUser(db, request);
        assertNotBanned(user);
        const [, type, postId] = favoriteItem;
        if (method === "PUT") {
          const row = expirePostIfNeeded(db, type, getPost(db, type, postId));
          if (row.status !== "active") throw new ApiError(409, "post_unavailable", "仅可收藏有效帖子");
          db.prepare("INSERT INTO favorites(id, user_id, post_type, post_id, created_at) VALUES(?, ?, ?, ?, ?) ON CONFLICT(user_id, post_type, post_id) DO NOTHING")
            .run(id(), user.id, type, postId, nowIso());
          return jsonResponse(response, 200, { post_type: type, post_id: postId, is_favorite: true });
        }
        db.prepare("DELETE FROM favorites WHERE user_id = ? AND post_type = ? AND post_id = ?").run(user.id, type, postId);
        return jsonResponse(response, 200, { post_type: type, post_id: postId, is_favorite: false });
      }

      if (path === "/api/v1/me/posts" && method === "GET") {
        const user = authUser(db, request);
        const typeFilter = requestUrl.searchParams.get("type");
        const typeNames = typeFilter ? [typeFilter] : Object.keys(POST_TABLES);
        typeNames.forEach(postTable);
        const items = [];
        for (const type of typeNames) {
          const rows = db.prepare(`SELECT * FROM ${postTable(type)} WHERE user_id = ? AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 100`).all(user.id);
          rows.forEach(row => items.push(postFromRow(type, expirePostIfNeeded(db, type, row))));
        }
        items.sort((a, b) => b.created_at.localeCompare(a.created_at));
        return jsonResponse(response, 200, { items });
      }

      if (path === "/api/v1/me/favorites" && method === "GET") {
        const user = authUser(db, request);
        const rows = db.prepare("SELECT post_type, post_id, created_at FROM favorites WHERE user_id = ? ORDER BY created_at DESC LIMIT 100").all(user.id);
        const items = [];
        for (const favorite of rows) {
          try {
            const post = getPost(db, favorite.post_type, favorite.post_id);
            const owner = db.prepare("SELECT id, display_name, avatar_url FROM users WHERE id = ?").get(post.user_id);
            items.push({ ...postFromRow(favorite.post_type, expirePostIfNeeded(db, favorite.post_type, post), owner), favorited_at: favorite.created_at });
          } catch (error) {
            if (!(error instanceof ApiError) || error.status !== 404) throw error;
          }
        }
        return jsonResponse(response, 200, { items });
      }

      const reportRoute = /^\/api\/v1\/posts\/(find|help|goods)\/([a-f0-9-]+)\/reports$/.exec(path);
      if (reportRoute && method === "POST") {
        const user = authUser(db, request);
        const [, type, postId] = reportRoute;
        getPost(db, type, postId);
        const body = await readBody(request);
        const allowedReasons = new Set(["false_information", "harassment_or_scam", "prohibited_content", "privacy_exposure", "other"]);
        if (!allowedReasons.has(body.reason)) throw new ApiError(400, "invalid_report_reason", "举报原因不支持");
        const reportId = id();
        try {
          db.prepare("INSERT INTO reports(id, reporter_user_id, post_type, post_id, reason, description, created_at) VALUES(?, ?, ?, ?, ?, ?, ?)")
            .run(reportId, user.id, type, postId, body.reason, text(body.description, "description", { max: 1000 }), nowIso());
        } catch (error) {
          if (String(error).includes("UNIQUE")) throw new ApiError(409, "duplicate_report", "你已举报过该帖子");
          throw error;
        }
        return jsonResponse(response, 201, { report_id: reportId, status: "pending" });
      }

      if (path === "/api/v1/admin/reports" && method === "GET") {
        requireAdmin(request, adminToken);
        const status = requestUrl.searchParams.get("status") || "pending";
        const rows = db.prepare("SELECT * FROM reports WHERE status = ? ORDER BY created_at ASC LIMIT 100").all(status);
        return jsonResponse(response, 200, { items: rows.map(row => ({ id: row.id, post_type: row.post_type, post_id: row.post_id, reason: row.reason, description: row.description, status: row.status, created_at: row.created_at })) });
      }

      const reportHandle = /^\/api\/v1\/admin\/reports\/([a-f0-9-]+)$/.exec(path);
      if (reportHandle && method === "PATCH") {
        requireAdmin(request, adminToken);
        const operator = authUser(db, request);
        const report = db.prepare("SELECT * FROM reports WHERE id = ?").get(reportHandle[1]);
        if (!report) throw new ApiError(404, "report_not_found", "举报记录不存在");
        const body = await readBody(request);
        const outcomes = new Set(["action_taken", "dismissed"]);
        if (!outcomes.has(body.outcome)) throw new ApiError(400, "invalid_outcome", "处理结果不支持");
        const note = text(body.note, "note", { required: true, max: 1000 });
        const timestamp = nowIso();
        if (body.outcome === "action_taken") {
          const table = postTable(report.post_type);
          db.prepare(`UPDATE ${table} SET status = 'removed', removed_reason = ?, updated_at = ? WHERE id = ?`).run(note, timestamp, report.post_id);
        }
        db.prepare("UPDATE reports SET status = ?, handler_id = ?, handled_at = ?, handling_note = ? WHERE id = ?")
          .run(body.outcome, operator.id, timestamp, note, report.id);
        db.prepare(`INSERT INTO moderation_actions(id, target_user_id, target_post_type, target_post_id, action_type, reason, start_at, operator_id, created_at)
          VALUES(?, (SELECT user_id FROM ${postTable(report.post_type)} WHERE id = ?), ?, ?, ?, ?, ?, ?, ?)`)
          .run(id(), report.post_id, report.post_type, report.post_id, body.outcome, note, timestamp, operator.id, timestamp);
        return jsonResponse(response, 200, { report_id: report.id, status: body.outcome, handled_at: timestamp });
      }

      if (path === "/api/v1/admin/users/restrictions" && method === "POST") {
        requireAdmin(request, adminToken);
        const operator = authUser(db, request);
        const body = await readBody(request);
        const target = db.prepare("SELECT * FROM users WHERE id = ?").get(text(body.user_id, "user_id", { required: true, max: 64 }));
        if (!target) throw new ApiError(404, "user_not_found", "用户不存在");
        const action = text(body.action_type, "action_type", { required: true, max: 32 });
        if (!["warning", "restrict_publish", "ban", "解除限制"].includes(action)) throw new ApiError(400, "invalid_action", "处罚类型不支持");
        const reason = text(body.reason, "reason", { required: true, max: 1000 });
        const durationHours = action === "restrict_publish" ? Math.min(Math.max(Number(body.duration_hours) || 24, 1), 24 * 30) : null;
        const timestamp = nowIso();
        const status = action === "ban" ? "banned" : action === "解除限制" || action === "warning" ? "normal" : "restricted";
        const until = durationHours ? new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString() : null;
        db.prepare("UPDATE users SET account_status = ?, restriction_type = ?, restricted_until = ?, account_status_reason = ?, updated_at = ? WHERE id = ?")
          .run(status, status === "restricted" ? "publish" : status === "banned" ? "all" : null, until, reason, timestamp, target.id);
        db.prepare(`INSERT INTO moderation_actions(id, target_user_id, action_type, reason, start_at, end_at, operator_id, created_at)
          VALUES(?, ?, ?, ?, ?, ?, ?, ?)`)
          .run(id(), target.id, action, reason, timestamp, until, operator.id, timestamp);
        return jsonResponse(response, 200, { user_id: target.id, account_status: status, restricted_until: until });
      }

      if (method === "GET" && !path.startsWith("/api/")) {
        const targetPath = path === "/" ? "/index.html" : path;
        const target = resolve(ROOT, `.${targetPath}`);
        if (!target.startsWith(ROOT + sep) && target !== ROOT) throw new ApiError(403, "forbidden_path", "文件路径不可访问");
        const fileStat = await stat(target).catch(() => null);
        if (!fileStat?.isFile()) throw new ApiError(404, "file_not_found", "页面不存在");
        const content = await readFile(target);
        response.writeHead(200, { "Content-Type": MIME_TYPES[extname(target).toLowerCase()] || "application/octet-stream", "X-Content-Type-Options": "nosniff" });
        response.end(content);
        return;
      }

      throw new ApiError(404, "not_found", "接口不存在");
    } catch (error) {
      if (error instanceof ApiError) return errorResponse(response, error.status, error.code, error.message, error.details);
      if (error?.name === "TimeoutError" || error?.name === "AbortError") return errorResponse(response, 502, "upstream_timeout", "微信登录服务响应超时");
      console.error("request failed:", error);
      return errorResponse(response, 500, "internal_error", "服务暂时不可用");
    }
  }

  const server = createHttpServer((request, response) => { void handler(request, response); });
  return {
    server,
    db,
    close() {
      server.close();
      db.close();
    }
  };
}

export function createServer(options = {}) {
  return createBackend(options);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const host = process.env.HOST || "127.0.0.1";
  const port = Number(process.env.PORT || 8080);
  const backend = createBackend();
  backend.server.listen(port, host, () => {
    console.log(`邻里宠帮服务已启动：http://${host}:${port}`);
    console.log(`SQLite 数据库：${process.env.PET_HELP_DB || DEFAULT_DB}`);
    if (!process.env.WECHAT_APP_ID || !process.env.WECHAT_APP_SECRET) console.log("微信登录未配置；本地开发演示登录已启用");
  });
  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, () => backend.close());
  }
}