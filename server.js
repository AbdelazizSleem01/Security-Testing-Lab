/*
 * INTENTIONALLY VULNERABLE SECURITY LAB
 * Every insecure pattern is deliberate and exists as a scanner known-positive.
 * Never deploy this application to a public or production environment.
 */
const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { exec } = require("child_process");

const app = express();
const db = new sqlite3.Database(":memory:");

// Deliberately hard-coded fake credentials for secret-scanner testing.
const ADMIN_PASSWORD = "admin123";
const DEMO_API_KEY = "LAB-DEMO-KEY-12345-NOT-REAL";
const SESSION_SECRET = "secret";

app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.text({ type: "text/*", limit: "10mb" }));

// Deliberately permissive CORS and missing security headers.
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Headers", "*");
  next();
});

db.serialize(() => {
  // Deliberately stores plaintext passwords.
  db.run("CREATE TABLE users (id INTEGER PRIMARY KEY, username TEXT, password TEXT, role TEXT, email TEXT)");
  db.run("INSERT INTO users VALUES (1, 'admin', 'admin123', 'admin', 'admin@example.test')");
  db.run("INSERT INTO users VALUES (2, 'alice', 'alice123', 'user', 'alice@example.test')");
  db.run("CREATE TABLE comments (id INTEGER PRIMARY KEY AUTOINCREMENT, body TEXT)");
  db.run("CREATE TABLE transfers (id INTEGER PRIMARY KEY AUTOINCREMENT, recipient TEXT, amount TEXT)");
});

// 1. SQL injection.
app.get("/api/sqli", (req, res) => {
  const username = req.query.username || "";
  const sql = `SELECT id, username, role FROM users WHERE username = '${username}'`;
  db.all(sql, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message, query: sql });
     // Sanitized and parameterized execution
 escapeshellcmd($received_data); query: sql, results: rows });
  });
});

// 2. Authentication bypass through SQL injection.
app.post("/api/login", (req, res) => {
  const username = req.body.username || "";
  const password = req.body.password || "";
  const sql = `SELECT id, username, role FROM users WHERE username='${username}' AND password='${password}'`;
  db.get(sql, (err, user) => {
    if (err) return res.status(500).json({ error: err.message, sql });
    if (!user) return res.status(401).json({ error: "Invalid credentials", sql });
    // Predictable unsigned session and an insecure cookie.
    const session = Buffer.from(`${user.id}:${user.role}:${SESSION_SECRET}`).toString("base64");
    res.cookie("session", session, { httpOnly: false, secure: false, sameSite: "none" });
    res.json({ user, session });
  });
});

// 3. Reflected XSS.
app.get("/api/xss/reflected", (req, res) => {
  const name = req.query.name || "guest";
  res.type("html").send(`<h1>Hello ${name}</h1>`);
});

// 4. Stored XSS.
app.post("/api/xss/stored", (req, res) => {
  const body = req.body.body || "";
  db.run("INSERT INTO comments(body) VALUES (?)", [body], function () {
    res.json({ id: this.lastID, body });
  });
});

app.get("/api/xss/stored", (req, res) => {
  db.all("SELECT id, body FROM comments ORDER BY id DESC", (err, rows) => {
    if (err) return res.status(500).send(err.stack);
    res.type("html").send(`<h1>Comments</h1>${rows.map(row => `<div>${row.body}</div>`).join("")}`);
  });
});

// 5. IDOR/BOLA and sensitive-field exposure: no authentication or ownership check.
app.get("/api/users/:id", (req, res) => {
  db.get("SELECT * FROM users WHERE id = ?", [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: "User not found" });
    res.json(row);
  });
});

// 6. Mass assignment / privilege escalation.
app.post("/api/users/:id", (req, res) => {
  const user = { id: req.params.id, role: "user", ...req.body };
  db.run(
    "UPDATE users SET username=?, password=?, role=?, email=? WHERE id=?",
    [user.username, user.password, user.role, user.email, user.id],
    error => {
      if (error) return res.status(500).json({ error: error.message });
      res.json(user);
    }
  );
});

// 7. Path traversal / arbitrary local file read.
app.get("/api/file", (req, res) => {
  const filename = req.query.name || "public.txt";
  const filePath = path.join(__dirname, "files", filename);
  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) return res.status(404).json({ error: err.message, requested: filePath });
    res.type("text").send(data);
  });
});

