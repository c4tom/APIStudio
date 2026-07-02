import express from "express";
import path from "path";
import fs from "fs/promises";
import { existsSync } from "fs";
import { createServer as createViteServer } from "vite";
import http from "http";
import https from "https";
import crypto from "crypto";
import { GoogleGenAI } from "@google/genai";
import { Method, BodyType, Protocol } from "./src/types.js";

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

const DATA_DIR = path.join(process.cwd(), ".openpost");
const MOCK_LOGS_DIR = path.join(DATA_DIR, "mock-logs");

// Decrypted secrets stored in-memory after unlocking
let decryptedVaultSecrets: Array<{ key: string; value: string }> = [];
let vaultUnlocked = false;

// Ensure directories exist
async function ensureDirs() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(MOCK_LOGS_DIR, { recursive: true });
}

// Helper to read JSON file or return default
async function readJsonFile<T>(filename: string, defaultValue: T): Promise<T> {
  const filePath = path.join(DATA_DIR, filename);
  if (!existsSync(filePath)) {
    return defaultValue;
  }
  try {
    const data = await fs.readFile(filePath, "utf-8");
    return JSON.parse(data) as T;
  } catch (error) {
    console.error(`Error reading ${filename}:`, error);
    return defaultValue;
  }
}

// Helper to write JSON file
async function writeJsonFile<T>(filename: string, data: T): Promise<void> {
  await ensureDirs();
  const filePath = path.join(DATA_DIR, filename);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}

// Initialize Gemini Client
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
};

// --- COLLECTION CRUD ---
app.get("/api/collections", async (req, res) => {
  const collections = await readJsonFile("/collections.json", []);
  res.json(collections);
});

app.post("/api/collections", async (req, res) => {
  const collections = req.body;
  await writeJsonFile("/collections.json", collections);
  res.json({ success: true, message: "Collections saved" });
});

// --- ENVIRONMENT CRUD ---
app.get("/api/environments", async (req, res) => {
  const environments = await readJsonFile("/environments.json", []);
  res.json(environments);
});

app.post("/api/environments", async (req, res) => {
  const environments = req.body;
  await writeJsonFile("/environments.json", environments);
  res.json({ success: true, message: "Environments saved" });
});

// --- HISTORY CRUD ---
app.get("/api/history", async (req, res) => {
  const history = await readJsonFile("/history.json", []);
  res.json(history);
});

app.post("/api/history", async (req, res) => {
  const history = req.body;
  await writeJsonFile("/history.json", history);
  res.json({ success: true, message: "History saved" });
});

// --- MOCK SERVER CRUD & LOGS ---
app.get("/api/mock-servers", async (req, res) => {
  const servers = await readJsonFile("/mock-servers.json", []);
  res.json(servers);
});

app.post("/api/mock-servers", async (req, res) => {
  const servers = req.body;
  await writeJsonFile("/mock-servers.json", servers);
  res.json({ success: true, message: "Mock servers saved" });
});

app.get("/api/mock-logs/:serverId", async (req, res) => {
  const logs = await readJsonFile(`mock-logs/${req.params.serverId}.json`, []);
  res.json(logs);
});

app.delete("/api/mock-logs/:serverId", async (req, res) => {
  await writeJsonFile(`mock-logs/${req.params.serverId}.json`, []);
  res.json({ success: true, message: "Logs cleared" });
});

// Log a mock server request
async function logMockRequest(serverId: string, logEntry: any) {
  const logs = await readJsonFile(`mock-logs/${serverId}.json`, []);
  logs.unshift(logEntry);
  if (logs.length > 200) {
    logs.pop();
  }
  await writeJsonFile(`mock-logs/${serverId}.json`, logs);
}

// --- SECRETS VAULT CRYPTO ---
app.get("/api/vault/status", async (req, res) => {
  const vaultFile = path.join(DATA_DIR, "vault.enc");
  const hasMasterPassword = existsSync(vaultFile);
  res.json({
    hasMasterPassword,
    unlocked: vaultUnlocked,
    secrets: vaultUnlocked ? decryptedVaultSecrets : []
  });
});

