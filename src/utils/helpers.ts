import { Method, BodyType, Protocol, RequestItem, CollectionItem, Header } from "../types.js";

// Helper to parse cURL commands
export function parseCurl(curlString: string): Partial<RequestItem> {
  const clean = curlString.trim().replace(/\\/g, " ");
  
  // Find URL
  const urlMatch = clean.match(/curl\s+["']?(https?:\/\/[^\s"']+)["']?/i) || clean.match(/["']?(https?:\/\/[^\s"']+)["']?/);
  const url = urlMatch ? urlMatch[1] : "";

  // Find Method
  let method: Method = Method.GET;
  if (/(-X|--request)\s+POST/i.test(clean)) method = Method.POST;
  else if (/(-X|--request)\s+PUT/i.test(clean)) method = Method.PUT;
  else if (/(-X|--request)\s+DELETE/i.test(clean)) method = Method.DELETE;
  else if (/(-X|--request)\s+PATCH/i.test(clean)) method = Method.PATCH;
  else if (/(-X|--request)\s+HEAD/i.test(clean)) method = Method.HEAD;
  else if (/(-X|--request)\s+OPTIONS/i.test(clean)) method = Method.OPTIONS;
  else if (/--data|--data-raw|-d/i.test(clean)) method = Method.POST; // default to POST if there is data but no method

  // Find Headers
  const headers: Header[] = [];
  const headerRegex = /(-H|--header)\s+["']([^"']+)["']/gi;
  let match;
  while ((match = headerRegex.exec(clean)) !== null) {
    const parts = match[2].split(":");
    if (parts.length >= 2) {
      headers.push({
        key: parts[0].trim(),
        value: parts.slice(1).join(":").trim(),
        enabled: true,
      });
    }
  }

  // Find Body
  let body = "";
  const bodyRegex = /(-d|--data|--data-raw|--data-binary)\s+["']([^"']+)["']/i;
  const bodyMatch = clean.match(bodyRegex);
  if (bodyMatch) {
    body = bodyMatch[2];
  } else {
    // try single quotes or unquoted JSON
    const jsonMatch = clean.match(/-d\s+({.*})/);
    if (jsonMatch) body = jsonMatch[1];
  }

  return {
    method,
    url,
    headers,
    body,
    bodyType: body ? BodyType.JSON : BodyType.RAW,
    protocol: Protocol.HTTP,
  };
}

