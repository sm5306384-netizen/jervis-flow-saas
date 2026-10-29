const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const root = __dirname;
const dashboardPath = path.join(root, "gym-owner-dashboard.html");
const serverPath = path.join(root, "auth-server.js");
const dataDir = path.join(root, "auth-data");

fs.mkdirSync(dataDir, { recursive: true });

const secretPath = path.join(dataDir, "session-secret");

if (!fs.existsSync(secretPath)) {
  fs.writeFileSync(
    secretPath,
    crypto.randomBytes(48).toString("hex"),
    { mode: 0o600, flag: "wx" }
  );
}

const secret = fs.readFileSync(secretPath, "utf8").trim();

if (secret.length < 32) {
  throw new Error("Session secret is invalid. Check auth-data/session-secret.");
}

let server = fs.readFileSync(serverPath, "utf8");

// Let the server load the persistent secret after a PowerShell restart.
const oldSecretLine = "const secret = process.env.AUTH_SESSION_SECRET;";

if (server.includes(oldSecretLine)) {
  server = server.replace(
    oldSecretLine,
    'const secret = process.env.AUTH_SESSION_SECRET || fs.readFileSync(path.join(DATA_DIR, "session-secret"), "utf8").trim();'
  );
  fs.writeFileSync(serverPath, server, "utf8");
}

if (!server.includes('"/api/gym-information"') ||
    !server.includes('"/api/logout"') ||
    !server.includes('"/dashboard"')) {
  throw new Error("Authentication server routes are incomplete; server was not started.");
}

// Prevent account databases and session secrets from being committed accidentally.
const gitignorePath = path.join(root, ".gitignore");
let gitignore = fs.existsSync(gitignorePath)
  ? fs.readFileSync(gitignorePath, "utf8")
  : "";

if (!gitignore.split(/\r?\n/).includes("auth-data/")) {
  gitignore += (gitignore.endsWith("\n") || gitignore.length === 0 ? "" : "\n");
  gitignore += "auth-data/\n";
  fs.writeFileSync(gitignorePath, gitignore, "utf8");
}

let html = fs.readFileSync(dashboardPath, "utf8");

if (!html.includes('id="gymForm"') ||
    !html.includes('id="saveBtn"') ||
    !html.includes('id="resetBtn"')) {
  throw new Error("Expected dashboard form/buttons not found. Original dashboard was not overwritten.");
}

// Add a logout button without changing the existing dashboard layout.
if (!html.includes('id="logoutBtn"')) {
  const badge = '<div class="badge">● Gym Profile Settings</div>';

  if (!html.includes(badge)) {
    throw new Error("Dashboard header could not be located.");
  }

  html = html.replace(
    badge,
    badge + '\n  <button class="secondary" type="button" id="logoutBtn" style="margin-left:auto">Logout</button>'
  );
}

if (!html.includes("gym_owner_knowledge_prototype_v1")) {
  throw new Error("Unexpected dashboard version; integration stopped.");
}

// Explain that data is now saved per account on the server.
html = html.replace(
  /<div class="notice">[\s\S]*?<\/div>/,
  '<div class="notice"><strong>Account protected:</strong> Gym information is saved to your account on the server. Har gym owner ka data alag hai. Changes save karne ke liye Save Gym Information dabayein.</div>'
);

const replacementScript = String.raw`
<script>
(function () {
  const form = document.getElementById("gymForm");
  const fields = Array.from(form.querySelectorAll("input, textarea, select"));
  const status = document.getElementById("status");
  const saveButton = document.getElementById("saveBtn");
  const resetButton = document.getElementById("resetBtn");
  const logoutButton = document.getElementById("logoutBtn");

  let loading = false;
  let saving = false;

  function updateProgress() {
    const filled = fields.filter(el => el.value.trim() !== "").length;
    document.getElementById("count").textContent = filled + "/20";
    document.getElementById("progress").style.width =
      (filled / fields.length * 100) + "%";
  }

  function collectData() {
    const data = {};
    fields.forEach(el => {
      data[el.id] = el.value.trim();
    });
    return data;
  }

  function showError(message) {
    status.textContent = message;
    status.style.color = "#fca5a5";
  }

  function showSuccess(message) {
    status.textContent = message;
    status.style.color = "#86efac";
  }

  async function api(url, options) {
    const response = await fetch(url, Object.assign({
      credentials: "same-origin",
      cache: "no-store"
    }, options || {}));

    if (response.status === 401) {
      location.replace("/");
      throw new Error("Session expire ho gaya. Dobara login karo.");
    }

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(result.error || "Request complete nahi hui.");
    }

    return result;
  }

  async function loadData() {
    loading = true;
    saveButton.disabled = true;
    resetButton.disabled = true;
    logoutButton.disabled = true;
    status.textContent = "Account information load ho rahi hai...";

    try {
      const data = await api("/api/gym-information");

      fields.forEach(el => {
        el.value = typeof data[el.id] === "string" ? data[el.id] : "";
      });

      showSuccess("Account ki saved gym information load ho gayi.");
    } catch (error) {
      showError(error.message || "Information load nahi ho saki.");
    } finally {
      loading = false;
      saveButton.disabled = false;
      resetButton.disabled = false;
      logoutButton.disabled = false;
      updateProgress();
    }
  }

  saveButton.addEventListener("click", async function () {
    if (loading || saving || !form.reportValidity()) return;

    saving = true;
    saveButton.disabled = true;
    status.textContent = "Server par save ho raha hai...";

    try {
      await api("/api/gym-information", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(collectData())
      });

      showSuccess("Gym information account mein successfully save ho gayi.");
    } catch (error) {
      showError(error.message || "Save failed. Dobara try karo.");
    } finally {
      saving = false;
      saveButton.disabled = false;
      updateProgress();
    }
  });

  resetButton.addEventListener("click", async function () {
    if (loading || saving) return;

    if (!confirm("Is account ki saved gym information delete karke form clear karna hai?")) {
      return;
    }

    saving = true;
    resetButton.disabled = true;
    saveButton.disabled = true;

    try {
      await api("/api/gym-information", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      });

      form.reset();
      showSuccess("Is account ki gym information clear ho gayi.");
    } catch (error) {
      showError(error.message || "Information clear nahi ho saki.");
    } finally {
      saving = false;
      resetButton.disabled = false;
      saveButton.disabled = false;
      updateProgress();
    }
  });

  logoutButton.addEventListener("click", async function () {
    if (saving || loading) return;
    if (!confirm("Logout karna hai?")) return;

    logoutButton.disabled = true;

    try {
      await api("/api/logout", { method: "POST" });
      location.replace("/");
    } catch (error) {
      showError(error.message || "Logout nahi ho saka.");
      logoutButton.disabled = false;
    }
  });

  fields.forEach(el => el.addEventListener("input", function () {
    if (!loading) {
      status.textContent = "Unsaved changes — Save Gym Information dabayein.";
      status.style.color = "#facc15";
      updateProgress();
    }
  }));

  loadData();
})();
</script>
</body>`;

const scriptPattern = /<script>[\s\S]*?<\/script>\s*<\/body>/i;

if (!scriptPattern.test(html)) {
  throw new Error("Dashboard script block not found. Dashboard was not updated.");
}

html = html.replace(scriptPattern, replacementScript);

fs.writeFileSync(dashboardPath, html, "utf8");

console.log("Dashboard connected to account-specific server APIs.");
console.log("Logout button added.");
console.log("Persistent session secret configured.");
console.log("Account data and sessions will be stored under auth-data/.");
