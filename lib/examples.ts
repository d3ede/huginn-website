export const pythonExample = `import os, time, uuid, requests

base = os.environ["HUGINN_BASE_URL"] + "/v1"
headers = {"Authorization": "Bearer " + os.environ["HUGINN_API_KEY"]}

response = requests.post(base + "/tasks",
    headers={**headers, "Idempotency-Key": str(uuid.uuid4())},
    json={"type": "hcaptcha", "websiteURL": "https://example.com",
          "websiteKey": "YOUR_SITE_KEY"}, timeout=20)
response.raise_for_status()
task = response.json()

deadline = time.monotonic() + 360
while time.monotonic() < deadline:
    response = requests.get(base + "/tasks/" + task["id"],
                            headers=headers, timeout=20)
    response.raise_for_status()
    task = response.json()
    if task["status"] == "succeeded":
        print(task["result"]["token"])
        break
    if task["status"] == "failed":
        raise RuntimeError(task["errorCode"])
    time.sleep(2)
else:
    raise TimeoutError("Task did not finish in time")`;
export const javascriptExample = `const base = process.env.HUGINN_BASE_URL + "/v1";
const headers = {
  Authorization: "Bearer " + process.env.HUGINN_API_KEY,
  "Content-Type": "application/json"
};

async function request(path, options = {}) {
  const response = await fetch(base + path, {
    ...options, headers: { ...headers, ...options.headers },
    signal: AbortSignal.timeout(20000)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error.message);
  return data;
}

let task = await request("/tasks", {
  method: "POST",
  headers: { "Idempotency-Key": crypto.randomUUID() },
  body: JSON.stringify({ type: "hcaptcha",
    websiteURL: "https://example.com", websiteKey: "YOUR_SITE_KEY" })
});

const deadline = Date.now() + 360000;
let completed = false;
while (Date.now() < deadline) {
  task = await request("/tasks/" + task.id);
  if (task.status === "succeeded") {
    console.log(task.result.token);
    completed = true;
    break;
  }
  if (task.status === "failed") throw new Error(task.errorCode);
  await new Promise(resolve => setTimeout(resolve, 2000));
}
if (!completed) throw new Error("Task timed out");`;