// Generate code snippet in 15 formats
export function generateCodeSnippet(request: RequestItem, language: string): string {
  const { method, url, headers, body } = request;
  const enabledHeaders = headers.filter((h) => h.enabled && h.key);
  const hasBody = method !== Method.GET && body;

  switch (language) {
    case "curl_unix": {
      let cmd = `curl -X ${method} "${url}"`;
      enabledHeaders.forEach((h) => {
        cmd += ` \\\n  -H "${h.key}: ${h.value}"`;
      });
      if (hasBody) {
        cmd += ` \\\n  -d '${body.replace(/'/g, "'\\''")}'`;
      }
      return cmd;
    }
    case "curl_win": {
      let cmd = `curl -X ${method} "${url}"`;
      enabledHeaders.forEach((h) => {
        cmd += ` ^\n  -H "${h.key}: ${h.value}"`;
      });
      if (hasBody) {
        cmd += ` ^\n  -d "${body.replace(/"/g, '\\"')}"`;
      }
      return cmd;
    }
    case "powershell": {
      let headersStr = enabledHeaders.map((h) => `  "${h.key}" = "${h.value}"`).join(";\n");
      let cmd = `$headers = @{\n${headersStr}\n}\n\n`;
      cmd += `Invoke-RestMethod -Uri "${url}" -Method ${method}`;
      if (enabledHeaders.length > 0) cmd += " -Headers $headers";
      if (hasBody) cmd += ` -Body '${body}' -ContentType "application/json"`;
      return cmd;
    }
    case "js_fetch": {
      const headerObj = enabledHeaders.reduce((acc, h) => ({ ...acc, [h.key]: h.value }), {});
      let code = `fetch("${url}", {\n`;
      code += `  method: "${method}",\n`;
      if (enabledHeaders.length > 0) {
        code += `  headers: ${JSON.stringify(headerObj, null, 4).replace(/\n/g, "\n  ")},\n`;
      }
      if (hasBody) {
        code += `  body: JSON.stringify(${body.trim()}),\n`;
      }
      code += `})\n.then(response => response.json())\n.then(data => console.log(data))\n.catch(err => console.error(err));`;
      return code;
    }
    case "js_axios": {
      const headerObj = enabledHeaders.reduce((acc, h) => ({ ...acc, [h.key]: h.value }), {});
      let code = `const axios = require('axios');\n\n`;
      code += `axios({\n`;
      code += `  method: '${method.toLowerCase()}',\n`;
      code += `  url: '${url}',\n`;
      if (enabledHeaders.length > 0) {
        code += `  headers: ${JSON.stringify(headerObj, null, 4).replace(/\n/g, "\n  ")},\n`;
      }
      if (hasBody) {
        code += `  data: ${body.trim()}\n`;
      }
      code += `})\n.then(response => console.log(response.data))\n.catch(error => console.error(error));`;
      return code;
    }
    case "python_requests": {
      let code = `import requests\nimport json\n\nurl = "${url}"\n`;
      if (enabledHeaders.length > 0) {
        const headerObj = enabledHeaders.reduce((acc, h) => ({ ...acc, [h.key]: h.value }), {});
        code += `headers = ${JSON.stringify(headerObj, null, 4)}\n`;
      } else {
        code += `headers = {}\n`;
      }
      if (hasBody) {
        code += `payload = ${body.trim()}\n`;
        code += `response = requests.request("${method}", url, headers=headers, json=payload)\n`;
      } else {
        code += `response = requests.request("${method}", url, headers=headers)\n`;
      }
      code += `print(response.text)`;
      return code;
    }
    case "go": {
      let code = `package main\n\nimport (\n\t"fmt"\n\t"net/http"\n\t"io"\n`;
      if (hasBody) code += `\t"strings"\n`;
      code += `)\n\nfunc main() {\n`;
      if (hasBody) {
        code += `\tpayload := strings.NewReader(\`${body}\`)\n`;
        code += `\treq, _ := http.NewRequest("${method}", "${url}", payload)\n`;
      } else {
        code += `\treq, _ := http.NewRequest("${method}", "${url}", nil)\n`;
      }
      enabledHeaders.forEach((h) => {
        code += `\treq.Header.Add("${h.key}", "${h.value}")\n`;
      });
      code += `\tres, _ := http.DefaultClient.Do(req)\n\tdefer res.Body.Close()\n\tbody, _ := io.ReadAll(res.Body)\n\tfmt.Println(string(body))\n}`;
      return code;
    }
    case "java": {
      let code = `import java.net.URI;\nimport java.net.http.HttpClient;\nimport java.net.http.HttpRequest;\nimport java.net.http.HttpResponse;\n\n`;
      code += `public class App {\n\tpublic static void main(String[] args) throws Exception {\n`;
      code += `\t\tHttpClient client = HttpClient.newHttpClient();\n`;
      code += `\t\tHttpRequest request = HttpRequest.newBuilder()\n`;
      code += `\t\t\t.uri(URI.create("${url}"))\n`;
      enabledHeaders.forEach((h) => {
        code += `\t\t\t.header("${h.key}", "${h.value}")\n`;
      });
      if (hasBody) {
        code += `\t\t\t.POST(HttpRequest.BodyPublishers.ofString("${body.replace(/"/g, '\\"')}\"))\n`;
      } else {
        code += `\t\t\t.method("${method}", HttpRequest.BodyPublishers.noBody())\n`;
      }
      code += `\t\t\t.build();\n\t\tHttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());\n`;
      code += `\t\tSystem.out.println(response.body());\n\t}\n}`;
      return code;
    }
    case "csharp": {
      let code = `using System.Net.Http;\nusing System.Threading.Tasks;\n\n`;
      code += `class Program {\n\tstatic async Task Main() {\n`;
      code += `\t\tvar client = new HttpClient();\n`;
      code += `\t\tvar request = new HttpRequestMessage(HttpMethod.${method === "PATCH" ? "Patch" : method}, "${url}");\n`;
      enabledHeaders.forEach((h) => {
        code += `\t\trequest.Headers.Add("${h.key}", "${h.value}");\n`;
      });
      if (hasBody) {
        code += `\t\trequest.Content = new StringContent("${body.replace(/"/g, '\\"')}", null, "application/json");\n`;
      }
      code += `\t\tvar response = await client.SendAsync(request);\n`;
      code += `\t\tConsole.WriteLine(await response.Content.ReadAsStringAsync());\n\t}\n}`;
      return code;
    }
    case "rust": {
      let code = `use reqwest::header::HeaderMap;\n\n#[tokio::main]\nasync fn main() -> Result<(), Box<dyn std::error::Error>> {\n`;
      code += `\tlet client = reqwest::Client::new();\n`;
      code += `\tlet mut headers = HeaderMap::new();\n`;
      enabledHeaders.forEach((h) => {
        code += `\theaders.insert("${h.key.toLowerCase()}", "${h.value}".parse()?);\n`;
      });
      code += `\tlet res = client.${method.toLowerCase()}("${url}")\n\t\t.headers(headers)\n`;
      if (hasBody) {
        code += `\t\t.body(\`${body}\`)\n`;
      }
      code += `\t\t.send()\n\t\t.await?\n\t\t.text()\n\t\t.await?;\n\tprintln!("{}", res);\n\tOk(())\n}`;
      return code;
    }
    case "php": {
      let code = `<?php\n$ch = curl_init();\ncurl_setopt($ch, CURLOPT_URL, "${url}");\ncurl_setopt($ch, CURLOPT_RETURNTRANSFER, true);\n`;
      code += `curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "${method}");\n`;
      if (enabledHeaders.length > 0) {
        const headerLines = enabledHeaders.map((h) => `"${h.key}: ${h.value}"`);
        code += `curl_setopt($ch, CURLOPT_HTTPHEADER, [${headerLines.join(", ")}]);\n`;
      }
      if (hasBody) {
        code += `curl_setopt($ch, CURLOPT_POSTFIELDS, '${body}');\n`;
      }
      code += `$response = curl_exec($ch);\ncurl_close($ch);\necho $response;\n?>`;
      return code;
    }
    case "swift": {
      let code = `import Foundation\n\nvar request = URLRequest(url: URL(string: "${url}")!)\n`;
      code += `request.httpMethod = "${method}"\n`;
      enabledHeaders.forEach((h) => {
        code += `request.setValue("${h.value}", forHTTPHeaderField: "${h.key}")\n`;
      });
      if (hasBody) {
        code += `request.httpBody = "${body.replace(/"/g, '\\"')}".data(using: .utf8)\n`;
      }
      code += `let task = URLSession.shared.dataTask(with: request) { data, response, error in\n`;
      code += `\tif let data = data { print(String(data: data, encoding: .utf8)!) }\n};\ntask.resume();`;
      return code;
    }
    case "grpcurl": {
      return `grpcurl -plaintext -proto service.proto -d '${body}' localhost:50051 my.package.Service/Method`;
    }
    default:
      return "Format not supported";
  }
}

