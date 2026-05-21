import { request } from "node:https";

const args = new Map();
for (let i = 2; i < process.argv.length; i += 1) {
  const arg = process.argv[i];
  if (arg.startsWith("--")) {
    const [key, inlineValue] = arg.slice(2).split("=");
    const nextValue = process.argv[i + 1]?.startsWith("--") ? undefined : process.argv[i + 1];
    args.set(key, inlineValue ?? nextValue ?? true);
    if (inlineValue === undefined && nextValue !== undefined) i += 1;
  }
}

const base = String(args.get("base") ?? "https://ongdngolu.org").replace(/\/+$/, "");
const timeoutMs = Number(args.get("timeout-ms") ?? 10000);

function requestUrl(path, method = "HEAD") {
  const url = new URL(path, base);

  return new Promise((resolve, reject) => {
    const req = request(
      url,
      {
        method,
        timeout: timeoutMs,
        headers: { "user-agent": "nglu-routing-smoke/1.0" },
      },
      (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () => {
          resolve({
            body,
            headers: res.headers,
            path,
            status: res.statusCode ?? 0,
            url: url.toString(),
          });
        });
      },
    );

    req.on("timeout", () => {
      req.destroy(new Error(`Timeout after ${timeoutMs}ms: ${url}`));
    });
    req.on("error", reject);
    req.end();
  });
}

function assertStatus(result, expected, label) {
  if (!expected.includes(result.status)) {
    throw new Error(`${label}: expected ${expected.join("/")} but got ${result.status} for ${result.url}`);
  }
}

function assertLocation(result, expectedPath, label) {
  const location = result.headers.location;
  if (!location) {
    throw new Error(`${label}: expected Location header ${expectedPath}, got none`);
  }

  const locationPath = location.startsWith("http")
    ? new URL(location).pathname
    : new URL(location, base).pathname;

  if (locationPath !== expectedPath) {
    throw new Error(`${label}: expected redirect to ${expectedPath}, got ${location}`);
  }
}

const checks = [
  async () => {
    const result = await requestUrl("/");
    assertStatus(result, [200], "marketing root");
    return `marketing root ${result.status}`;
  },
  async () => {
    const result = await requestUrl("/crm");
    assertStatus(result, [301, 302, 307, 308], "CRM entry redirect");
    assertLocation(result, "/admin/auth/login", "CRM entry redirect");
    return `CRM entry ${result.status} -> ${result.headers.location}`;
  },
  async () => {
    const result = await requestUrl("/admin/auth/login");
    assertStatus(result, [200], "CRM login route");
    return `CRM login route ${result.status}`;
  },
  async () => {
    const result = await requestUrl("/api/health", "GET");
    assertStatus(result, [200], "API health");
    if (!result.body.includes('"status":"ok"') && !result.body.includes('"status": "ok"')) {
      throw new Error(`API health: expected body to include status ok, got ${result.body.slice(0, 160)}`);
    }
    return `API health ${result.status}`;
  },
];

const failures = [];

for (const check of checks) {
  try {
    console.log(`ok: ${await check()}`);
  } catch (error) {
    failures.push(error instanceof Error ? error.message : String(error));
  }
}

if (failures.length > 0) {
  console.error(`Routing smoke failed for ${base}:`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Routing smoke passed for ${base}.`);