app.post("/api/vault/setup", async (req, res) => {
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ error: "Password is required" });
  }

  const salt = crypto.randomBytes(16).toString("hex");
  const iv = crypto.randomBytes(12).toString("hex");
  
  // Derivation of key
  const key = crypto.pbkdf2Sync(password, salt, 100000, 32, "sha512");
  
  const initialData = JSON.stringify({ secrets: [], certificates: [] });
  const cipher = crypto.createCipheriv("aes-256-gcm", key, Buffer.from(iv, "hex"));
  let ciphertext = cipher.update(initialData, "utf8", "hex");
  ciphertext += cipher.final("hex");
  const tag = cipher.getAuthTag().toString("hex");

  await writeJsonFile("vault.enc", { ciphertext, iv, tag, salt });
  vaultUnlocked = true;
  decryptedVaultSecrets = [];
  
  res.json({ success: true, message: "Vault created successfully" });
});

app.post("/api/vault/unlock", async (req, res) => {
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ error: "Password is required" });
  }

  try {
    const vaultData = await readJsonFile<any>("vault.enc", null);
    if (!vaultData) {
      return res.status(400).json({ error: "Vault not initialized" });
    }

    const key = crypto.pbkdf2Sync(password, vaultData.salt, 100000, 32, "sha512");
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(vaultData.iv, "hex"));
    decipher.setAuthTag(Buffer.from(vaultData.tag, "hex"));

    let decrypted = decipher.update(vaultData.ciphertext, "hex", "utf8");
    decrypted += decipher.final("utf8");

    const parsed = JSON.parse(decrypted);
    decryptedVaultSecrets = parsed.secrets || [];
    vaultUnlocked = true;

    res.json({ success: true, secrets: decryptedVaultSecrets });
  } catch (err) {
    res.status(400).json({ error: "Incorrect master password" });
  }
});

app.post("/api/vault/lock", (req, res) => {
  decryptedVaultSecrets = [];
  vaultUnlocked = false;
  res.json({ success: true, message: "Vault locked" });
});

app.post("/api/vault/secrets", async (req, res) => {
  if (!vaultUnlocked) {
    return res.status(401).json({ error: "Vault is locked" });
  }
  const { secrets, password } = req.body; // Needs password to re-encrypt
  if (!password) {
    return res.status(400).json({ error: "Master password required to update vault" });
  }

  try {
    const vaultData = await readJsonFile<any>("vault.enc", null);
    const salt = vaultData.salt;
    const iv = crypto.randomBytes(12).toString("hex");
    const key = crypto.pbkdf2Sync(password, salt, 100000, 32, "sha512");

    decryptedVaultSecrets = secrets;
    const initialData = JSON.stringify({ secrets, certificates: [] });
    const cipher = crypto.createCipheriv("aes-256-gcm", key, Buffer.from(iv, "hex"));
    let ciphertext = cipher.update(initialData, "utf8", "hex");
    ciphertext += cipher.final("hex");
    const tag = cipher.getAuthTag().toString("hex");

    await writeJsonFile("vault.enc", { ciphertext, iv, tag, salt });
    res.json({ success: true, secrets: decryptedVaultSecrets });
  } catch (err) {
    res.status(400).json({ error: "Failed to update vault. Verify password." });
  }
});

