const CONFIG_KEY = "site-config";
const ADMIN_PASSWORD_KEY = "admin-password";
const PASSWORD_MIN_LENGTH = 6;
const PASSWORD_MAX_LENGTH = 128;

const DEFAULT_CONFIG = {
  customerServiceId: "2379548014",
  contactUrl: "https://www.paopaomiyu.xyz/",
  downloadUrl: "https://www.paopaomiyu.xyz/",
  gameUrl: "https://h5.cggames.top/#/Main/home",
  siteTitle: "南宫承兑",
  logoUrl: "/images/logo.jpeg"
};

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store"
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: JSON_HEADERS
  });
}

function normalizeText(value, fallback, maxLength) {
  if (typeof value !== "string") {
    return fallback;
  }

  const text = value.trim();
  if (!text) {
    return fallback;
  }

  return text.slice(0, maxLength);
}

function normalizePublicUrl(value, fallback, allowedProtocols = ["http:", "https:"]) {
  const text = normalizeText(value, fallback, 500);

  try {
    const url = new URL(text);
    return allowedProtocols.includes(url.protocol) ? text : fallback;
  } catch {
    return fallback;
  }
}

function normalizeLogoUrl(value, fallback) {
  const text = normalizeText(value, fallback, 500);

  if (text.startsWith("/")) {
    return text;
  }

  return normalizePublicUrl(text, fallback);
}

function normalizePassword(value) {
  if (typeof value !== "string") {
    return null;
  }

  const password = value.trim();
  if (password.length < PASSWORD_MIN_LENGTH || password.length > PASSWORD_MAX_LENGTH) {
    return null;
  }

  return password;
}

function bytesToHex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function makeSalt() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

async function sha256Hex(text) {
  const buffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return bytesToHex(new Uint8Array(buffer));
}

async function createPasswordRecord(password) {
  const salt = makeSalt();
  return {
    version: 1,
    salt,
    hash: await sha256Hex(`${salt}:${password}`)
  };
}

function isPasswordRecord(record) {
  return record?.version === 1
    && typeof record.salt === "string"
    && typeof record.hash === "string"
    && record.salt.length > 0
    && record.hash.length > 0;
}

async function readStoredPassword(env) {
  if (!env.SITE_CONFIG) {
    return null;
  }

  const record = await env.SITE_CONFIG.get(ADMIN_PASSWORD_KEY, "json");
  return isPasswordRecord(record) ? record : null;
}

async function verifyAdminPassword(env, password) {
  if (typeof password !== "string" || !password) {
    return false;
  }

  const storedPassword = await readStoredPassword(env);
  if (storedPassword) {
    const hash = await sha256Hex(`${storedPassword.salt}:${password}`);
    return hash === storedPassword.hash;
  }

  return Boolean(env.ADMIN_PASSWORD) && password === env.ADMIN_PASSWORD;
}

function sanitizeConfig(config) {
  return {
    customerServiceId: normalizeText(config?.customerServiceId, DEFAULT_CONFIG.customerServiceId, 64),
    contactUrl: normalizePublicUrl(config?.contactUrl, DEFAULT_CONFIG.contactUrl, ["http:", "https:", "wangwang:"]),
    downloadUrl: normalizePublicUrl(config?.downloadUrl, DEFAULT_CONFIG.downloadUrl),
    gameUrl: normalizePublicUrl(config?.gameUrl, DEFAULT_CONFIG.gameUrl),
    siteTitle: normalizeText(config?.siteTitle, DEFAULT_CONFIG.siteTitle, 40),
    logoUrl: normalizeLogoUrl(config?.logoUrl, DEFAULT_CONFIG.logoUrl)
  };
}

function sanitizeAdminConfig(config, currentConfig) {
  return {
    ...currentConfig,
    customerServiceId: normalizeText(config?.customerServiceId, currentConfig.customerServiceId, 64),
    contactUrl: normalizePublicUrl(config?.contactUrl, currentConfig.contactUrl, ["http:", "https:", "wangwang:"]),
    downloadUrl: normalizePublicUrl(config?.downloadUrl, currentConfig.downloadUrl),
    gameUrl: normalizePublicUrl(config?.gameUrl, currentConfig.gameUrl)
  };
}

async function readStoredConfig(env) {
  if (!env.SITE_CONFIG) {
    return DEFAULT_CONFIG;
  }

  const stored = await env.SITE_CONFIG.get(CONFIG_KEY, "json");
  return sanitizeConfig(stored || DEFAULT_CONFIG);
}

export async function onRequestGet({ env }) {
  try {
    const config = await readStoredConfig(env);
    return json(config);
  } catch (error) {
    console.error("Failed to read config:", error);
    return json(DEFAULT_CONFIG);
  }
}

export async function onRequestPost({ request, env }) {
  if (!env.SITE_CONFIG) {
    return json({ error: "SITE_CONFIG KV binding is not configured." }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }

  const storedPassword = await readStoredPassword(env);
  if (!storedPassword && !env.ADMIN_PASSWORD) {
    return json({ error: "ADMIN_PASSWORD environment variable is not configured." }, 500);
  }

  if (!(await verifyAdminPassword(env, body?.password))) {
    return json({ error: "管理密码错误。" }, 401);
  }

  const currentConfig = await readStoredConfig(env);

  if (body?.action === "login") {
    return json({ ok: true, config: currentConfig });
  }

  if (body?.action === "changePassword") {
    const newPassword = normalizePassword(body?.newPassword);
    if (!newPassword) {
      return json({ error: `新密码长度需为 ${PASSWORD_MIN_LENGTH}-${PASSWORD_MAX_LENGTH} 位。` }, 400);
    }

    try {
      await env.SITE_CONFIG.put(ADMIN_PASSWORD_KEY, JSON.stringify(await createPasswordRecord(newPassword)));
      return json({ ok: true });
    } catch (error) {
      console.error("Failed to change admin password:", error);
      return json({ error: "管理员密码修改失败，请检查 KV 绑定。" }, 500);
    }
  }

  const config = sanitizeAdminConfig(body?.config || {}, currentConfig);

  try {
    await env.SITE_CONFIG.put(CONFIG_KEY, JSON.stringify(config));
    return json({ ok: true, config });
  } catch (error) {
    console.error("Failed to save config:", error);
    return json({ error: "配置保存失败，请检查 KV 绑定。" }, 500);
  }
}
