const express = require("express");
const os = require("os");
const fs = require("fs");
const crypto = require("crypto");
const { execSync } = require("child_process");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8080;
let loadRunning = false;
let loadLevel = "low";
let requestsHandled = 0;
let totalWorkMs = 0;

function readFileSafe(path) {
  try { return fs.readFileSync(path, "utf8").trim(); } catch (_) { return null; }
}

function getInstanceInfo() {
  const hostname = os.hostname();
  let instanceId = process.env.INSTANCE_ID || "local";
  let privateIp = process.env.PRIVATE_IP || "unknown";
  let availabilityZone = process.env.AVAILABILITY_ZONE || "unknown";

  try {
    const token = execSync(
      "curl -sS --max-time 1 -X PUT -H 'X-aws-ec2-metadata-token-ttl-seconds: 60' http://169.254.169.254/latest/api/token",
      { encoding: "utf8" }
    ).trim();

    const header = `-H 'X-aws-ec2-metadata-token: ${token}'`;
    const get = (path) => execSync(
      `curl -sS --max-time 1 ${header} http://169.254.169.254/latest/meta-data/${path}`,
      { encoding: "utf8" }
    ).trim();

    instanceId = get("instance-id") || instanceId;
    privateIp = get("local-ipv4") || privateIp;
    availabilityZone = get("placement/availability-zone") || availabilityZone;
  } catch (_) {}

  return {
    instanceId,
    hostname,
    privateIp,
    availabilityZone,
    containerId: process.env.HOSTNAME || "local",
    pid: process.pid
  };
}

function doCpuWork(level) {
  const durations = { low: 20, medium: 60, high: 150, extreme: 350 };
  const duration = durations[level] || durations.low;
  const start = Date.now();
  let hash = Buffer.from("autoscaling-test");

  while (Date.now() - start < duration) {
    hash = crypto.createHash("sha256").update(hash).digest();
  }

  const elapsed = Date.now() - start;
  totalWorkMs += elapsed;
  return elapsed;
}

app.get("/health", (_req, res) => {
  res.json({ status: "healthy", ...getInstanceInfo(), timestamp: new Date().toISOString() });
});

app.get("/api/info", (_req, res) => {
  res.json({ ...getInstanceInfo(), loadRunning, loadLevel, requestsHandled, timestamp: new Date().toISOString() });
});

app.get("/api/load", (_req, res) => {
  const elapsed = doCpuWork(loadLevel);
  requestsHandled++;
  res.json({
    ok: true,
    loadLevel,
    workMs: elapsed,
    requestNumber: requestsHandled,
    ...getInstanceInfo(),
    timestamp: new Date().toISOString()
  });
});

app.post("/api/load/start", (req, res) => {
  loadRunning = true;
  loadLevel = req.body?.level || "medium";
  res.json({ loadRunning, loadLevel, ...getInstanceInfo() });
});

app.post("/api/load/stop", (_req, res) => {
  loadRunning = false;
  res.json({ loadRunning, loadLevel, ...getInstanceInfo() });
});

app.get("/api/stats", (_req, res) => {
  res.json({
    loadRunning,
    loadLevel,
    requestsHandled,
    totalWorkMs,
    uptimeSeconds: Math.floor(process.uptime()),
    ...getInstanceInfo(),
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Backend listening on ${PORT}`);
});
