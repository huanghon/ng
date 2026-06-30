import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { onRequestGet, onRequestPost } from "../functions/api/config.js";

const root = resolve("public");
const port = Number(process.env.PORT || 8788);
const adminPassword = process.env.ADMIN_PASSWORD || "admin123";

const store = new Map();
const env = {
  ADMIN_PASSWORD: adminPassword,
  SITE_CONFIG: {
    async get(key, type) {
      const value = store.get(key);
      if (type === "json" && value) {
        return JSON.parse(value);
      }
      return value || null;
    },
    async put(key, value) {
      store.set(key, value);
    }
  }
};

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml; charset=utf-8",
  ".ico": "image/x-icon"
};

function sendNodeResponse(nodeResponse, webResponse) {
  nodeResponse.writeHead(webResponse.status, Object.fromEntries(webResponse.headers));
  return webResponse.arrayBuffer().then((buffer) => {
    nodeResponse.end(Buffer.from(buffer));
  });
}

function resolveStaticPath(pathname) {
  let filePath = pathname;
  if (filePath === "/") {
    filePath = "/index.html";
  } else if (filePath === "/admin" || filePath === "/admin/") {
    filePath = "/admin/index.html";
  }

  const resolved = resolve(join(root, normalize(filePath)));
  if (!resolved.startsWith(root)) {
    return null;
  }
  return resolved;
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);

  if (url.pathname === "/api/config") {
    const chunks = [];
    for await (const chunk of request) {
      chunks.push(chunk);
    }

    const webRequest = new Request(url, {
      method: request.method,
      headers: request.headers,
      body: chunks.length ? Buffer.concat(chunks) : undefined
    });

    const webResponse = request.method === "POST"
      ? await onRequestPost({ request: webRequest, env })
      : await onRequestGet({ request: webRequest, env });

    await sendNodeResponse(response, webResponse);
    return;
  }

  const staticPath = resolveStaticPath(url.pathname);
  if (!staticPath) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    const content = await readFile(staticPath);
    response.writeHead(200, {
      "Content-Type": mimeTypes[extname(staticPath)] || "application/octet-stream",
      "Cache-Control": "no-store"
    });
    response.end(content);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
});

server.listen(port, () => {
  console.log(`Local preview: http://localhost:${port}/`);
  console.log(`Admin page:    http://localhost:${port}/admin`);
  console.log(`Admin password for this local preview: ${adminPassword}`);
});