// Map Postman collection to our internal CollectionsItem structure
export function importPostmanCollection(postmanJson: any): CollectionItem {
  const collectionId = crypto.randomUUID();
  const collectionName = postmanJson.info?.name || "Imported Collection";
  const requests: RequestItem[] = [];
  const folders: any[] = [];

  function processItem(item: any, parentFolderId: string | null = null) {
    if (item.item) {
      const folderId = crypto.randomUUID();
      folders.push({
        id: folderId,
        name: item.name,
        collectionId,
        parentId: parentFolderId,
      });
      item.item.forEach((subItem: any) => processItem(subItem, folderId));
    } else {
      // It's a request
      const reqHeaders: Header[] = [];
      if (item.request?.header) {
        item.request.header.forEach((h: any) => {
          reqHeaders.push({ key: h.key, value: h.value || "", enabled: !h.disabled });
        });
      }

      // Read body
      let bodyText = "";
      let bodyType = BodyType.RAW;
      if (item.request?.body) {
        const pBody = item.request.body;
        if (pBody.mode === "raw") {
          bodyText = pBody.raw || "";
          bodyType = BodyType.JSON; // Default to JSON if it's raw
        } else if (pBody.mode === "urlencoded") {
          bodyText = JSON.stringify(pBody.urlencoded || []);
          bodyType = BodyType.URL_ENCODED;
        }
      }

      const rawUrl = typeof item.request?.url === "string" ? item.request.url : item.request?.url?.raw || "";

      requests.push({
        id: crypto.randomUUID(),
        name: item.name,
        method: (item.request?.method || "GET") as Method,
        url: rawUrl,
        protocol: Protocol.HTTP,
        headers: reqHeaders,
        params: [],
        bodyType,
        body: bodyText,
        auth: { type: "none" },
        folderId: parentFolderId,
        collectionId,
      });
    }
  }

  if (Array.isArray(postmanJson.item)) {
    postmanJson.item.forEach((item: any) => processItem(item));
  }

  return {
    id: collectionId,
    name: collectionName,
    requests,
    folders,
  };
}