// --- PROXY HTTP / SSE REQUESTS ---
app.post("/api/request", async (req, res) => {
  const { method, url, headers, body, sslVerification, stream } = req.body;

  if (!url) {
    return res.status(400).json({ error: "URL is required" });
  }

  // Resolve Vault secrets on backend before executing the request
  let resolvedUrl = url;
  let resolvedBody = body || "";
  let resolvedHeaders = { ...headers };

  if (vaultUnlocked) {
    for (const secret of decryptedVaultSecrets) {
      const placeholder = `{{${secret.key}}}`;
      resolvedUrl = resolvedUrl.replaceAll(placeholder, secret.value);
      if (typeof resolvedBody === "string") {
        resolvedBody = resolvedBody.replaceAll(placeholder, secret.value);
      }
      for (const [hKey, hVal] of Object.entries(resolvedHeaders)) {
        if (typeof hVal === "string") {
          resolvedHeaders[hKey] = hVal.replaceAll(placeholder, secret.value);
        }
      }
    }
  }

  // Set up the Node request options
  const startTime = Date.now();
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(resolvedUrl);
  } catch (e) {
    return res.status(400).json({ error: "Invalid URL format" });
  }

  const isHttps = parsedUrl.protocol === "https:";
  const requester = isHttps ? https : http;

  const requestOptions: https.RequestOptions = {
    method: method,
    headers: resolvedHeaders,
    rejectUnauthorized: sslVerification !== false,
  };

  // Setup streaming response or normal response
  if (stream) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const proxyReq = requester.request(resolvedUrl, requestOptions, (proxyRes) => {
      proxyRes.on("data", (chunk) => {
        res.write(chunk);
      });
      proxyRes.on("end", () => {
        res.end();
      });
    });

    proxyReq.on("error", (err) => {
      res.write(`data: {"error": "${err.message}"}\n\n`);
      res.end();
    });

    if (method !== "GET" && resolvedBody) {
      proxyReq.write(resolvedBody);
    }
    proxyReq.end();
  } else {
    // Standard response gathering
    const proxyReq = requester.request(resolvedUrl, requestOptions, (proxyRes) => {
      const chunks: Buffer[] = [];
      proxyRes.on("data", (chunk) => chunks.push(chunk));
      proxyRes.on("end", () => {
        const responseTime = Date.now() - startTime;
        const responseBuffer = Buffer.concat(chunks);
        const bodyText = responseBuffer.toString("utf8");

        // Format headers nicely
        const resHeaders: Record<string, string> = {};
        for (const [key, val] of Object.entries(proxyRes.headers)) {
          if (Array.isArray(val)) {
            resHeaders[key] = val.join(", ");
          } else if (val) {
            resHeaders[key] = val;
          }
        }

        res.json({
          status: proxyRes.statusCode || 200,
          statusText: proxyRes.statusMessage || "OK",
          headers: resHeaders,
          body: bodyText,
          size: responseBuffer.length,
          time: responseTime,
          cookies: proxyRes.headers["set-cookie"] || [],
          actualRequest: {
            rawHeaders: JSON.stringify(resolvedHeaders, null, 2),
            rawBody: typeof resolvedBody === "string" ? resolvedBody : JSON.stringify(resolvedBody),
            resolvedUrl: resolvedUrl
          }
        });
      });
    });

    proxyReq.on("error", (err) => {
      res.status(500).json({
        error: `Request failed: ${err.message}`,
        time: Date.now() - startTime
      });
    });

    if (method !== "GET" && resolvedBody) {
      proxyReq.write(resolvedBody);
    }
    proxyReq.end();
  }
});

// --- GEMINI INTEGRATIONS ---
app.post("/api/gemini/generate", async (req, res) => {
  const { prompt, type } = req.body;
  const ai = getGeminiClient();

  if (!ai) {
    return res.status(500).json({ error: "Gemini API key is not configured in Secrets." });
  }

  let systemInstruction = "You are a helpful API design assistant.";
  if (type === "explain") {
    systemInstruction = "You are a technical documenter. Explain what this API does, how to use it, its endpoints, and its data structure clearly.";
  } else if (type === "integration") {
    systemInstruction = "You are an expert software developer. Write clean, production-ready, highly idiomatic code to integrate this API in the user's requested language. Focus on proper exception handling, typings, and standard client usage.";
  } else if (type === "debug") {
    systemInstruction = "You are a DevSecOps debugging assistant. Help diagnose the issues shown in this API response, check status codes, response headers, and bodies, and offer specific solutions to fix them.";
  } else if (type === "tests") {
    systemInstruction = "You are an expert QA automation engineer. Write tests in JavaScript, Jest, or Postman script format for the given request and response schema. Validate types, statuses, headers, and values.";
  } else if (type === "docs") {
    systemInstruction = "You are a technical writer. Write polished Markdown API reference documentation for this request and response.";
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    res.json({ text: response.text });
  } catch (error: any) {
    res.status(500).json({ error: `Gemini generation error: ${error.message}` });
  }
});

