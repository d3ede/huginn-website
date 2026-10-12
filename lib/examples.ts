export const createTaskPayload = {
  clientKey: 'YOUR_API_KEY',
  task: {
    type: 'HCaptchaTaskProxyless',
    websiteURL: 'https://example.com',
    websiteKey: 'YOUR_SITE_KEY',
  },
};
export const pollTaskPayload = { clientKey: 'YOUR_API_KEY', taskId: 'TASK_ID' };
export const readyTaskPayload = {
  errorId: 0,
  status: 'ready',
  solution: {
    gRecaptchaResponse: 'SOLUTION_TOKEN',
    token: 'SOLUTION_TOKEN',
    userAgent: 'BROWSER_USER_AGENT',
  },
};

export const pythonExample = `import os, time, requests

base = os.environ["HUGINN_BASE_URL"].rstrip("/")
key = os.environ["HUGINN_API_KEY"]

def request(method, payload):
    response = requests.post(base + "/" + method,
        json={"clientKey": key, **payload}, timeout=20)
    response.raise_for_status()
    data = response.json()
    if data["errorId"] != 0:
        raise RuntimeError(
            data["errorCode"] + ": " + data.get("errorDescription", ""))
    return data

created = request("createTask", {
    "task": {
        "type": "HCaptchaTaskProxyless",
        "websiteURL": "https://example.com",
        "websiteKey": "YOUR_SITE_KEY"
    }
})
task_id = created["taskId"]

deadline = time.monotonic() + 360
while time.monotonic() < deadline:
    time.sleep(5)
    result = request("getTaskResult", {"taskId": task_id})
    if result["status"] == "ready":
        print(result["solution"]["gRecaptchaResponse"])
        break
    if result["status"] != "processing":
        raise RuntimeError("Unexpected task status")
else:
    raise TimeoutError("Task did not finish in time")`;

export const javascriptExample = `const base = process.env.HUGINN_BASE_URL.replace(/\\/$/, "");
const clientKey = process.env.HUGINN_API_KEY;

async function request(method, payload) {
  const response = await fetch(base + "/" + method, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientKey, ...payload }),
    signal: AbortSignal.timeout(20000)
  });
  if (!response.ok) throw new Error("HTTP " + response.status);
  const data = await response.json();
  if (data.errorId !== 0)
    throw new Error(data.errorCode + ": " + (data.errorDescription ?? ""));
  return data;
}

const created = await request("createTask", {
  task: {
    type: "HCaptchaTaskProxyless",
    websiteURL: "https://example.com",
    websiteKey: "YOUR_SITE_KEY"
  }
});

const deadline = Date.now() + 360000;
let completed = false;
while (Date.now() < deadline) {
  await new Promise(resolve => setTimeout(resolve, 5000));
  const result = await request("getTaskResult", { taskId: created.taskId });
  if (result.status === "ready") {
    console.log(result.solution.gRecaptchaResponse);
    completed = true;
    break;
  }
  if (result.status !== "processing") throw new Error("Unexpected task status");
}
if (!completed) throw new Error("Task timed out");`;

export const compactPythonExample = `import os, requests

response = requests.post(
    os.environ["HUGINN_BASE_URL"].rstrip("/") + "/createTask",
    json={
        "clientKey": os.environ["HUGINN_API_KEY"],
        "task": {
            "type": "HCaptchaTaskProxyless",
            "websiteURL": "https://example.com",
            "websiteKey": "YOUR_SITE_KEY"
        }
    }, timeout=20
)
response.raise_for_status()
task = response.json()
if task["errorId"] != 0:
    raise RuntimeError(task["errorCode"])
task_id = task["taskId"]`;

export const compactJavascriptExample = `const response = await fetch(
  process.env.HUGINN_BASE_URL.replace(/\\/$/, "") + "/createTask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clientKey: process.env.HUGINN_API_KEY,
      task: {
        type: "HCaptchaTaskProxyless",
        websiteURL: "https://example.com",
        websiteKey: "YOUR_SITE_KEY"
      }
    }),
    signal: AbortSignal.timeout(20000)
  }
);
if (!response.ok) throw new Error("HTTP " + response.status);
const task = await response.json();
if (task.errorId !== 0) throw new Error(task.errorCode);
const taskId = task.taskId;`;
