export enum Method {
  GET = "GET",
  POST = "POST",
  PUT = "PUT",
  DELETE = "DELETE",
  PATCH = "PATCH",
  HEAD = "HEAD",
  OPTIONS = "OPTIONS"
}

export enum Protocol {
  HTTP = "HTTP",
  WEBSOCKET = "WEBSOCKET",
  GRAPHQL = "GRAPHQL",
  GRPC = "GRPC"
}

export enum BodyType {
  JSON = "JSON",
  FORM_DATA = "FORM_DATA",
  URL_ENCODED = "URL_ENCODED",
  RAW = "RAW",
  XML = "XML",
  GRAPHQL = "GRAPHQL",
  BINARY = "BINARY"
}

export interface Header {
  key: string;
  value: string;
  enabled: boolean;
}

export interface QueryParam {
  key: string;
  value: string;
  enabled: boolean;
}

export interface AuthConfig {
  type: "none" | "basic" | "bearer" | "apikey" | "oauth2" | "aws" | "digest";
  basic?: { username: string; password?: string };
  bearer?: { token: string };
  apikey?: { key: string; value: string; addTo: "header" | "query" };
  oauth2?: { grantType: string; clientId: string; clientSecret?: string; authUrl?: string; accessToken?: string };
  aws?: { accessKey: string; secretKey: string; region: string; service: string };
  digest?: { username: string; password?: string };
}

export interface RequestItem {
  id: string;
  name: string;
  method: Method;
  url: string;
  protocol: Protocol;
  headers: Header[];
  params: QueryParam[];
  bodyType: BodyType;
  body: string;
  auth: AuthConfig;
  preRequestScript?: string;
  testScript?: string;
  folderId?: string | null;
  collectionId?: string | null;
}

export interface FolderItem {
  id: string;
  name: string;
  collectionId: string;
  parentId?: string | null;
  auth?: AuthConfig;
  preRequestScript?: string;
  testScript?: string;
}

export interface CollectionItem {
  id: string;
  name: string;
  description?: string;
  auth?: AuthConfig;
  preRequestScript?: string;
  testScript?: string;
  requests: RequestItem[];
  folders: FolderItem[];
}

export interface EnvVariable {
  key: string;
  value: string;
  enabled: boolean;
  isSecret?: boolean;
}

export interface Environment {
  id: string;
  name: string;
  variables: EnvVariable[];
}

export interface ResponseData {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  size: number;
  time: number;
  cookies: Record<string, string>;
  sseEvents?: string[];
  protocol?: string;
  actualRequest?: {
    rawHeaders: string;
    rawBody?: string;
    resolvedUrl: string;
  };
}

export interface MockRoute {
  id: string;
  method: string;
  path: string;
  status: number;
  headers: Header[];
  responseBody: string;
  mcpEnabled?: boolean;
  mcpDescription?: string;
  mcpSchema?: string; // JSON Schema string
}

export interface MockLog {
  id: string;
  timestamp: string;
  method: string;
  path: string;
  status: number;
  matched: boolean;
  ip: string;
  mcpCall?: boolean;
}

export interface MockServer {
  id: string;
  name: string;
  autoStart: boolean;
  enabled: boolean;
  routes: MockRoute[];
}

export interface SecretVaultData {
  unlocked: boolean;
  hasMasterPassword: boolean;
  secrets: Array<{ id: string; key: string; value: string }>;
  certificates: Array<{ id: string; name: string; cert: string; key: string; passphrase?: string }>;
}