// --- VIRTUAL MOCK SERVERS ENDPOINT ROUTING ---
// Capture any request under /mock/:serverId/*
app.all("/mock/:serverId/*", async (req, res) => {
  const { serverId } = req.params;
  const originalPath = "/" + req.params[0];
  const method = req.method;

  const servers = await readJsonFile<any[]>("/mock-servers.json", []);
  const server = servers.find((s) => s.id === serverId);

  if (!server || !server.enabled) {
    await logMockRequest(serverId, {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      method,
      path: originalPath,
      status: 404,
      matched: false,
      ip: req.ip || "127.0.0.1"
    });
    return res.status(404).send(`Mock server '${serverId}' is offline or does not exist.`);
  }

  // Direct match or path template match
  const matchedRoute = server.routes.find((route: any) => {
    if (route.method.toUpperCase() !== method.toUpperCase()) return false;
    // Basic route matching (direct or primitive wildcard)
    const routePath = route.path.startsWith("/") ? route.path : "/" + route.path;
    return routePath === originalPath || routePath === "/*";
  });

  if (matchedRoute) {
    // Add headers
    if (matchedRoute.headers && Array.isArray(matchedRoute.headers)) {
      for (const h of matchedRoute.headers) {
        if (h.enabled && h.key) {
          res.setHeader(h.key, h.value);
        }
      }
    }

    // Default JSON headers if needed
    if (!res.getHeader("Content-Type")) {
      res.setHeader("Content-Type", "application/json");
    }

    await logMockRequest(serverId, {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      method,
      path: originalPath,
      status: matchedRoute.status,
      matched: true,
      ip: req.ip || "127.0.0.1"
    });

    return res.status(matchedRoute.status).send(matchedRoute.responseBody);
  }

  // No match
  await logMockRequest(serverId, {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    method,
    path: originalPath,
    status: 404,
    matched: false,
    ip: req.ip || "127.0.0.1"
  });

  res.status(404).json({ error: `Mock route not found for ${method} ${originalPath}` });
});

// --- MANAGEMENT MCP SERVER (EXPOSING TOOLS) ---
app.all("/api/mcp", async (req, res) => {
  // Simple Mock Management MCP endpoint for Copilot/Cursor discovery
  if (req.method === "GET") {
    return res.json({
      mcpVersion: "1.0",
      capabilities: { tools: {} },
      info: { name: "API Studio Management", version: "1.0.0" }
    });
  }

  const { method, params } = req.body || {};
  if (method === "tools/list") {
    return res.json({
      tools: [
        { name: "list_collections", description: "Get list of all folders and request collections" },
        { name: "create_request", description: "Create a new HTTP request in a collection", inputSchema: { type: "object", properties: { name: { type: "string" }, url: { type: "string" } } } },
        { name: "run_request", description: "Trigger an HTTP request and return the response", inputSchema: { type: "object", properties: { url: { type: "string" }, method: { type: "string" } } } }
      ]
    });
  }

  if (method === "tools/call") {
    const toolName = params?.name;
    if (toolName === "list_collections") {
      const collections = await readJsonFile("/collections.json", []);
      return res.json({ content: [{ type: "text", text: JSON.stringify(collections, null, 2) }] });
    }
    return res.json({ content: [{ type: "text", text: "Tool executing..." }] });
  }

  res.status(404).json({ error: "MCP Method not found" });
});

// Start express server and Vite
async function startServer() {
  await ensureDirs();

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`API Studio server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
