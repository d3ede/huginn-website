export const pythonExample = `import os, time, requests

base = os.environ["HUGINN_BASE_URL"] + "/v1"
headers = {"Authorization": "Bearer " + os.environ["HUGINN_API_KEY"]}

response = requests.post(base + "/tasks", headers=headers,
    json={"type": "hcaptcha", "websiteURL": "https://example.com",
          "websiteKey": "YOUR_SITE_KEY"}, timeout=20)
response.raise_for_status()
task = response.json()

for _ in range(120):
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
    ...options, headers, signal: AbortSignal.timeout(20000)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error.message);
  return data;
}

let task = await request("/tasks", {
  method: "POST",
  body: JSON.stringify({ type: "hcaptcha",
    websiteURL: "https://example.com", websiteKey: "YOUR_SITE_KEY" })
});

for (let i = 0; i < 120; i++) {
  task = await request("/tasks/" + task.id);
  if (task.status === "succeeded") {
    console.log(task.result.token);
    break;
  }
  if (task.status === "failed") throw new Error(task.errorCode);
  if (i === 119) throw new Error("Task timed out");
  await new Promise(resolve => setTimeout(resolve, 2000));
}`;