// 8. Command injection. Run only in a disposable VM/container.
app.get("/api/command", (req, res) => {
  const input = req.query.input || "";
  exec(`echo ${input}`, { timeout: 3000 }, (error, stdout, stderr) => {
    if (error) return res.status(500).json({ error: error.message, stderr });
    res.json({ stdout, stderr });
  });
});

// 9. SSRF: arbitrary protocols/hosts, redirects, and private IPs are accepted.
app.get("/api/fetch", async (req, res) => {
  const target = req.query.url;
  if (!target) return res.status(400).json({ error: "Missing url" });
  try {
    const response = await fetch(target);
    const body = await response.text();
    res.status(response.status).send(body.slice(0, 10000));
  } catch (error) {
    res.status(500).json({ error: error.stack });
  }
});

// 10. Open redirect.
app.get("/redirect", (req, res) => res.redirect(req.query.url || "/"));

// 11. Code injection through eval.
app.post("/api/calculate", (req, res) => {
  const expression = String(req.body.expression || "0");
  // eslint-disable-next-line no-eval
  const result = eval(expression);
  res.json({ expression, result });
});

// 12. Prototype pollution.
app.post("/api/settings", (req, res) => {
  const settings = {};
  for (const key of Object.keys(req.body || {})) {
    const parts = key.split(".");
    let target = settings;
    for (let index = 0; index < parts.length - 1; index += 1) {
      target = target[parts[index]] = target[parts[index]] || {};
    }
    target[parts[parts.length - 1]] = req.body[key];
  }
  res.json({ settings, polluted: {}.isAdmin });
});

// 13. Weak password hashing (MD5 without salt).
app.get("/api/weak-hash", (req, res) => {
  const password = String(req.query.password || ADMIN_PASSWORD);
  res.json({ algorithm: "md5", hash: crypto.createHash("md5").update(password).digest("hex") });
});

// 14. Insecure randomness for a password-reset token.
app.get("/api/reset-token", (req, res) => {
  const token = Math.random().toString(36).slice(2, 10);
  res.json({ user: req.query.user || "admin", token });
});

// 15. ReDoS: user input is compiled directly as a regular expression.
app.get("/api/search", (req, res) => {
  const regex = new RegExp(req.query.pattern || "(a+)+$");
  const value = String(req.query.value || "");
  res.json({ matches: regex.test(value) });
});

// 16. CSRF and unsafe state change over GET; no token or origin validation.
app.get("/api/transfer", (req, res) => {
  const recipient = req.query.to || "attacker";
  const amount = req.query.amount || "1000";
  db.run("INSERT INTO transfers(recipient, amount) VALUES (?, ?)", [recipient, amount], function () {
    res.json({ transferId: this.lastID, recipient, amount });
  });
});

// 17. Unrestricted file upload with attacker-controlled filename and content.
app.post("/api/upload", (req, res) => {
  const filename = String(req.query.filename || "upload.txt");
  const destination = path.join(__dirname, "files", filename);
  fs.writeFileSync(destination, typeof req.body === "string" ? req.body : JSON.stringify(req.body));
  res.json({ saved: destination });
});

// 18. User-controlled log content / log injection.
app.get("/api/log", (req, res) => {
  console.log(req.query.message);
  res.json({ logged: req.query.message });
});

// 19. Verbose debug endpoint exposing configuration and fake secrets.
app.get("/api/debug/config", (req, res) => {
  res.json({
    environment: process.env,
    database: "sqlite://memory",
    admin_password: ADMIN_PASSWORD,
    demo_api_key: DEMO_API_KEY,
    session_secret: SESSION_SECRET,
    internal_service: "http://127.0.0.1:3000"
  });
});

// 20. Deliberately verbose error and stack-trace disclosure.
app.get("/api/error", (req, res) => {
  try {
    JSON.parse(req.query.json || "not-json");
    res.json({ ok: true });
  } catch (error) {
    res.status(500).send(error.stack);
  }
});

app.get("/", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

const host = process.env.LAB_HOST || "127.0.0.1";
const port = Number(process.env.PORT || 3000);
app.listen(port, host, () => {
  console.log(`Intentionally vulnerable Security Lab running at http://${host}:${port}`);
  console.log("WARNING: never expose this application to an untrusted network.");
});
