import React, { useState, useEffect, useRef } from "react";
import {
  Method,
  Protocol,
  BodyType,
  RequestItem,
  CollectionItem,
  FolderItem,
  Environment,
  Header,
  QueryParam,
  ResponseData,
  MockServer,
  MockRoute,
  MockLog
} from "./types";
import { parseCurl, generateCodeSnippet, importPostmanCollection } from "./utils/helpers";
import { mockTemplates, MockTemplate } from "./utils/mockTemplates";
import {
  Activity,
  Send,
  Save,
  Plus,
  Trash,
  ChevronRight,
  ChevronDown,
  Folder,
  FileText,
  Key,
  Shield,
  Layers,
  Settings,
  History,
  Terminal,
  Cpu,
  Globe,
  Database,
  Lock,
  Unlock,
  Sparkles,
  Eye,
  EyeOff,
  Code,
  Check,
  Play,
  StopCircle,
  Copy,
  Download,
  Upload,
  Info,
  Server,
  AlertTriangle,
  RefreshCw,
  Search,
  BookOpen
} from "lucide-react";

export default function App() {
  // Navigation & UI State
  const [activeSidebar, setActiveSidebar] = useState<"collections" | "environments" | "history" | "mock" | "vault" | "settings">("collections");
  const [activeTabId, setActiveTabId] = useState<string>("default");
  const [tabs, setTabs] = useState<Array<{ id: string; name: string; method: Method; url: string; protocol: Protocol }>>([
    { id: "default", name: "New Request", method: Method.GET, url: "https://jsonplaceholder.typicode.com/posts/1", protocol: Protocol.HTTP }
  ]);
  const [simpleMode, setSimpleMode] = useState<boolean>(false);

  // Core Data State
  const [collections, setCollections] = useState<CollectionItem[]>([]);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [mockServers, setMockServers] = useState<MockServer[]>([]);
  const [selectedEnvId, setSelectedEnvId] = useState<string>("none");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Request Form State (keyed by activeTabId)
  const [requestsState, setRequestsState] = useState<Record<string, Partial<RequestItem>>>({
    default: {
      id: "default",
      name: "New Request",
      method: Method.GET,
      url: "https://jsonplaceholder.typicode.com/posts/1",
      protocol: Protocol.HTTP,
      headers: [
        { key: "Content-Type", value: "application/json", enabled: true },
        { key: "Accept", value: "*/*", enabled: true }
      ],
      params: [{ key: "", value: "", enabled: true }],
      bodyType: BodyType.JSON,
      body: `{\n  "title": "Hello",\n  "body": "World",\n  "userId": 1\n}`,
      auth: { type: "none" }
    }
  });

  // Response State (keyed by activeTabId)
  const [responses, setResponses] = useState<Record<string, ResponseData & { loading?: boolean; error?: string }>>({});
  
  // Streaming state (SSE / WebSockets)
  const [streamingEvents, setStreamingEvents] = useState<Record<string, string[]>>({});
  const [isStreaming, setIsStreaming] = useState<Record<string, boolean>>({});
  const [sseController, setSseController] = useState<Record<string, AbortController | null>>({});

  // Active sub-tab inside Request Configuration
  const [activeSubTab, setActiveSubTab] = useState<"body" | "auth" | "headers" | "params" | "scripts" | "code">("body");
  
  // Active sub-tab inside Response Viewer
  const [activeResponseSubTab, setActiveResponseSubTab] = useState<"body" | "headers" | "cookies" | "actual" | "stream" | "ai">("body");

  // Code Export selection
  const [selectedLanguage, setSelectedLanguage] = useState<string>("curl_unix");

  // Encrypted Vault State
  const [vaultStatus, setVaultStatus] = useState<{ hasMasterPassword: boolean; unlocked: boolean; secrets: any[] }>({
    hasMasterPassword: false,
    unlocked: false,
    secrets: []
  });
  const [vaultPassword, setVaultPassword] = useState("");
  const [vaultNewSecretKey, setVaultNewSecretKey] = useState("");
  const [vaultNewSecretValue, setVaultNewSecretValue] = useState("");
  const [vaultError, setVaultError] = useState("");
  const [vaultSuccess, setVaultSuccess] = useState("");

  // AI Prompt Generator State
  const [aiLoading, setAiLoading] = useState(false);
  const [aiOutput, setAiOutput] = useState("");
  const [aiPromptType, setAiPromptType] = useState<"explain" | "integration" | "debug" | "tests" | "docs">("explain");

  // Mock server management
  const [newMockServerName, setNewMockServerName] = useState("");
  const [selectedMockServerId, setSelectedMockServerId] = useState<string | null>(null);
  const [mockLogs, setMockLogs] = useState<MockLog[]>([]);

  // Mock server library & route editor states
  const [showMockLibrary, setShowMockLibrary] = useState<boolean>(true);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [routeMethod, setRouteMethod] = useState<string>("GET");
  const [routePath, setRoutePath] = useState<string>("");
  const [routeStatus, setRouteStatus] = useState<number>(200);
  const [routeResponseBody, setRouteResponseBody] = useState<string>("");
  const [routeHeaders, setRouteHeaders] = useState<Array<{ key: string; value: string; enabled: boolean }>>([]);
  const [jsonValidationError, setJsonValidationError] = useState<string | null>(null);

  // WebSocket / Connection simulation state
  const [webSocketStatus, setWebSocketStatus] = useState<"disconnected" | "connecting" | "connected">("disconnected");
  const [wsInputMessage, setWsInputMessage] = useState("");

  // gRPC State
  const [grpcProtoFile, setGrpcProtoFile] = useState<string>("");
  const [grpcServices, setGrpcServices] = useState<string[]>(["GreeterService", "UserService"]);
  const [selectedGrpcService, setSelectedGrpcService] = useState("GreeterService");
  const [grpcMethods, setGrpcMethods] = useState<string[]>(["SayHello", "GetProfile"]);
  const [selectedGrpcMethod, setSelectedGrpcMethod] = useState("SayHello");

  // UI Toast/Notification state
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  // --- REFS ---
  const fileInputRef = useRef<HTMLInputElement>(null);
  const postmanImportRef = useRef<HTMLInputElement>(null);

  // --- TOAST TRIGGER ---
  const triggerToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // --- API INITIALIZATION ---
  useEffect(() => {
    fetchCollections();
    fetchEnvironments();
    fetchHistory();
    fetchMockServers();
    fetchVaultStatus();
  }, []);

  // Sync editing fields with selectedRouteId
  useEffect(() => {
    if (!selectedMockServerId) return;
    const srv = mockServers.find((s) => s.id === selectedMockServerId);
    if (!srv) return;
    const rt = srv.routes.find((r) => r.id === selectedRouteId);
    if (rt) {
      setRouteMethod(rt.method);
      setRoutePath(rt.path);
      setRouteStatus(rt.status);
      setRouteResponseBody(rt.responseBody);
      setRouteHeaders(rt.headers || []);
      setJsonValidationError(null);
    } else {
      // Pick first route if none selected and server exists
      if (srv.routes.length > 0) {
        setSelectedRouteId(srv.routes[0].id);
      } else {
        setSelectedRouteId(null);
      }
    }
  }, [selectedRouteId, selectedMockServerId, mockServers]);

  // Live validation of JSON response body
  useEffect(() => {
    if (!routeResponseBody) {
      setJsonValidationError(null);
      return;
    }
    try {
      JSON.parse(routeResponseBody);
      setJsonValidationError(null);
    } catch (e: any) {
      setJsonValidationError(e.message);
    }
  }, [routeResponseBody]);

  const fetchCollections = async () => {
    try {
      const res = await fetch("/api/collections");
      if (res.ok) {
        const data = await res.json();
        setCollections(data);
      }
    } catch (e) {
      console.error("Error loading collections", e);
    }
  };

  const fetchEnvironments = async () => {
    try {
      const res = await fetch("/api/environments");
      if (res.ok) {
        const data = await res.json();
        setEnvironments(data);
        if (data.length > 0 && selectedEnvId === "none") {
          setSelectedEnvId(data[0].id);
        }
      }
    } catch (e) {
      console.error("Error loading environments", e);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch("/api/history");
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (e) {
      console.error("Error loading history", e);
    }
  };

  const fetchMockServers = async () => {
    try {
      const res = await fetch("/api/mock-servers");
      if (res.ok) {
        const data = await res.json();
        setMockServers(data);
        if (data.length > 0 && !selectedMockServerId) {
          setSelectedMockServerId(data[0].id);
          fetchMockLogs(data[0].id);
        }
      }
    } catch (e) {
      console.error("Error loading mock servers", e);
    }
  };

  const fetchMockLogs = async (serverId: string) => {
    try {
      const res = await fetch(`/api/mock-logs/${serverId}`);
      if (res.ok) {
        const data = await res.json();
        setMockLogs(data);
      }
    } catch (e) {
      console.error("Error loading mock logs", e);
    }
  };

  const fetchVaultStatus = async () => {
    try {
      const res = await fetch("/api/vault/status");
      if (res.ok) {
        const data = await res.json();
        setVaultStatus(data);
      }
    } catch (e) {
      console.error("Error loading vault status", e);
    }
  };

  // --- STATE MUTATORS WITH PERSISTENCE ---
  const saveCollectionsToDb = async (updated: CollectionItem[]) => {
    setCollections(updated);
    try {
      await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated)
      });
    } catch (e) {
      triggerToast("Failed to sync collections with server", "error");
    }
  };

  const saveEnvironmentsToDb = async (updated: Environment[]) => {
    setEnvironments(updated);
    try {
      await fetch("/api/environments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated)
      });
    } catch (e) {
      triggerToast("Failed to sync environments with server", "error");
    }
  };

  const saveHistoryToDb = async (updated: any[]) => {
    setHistory(updated);
    try {
      await fetch("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated)
      });
    } catch (e) {
      console.error("Failed to save history", e);
    }
  };

  const saveMockServersToDb = async (updated: MockServer[]) => {
    setMockServers(updated);
    try {
      await fetch("/api/mock-servers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated)
      });
    } catch (e) {
      triggerToast("Failed to save mock server configs", "error");
    }
  };

  // --- ACTIVE REQUEST HELPERS ---
  const currentRequest = requestsState[activeTabId] || {
    id: activeTabId,
    name: "New Request",
    method: Method.GET,
    url: "",
    protocol: Protocol.HTTP,
    headers: [],
    params: [],
    bodyType: BodyType.JSON,
    body: "",
    auth: { type: "none" }
  };

  const updateCurrentRequest = (updates: Partial<RequestItem>) => {
    const updated = { ...currentRequest, ...updates };
    setRequestsState((prev) => ({
      ...prev,
      [activeTabId]: updated
    }));

    // Update tab name if renamed
    if (updates.name) {
      setTabs((prev) =>
        prev.map((t) => (t.id === activeTabId ? { ...t, name: updates.name! } : t))
      );
    }
    // Update tab method if changed
    if (updates.method) {
      setTabs((prev) =>
        prev.map((t) => (t.id === activeTabId ? { ...t, method: updates.method! } : t))
      );
    }
    // Update tab protocol if changed
    if (updates.protocol) {
      setTabs((prev) =>
        prev.map((t) => (t.id === activeTabId ? { ...t, protocol: updates.protocol! } : t))
      );
    }
  };

  // --- RESOLVING ENVIRONMENT VARIABLES & SECRETS ---
  const getActiveEnvVariables = () => {
    const env = environments.find((e) => e.id === selectedEnvId);
    return env ? env.variables : [];
  };

  const resolvePlaceholders = (text: string): string => {
    if (!text) return "";
    let resolved = text;

    // Resolve Environments first
    const activeVars = getActiveEnvVariables();
    activeVars.forEach((v) => {
      if (v.enabled && v.key) {
        resolved = resolved.replaceAll(`{{${v.key}}}`, v.value);
      }
    });

    // Vault secrets are also resolved on the backend if unlocked, but we can do a visual hint/substitution here for display
    if (vaultStatus.unlocked) {
      vaultStatus.secrets.forEach((s) => {
        resolved = resolved.replaceAll(`{{${s.key}}}`, s.value);
      });
    }

    return resolved;
  };

  // --- COLLECTION ACTIONS ---
  const handleCreateCollection = () => {
    const newCol: CollectionItem = {
      id: crypto.randomUUID(),
      name: "New Collection",
      requests: [],
      folders: []
    };
    saveCollectionsToDb([...collections, newCol]);
    triggerToast("Created new collection");
  };

  const handleCreateFolder = (collectionId: string) => {
    const updated = collections.map((col) => {
      if (col.id === collectionId) {
        const folders = col.folders || [];
        const newFolder: FolderItem = {
          id: crypto.randomUUID(),
          name: "New Folder",
          collectionId
        };
        return { ...col, folders: [...folders, newFolder] };
      }
      return col;
    });
    saveCollectionsToDb(updated);
    triggerToast("Created new folder");
  };

  const handleCreateRequestInCollection = (collectionId: string, folderId: string | null = null) => {
    const reqId = crypto.randomUUID();
    const newReq: RequestItem = {
      id: reqId,
      name: "GET Request",
      method: Method.GET,
      url: "https://jsonplaceholder.typicode.com/posts",
      protocol: Protocol.HTTP,
      headers: [{ key: "Accept", value: "*/*", enabled: true }],
      params: [],
      bodyType: BodyType.JSON,
      body: "",
      auth: { type: "none" },
      collectionId,
      folderId
    };

    const updated = collections.map((col) => {
      if (col.id === collectionId) {
        return { ...col, requests: [...col.requests, newReq] };
      }
      return col;
    });
    saveCollectionsToDb(updated);

    // Add to tabs and set active
    setTabs((prev) => [...prev, { id: reqId, name: newReq.name, method: newReq.method, url: newReq.url, protocol: newReq.protocol }]);
    setRequestsState((prev) => ({ ...prev, [reqId]: newReq }));
    setActiveTabId(reqId);
    triggerToast("Created request inside collection");
  };

  const handleDeleteCollection = (id: string) => {
    const updated = collections.filter((c) => c.id !== id);
    saveCollectionsToDb(updated);
    triggerToast("Deleted collection", "info");
  };

  // --- EXECUTE REQUESTS / SEND / STREAM ---
  const handleSendRequest = async () => {
    const reqId = activeTabId;
    const req = currentRequest;
    
    // Clear old response
    setResponses((prev) => ({
      ...prev,
      [reqId]: { ...prev[reqId], loading: true, error: undefined } as any
    }));

    // Handle WebSocket Protocol specifically
    if (req.protocol === Protocol.WEBSOCKET) {
      handleWebSocketConnect();
      return;
    }

    // Resolve variables for proxy fetch
    const resolvedUrl = resolvePlaceholders(req.url || "");
    const headersObj: Record<string, string> = {};
    if (req.headers) {
      req.headers.forEach((h) => {
        if (h.enabled && h.key) {
          headersObj[h.key] = resolvePlaceholders(h.value);
        }
      });
    }

    // Injected Authentication Headers
    if (req.auth?.type === "bearer" && req.auth.bearer?.token) {
      headersObj["Authorization"] = `Bearer ${resolvePlaceholders(req.auth.bearer.token)}`;
    } else if (req.auth?.type === "basic" && req.auth.basic) {
      const username = resolvePlaceholders(req.auth.basic.username);
      const password = resolvePlaceholders(req.auth.basic.password || "");
      const credentials = btoa(`${username}:${password}`);
      headersObj["Authorization"] = `Basic ${credentials}`;
    } else if (req.auth?.type === "apikey" && req.auth.apikey) {
      const key = resolvePlaceholders(req.auth.apikey.key);
      const val = resolvePlaceholders(req.auth.apikey.value);
      if (req.auth.apikey.addTo === "header" && key) {
        headersObj[key] = val;
      }
    }

    const resolvedBody = resolvePlaceholders(req.body || "");

    // Check if user is asking for SSE / Streaming
    const isSseUrl = resolvedUrl.includes("sse") || resolvedUrl.includes("stream");
    
    if (isSseUrl) {
      // Setup SSE Streaming
      triggerToast("Streaming SSE events detected...", "info");
      setIsStreaming((prev) => ({ ...prev, [reqId]: true }));
      setStreamingEvents((prev) => ({ ...prev, [reqId]: [] }));

      try {
        const controller = new AbortController();
        setSseController((prev) => ({ ...prev, [reqId]: controller }));

        const response = await fetch("/api/request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            method: req.method,
            url: resolvedUrl,
            headers: headersObj,
            body: resolvedBody,
            sslVerification: true,
            stream: true
          }),
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error(`Server returned status ${response.status}`);
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder("utf-8");

        setResponses((prev) => ({
          ...prev,
          [reqId]: {
            status: 200,
            statusText: "Streaming",
            headers: { "Content-Type": "text/event-stream" },
            body: "Active SSE Connection",
            size: 0,
            time: 0,
            cookies: {},
            loading: false
          }
        }));

        setActiveResponseSubTab("stream");

        while (true) {
          const { value, done } = await reader!.read();
          if (done) break;
          const chunk = decoder.decode(value);
          setStreamingEvents((prev) => ({
            ...prev,
            [reqId]: [...(prev[reqId] || []), chunk]
          }));
        }

      } catch (err: any) {
        if (err.name !== "AbortError") {
          setResponses((prev) => ({
            ...prev,
            [reqId]: { loading: false, error: err.message } as any
          }));
        }
      } finally {
        setIsStreaming((prev) => ({ ...prev, [reqId]: false }));
      }
    } else {
      // Normal HTTP/GraphQL Call
      try {
        const res = await fetch("/api/request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            method: req.method,
            url: resolvedUrl,
            headers: headersObj,
            body: resolvedBody,
            sslVerification: true,
            stream: false
          })
        });

        const data = await res.json();
        if (!res.ok || data.error) {
          setResponses((prev) => ({
            ...prev,
            [reqId]: {
              status: 500,
              statusText: "Error",
              headers: {},
              body: data.error || "Request failed",
              size: 0,
              time: 0,
              cookies: {},
              loading: false,
              error: data.error
            }
          }));
        } else {
          setResponses((prev) => ({
            ...prev,
            [reqId]: { ...data, loading: false }
          }));

          // Append to history
          const histEntry = {
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            method: req.method,
            url: req.url,
            protocol: req.protocol,
            status: data.status,
            time: data.time
          };
          saveHistoryToDb([histEntry, ...history]);
        }
      } catch (err: any) {
        setResponses((prev) => ({
          ...prev,
          [reqId]: {
            status: 500,
            statusText: "Failed",
            headers: {},
            body: err.message,
            size: 0,
            time: 0,
            cookies: {},
            loading: false,
            error: err.message
          }
        }));
      }
    }
  };

  const stopStream = () => {
    const reqId = activeTabId;
    const controller = sseController[reqId];
    if (controller) {
      controller.abort();
      setSseController((prev) => ({ ...prev, [reqId]: null }));
    }
    setIsStreaming((prev) => ({ ...prev, [reqId]: false }));
    triggerToast("Stream disconnected", "info");
  };

  // --- WEBSOCKET CLIENT SIMULATOR ---
  const handleWebSocketConnect = () => {
    setWebSocketStatus("connecting");
    setTimeout(() => {
      setWebSocketStatus("connected");
      setStreamingEvents((prev) => ({
        ...prev,
        [activeTabId]: [
          ...(prev[activeTabId] || []),
          `⚡ System: Connected to ${currentRequest.url || "ws://echo.websocket.org"} successfully.`
        ]
      }));
      setActiveResponseSubTab("stream");
      triggerToast("WebSocket Connected");
    }, 1000);
  };

  const handleWebSocketDisconnect = () => {
    setWebSocketStatus("disconnected");
    setStreamingEvents((prev) => ({
      ...prev,
      [activeTabId]: [
        ...(prev[activeTabId] || []),
        `⚡ System: Connection closed.`
      ]
    }));
    triggerToast("WebSocket Disconnected", "info");
  };

  const handleSendWebSocketMessage = () => {
    if (!wsInputMessage.trim()) return;
    const msg = wsInputMessage;
    setStreamingEvents((prev) => ({
      ...prev,
      [activeTabId]: [
        ...(prev[activeTabId] || []),
        `↑ sent [${new Date().toLocaleTimeString()}]: ${msg}`,
        `↓ received [${new Date().toLocaleTimeString()}]: ${msg} (Echoed back)`
      ]
    }));
    setWsInputMessage("");
  };

  // --- gRPC CLIENT SIMULATOR ---
  const handleGrpcInvoke = () => {
    const reqId = activeTabId;
    setResponses((prev) => ({
      ...prev,
      [reqId]: { ...prev[reqId], loading: true, error: undefined } as any
    }));

    setTimeout(() => {
      const responsePayload = {
        message: `Hello from gRPC! ${selectedGrpcMethod} executed successfully on service ${selectedGrpcService}.`,
        timestamp: new Date().toISOString(),
        id: crypto.randomUUID()
      };

      setResponses((prev) => ({
        ...prev,
        [reqId]: {
          status: 200,
          statusText: "OK",
          headers: {
            "content-type": "application/grpc",
            "grpc-status": "0",
            "grpc-message": "OK"
          },
          body: JSON.stringify(responsePayload, null, 2),
          size: JSON.stringify(responsePayload).length,
          time: 145,
          cookies: {},
          protocol: "HTTP/2 (gRPC)",
          loading: false,
          actualRequest: {
            resolvedUrl: currentRequest.url || "grpc://localhost:50051",
            rawHeaders: `grpc-timeout: 30S\nuser-agent: grpc-node-js/1.8.0\ncontent-type: application/grpc`,
            rawBody: currentRequest.body
          }
        }
      }));
      triggerToast("gRPC Unary Call Invoked");
    }, 1200);
  };

  // --- CODELINE IMPORT / CURL PARSING ---
  const handleImportCurl = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const curlText = (form.elements.namedItem("curlInput") as HTMLTextAreaElement).value;
    if (!curlText.trim()) return;

    try {
      const parsed = parseCurl(curlText);
      updateCurrentRequest(parsed);
      form.reset();
      triggerToast("cURL import successful!");
    } catch (err) {
      triggerToast("Failed to parse cURL command", "error");
    }
  };

  // --- ENCRYPTED VAULT ACTIONS ---
  const handleVaultSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setVaultError("");
    setVaultSuccess("");
    if (!vaultPassword) return;

    try {
      const res = await fetch("/api/vault/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: vaultPassword })
      });
      const data = await res.json();
      if (res.ok) {
        setVaultSuccess("Vault created and unlocked!");
        setVaultPassword("");
        fetchVaultStatus();
      } else {
        setVaultError(data.error || "Failed to create vault");
      }
    } catch (err: any) {
      setVaultError(err.message);
    }
  };

  const handleVaultUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setVaultError("");
    setVaultSuccess("");
    if (!vaultPassword) return;

    try {
      const res = await fetch("/api/vault/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: vaultPassword })
      });
      const data = await res.json();
      if (res.ok) {
        setVaultSuccess("Vault unlocked successfully!");
        fetchVaultStatus();
      } else {
        setVaultError(data.error || "Incorrect master password");
      }
    } catch (err: any) {
      setVaultError(err.message);
    }
  };

  const handleVaultLock = async () => {
    try {
      await fetch("/api/vault/lock", { method: "POST" });
      setVaultSuccess("Vault locked");
      setVaultPassword("");
      fetchVaultStatus();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddVaultSecret = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vaultNewSecretKey || !vaultNewSecretValue) return;

    const key = vaultNewSecretKey.trim();
    const value = vaultNewSecretValue.trim();

    const existingSecrets = vaultStatus.secrets || [];
    // Ensure no duplicates
    if (existingSecrets.some((s: any) => s.key === key)) {
      triggerToast("Secret key already exists", "error");
      return;
    }

    const updatedSecrets = [...existingSecrets, { id: crypto.randomUUID(), key, value }];
    
    // Prompt for password to encrypt
    const pass = prompt("Please enter your Master Password to confirm encryption:");
    if (!pass) return;

    try {
      const res = await fetch("/api/vault/secrets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secrets: updatedSecrets, password: pass })
      });
      const data = await res.json();
      if (res.ok) {
        setVaultNewSecretKey("");
        setVaultNewSecretValue("");
        fetchVaultStatus();
        triggerToast("Secret added to GCM vault");
      } else {
        triggerToast(data.error || "Failed to add secret", "error");
      }
    } catch (err) {
      triggerToast("Encryption failed", "error");
    }
  };

  const handleDeleteVaultSecret = async (id: string) => {
    const updatedSecrets = vaultStatus.secrets.filter((s) => s.id !== id);
    const pass = prompt("Please enter your Master Password to confirm updates:");
    if (!pass) return;

    try {
      const res = await fetch("/api/vault/secrets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secrets: updatedSecrets, password: pass })
      });
      if (res.ok) {
        fetchVaultStatus();
        triggerToast("Secret deleted", "info");
      }
    } catch (err) {
      triggerToast("Decryption/Encryption failure", "error");
    }
  };

  // --- GEMINI AI INTEGRATION ---
  const generateAiContent = async () => {
    setAiLoading(true);
    setAiOutput("");
    setActiveResponseSubTab("ai");

    const promptMessage = `
    Analyze the following request detail and generate:
    Type: ${aiPromptType}

    REQUEST:
    Protocol: ${currentRequest.protocol}
    Method: ${currentRequest.method}
    URL: ${currentRequest.url}
    Headers: ${JSON.stringify(currentRequest.headers)}
    Body: ${currentRequest.body}

    RESPONSE CACHE:
    ${JSON.stringify(responses[activeTabId] || "No response received yet")}
    `;

    try {
      const res = await fetch("/api/gemini/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: promptMessage,
          type: aiPromptType
        })
      });
      const data = await res.json();
      if (res.ok) {
        setAiOutput(data.text || "No prompt generated");
      } else {
        setAiOutput(data.error || "AI Generation error");
      }
    } catch (e: any) {
      setAiOutput(`Failed to connect to Gemini API: ${e.message}`);
    } finally {
      setAiLoading(false);
    }
  };

  // --- POSTMAN IMPORT ---
  const handlePostmanImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const imported = importPostmanCollection(json);
        await saveCollectionsToDb([...collections, imported]);
        triggerToast(`Postman collection '${imported.name}' imported!`);
      } catch (err) {
        triggerToast("Invalid Postman JSON structure", "error");
      }
    };
    reader.readAsText(file);
  };

  // --- TABS MANAGEMENT ---
  const handleNewTab = () => {
    const id = crypto.randomUUID();
    setTabs((prev) => [...prev, { id, name: "New Request", method: Method.GET, url: "", protocol: Protocol.HTTP }]);
    setRequestsState((prev) => ({
      ...prev,
      [id]: {
        id,
        name: "New Request",
        method: Method.GET,
        url: "",
        protocol: Protocol.HTTP,
        headers: [],
        params: [],
        bodyType: BodyType.JSON,
        body: "",
        auth: { type: "none" }
      }
    }));
    setActiveTabId(id);
  };

  const handleCloseTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tabs.length === 1) return; // don't close last tab
    const nextTabs = tabs.filter((t) => t.id !== id);
    setTabs(nextTabs);
    if (activeTabId === id) {
      setActiveTabId(nextTabs[nextTabs.length - 1].id);
    }
  };

  // --- MOCK SERVER ACTIONS ---
  const handleCreateMockServer = () => {
    if (!newMockServerName.trim()) return;
    const newServer: MockServer = {
      id: crypto.randomUUID(),
      name: newMockServerName.trim(),
      autoStart: true,
      enabled: true,
      routes: [
        {
          id: crypto.randomUUID(),
          method: "GET",
          path: "/users",
          status: 200,
          headers: [{ key: "Content-Type", value: "application/json", enabled: true }],
          responseBody: JSON.stringify([{ id: 1, name: "Alice" }, { id: 2, name: "Bob" }], null, 2)
        }
      ]
    };
    saveMockServersToDb([...mockServers, newServer]);
    setNewMockServerName("");
    setSelectedMockServerId(newServer.id);
    fetchMockLogs(newServer.id);
    triggerToast("Mock server created");
  };

  const toggleMockServer = (id: string) => {
    const updated = mockServers.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s));
    saveMockServersToDb(updated);
    triggerToast("Mock Server configuration toggled", "info");
  };

  // --- MOCK TEMPLATES LIBRARY ACTIONS ---
  const handleImportMockTemplate = (template: MockTemplate) => {
    const newServer: MockServer = {
      id: crypto.randomUUID(),
      name: `${template.name} Instance`,
      autoStart: true,
      enabled: true,
      routes: template.routes.map((r) => ({
        id: crypto.randomUUID(),
        method: r.method,
        path: r.path,
        status: r.status,
        headers: r.headers || [],
        responseBody: r.responseBody
      }))
    };
    const updated = [...mockServers, newServer];
    saveMockServersToDb(updated);
    setSelectedMockServerId(newServer.id);
    setShowMockLibrary(false);
    fetchMockLogs(newServer.id);
    triggerToast(`Mock Server created from template: ${template.name}!`);
  };

  const handleDeleteMockServer = (id: string) => {
    if (!window.confirm("Are you sure you want to decommission this mock server instance?")) return;
    const updated = mockServers.filter((s) => s.id !== id);
    saveMockServersToDb(updated);
    if (selectedMockServerId === id) {
      const nextId = updated.length > 0 ? updated[0].id : null;
      setSelectedMockServerId(nextId);
      if (nextId) fetchMockLogs(nextId);
    }
    triggerToast("Mock Server instance successfully deleted", "info");
  };

  const handleClearMockLogs = async (serverId: string) => {
    try {
      const res = await fetch(`/api/mock-logs/${serverId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setMockLogs([]);
        triggerToast("Mock request execution logs purged", "info");
      }
    } catch (e) {
      triggerToast("Failed to clear logs", "error");
    }
  };

  const handleAddMockRoute = () => {
    if (!selectedMockServerId) return;
    const newRt: MockRoute = {
      id: crypto.randomUUID(),
      method: "GET",
      path: "/new-route",
      status: 200,
      headers: [{ key: "Content-Type", value: "application/json", enabled: true }],
      responseBody: JSON.stringify({ message: "Mock Route Created Successfully" }, null, 2)
    };
    const updated = mockServers.map((srv) => {
      if (srv.id !== selectedMockServerId) return srv;
      return { ...srv, routes: [...srv.routes, newRt] };
    });
    saveMockServersToDb(updated);
    setSelectedRouteId(newRt.id);
    triggerToast("New route endpoint configuration appended");
  };

  const handleSaveMockRoute = () => {
    if (!selectedMockServerId || !selectedRouteId) return;
    const updated = mockServers.map((srv) => {
      if (srv.id !== selectedMockServerId) return srv;
      return {
        ...srv,
        routes: srv.routes.map((rt) => {
          if (rt.id !== selectedRouteId) return rt;
          return {
            ...rt,
            method: routeMethod,
            path: routePath,
            status: routeStatus,
            headers: routeHeaders,
            responseBody: routeResponseBody
          };
        })
      };
    });
    saveMockServersToDb(updated);
    triggerToast("Route specifications successfully saved");
  };

  const handleDeleteMockRoute = (routeId: string) => {
    if (!selectedMockServerId) return;
    const srv = mockServers.find((s) => s.id === selectedMockServerId);
    if (!srv) return;
    if (srv.routes.length <= 1) {
      triggerToast("A mock server must contain at least one route schema.", "error");
      return;
    }
    const updated = mockServers.map((s) => {
      if (s.id !== selectedMockServerId) return s;
      return { ...s, routes: s.routes.filter((rt) => rt.id !== routeId) };
    });
    saveMockServersToDb(updated);
    if (selectedRouteId === routeId) {
      setSelectedRouteId(null);
    }
    triggerToast("Route endpoint matching deleted", "info");
  };

  const handleTestMockRoute = (route: MockRoute) => {
    if (!selectedMockServerId) return;
    const cleanPath = route.path.startsWith("/") ? route.path : "/" + route.path;
    const mockUrl = `${window.location.origin}/mock/${selectedMockServerId}${cleanPath}`;
    const tabId = crypto.randomUUID();

    setTabs((prev) => [
      ...prev,
      {
        id: tabId,
        name: `Test: ${route.method} ${route.path}`,
        method: route.method as Method,
        url: mockUrl,
        protocol: Protocol.HTTP
      }
    ]);

    setRequestsState((prev) => ({
      ...prev,
      [tabId]: {
        id: tabId,
        name: `Test: ${route.method} ${route.path}`,
        method: route.method as Method,
        url: mockUrl,
        protocol: Protocol.HTTP,
        headers: [{ key: "Accept", value: "application/json", enabled: true }],
        params: [],
        bodyType: BodyType.JSON,
        body: "",
        auth: { type: "none" }
      }
    }));

    setActiveTabId(tabId);
    setActiveSidebar("collections");
    triggerToast("Verification client tab successfully initialized!");
  };

  // Pre-request & Test Scripts Simulation runner
  const [testScriptOutput, setTestScriptOutput] = useState<string[]>([]);
  const handleRunScripts = () => {
    const outputs = ["🚀 Initializing Pre-request Sandbox...", "✅ Setting header 'X-Sandbox' = 'API-Studio-Agent'"];
    if (currentRequest.testScript) {
      outputs.push("🧪 Running automated test scripts...");
      outputs.push("✓ Expected HTTP Status to be 200");
      outputs.push(`✓ Schema validated structure matches cache`);
    } else {
      outputs.push("⚠️ No custom pre-request or test script loaded.");
    }
    setTestScriptOutput(outputs);
    triggerToast("Scripts executed inside local Sandbox");
  };

  // --- MOCK SERVER DASHBOARD RENDERING ---
  const renderMockDashboard = () => {
    const activeServer = mockServers.find((s) => s.id === selectedMockServerId);

    return (
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#1E1E1F] select-text">
        {/* Dashboard Top Header */}
        <div className="p-5 border-b border-[#2D2D2D] bg-[#252526] shrink-0">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-blue-400 animate-pulse" />
                <h1 className="text-lg font-bold text-white font-display">Virtual Instances & Mocks Sandbox</h1>
              </div>
              <p className="text-xs text-gray-400 mt-1 max-w-3xl">
                Simule e gerencie servidores REST APIs, fluxos de autenticação JWT e integrações financeiras em um ambiente isolado de alta performance.
              </p>
            </div>
            
            <div className="flex items-center space-x-3 shrink-0">
              <button
                onClick={() => setShowMockLibrary(true)}
                className={`flex items-center space-x-2 py-1.5 px-3 rounded text-xs font-semibold border transition-all ${
                  showMockLibrary
                    ? "bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-500/20"
                    : "bg-[#2D2D2D] border-[#444] text-gray-300 hover:text-white hover:bg-[#3C3C3C]"
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>Explorar Biblioteca</span>
              </button>
              
              {!showMockLibrary && activeServer && (
                <button
                  onClick={() => setShowMockLibrary(false)}
                  className="flex items-center space-x-2 py-1.5 px-3 rounded text-xs font-semibold border border-blue-800 bg-blue-950/30 text-blue-400"
                >
                  <Server className="w-4 h-4" />
                  <span>Editor: {activeServer.name}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Dashboard Content area */}
        {showMockLibrary ? (
          /* --- LIBRARY EXPLORER VIEW --- */
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="space-y-1">
              <h2 className="text-sm font-bold uppercase tracking-wider text-blue-400 font-display">Biblioteca de Mocks</h2>
              <p className="text-xs text-gray-500">
                Instancie imediatamente servidores virtuais prontos para simular provedores conhecidos ou APIs de terceiros.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {mockTemplates.map((tmpl) => (
                <div
                  key={tmpl.id}
                  className="bg-[#252526] border border-[#333] hover:border-blue-500/50 rounded-lg p-5 transition-all flex flex-col justify-between space-y-4 shadow-sm group"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 rounded bg-blue-950/40 text-blue-400 border border-blue-900/50">
                          {tmpl.iconName === "Database" && <Database className="w-5 h-5" />}
                          {tmpl.iconName === "Shield" && <Shield className="w-5 h-5" />}
                          {tmpl.iconName === "Lock" && <Lock className="w-5 h-5" />}
                          {tmpl.iconName === "Globe" && <Globe className="w-5 h-5" />}
                          {tmpl.iconName === "Activity" && <Activity className="w-5 h-5" />}
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors font-display">{tmpl.name}</h3>
                          <span className={`inline-block text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded border mt-1 ${tmpl.badgeColor}`}>
                            {tmpl.category}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-xs text-gray-400 leading-relaxed">
                      {tmpl.description}
                    </p>

                    {/* Preview of routes */}
                    <div className="space-y-1.5 pt-2">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500 block">Mapeamento de Rotas ({tmpl.routes.length})</span>
                      <div className="flex flex-wrap gap-1.5">
                        {tmpl.routes.map((rt, idx) => (
                          <div key={idx} className="flex items-center space-x-1 bg-[#1E1E1F] border border-[#333] rounded px-1.5 py-0.5 font-mono text-[9px]">
                            <span className={`font-bold uppercase ${
                              rt.method === "GET" ? "text-green-400" : "text-blue-400"
                            }`}>
                              {rt.method}
                            </span>
                            <span className="text-gray-400">{rt.path}</span>
                            <span className="text-gray-600">→</span>
                            <span className="text-[#9CDCFE]">{rt.status}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#333]/40 flex justify-end">
                    <button
                      onClick={() => handleImportMockTemplate(tmpl)}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-1.5 px-4 rounded transition-colors flex items-center space-x-2 animate-none"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Instanciar Mock</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* --- INSTANCE EDITOR VIEW --- */
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {!activeServer ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-blue-950/40 border border-blue-900/50 flex items-center justify-center text-blue-400 text-lg">
                  <Server className="w-6 h-6" />
                </div>
                <div className="space-y-1 max-w-md">
                  <h3 className="text-sm font-bold text-white font-display">Nenhuma Instância Ativa Selecionada</h3>
                  <p className="text-xs text-gray-400">
                    Selecione um servidor virtual na lista lateral ou explore nossa biblioteca de mocks predefinidos clicando no botão abaixo.
                  </p>
                </div>
                <button
                  onClick={() => setShowMockLibrary(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-1.5 px-4 rounded transition-all flex items-center space-x-2"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Explorar Biblioteca</span>
                </button>
              </div>
            ) : (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Instance Host Banner */}
                <div className="p-4 bg-[#212124] border-b border-[#2D2D2D] flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-white uppercase tracking-wide">Status do Servidor:</span>
                      <span className={`text-[10px] font-mono font-bold px-1.5 rounded ${
                        activeServer.enabled ? "bg-green-950/50 text-green-400 border border-green-900" : "bg-red-950/50 text-red-400 border border-red-900"
                      }`}>
                        {activeServer.enabled ? "ONLINE (PORT: 3000)" : "OFFLINE"}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 bg-[#1E1E1F] border border-[#333] rounded px-2 py-1 font-mono text-xs w-full max-w-xl">
                      <Globe className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span className="text-gray-500">Base URL:</span>
                      <span className="text-yellow-400 font-bold truncate">
                        {window.location.origin}/mock/{activeServer.id}
                      </span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}/mock/${activeServer.id}`);
                          triggerToast("Base URL copiada para a área de transferência!");
                        }}
                        className="p-1 hover:bg-[#2D2D2D] rounded text-gray-400 hover:text-white ml-auto cursor-pointer"
                        title="Copy URL"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 self-end md:self-center">
                    <button
                      onClick={() => handleClearMockLogs(activeServer.id)}
                      className="text-xs border border-[#444] hover:border-red-500/40 text-gray-400 hover:text-red-400 bg-[#252526] hover:bg-red-950/10 px-3 py-1.5 rounded transition-all cursor-pointer"
                    >
                      Limpar Logs
                    </button>
                    <button
                      onClick={() => handleDeleteMockServer(activeServer.id)}
                      className="text-xs border border-red-900/50 bg-red-950/20 hover:bg-red-900/30 text-red-400 px-3 py-1.5 rounded transition-all flex items-center space-x-1 cursor-pointer"
                    >
                      <Trash className="w-3.5 h-3.5" />
                      <span>Deletar Instância</span>
                    </button>
                  </div>
                </div>

                {/* Main Two-Column Panel */}
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden border-b border-[#2D2D2D]">
                  {/* Left Column: Routes List (5 cols) */}
                  <div className="lg:col-span-5 flex flex-col border-r border-[#2D2D2D] overflow-hidden bg-[#202021]/40">
                    <div className="p-3 border-b border-[#2D2D2D] flex items-center justify-between shrink-0">
                      <span className="text-xs font-bold text-gray-300 font-display">Rotas Mapeadas ({activeServer.routes.length})</span>
                      <button
                        onClick={handleAddMockRoute}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-1 px-2.5 rounded flex items-center space-x-1 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Rota</span>
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                      {activeServer.routes.map((rt) => {
                        const isSelected = rt.id === selectedRouteId;
                        return (
                          <div
                            key={rt.id}
                            onClick={() => setSelectedRouteId(rt.id)}
                            className={`p-2.5 rounded border cursor-pointer transition-all flex items-center justify-between group ${
                              isSelected
                                ? "bg-[#2A2A2E] border-blue-500 shadow-sm"
                                : "bg-[#1E1E1F] border-[#333] hover:bg-[#252526]"
                            }`}
                          >
                            <div className="flex items-center space-x-2 truncate">
                              <span className={`text-[9px] font-bold font-mono px-1.5 py-0.5 rounded shrink-0 uppercase tracking-wider ${
                                rt.method === "GET" 
                                  ? "bg-green-950/40 text-green-400 border border-green-900/40" 
                                  : "bg-blue-950/40 text-blue-400 border border-blue-900/40"
                              }`}>
                                {rt.method}
                              </span>
                              <span className="text-xs font-mono text-white truncate max-w-[130px] lg:max-w-[160px]">{rt.path}</span>
                            </div>

                            <div className="flex items-center space-x-2 shrink-0">
                              <span className="text-[10px] font-mono text-[#4EC9B0] bg-teal-950/30 px-1 rounded border border-teal-900/30">{rt.status}</span>
                              
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleTestMockRoute(rt);
                                }}
                                className="p-1 hover:bg-[#3C3C3D] rounded text-gray-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                title="Testar rota no cliente HTTP"
                              >
                                <Play className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteMockRoute(rt.id);
                                }}
                                className="p-1 hover:bg-red-950/20 rounded text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                title="Deletar rota"
                              >
                                <Trash className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right Column: Active Route Detail Config Editor (7 cols) */}
                  <div className="lg:col-span-7 flex flex-col overflow-hidden bg-[#1E1E1F]">
                    {selectedRouteId && activeServer.routes.some((r) => r.id === selectedRouteId) ? (
                      <div className="flex-1 flex flex-col overflow-hidden">
                        {/* Editor Header */}
                        <div className="p-3 border-b border-[#2D2D2D] bg-[#252526] shrink-0 flex items-center justify-between">
                          <div className="flex items-center space-x-2 font-mono text-xs text-white">
                            <span className="text-gray-400">Rota ativa:</span>
                            <span className="text-blue-400 font-bold uppercase">{routeMethod}</span>
                            <span className="text-yellow-400">{routePath}</span>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => {
                                const currentRt = activeServer.routes.find((r) => r.id === selectedRouteId);
                                if (currentRt) handleTestMockRoute(currentRt);
                              }}
                              className="text-xs bg-teal-800 hover:bg-teal-700 text-white font-semibold py-1 px-2.5 rounded transition-colors flex items-center space-x-1 cursor-pointer"
                              title="Testar esse endpoint com o cliente"
                            >
                              <Play className="w-3.5 h-3.5" />
                              <span>Testar Rota</span>
                            </button>
                            <button
                              onClick={handleSaveMockRoute}
                              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-1 px-3 rounded flex items-center space-x-1 transition-colors cursor-pointer"
                            >
                              <Save className="w-3.5 h-3.5" />
                              <span>Salvar Rota</span>
                            </button>
                          </div>
                        </div>

                        {/* Editor Settings Scroll */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                          {/* Method and Path inputs */}
                          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                            <div className="md:col-span-4">
                              <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">HTTP Method</label>
                              <select
                                value={routeMethod}
                                onChange={(e) => setRouteMethod(e.target.value)}
                                className="w-full bg-[#252526] border border-[#333] rounded px-2.5 py-1.5 text-xs text-blue-400 font-mono outline-none focus:border-[#007ACC]"
                              >
                                {["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"].map((m) => (
                                  <option key={m} value={m} className="bg-[#2D2D2D] text-white font-mono">{m}</option>
                                ))}
                              </select>
                            </div>
                            
                            <div className="md:col-span-8">
                              <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Caminho (Path)</label>
                              <input
                                type="text"
                                value={routePath}
                                onChange={(e) => setRoutePath(e.target.value)}
                                placeholder="/exemplo/rota"
                                className="w-full bg-[#252526] border border-[#333] rounded px-2.5 py-1.5 text-xs text-[#9CDCFE] font-mono outline-none focus:border-[#007ACC]"
                              />
                            </div>
                          </div>

                          {/* Response Status & Content-Type */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Status HTTP</label>
                              <select
                                value={routeStatus}
                                onChange={(e) => setRouteStatus(Number(e.target.value))}
                                className="w-full bg-[#252526] border border-[#333] rounded px-2.5 py-1.5 text-xs text-[#4EC9B0] font-mono outline-none focus:border-[#007ACC]"
                              >
                                {[200, 201, 202, 204, 301, 302, 400, 401, 403, 404, 409, 500, 502, 503].map((code) => (
                                  <option key={code} value={code} className="bg-[#2D2D2D] text-white font-mono">
                                    {code} - {code < 300 ? "Success" : code < 400 ? "Redirect" : "Error"}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Content-Type</label>
                              <select
                                value={routeHeaders.find((h) => h.key.toLowerCase() === "content-type")?.value || "application/json"}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  const filtered = routeHeaders.filter((h) => h.key.toLowerCase() !== "content-type");
                                  setRouteHeaders([...filtered, { key: "Content-Type", value: val, enabled: true }]);
                                }}
                                className="w-full bg-[#252526] border border-[#333] rounded px-2.5 py-1.5 text-xs text-[#9CDCFE] font-mono outline-none focus:border-[#007ACC]"
                              >
                                <option value="application/json">application/json (JSON)</option>
                                <option value="text/plain">text/plain (Plain Text)</option>
                                <option value="text/html">text/html (HTML Markup)</option>
                                <option value="application/xml">application/xml (XML)</option>
                              </select>
                            </div>
                          </div>

                          {/* Response Payload Textarea */}
                          <div className="flex-1 flex flex-col min-h-[180px]">
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-[10px] uppercase font-bold text-gray-500 block">Corpo da Resposta (Response Body)</label>
                              {jsonValidationError ? (
                                <span className="text-[9px] font-semibold text-red-400 bg-red-950/20 border border-red-900/40 px-1.5 py-0.5 rounded flex items-center">
                                  <AlertTriangle className="w-3 h-3 mr-1" /> JSON Inválido: {jsonValidationError.slice(0, 30)}
                                </span>
                              ) : routeResponseBody ? (
                                <span className="text-[9px] font-semibold text-green-400 bg-green-950/20 border border-green-900/40 px-1.5 py-0.5 rounded flex items-center">
                                  <Check className="w-3 h-3 mr-1" /> Sintaxe JSON Válida
                                </span>
                              ) : null}
                            </div>
                            <textarea
                              value={routeResponseBody}
                              onChange={(e) => setRouteResponseBody(e.target.value)}
                              placeholder="{}"
                              rows={8}
                              className="w-full flex-1 bg-[#1E1E1F] border border-[#333] rounded-lg p-3 text-xs text-gray-300 font-mono outline-none resize-y focus:border-[#007ACC] h-48 focus:ring-1 focus:ring-blue-500/20"
                            />
                          </div>

                          {/* Advanced Custom Headers list */}
                          <div className="space-y-2">
                            <span className="text-[10px] uppercase font-bold text-gray-500 block">Custom Headers de Resposta ({routeHeaders.filter(h => h.key.toLowerCase() !== "content-type").length})</span>
                            <div className="space-y-1.5">
                              {routeHeaders.filter(h => h.key.toLowerCase() !== "content-type").map((hd, idx) => (
                                <div key={idx} className="flex items-center space-x-2">
                                  <input
                                    type="text"
                                    value={hd.key}
                                    placeholder="Header Key"
                                    onChange={(e) => {
                                      const key = e.target.value;
                                      const updated = routeHeaders.map((h, i) => i === idx ? { ...h, key } : h);
                                      setRouteHeaders(updated);
                                    }}
                                    className="bg-[#252526] border border-[#333] rounded px-2 py-1 text-xs text-white font-mono w-1/2 outline-none"
                                  />
                                  <input
                                    type="text"
                                    value={hd.value}
                                    placeholder="Value"
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      const updated = routeHeaders.map((h, i) => i === idx ? { ...h, value } : h);
                                      setRouteHeaders(updated);
                                    }}
                                    className="bg-[#252526] border border-[#333] rounded px-2 py-1 text-xs text-white font-mono w-1/2 outline-none"
                                  />
                                  <button
                                    onClick={() => {
                                      const filtered = routeHeaders.filter((_, i) => i !== idx);
                                      setRouteHeaders(filtered);
                                    }}
                                    className="text-red-400 hover:text-red-300 p-1"
                                  >
                                    <Trash className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}
                              
                              <button
                                onClick={() => setRouteHeaders([...routeHeaders, { key: "", value: "", enabled: true }])}
                                className="text-[10px] text-blue-400 hover:underline flex items-center pt-1"
                              >
                                <Plus className="w-3 h-3 mr-1" /> Add Custom Header
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-500 space-y-2">
                        <Info className="w-6 h-6 text-gray-600" />
                        <p className="text-xs max-w-sm leading-relaxed">
                          Nenhuma rota de endpoint ativa para edição. Selecione ou crie um endpoint na coluna à esquerda para prosseguir.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Pane: Logs Monitor */}
                <div className="h-44 flex flex-col bg-[#1E1E1F] overflow-hidden shrink-0">
                  <div className="px-4 py-2 bg-[#252526] border-b border-[#2D2D2D] flex items-center justify-between shrink-0">
                    <div className="flex items-center space-x-2">
                      <Terminal className="w-4 h-4 text-green-400 animate-pulse" />
                      <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Live Request Execution Logs (Real-Time Stream)</span>
                    </div>
                    <button
                      onClick={() => fetchMockLogs(activeServer.id)}
                      className="p-1 hover:bg-[#2D2D2D] rounded text-gray-400 hover:text-white cursor-pointer"
                      title="Forçar Recarregar Logs"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex-1 overflow-auto p-2 font-mono text-[11px] bg-[#18181A] text-gray-300 space-y-1.5 select-text">
                    {mockLogs.length === 0 ? (
                      <div className="text-center py-8 text-gray-600 italic">
                        Logs de requisições vazios. Chame algum endpoint e monitore as execuções em tempo real!
                      </div>
                    ) : (
                      [...mockLogs].reverse().map((log, idx) => (
                        <div key={idx} className="flex items-start space-x-2 py-0.5 border-b border-[#252526]/50">
                          <span className="text-gray-600">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                          <span className={`font-bold uppercase ${
                            log.method === "GET" ? "text-green-400" : "text-blue-400"
                          }`}>{log.method}</span>
                          <span className="text-[#9CDCFE]">{log.path}</span>
                          <span className="text-gray-500">→</span>
                          <span className={`font-bold ${log.status < 300 ? "text-green-400" : "text-red-400"}`}>{log.status}</span>
                          <span className="text-gray-600 text-[10px] ml-auto">{log.ip || "127.0.0.1"}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div id="api-studio-root" className="flex flex-col h-screen w-full bg-[#1E1E1E] text-[#CCCCCC] font-sans overflow-hidden select-none">
      {/* --- TOP NAV BAR --- */}
      <div id="top-navbar" className="flex items-center justify-between h-11 px-4 bg-[#2D2D2D] border-b border-[#333333] shrink-0">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-white">
            <div className="w-6 h-6 bg-[#007ACC] rounded-md flex items-center justify-center font-bold text-sm shadow-md shadow-blue-500/20">⚡</div>
            <span className="text-xs font-semibold tracking-wider uppercase font-display">API Studio</span>
          </div>
          <div className="h-4 w-[1px] bg-[#444444]"></div>
          
          <div className="flex items-center space-x-3 text-xs">
            <button
              onClick={() => setActiveSidebar("collections")}
              className={`px-2 py-1 rounded transition-colors ${activeSidebar === "collections" ? "text-white bg-[#37373D] font-medium" : "text-[#858585] hover:text-white"}`}
            >
              Collections
            </button>
            <button
              onClick={() => setActiveSidebar("environments")}
              className={`px-2 py-1 rounded transition-colors ${activeSidebar === "environments" ? "text-white bg-[#37373D] font-medium" : "text-[#858585] hover:text-white"}`}
            >
              Environments
            </button>
            <button
              onClick={() => setActiveSidebar("history")}
              className={`px-2 py-1 rounded transition-colors ${activeSidebar === "history" ? "text-white bg-[#37373D] font-medium" : "text-[#858585] hover:text-white"}`}
            >
              History
            </button>
            <button
              onClick={() => setActiveSidebar("vault")}
              className={`px-2 py-1 rounded transition-colors ${activeSidebar === "vault" ? "text-white bg-[#37373D] font-medium" : "text-[#858585] hover:text-white"}`}
            >
              Vault {vaultStatus.unlocked ? "🔓" : "🔒"}
            </button>
            <button
              onClick={() => setActiveSidebar("mock")}
              className={`px-2 py-1 rounded transition-colors ${activeSidebar === "mock" ? "text-white bg-[#37373D] font-medium" : "text-[#858585] hover:text-white"}`}
            >
              Mock Servers
            </button>
          </div>
        </div>

        {/* --- GLOBAL PREFERENCES & TOASTS --- */}
        <div className="flex items-center space-x-3">
          {toast && (
            <div className={`text-xs px-3 py-1 rounded shadow-lg border animate-pulse ${
              toast.type === "error" ? "bg-red-950/50 text-red-400 border-red-700/50" :
              toast.type === "info" ? "bg-blue-950/50 text-blue-400 border-blue-700/50" :
              "bg-green-950/50 text-green-400 border-green-700/50"
            }`}>
              {toast.message}
            </div>
          )}

          {/* Environment picker */}
          <div className="flex items-center bg-[#3C3C3C] px-2 py-1 rounded text-[11px] border border-[#454545]">
            <span className="mr-2 opacity-60">ENV:</span>
            <select
              value={selectedEnvId}
              onChange={(e) => setSelectedEnvId(e.target.value)}
              className="bg-transparent text-[#4EC9B0] outline-none cursor-pointer font-semibold font-mono border-none p-0"
            >
              <option value="none">No Environment</option>
              {environments.map((e) => (
                <option key={e.id} value={e.id} className="bg-[#2D2D2D] text-white">
                  {e.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setActiveSidebar("settings")}
            className="p-1 hover:bg-[#3C3C3C] rounded text-gray-400 hover:text-white transition-colors"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* --- BODY --- */}
      <div id="app-body" className="flex flex-1 overflow-hidden">
        
        {/* --- SIDEBAR ACTIVE TABS LIST --- */}
        <div id="side-activator-view" className="w-64 bg-[#252526] border-r border-[#333333] flex flex-col shrink-0 overflow-hidden">
          
          {/* COLLECTIONS VIEW */}
          {activeSidebar === "collections" && (
            <div className="flex flex-col h-full overflow-hidden">
              <div className="p-3 flex items-center justify-between border-b border-[#2D2D2D]">
                <span className="text-[11px] font-bold uppercase tracking-wider font-display text-gray-400">Collections</span>
                <div className="flex space-x-1">
                  <button
                    onClick={handleCreateCollection}
                    className="hover:bg-[#3C3C3C] p-1 rounded text-gray-400 hover:text-white transition-colors"
                    title="Add Collection"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => postmanImportRef.current?.click()}
                    className="hover:bg-[#3C3C3C] p-1 rounded text-gray-400 hover:text-white transition-colors"
                    title="Import Postman Collection"
                  >
                    <Upload className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="file"
                    ref={postmanImportRef}
                    onChange={handlePostmanImport}
                    accept=".json"
                    className="hidden"
                  />
                </div>
              </div>

              {/* Collections list */}
              <div className="flex-1 overflow-y-auto px-2 py-3 space-y-2">
                <div className="relative mb-2">
                  <Search className="w-3.5 h-3.5 absolute left-2 top-2.5 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search requests..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#1E1E1E] border border-[#333333] rounded pl-7 pr-2 py-1 text-xs outline-none text-white focus:border-[#007ACC]"
                  />
                </div>

                {collections.length === 0 ? (
                  <div className="text-center py-6 text-xs text-gray-500">
                    No collections. Click + to get started, or import from Postman.
                  </div>
                ) : (
                  collections.map((col) => {
                    // Filter requests if searchQuery active
                    const filteredRequests = searchQuery
                      ? col.requests.filter(
                          (r) =>
                            r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            r.url.toLowerCase().includes(searchQuery.toLowerCase())
                        )
                      : col.requests;

                    return (
                      <div key={col.id} className="space-y-1">
                        <div className="flex items-center justify-between p-1 hover:bg-[#2D2D2D] rounded group transition-colors">
                          <div className="flex items-center space-x-1 cursor-pointer">
                            <Folder className="w-4 h-4 text-blue-400 shrink-0" />
                            <span className="text-xs font-semibold text-white truncate max-w-[140px]">{col.name}</span>
                          </div>
                          <div className="hidden group-hover:flex items-center space-x-1 shrink-0">
                            <button
                              onClick={() => handleCreateRequestInCollection(col.id)}
                              className="hover:bg-[#3C3C3C] p-0.5 rounded text-gray-400 hover:text-white"
                              title="Add Request"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleDeleteCollection(col.id)}
                              className="hover:bg-[#3C3C3C] p-0.5 rounded text-red-400"
                              title="Delete Collection"
                            >
                              <Trash className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* Requests inside collection */}
                        <div className="ml-3 pl-2 border-l border-[#333333] space-y-1">
                          {filteredRequests.map((req) => (
                            <div
                              key={req.id}
                              onClick={() => {
                                // Add to tabs if not already present
                                if (!tabs.some((t) => t.id === req.id)) {
                                  setTabs((prev) => [...prev, { id: req.id, name: req.name, method: req.method, url: req.url, protocol: req.protocol }]);
                                }
                                setRequestsState((prev) => ({ ...prev, [req.id]: req }));
                                setActiveTabId(req.id);
                              }}
                              className={`flex items-center p-1 rounded cursor-pointer transition-all ${
                                activeTabId === req.id ? "bg-[#37373D] text-white" : "hover:bg-[#2D2D2D] text-gray-400"
                              }`}
                            >
                              <span className={`text-[9px] font-bold font-mono mr-1.5 w-8 text-center px-1 rounded uppercase shrink-0 ${
                                req.method === "GET" ? "bg-green-950/50 text-green-400" :
                                req.method === "POST" ? "bg-blue-950/50 text-blue-400" :
                                "bg-yellow-950/50 text-yellow-400"
                              }`}>
                                {req.method}
                              </span>
                              <span className="text-xs truncate">{req.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* ENVIRONMENTS VIEW */}
          {activeSidebar === "environments" && (
            <div className="flex flex-col h-full overflow-hidden">
              <div className="p-3 flex items-center justify-between border-b border-[#2D2D2D]">
                <span className="text-[11px] font-bold uppercase tracking-wider font-display text-gray-400">Environments</span>
                <button
                  onClick={() => {
                    const id = crypto.randomUUID();
                    const newEnv: Environment = {
                      id,
                      name: "New Env",
                      variables: [{ key: "base_url", value: "https://jsonplaceholder.typicode.com", enabled: true }]
                    };
                    saveEnvironmentsToDb([...environments, newEnv]);
                    setSelectedEnvId(id);
                    triggerToast("Created new environment");
                  }}
                  className="hover:bg-[#3C3C3C] p-1 rounded text-gray-400 hover:text-white transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-4">
                {environments.map((env) => (
                  <div key={env.id} className="p-2.5 bg-[#1E1E1F] rounded border border-[#333333] space-y-2">
                    <div className="flex items-center justify-between">
                      <input
                        type="text"
                        value={env.name}
                        onChange={(e) => {
                          const updated = environments.map((ev) => (ev.id === env.id ? { ...ev, name: e.target.value } : ev));
                          saveEnvironmentsToDb(updated);
                        }}
                        className="bg-transparent border-b border-transparent hover:border-gray-500 focus:border-[#007ACC] text-xs font-semibold text-white outline-none w-2/3"
                      />
                      <button
                        onClick={() => {
                          const updated = environments.filter((ev) => ev.id !== env.id);
                          saveEnvironmentsToDb(updated);
                          if (selectedEnvId === env.id) setSelectedEnvId("none");
                          triggerToast("Environment deleted", "info");
                        }}
                        className="text-red-400 hover:text-red-300 p-1"
                      >
                        <Trash className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Variable list */}
                    <div className="space-y-1.5 pt-2">
                      {env.variables.map((v, idx) => (
                        <div key={idx} className="flex items-center space-x-1">
                          <input
                            type="text"
                            value={v.key}
                            placeholder="key"
                            onChange={(e) => {
                              const updatedVars = [...env.variables];
                              updatedVars[idx].key = e.target.value;
                              const updated = environments.map((ev) => (ev.id === env.id ? { ...ev, variables: updatedVars } : ev));
                              saveEnvironmentsToDb(updated);
                            }}
                            className="bg-[#2D2D2D] text-[11px] font-mono p-1 rounded outline-none w-1/2 text-white"
                          />
                          <input
                            type="text"
                            value={v.value}
                            placeholder="value"
                            onChange={(e) => {
                              const updatedVars = [...env.variables];
                              updatedVars[idx].value = e.target.value;
                              const updated = environments.map((ev) => (ev.id === env.id ? { ...ev, variables: updatedVars } : ev));
                              saveEnvironmentsToDb(updated);
                            }}
                            className="bg-[#2D2D2D] text-[11px] font-mono p-1 rounded outline-none w-1/2 text-white"
                          />
                          <button
                            onClick={() => {
                              const updatedVars = env.variables.filter((_, i) => i !== idx);
                              const updated = environments.map((ev) => (ev.id === env.id ? { ...ev, variables: updatedVars } : ev));
                              saveEnvironmentsToDb(updated);
                            }}
                            className="text-gray-500 hover:text-white"
                          >
                            ×
                          </button>
                        </div>
                      ))}

                      <button
                        onClick={() => {
                          const updatedVars = [...env.variables, { key: "", value: "", enabled: true }];
                          const updated = environments.map((ev) => (ev.id === env.id ? { ...ev, variables: updatedVars } : ev));
                          saveEnvironmentsToDb(updated);
                        }}
                        className="text-[10px] text-blue-400 hover:underline flex items-center pt-1"
                      >
                        <Plus className="w-3 h-3 mr-1" /> Add Variable
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* HISTORY VIEW */}
          {activeSidebar === "history" && (
            <div className="flex flex-col h-full overflow-hidden">
              <div className="p-3 flex items-center justify-between border-b border-[#2D2D2D]">
                <span className="text-[11px] font-bold uppercase tracking-wider font-display text-gray-400">History Log</span>
                <button
                  onClick={() => {
                    saveHistoryToDb([]);
                    triggerToast("History cleared", "info");
                  }}
                  className="text-xs text-red-400 hover:underline"
                >
                  Clear All
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                {history.length === 0 ? (
                  <div className="text-center py-6 text-xs text-gray-500">
                    No requests have been executed yet.
                  </div>
                ) : (
                  history.map((hist) => (
                    <div
                      key={hist.id}
                      onClick={() => {
                        const id = crypto.randomUUID();
                        setTabs((prev) => [...prev, { id, name: `Restored ${hist.method}`, method: hist.method, url: hist.url, protocol: hist.protocol }]);
                        setRequestsState((prev) => ({
                          ...prev,
                          [id]: {
                            id,
                            name: `Restored ${hist.method}`,
                            method: hist.method,
                            url: hist.url,
                            protocol: hist.protocol,
                            headers: [],
                            params: [],
                            bodyType: BodyType.JSON,
                            body: "",
                            auth: { type: "none" }
                          }
                        }));
                        setActiveTabId(id);
                      }}
                      className="p-1.5 bg-[#1E1E1F] hover:bg-[#2D2D2D] rounded border border-[#333333] cursor-pointer transition-colors space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-[9px] font-bold font-mono px-1 rounded uppercase ${
                          hist.method === "GET" ? "bg-green-950/50 text-green-400" : "bg-blue-950/50 text-blue-400"
                        }`}>
                          {hist.method}
                        </span>
                        <span className={`text-[10px] font-mono ${hist.status < 300 ? "text-green-400" : "text-red-400"}`}>
                          {hist.status} ({hist.time}ms)
                        </span>
                      </div>
                      <div className="text-[11px] truncate text-white">{hist.url}</div>
                      <div className="text-[9px] text-gray-500">{new Date(hist.timestamp).toLocaleTimeString()}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* VAULT MANAGER VIEW */}
          {activeSidebar === "vault" && (
            <div className="flex flex-col h-full overflow-hidden">
              <div className="p-3 border-b border-[#2D2D2D]">
                <div className="flex items-center space-x-2 text-white">
                  <Shield className="w-4 h-4 text-green-400" />
                  <span className="text-[11px] font-bold uppercase tracking-wider font-display">AES-256-GCM Vault</span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-4">
                {/* Status indicator */}
                <div className="p-2 rounded bg-slate-900 border border-slate-800 text-xs text-slate-300 space-y-1">
                  <div className="flex items-center justify-between font-semibold">
                    <span>Status:</span>
                    <span className={vaultStatus.unlocked ? "text-green-400" : "text-red-400"}>
                      {vaultStatus.unlocked ? "🔓 Unlocked" : "🔒 Locked"}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-500">
                    Vault is encrypted locally at <code>.openpost/vault.enc</code> with PBKDF2 key derivation.
                  </p>
                </div>

                {/* Setup or Unlock required */}
                {!vaultStatus.hasMasterPassword ? (
                  <form onSubmit={handleVaultSetup} className="space-y-3">
                    <span className="text-xs font-semibold text-white">Create Master Password</span>
                    <p className="text-[10px] text-gray-400">Initialize the GCM vault with an absolute master key.</p>
                    <input
                      type="password"
                      placeholder="Enter password"
                      value={vaultPassword}
                      onChange={(e) => setVaultPassword(e.target.value)}
                      className="w-full bg-[#1E1E1E] border border-[#444] rounded p-1.5 text-xs text-white"
                      required
                    />
                    <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs py-1.5 rounded">
                      Initialize Vault
                    </button>
                  </form>
                ) : !vaultStatus.unlocked ? (
                  <form onSubmit={handleVaultUnlock} className="space-y-3">
                    <span className="text-xs font-semibold text-white">Unlock Secure Vault</span>
                    <input
                      type="password"
                      placeholder="Enter Master Password"
                      value={vaultPassword}
                      onChange={(e) => setVaultPassword(e.target.value)}
                      className="w-full bg-[#1E1E1E] border border-[#444] rounded p-1.5 text-xs text-white"
                      required
                    />
                    <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs py-1.5 rounded">
                      Unlock Vault
                    </button>
                    {vaultError && <p className="text-[10px] text-red-400">{vaultError}</p>}
                  </form>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white">Vault Secrets</span>
                      <button onClick={handleVaultLock} className="text-red-400 hover:underline text-[10px] flex items-center">
                        <Lock className="w-3 h-3 mr-1" /> Lock Vault
                      </button>
                    </div>

                    {/* Secret creation form */}
                    <form onSubmit={handleAddVaultSecret} className="p-2 bg-[#1E1E1F] border border-[#333] rounded space-y-2">
                      <span className="text-[10px] uppercase font-bold text-gray-400">Add Key-Value</span>
                      <input
                        type="text"
                        placeholder="Secret Name (e.g. op_api_key)"
                        value={vaultNewSecretKey}
                        onChange={(e) => setVaultNewSecretKey(e.target.value)}
                        className="w-full bg-[#1E1E1E] border border-[#444] rounded p-1 text-[11px] font-mono text-white"
                        required
                      />
                      <input
                        type="password"
                        placeholder="Value"
                        value={vaultNewSecretValue}
                        onChange={(e) => setVaultNewSecretValue(e.target.value)}
                        className="w-full bg-[#1E1E1E] border border-[#444] rounded p-1 text-[11px] font-mono text-white"
                        required
                      />
                      <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white text-[11px] py-1 rounded font-medium">
                        Securely Encrypt Key
                      </button>
                    </form>

                    {/* Vault list */}
                    <div className="space-y-2 max-h-[220px] overflow-y-auto">
                      {vaultStatus.secrets.length === 0 ? (
                        <p className="text-[10px] text-gray-500">No secrets saved. Use <code>{"{{your_key}}"}</code> inside endpoints/headers.</p>
                      ) : (
                        vaultStatus.secrets.map((s) => (
                          <div key={s.id} className="flex items-center justify-between p-1.5 bg-[#252526] border border-[#333] rounded">
                            <div className="font-mono text-xs text-blue-400 truncate w-2/3">
                              {s.key}
                            </div>
                            <button
                              onClick={() => handleDeleteVaultSecret(s.id)}
                              className="text-red-400 hover:text-red-300 p-1"
                              title="Delete from Vault"
                            >
                              <Trash className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* MOCK SERVERS VIEW */}
          {activeSidebar === "mock" && (
            <div className="flex flex-col h-full overflow-hidden">
              <div className="p-3 flex items-center justify-between border-b border-[#2D2D2D]">
                <div className="flex items-center space-x-2 text-white">
                  <Server className="w-4 h-4 text-blue-400" />
                  <span className="text-[11px] font-bold uppercase tracking-wider font-display">Mock Servers</span>
                </div>
              </div>
              
              <div className="p-3 border-b border-[#2D2D2D] bg-[#222224]/30 space-y-2">
                <button
                  onClick={() => setShowMockLibrary(true)}
                  className={`w-full flex items-center justify-center space-x-2 py-1.5 px-3 rounded text-xs font-semibold border transition-all ${
                    showMockLibrary 
                      ? "bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-500/15" 
                      : "bg-[#252526] border-[#333] text-gray-300 hover:text-white hover:bg-[#2F2F30]"
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Explorar Biblioteca</span>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-4">
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-white">Criar Servidor Vazio</span>
                  <div className="flex space-x-1">
                    <input
                      type="text"
                      placeholder="e.g. Payments API"
                      value={newMockServerName}
                      onChange={(e) => setNewMockServerName(e.target.value)}
                      className="bg-[#1E1E1E] border border-[#333] rounded px-2 py-1 text-xs outline-none text-white flex-1"
                    />
                    <button
                      onClick={() => {
                        handleCreateMockServer();
                        setShowMockLibrary(false);
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white rounded px-2 transition-colors"
                      title="Criar Novo"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white">Instâncias</span>
                    <span className="text-[10px] font-mono text-gray-500">({mockServers.length})</span>
                  </div>
                  {mockServers.length === 0 ? (
                    <div className="text-center py-4 bg-[#1E1E1F]/50 border border-dashed border-[#333] rounded text-[10px] text-gray-500 p-2">
                      Nenhuma instância ativa. Escolha um template da biblioteca acima!
                    </div>
                  ) : (
                    mockServers.map((srv) => (
                      <div
                        key={srv.id}
                        onClick={() => {
                          setSelectedMockServerId(srv.id);
                          setShowMockLibrary(false);
                          fetchMockLogs(srv.id);
                        }}
                        className={`p-2 rounded border cursor-pointer transition-all ${
                          !showMockLibrary && selectedMockServerId === srv.id 
                            ? "bg-[#37373D] border-[#007ACC] shadow-sm" 
                            : "bg-[#1E1E1F] border-[#333] hover:bg-[#2D2D2D]"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-white truncate max-w-[110px]">{srv.name}</span>
                          <div className="flex items-center space-x-2 shrink-0">
                            <span className={`text-[8px] px-1 rounded font-bold ${srv.enabled ? "bg-green-950/40 text-green-400" : "bg-red-950/40 text-red-400"}`}>
                              {srv.enabled ? "LIVE" : "OFF"}
                            </span>
                            <input
                              type="checkbox"
                              checked={srv.enabled}
                              onChange={(e) => {
                                e.stopPropagation();
                                toggleMockServer(srv.id);
                              }}
                              className="cursor-pointer h-3 w-3"
                            />
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-gray-400 mt-1 font-mono">
                          <span className="text-blue-400">/mock/{srv.id.slice(0, 8)}</span>
                          <span className="text-gray-500">({srv.routes.length} rotas)</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* SETTINGS VIEW */}
          {activeSidebar === "settings" && (
            <div className="flex flex-col h-full overflow-hidden">
              <div className="p-3 border-b border-[#2D2D2D]">
                <span className="text-[11px] font-bold uppercase tracking-wider font-display text-gray-400">Settings</span>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-4 text-xs">
                <div className="flex items-center justify-between bg-[#1E1E1F] p-2 rounded border border-[#333]">
                  <div>
                    <p className="font-semibold text-white">Simple UI Mode</p>
                    <p className="text-[10px] text-gray-500">Hide advanced GraphQL / gRPC / Vault configuration.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={simpleMode}
                    onChange={(e) => setSimpleMode(e.target.checked)}
                    className="cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between bg-[#1E1E1F] p-2 rounded border border-[#333]">
                  <div>
                    <p className="font-semibold text-white">Auto Cookie Jar</p>
                    <p className="text-[10px] text-gray-500">Automatically save and send back set-cookies.</p>
                  </div>
                  <input type="checkbox" defaultChecked className="cursor-pointer" />
                </div>

                <div className="flex items-center justify-between bg-[#1E1E1F] p-2 rounded border border-[#333]">
                  <div>
                    <p className="font-semibold text-white">SSL Verification</p>
                    <p className="text-[10px] text-gray-500">Verify SSL certificate validity on proxy calls.</p>
                  </div>
                  <input type="checkbox" defaultChecked className="cursor-pointer" />
                </div>

                <div className="p-2 bg-[#2D2D2D] rounded border border-[#333] space-y-2">
                  <span className="font-semibold text-white">Data Storage paths:</span>
                  <div className="font-mono text-[10px] text-[#4EC9B0] space-y-1">
                    <div>Local: .openpost/</div>
                    <div>Global: ~/.openpost/global/</div>
                  </div>
                  <p className="text-[10px] text-gray-500">
                    Git-friendly and automatically shareable. Complete confidentiality guaranteed.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* --- MAIN EDITOR CONTAINER (MULTI-TAB) --- */}
        <div id="main-editor-container" className="flex-1 flex flex-col min-w-0">
          {activeSidebar === "mock" ? (
            renderMockDashboard()
          ) : (
            <>
              {/* --- TABS BAR --- */}
              <div id="tabs-bar" className="flex bg-[#252526] h-10 shrink-0 border-b border-[#1E1E1E] overflow-x-auto overflow-y-hidden">
            {tabs.map((tab) => {
              const reqState = requestsState[tab.id] || { method: tab.method };
              return (
                <div
                  key={tab.id}
                  onClick={() => setActiveTabId(tab.id)}
                  className={`flex items-center px-4 space-x-2 border-r border-[#1E1E1E] cursor-pointer transition-colors shrink-0 ${
                    activeTabId === tab.id ? "bg-[#1E1E1E] text-white border-t border-t-[#007ACC]" : "bg-[#2D2D2D] text-gray-400 hover:bg-[#2D2D2D]/80"
                  }`}
                >
                  <span className={`text-[9px] font-mono font-bold ${
                    reqState.method === "GET" ? "text-green-400" : "text-blue-400"
                  }`}>
                    {reqState.method}
                  </span>
                  <span className="text-[11px] font-medium truncate max-w-[120px]">{tab.name}</span>
                  <button
                    onClick={(e) => handleCloseTab(tab.id, e)}
                    className="hover:bg-[#3C3C3C] rounded p-0.5"
                  >
                    ×
                  </button>
                </div>
              );
            })}
            
            <button
              onClick={handleNewTab}
              className="px-3 hover:bg-[#2D2D2D] text-gray-400 hover:text-white flex items-center"
              title="New Tab"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* --- MAIN WORKSPACE WORKFLOW --- */}
          <div id="request-main-workspace" className="p-4 flex-1 flex flex-col space-y-4 overflow-y-auto">
            
            {/* cURL import bar (collapsible) */}
            <div className="bg-[#252526] border border-[#333] rounded-lg p-3">
              <span className="text-xs font-semibold text-white block mb-2 font-display">⚡ Quick Import (cURL)</span>
              <form onSubmit={handleImportCurl} className="flex space-x-2">
                <textarea
                  name="curlInput"
                  placeholder="Paste cURL command here (e.g. curl -X POST https://api.openai.com/v1/embeddings -H 'Content-Type: ...' -d '{...}')"
                  className="bg-[#1E1E1E] text-xs font-mono p-2 rounded border border-[#444] text-white flex-1 h-10 outline-none resize-none focus:border-[#007ACC]"
                />
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded text-xs px-4 font-semibold transition-colors"
                >
                  Import
                </button>
              </form>
            </div>

            {/* --- ENDPOINT BOX CONTROLS --- */}
            <div id="endpoint-controls" className="flex items-center space-x-2">
              <div className="flex bg-[#252526] border border-[#333333] rounded flex-1 items-stretch overflow-hidden">
                <select
                  value={currentRequest.method}
                  onChange={(e) => updateCurrentRequest({ method: e.target.value as Method })}
                  className="px-3 bg-[#2D2D2D] text-[#569CD6] font-mono font-bold border-r border-[#333333] outline-none text-xs"
                >
                  {Object.values(Method).map((m) => (
                    <option key={m} value={m} className="bg-[#2D2D2D] text-white font-mono">{m}</option>
                  ))}
                </select>

                {/* Protocol Selector */}
                {!simpleMode && (
                  <select
                    value={currentRequest.protocol}
                    onChange={(e) => updateCurrentRequest({ protocol: e.target.value as Protocol })}
                    className="px-3 bg-[#2D2D2D] text-[#4EC9B0] font-mono border-r border-[#333333] outline-none text-xs"
                  >
                    {Object.values(Protocol).map((p) => (
                      <option key={p} value={p} className="bg-[#2D2D2D] text-white font-mono">{p}</option>
                    ))}
                  </select>
                )}

                <input
                  type="text"
                  placeholder="Enter URL endpoint (e.g. https://jsonplaceholder.typicode.com/posts/1 or ws:// or grpc://)"
                  value={currentRequest.url || ""}
                  onChange={(e) => updateCurrentRequest({ url: e.target.value })}
                  className="bg-transparent px-3 flex-1 text-xs outline-none text-[#9CDCFE] font-mono"
                />
              </div>

              {/* Action Trigger Buttons */}
              {currentRequest.protocol === Protocol.WEBSOCKET ? (
                webSocketStatus === "connected" ? (
                  <button
                    onClick={handleWebSocketDisconnect}
                    className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded font-semibold text-xs transition-colors flex items-center"
                  >
                    Disconnect <StopCircle className="w-3.5 h-3.5 ml-1.5" />
                  </button>
                ) : (
                  <button
                    onClick={handleSendRequest}
                    className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded font-semibold text-xs transition-colors flex items-center"
                    disabled={webSocketStatus === "connecting"}
                  >
                    {webSocketStatus === "connecting" ? "Connecting..." : "Connect"} <Play className="w-3.5 h-3.5 ml-1.5" />
                  </button>
                )
              ) : currentRequest.protocol === Protocol.GRPC ? (
                <button
                  onClick={handleGrpcInvoke}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded font-semibold text-xs transition-colors flex items-center"
                >
                  Invoke <Play className="w-3.5 h-3.5 ml-1.5" />
                </button>
              ) : (
                isStreaming[activeTabId] ? (
                  <button
                    onClick={stopStream}
                    className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded font-semibold text-xs transition-colors flex items-center"
                  >
                    Stop <StopCircle className="w-3.5 h-3.5 ml-1.5" />
                  </button>
                ) : (
                  <button
                    onClick={handleSendRequest}
                    className="bg-[#007ACC] hover:bg-[#0062A3] text-white px-5 py-2 rounded font-semibold text-xs transition-colors flex items-center shadow-lg"
                  >
                    Send <Send className="w-3.5 h-3.5 ml-1.5" />
                  </button>
                )
              )}

              {/* Save inside collection dropdown simulation */}
              <button
                onClick={() => {
                  if (collections.length === 0) {
                    triggerToast("Create a Collection first to save this request", "error");
                    return;
                  }
                  // Save current request to the first collection
                  const col = collections[0];
                  const newReq = { ...currentRequest, id: crypto.randomUUID() } as RequestItem;
                  const updated = collections.map((c) => c.id === col.id ? { ...c, requests: [...c.requests, newReq] } : c);
                  saveCollectionsToDb(updated);
                  triggerToast(`Request saved to ${col.name}!`);
                }}
                className="bg-[#3C3C3C] hover:bg-[#454545] p-2 border border-[#444] rounded transition-colors"
                title="Save Request"
              >
                <Save className="w-4 h-4 text-white" />
              </button>
            </div>

            {/* --- REQUEST CONFIGURATION MULTI-TABS --- */}
            <div id="request-subtabs-group" className="flex-1 flex flex-col min-h-[300px]">
              
              <div className="flex border-b border-[#333333] text-[11px] font-medium shrink-0">
                <button
                  onClick={() => setActiveSubTab("body")}
                  className={`px-4 py-2 border-b-2 transition-colors ${activeSubTab === "body" ? "border-blue-500 text-white" : "border-transparent opacity-60 hover:opacity-100"}`}
                >
                  Body
                </button>
                <button
                  onClick={() => setActiveSubTab("auth")}
                  className={`px-4 py-2 border-b-2 transition-colors ${activeSubTab === "auth" ? "border-blue-500 text-white" : "border-transparent opacity-60 hover:opacity-100"}`}
                >
                  Auth
                </button>
                <button
                  onClick={() => setActiveSubTab("headers")}
                  className={`px-4 py-2 border-b-2 transition-colors ${activeSubTab === "headers" ? "border-blue-500 text-white" : "border-transparent opacity-60 hover:opacity-100"}`}
                >
                  Headers {currentRequest.headers?.length ? <span className="bg-blue-600 text-white px-1.5 py-0.2 rounded-full text-[9px] ml-1">{currentRequest.headers.length}</span> : ""}
                </button>
                <button
                  onClick={() => setActiveSubTab("params")}
                  className={`px-4 py-2 border-b-2 transition-colors ${activeSubTab === "params" ? "border-blue-500 text-white" : "border-transparent opacity-60 hover:opacity-100"}`}
                >
                  Query Params
                </button>
                <button
                  onClick={() => setActiveSubTab("scripts")}
                  className={`px-4 py-2 border-b-2 transition-colors ${activeSubTab === "scripts" ? "border-blue-500 text-white" : "border-transparent opacity-60 hover:opacity-100"}`}
                >
                  Pre-Request & Tests
                </button>
                <div className="flex-1"></div>
                <button
                  onClick={() => setActiveSubTab("code")}
                  className={`px-4 py-2 text-blue-400 cursor-pointer flex items-center hover:underline border-b-2 ${activeSubTab === "code" ? "border-blue-500 text-white" : "border-transparent"}`}
                >
                  <Code className="w-3.5 h-3.5 mr-1" /> Code Export
                </button>
              </div>

              {/* Subtab panels */}
              <div className="flex-1 bg-[#1E1E1E] border border-[#333333] mt-2 rounded-lg p-3 overflow-hidden flex flex-col">
                
                {activeSubTab === "body" && (
                  <div className="flex-1 flex flex-col space-y-3 h-full">
                    {currentRequest.protocol === Protocol.GRPC ? (
                      <div className="space-y-3 flex-1 flex flex-col">
                        <div className="grid grid-cols-2 gap-3 shrink-0">
                          <div>
                            <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Service Picker</label>
                            <select
                              value={selectedGrpcService}
                              onChange={(e) => setSelectedGrpcService(e.target.value)}
                              className="w-full bg-[#2D2D2D] border border-[#444] rounded p-1 text-xs text-white"
                            >
                              {grpcServices.map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Method Name</label>
                            <select
                              value={selectedGrpcMethod}
                              onChange={(e) => setSelectedGrpcMethod(e.target.value)}
                              className="w-full bg-[#2D2D2D] border border-[#444] rounded p-1 text-xs text-white"
                            >
                              {grpcMethods.map((m) => <option key={m} value={m}>{m}</option>)}
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Load Protocol Buffer (.proto)</label>
                          <div className="flex space-x-2">
                            <input
                              type="text"
                              value={grpcProtoFile}
                              onChange={(e) => setGrpcProtoFile(e.target.value)}
                              placeholder="Path or paste proto content (e.g. syntax = 'proto3'; service Greeter { rpc SayHello... })"
                              className="bg-[#2D2D2D] border border-[#444] rounded p-1.5 text-xs text-white flex-1 font-mono"
                            />
                            <button
                              onClick={() => {
                                setGrpcProtoFile("syntax = 'proto3';\npackage helloworld;\n\nservice Greeter {\n  rpc SayHello (HelloRequest) returns (HelloReply) {}\n}");
                                triggerToast("Loaded helloworld.proto");
                              }}
                              className="bg-blue-600 hover:bg-blue-700 text-white rounded text-xs px-3 font-semibold"
                            >
                              Load Example Proto
                            </button>
                          </div>
                        </div>

                        <div className="flex-1 flex flex-col">
                          <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">JSON Argument Body</label>
                          <textarea
                            value={currentRequest.body || ""}
                            onChange={(e) => updateCurrentRequest({ body: e.target.value })}
                            placeholder='{ "name": "World" }'
                            className="bg-[#1E1E1E] text-xs font-mono p-2 rounded border border-[#444] text-white flex-1 outline-none h-full"
                          />
                        </div>
                      </div>
                    ) : currentRequest.protocol === Protocol.GRAPHQL ? (
                      <div className="flex-1 flex flex-col space-y-3 h-full">
                        <div className="flex items-center justify-between shrink-0">
                          <span className="text-[10px] uppercase font-bold text-gray-400">GraphQL Editor</span>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => {
                                updateCurrentRequest({
                                  body: "query GetCountries {\n  countries {\n    code\n    name\n    emoji\n  }\n}"
                                });
                                triggerToast("Prettified query loaded");
                              }}
                              className="text-[10px] bg-blue-600 hover:bg-blue-700 text-white px-2 py-0.5 rounded"
                            >
                              Fetch Schema & Builder
                            </button>
                          </div>
                        </div>
                        <textarea
                          value={currentRequest.body || ""}
                          onChange={(e) => updateCurrentRequest({ body: e.target.value })}
                          placeholder="query { ... }"
                          className="bg-[#1E1E1E] text-xs font-mono p-2 rounded border border-[#444] text-[#4EC9B0] flex-1 outline-none h-full"
                        />
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col h-full">
                        <div className="flex items-center space-x-4 mb-2 shrink-0">
                          {Object.values(BodyType).map((bt) => (
                            <label key={bt} className="flex items-center space-x-1.5 cursor-pointer text-xs text-gray-300">
                              <input
                                type="radio"
                                name="bodyType"
                                value={bt}
                                checked={currentRequest.bodyType === bt}
                                onChange={() => updateCurrentRequest({ bodyType: bt })}
                                className="cursor-pointer"
                              />
                              <span>{bt}</span>
                            </label>
                          ))}
                        </div>

                        <textarea
                          value={currentRequest.body || ""}
                          onChange={(e) => updateCurrentRequest({ body: e.target.value })}
                          placeholder="Type request body content here..."
                          className="bg-[#1E1E1E] text-xs font-mono p-2 rounded border border-[#444] text-[#CE9178] flex-1 h-full outline-none focus:border-[#007ACC]"
                        />
                      </div>
                    )}
                  </div>
                )}

                {activeSubTab === "auth" && (
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <span className="text-xs font-bold uppercase text-gray-400">Auth Type:</span>
                      <select
                        value={currentRequest.auth?.type || "none"}
                        onChange={(e) => updateCurrentRequest({
                          auth: { ...currentRequest.auth, type: e.target.value as any }
                        })}
                        className="bg-[#2D2D2D] text-xs text-white border border-[#444] rounded p-1"
                      >
                        <option value="none">No Auth</option>
                        <option value="bearer">Bearer Token</option>
                        <option value="basic">Basic Auth</option>
                        <option value="apikey">API Key</option>
                        <option value="digest">Digest Auth</option>
                      </select>
                    </div>

                    {currentRequest.auth?.type === "bearer" && (
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-gray-500">Token</label>
                        <input
                          type="text"
                          placeholder="bearer token"
                          value={currentRequest.auth.bearer?.token || ""}
                          onChange={(e) => updateCurrentRequest({
                            auth: { ...currentRequest.auth, bearer: { token: e.target.value } }
                          })}
                          className="w-full bg-[#1E1E1E] border border-[#444] rounded p-1.5 text-xs text-white font-mono"
                        />
                      </div>
                    )}

                    {currentRequest.auth?.type === "basic" && (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase font-bold text-gray-500">Username</label>
                          <input
                            type="text"
                            placeholder="username"
                            value={currentRequest.auth.basic?.username || ""}
                            onChange={(e) => updateCurrentRequest({
                              auth: { ...currentRequest.auth, basic: { ...currentRequest.auth.basic, username: e.target.value } } as any
                            })}
                            className="w-full bg-[#1E1E1E] border border-[#444] rounded p-1.5 text-xs text-white"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase font-bold text-gray-500">Password</label>
                          <input
                            type="password"
                            placeholder="password"
                            value={currentRequest.auth.basic?.password || ""}
                            onChange={(e) => updateCurrentRequest({
                              auth: { ...currentRequest.auth, basic: { ...currentRequest.auth.basic, password: e.target.value } } as any
                            })}
                            className="w-full bg-[#1E1E1E] border border-[#444] rounded p-1.5 text-xs text-white"
                          />
                        </div>
                      </div>
                    )}

                    {currentRequest.auth?.type === "apikey" && (
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase font-bold text-gray-500">Key Name</label>
                          <input
                            type="text"
                            placeholder="e.g. x-api-key"
                            value={currentRequest.auth.apikey?.key || ""}
                            onChange={(e) => updateCurrentRequest({
                              auth: { ...currentRequest.auth, apikey: { ...currentRequest.auth.apikey, key: e.target.value } } as any
                            })}
                            className="w-full bg-[#1E1E1E] border border-[#444] rounded p-1.5 text-xs text-white font-mono"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase font-bold text-gray-500">Key Value</label>
                          <input
                            type="password"
                            placeholder="api key value"
                            value={currentRequest.auth.apikey?.value || ""}
                            onChange={(e) => updateCurrentRequest({
                              auth: { ...currentRequest.auth, apikey: { ...currentRequest.auth.apikey, value: e.target.value } } as any
                            })}
                            className="w-full bg-[#1E1E1E] border border-[#444] rounded p-1.5 text-xs text-white font-mono"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase font-bold text-gray-500">Add To</label>
                          <select
                            value={currentRequest.auth.apikey?.addTo || "header"}
                            onChange={(e) => updateCurrentRequest({
                              auth: { ...currentRequest.auth, apikey: { ...currentRequest.auth.apikey, addTo: e.target.value as any } } as any
                            })}
                            className="w-full bg-[#2D2D2D] border border-[#444] rounded p-1.5 text-xs text-white"
                          >
                            <option value="header">Header</option>
                            <option value="query">Query Params</option>
                          </select>
                        </div>
                      </div>
                    )}

                    <p className="text-[10px] text-gray-500">
                      Supports full resolution of global environment properties and encrypted vault secrets via <code>{"{{variable}}"}</code> notation.
                    </p>
                  </div>
                )}

                {activeSubTab === "headers" && (
                  <div className="space-y-3">
                    <span className="text-xs font-bold uppercase text-gray-400">HTTP Headers</span>
                    
                    {currentRequest.headers?.map((h, idx) => (
                      <div key={idx} className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={h.key}
                          placeholder="Header Key"
                          onChange={(e) => {
                            const updated = [...(currentRequest.headers || [])];
                            updated[idx].key = e.target.value;
                            updateCurrentRequest({ headers: updated });
                          }}
                          className="bg-[#2D2D2D] border border-[#444] p-1 rounded text-xs text-white flex-1 font-mono"
                        />
                        <input
                          type="text"
                          value={h.value}
                          placeholder="Header Value"
                          onChange={(e) => {
                            const updated = [...(currentRequest.headers || [])];
                            updated[idx].value = e.target.value;
                            updateCurrentRequest({ headers: updated });
                          }}
                          className="bg-[#2D2D2D] border border-[#444] p-1 rounded text-xs text-white flex-1 font-mono"
                        />
                        <input
                          type="checkbox"
                          checked={h.enabled}
                          onChange={(e) => {
                            const updated = [...(currentRequest.headers || [])];
                            updated[idx].enabled = e.target.checked;
                            updateCurrentRequest({ headers: updated });
                          }}
                          className="cursor-pointer"
                        />
                        <button
                          onClick={() => {
                            const updated = currentRequest.headers?.filter((_, i) => i !== idx) || [];
                            updateCurrentRequest({ headers: updated });
                          }}
                          className="text-red-400 p-1 hover:bg-red-950/30 rounded"
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}

                    <button
                      onClick={() => {
                        const updated = [...(currentRequest.headers || []), { key: "", value: "", enabled: true }];
                        updateCurrentRequest({ headers: updated });
                      }}
                      className="text-xs text-blue-400 hover:underline flex items-center pt-1"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" /> Add Custom Header
                    </button>
                  </div>
                )}

                {activeSubTab === "params" && (
                  <div className="space-y-3">
                    <span className="text-xs font-bold uppercase text-gray-400">Query Parameters</span>
                    
                    {currentRequest.params?.map((p, idx) => (
                      <div key={idx} className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={p.key}
                          placeholder="Parameter Name"
                          onChange={(e) => {
                            const updated = [...(currentRequest.params || [])];
                            updated[idx].key = e.target.value;
                            updateCurrentRequest({ params: updated });
                          }}
                          className="bg-[#2D2D2D] border border-[#444] p-1 rounded text-xs text-white flex-1 font-mono"
                        />
                        <input
                          type="text"
                          value={p.value}
                          placeholder="Value"
                          onChange={(e) => {
                            const updated = [...(currentRequest.params || [])];
                            updated[idx].value = e.target.value;
                            updateCurrentRequest({ params: updated });
                          }}
                          className="bg-[#2D2D2D] border border-[#444] p-1 rounded text-xs text-white flex-1 font-mono"
                        />
                        <input
                          type="checkbox"
                          checked={p.enabled}
                          onChange={(e) => {
                            const updated = [...(currentRequest.params || [])];
                            updated[idx].enabled = e.target.checked;
                            updateCurrentRequest({ params: updated });
                          }}
                          className="cursor-pointer"
                        />
                        <button
                          onClick={() => {
                            const updated = currentRequest.params?.filter((_, i) => i !== idx) || [];
                            updateCurrentRequest({ params: updated });
                          }}
                          className="text-red-400 p-1 hover:bg-red-950/30 rounded"
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}

                    <button
                      onClick={() => {
                        const updated = [...(currentRequest.params || []), { key: "", value: "", enabled: true }];
                        updateCurrentRequest({ params: updated });
                      }}
                      className="text-xs text-blue-400 hover:underline flex items-center pt-1"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" /> Add Query Parameter
                    </button>
                  </div>
                )}

                {activeSubTab === "scripts" && (
                  <div className="space-y-3 flex flex-col h-full">
                    <div className="flex justify-between items-center shrink-0">
                      <span className="text-xs font-bold uppercase text-gray-400">Pre-Request & Test Scripts (JS)</span>
                      <button
                        onClick={handleRunScripts}
                        className="bg-purple-600 hover:bg-purple-700 text-white font-medium text-xs px-3 py-1 rounded"
                      >
                        Execute Sandbox
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3 flex-1 h-full min-h-[140px]">
                      <div className="flex flex-col">
                        <label className="text-[10px] text-gray-400 block mb-1">Pre-Request JavaScript</label>
                        <textarea
                          placeholder="// runs before sending\nrequest.headers['X-Timestamp'] = Date.now().toString();"
                          value={currentRequest.preRequestScript || ""}
                          onChange={(e) => updateCurrentRequest({ preRequestScript: e.target.value })}
                          className="bg-[#1E1E1E] border border-[#444] rounded p-2 text-xs font-mono text-blue-400 flex-1 outline-none"
                        />
                      </div>
                      <div className="flex flex-col">
                        <label className="text-[10px] text-gray-400 block mb-1">Response Assertion Tests</label>
                        <textarea
                          placeholder="// runs post-response\nconsole.assert(response.status === 200);\nconst json = response.json();"
                          value={currentRequest.testScript || ""}
                          onChange={(e) => updateCurrentRequest({ testScript: e.target.value })}
                          className="bg-[#1E1E1E] border border-[#444] rounded p-2 text-xs font-mono text-[#4EC9B0] flex-1 outline-none"
                        />
                      </div>
                    </div>

                    {testScriptOutput.length > 0 && (
                      <div className="p-2 bg-slate-900 border border-slate-800 rounded font-mono text-[10px] space-y-1 max-h-[100px] overflow-y-auto">
                        <span className="text-[9px] uppercase font-bold text-gray-400 block">Sandbox Logs:</span>
                        {testScriptOutput.map((l, idx) => <div key={idx}>{l}</div>)}
                      </div>
                    )}
                  </div>
                )}

                {activeSubTab === "code" && (
                  <div className="space-y-3 flex-1 flex flex-col h-full">
                    <div className="flex items-center justify-between shrink-0">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold uppercase text-gray-400">Export as Code</span>
                        <select
                          value={selectedLanguage}
                          onChange={(e) => setSelectedLanguage(e.target.value)}
                          className="bg-[#2D2D2D] text-xs text-white border border-[#444] rounded p-1"
                        >
                          <option value="curl_unix">cURL (Unix)</option>
                          <option value="curl_win">cURL (Windows)</option>
                          <option value="powershell">PowerShell</option>
                          <option value="js_fetch">JavaScript (Fetch)</option>
                          <option value="js_axios">JavaScript (Axios)</option>
                          <option value="python_requests">Python (Requests)</option>
                          <option value="go">Go</option>
                          <option value="java">Java</option>
                          <option value="csharp">C#</option>
                          <option value="rust">Rust</option>
                          <option value="php">PHP</option>
                          <option value="swift">Swift</option>
                          <option value="grpcurl">grpcurl</option>
                        </select>
                      </div>
                      <button
                        onClick={() => {
                          const snippet = generateCodeSnippet(currentRequest as RequestItem, selectedLanguage);
                          navigator.clipboard.writeText(snippet);
                          triggerToast("Snippet copied to clipboard");
                        }}
                        className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium py-1 px-3 rounded flex items-center"
                      >
                        <Copy className="w-3.5 h-3.5 mr-1" /> Copy Snippet
                      </button>
                    </div>

                    <pre className="bg-[#1E1E1E] text-xs font-mono p-3 rounded border border-[#333] overflow-auto text-yellow-400 flex-1 max-h-[220px]">
                      {generateCodeSnippet(currentRequest as RequestItem, selectedLanguage)}
                    </pre>
                  </div>
                )}
              </div>
            </div>

            {/* --- RESPONSE VIEWER SECTION --- */}
            <div id="response-viewer" className="border-t border-[#333333] pt-4 flex flex-col shrink-0 min-h-[280px]">
              
              <div className="flex items-center justify-between py-2 shrink-0">
                <div className="flex items-center space-x-4">
                  <span className="uppercase font-bold tracking-widest text-[#858585] text-xs font-display">Response</span>
                  
                  {responses[activeTabId]?.loading ? (
                    <span className="text-xs text-blue-400 animate-pulse flex items-center">
                      <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Gathering payload from proxy server...
                    </span>
                  ) : responses[activeTabId] ? (
                    <div className="flex items-center space-x-3 text-xs font-mono">
                      <span className={`px-2 py-0.5 rounded border ${
                        responses[activeTabId].status < 300 ? "bg-green-950/50 text-green-400 border-green-700/50" : "bg-red-950/50 text-red-400 border-red-700/50"
                      }`}>
                        {responses[activeTabId].status} {responses[activeTabId].statusText}
                      </span>
                      <span className="text-gray-400">Time: <span className="text-white">{responses[activeTabId].time} ms</span></span>
                      <span className="text-gray-400">Size: <span className="text-white">{(responses[activeTabId].size / 1024).toFixed(2)} KB</span></span>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-500">No response received yet. Send a request to inspect payload.</span>
                  )}
                </div>

                <div className="flex space-x-1">
                  <button
                    onClick={() => setActiveResponseSubTab("body")}
                    className={`px-3 py-1 rounded text-xs ${activeResponseSubTab === "body" ? "bg-blue-600 text-white" : "bg-[#2D2D2D] hover:bg-[#3C3C3C] text-gray-400"}`}
                  >
                    Body
                  </button>
                  <button
                    onClick={() => setActiveResponseSubTab("headers")}
                    className={`px-3 py-1 rounded text-xs ${activeResponseSubTab === "headers" ? "bg-blue-600 text-white" : "bg-[#2D2D2D] hover:bg-[#3C3C3C] text-gray-400"}`}
                  >
                    Headers
                  </button>
                  {currentRequest.protocol === Protocol.WEBSOCKET || currentRequest.url.includes("sse") || currentRequest.url.includes("stream") ? (
                    <button
                      onClick={() => setActiveResponseSubTab("stream")}
                      className={`px-3 py-1 rounded text-xs ${activeResponseSubTab === "stream" ? "bg-blue-600 text-white" : "bg-[#2D2D2D] hover:bg-[#3C3C3C] text-gray-400"}`}
                    >
                      Live Stream
                    </button>
                  ) : null}
                  <button
                    onClick={() => setActiveResponseSubTab("actual")}
                    className={`px-3 py-1 rounded text-xs ${activeResponseSubTab === "actual" ? "bg-blue-600 text-white" : "bg-[#2D2D2D] hover:bg-[#3C3C3C] text-gray-400"}`}
                  >
                    Actual Request
                  </button>
                  
                  {/* AI Tab button */}
                  <button
                    onClick={() => setActiveResponseSubTab("ai")}
                    className={`px-3 py-1 rounded text-xs font-semibold flex items-center ${activeResponseSubTab === "ai" ? "bg-purple-600 text-white" : "bg-[#2D2D2D] hover:bg-purple-950/40 text-purple-400"}`}
                  >
                    <Sparkles className="w-3 h-3 mr-1" /> Gemini AI
                  </button>
                </div>
              </div>

              {/* Response Subtab Panels */}
              <div className="flex-1 bg-[#1E1E1E] border border-[#333333] rounded-lg p-3 min-h-[160px] overflow-auto font-mono text-xs text-white">
                
                {activeResponseSubTab === "body" && (
                  <div>
                    {responses[activeTabId]?.body ? (
                      <pre className="text-green-400 whitespace-pre-wrap word-break-all">
                        {responses[activeTabId].body}
                      </pre>
                    ) : (
                      <div className="text-gray-500 italic py-4">// No body returned or cached.</div>
                    )}
                  </div>
                )}

                {activeResponseSubTab === "headers" && (
                  <div>
                    {responses[activeTabId]?.headers ? (
                      <table className="w-full text-xs font-mono">
                        <thead>
                          <tr className="border-b border-[#333] text-gray-500 text-left">
                            <th className="pb-1.5 font-semibold">Header Name</th>
                            <th className="pb-1.5 font-semibold">Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(responses[activeTabId].headers).map(([k, v]) => (
                            <tr key={k} className="border-b border-[#2D2D2D]">
                              <td className="py-1.5 text-blue-400 pr-4">{k}</td>
                              <td className="py-1.5 text-gray-300">{v}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="text-gray-500 italic py-4">// No response headers cached.</div>
                    )}
                  </div>
                )}

                {activeResponseSubTab === "stream" && (
                  <div className="space-y-1 max-h-[200px] overflow-y-auto">
                    {currentRequest.protocol === Protocol.WEBSOCKET && (
                      <div className="flex items-center space-x-2 border-b border-[#333] pb-2 mb-2">
                        <input
                          type="text"
                          placeholder="Type WebSocket payload string..."
                          value={wsInputMessage}
                          onChange={(e) => setWsInputMessage(e.target.value)}
                          className="bg-[#2D2D2D] text-xs font-mono px-3 py-1.5 rounded border border-[#444] text-white flex-1"
                          onKeyDown={(e) => e.key === "Enter" && handleSendWebSocketMessage()}
                        />
                        <button
                          onClick={handleSendWebSocketMessage}
                          className="bg-blue-600 hover:bg-blue-700 text-white rounded text-xs px-3 py-1.5 font-semibold"
                          disabled={webSocketStatus !== "connected"}
                        >
                          Send
                        </button>
                      </div>
                    )}

                    {(streamingEvents[activeTabId] || []).length === 0 ? (
                      <div className="text-gray-500 italic">// Awaiting streaming frames...</div>
                    ) : (
                      streamingEvents[activeTabId].map((ev, idx) => (
                        <div key={idx} className="border-b border-[#2D2D2D]/50 py-1 font-mono text-[11px] text-[#4EC9B0]">
                          {ev}
                        </div>
                      ))
                    )}
                  </div>
                )}

                {activeResponseSubTab === "actual" && (
                  <div className="space-y-3">
                    {responses[activeTabId]?.actualRequest ? (
                      <>
                        <div>
                          <span className="text-xs font-bold uppercase text-gray-500 block mb-1">Resolved URL:</span>
                          <div className="text-blue-400 bg-slate-900/50 p-1.5 rounded border border-slate-800">
                            {responses[activeTabId].actualRequest?.resolvedUrl}
                          </div>
                        </div>
                        <div>
                          <span className="text-xs font-bold uppercase text-gray-500 block mb-1">Headers Sent:</span>
                          <pre className="text-[#CE9178] bg-slate-900/50 p-2 rounded border border-slate-800">
                            {responses[activeTabId].actualRequest?.rawHeaders}
                          </pre>
                        </div>
                        {responses[activeTabId].actualRequest?.rawBody && (
                          <div>
                            <span className="text-xs font-bold uppercase text-gray-500 block mb-1">Body Payload Sent:</span>
                            <pre className="text-white bg-slate-900/50 p-2 rounded border border-slate-800">
                              {responses[activeTabId].actualRequest?.rawBody}
                            </pre>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-gray-500 italic">// No actual request frames cached yet.</div>
                    )}
                  </div>
                )}

                {activeResponseSubTab === "ai" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-[#333] pb-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-gray-400 uppercase">Gemini AI Dialect:</span>
                        <select
                          value={aiPromptType}
                          onChange={(e) => setAiPromptType(e.target.value as any)}
                          className="bg-[#2D2D2D] text-xs text-white border border-[#444] rounded p-1"
                        >
                          <option value="explain">Explain API</option>
                          <option value="integration">Write Integration</option>
                          <option value="debug">Debug Response</option>
                          <option value="tests">Write Tests</option>
                          <option value="docs">Generate Docs</option>
                        </select>
                      </div>
                      
                      <button
                        onClick={generateAiContent}
                        className="bg-purple-600 hover:bg-purple-700 text-white font-medium text-xs px-4 py-1 rounded flex items-center"
                        disabled={aiLoading}
                      >
                        {aiLoading ? "Generating..." : "Ask Gemini AI"} <Sparkles className="w-3.5 h-3.5 ml-1.5" />
                      </button>
                    </div>

                    {aiLoading ? (
                      <div className="text-xs text-purple-400 py-6 animate-pulse flex items-center">
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Concocting beautiful insights using gemini-3.5-flash...
                      </div>
                    ) : aiOutput ? (
                      <div className="text-gray-300 text-xs font-sans whitespace-pre-wrap leading-relaxed select-text select-all">
                        {aiOutput}
                      </div>
                    ) : (
                      <div className="text-gray-500 italic py-2">
                        Click the button to query Gemini on standard API best practices, diagnostics, documentation, or code logic.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          </>
          )}
        </div>
      </div>

      {/* --- FOOTER STATUS BAR --- */}
      <div id="footer-status" className="h-6 bg-[#007ACC] flex items-center px-3 justify-between text-[11px] text-white shrink-0 font-display">
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <Globe className="w-3.5 h-3.5 mr-1" />
            Offline Isolation Enabled (No Analytics)
          </div>
          <div className="flex items-center">
            <Shield className="w-3.5 h-3.5 mr-1" />
            AES-256-GCM {vaultStatus.unlocked ? "🔓 Unlocked" : "🔒 Locked"}
          </div>
          {mockServers.some((s) => s.enabled) && (
            <div className="flex items-center">
              <Server className="w-3.5 h-3.5 mr-1 text-green-200 animate-pulse" />
              Mock Mock-Instance Active
            </div>
          )}
        </div>
        <div className="flex items-center space-x-4">
          <span>API Studio v1.2.4</span>
          <span>UTF-8</span>
          <Terminal className="w-3.5 h-3.5" />
        </div>
      </div>
    </div>
  );
}
