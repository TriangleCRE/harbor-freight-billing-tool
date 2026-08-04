"use strict";

const path = require("node:path");
const express = require("express");
const {
  COOKIE_NAME,
  MAX_AGE_MS,
  checkPasscode,
  makeSessionCookieValue,
  isValidSessionCookie,
} = require("./lib/auth");

const app = express();

app.disable("x-powered-by");
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  header.split(";").forEach((part) => {
    const idx = part.indexOf("=");
    if (idx === -1) return;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (key) {
      try {
        out[key] = decodeURIComponent(val);
      } catch {
        out[key] = val;
      }
    }
  });
  return out;
}

function setSessionCookie(res) {
  res.cookie(COOKIE_NAME, makeSessionCookieValue(), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: MAX_AGE_MS,
    path: "/",
  });
}

function clearSessionCookie(res) {
  res.clearCookie(COOKIE_NAME, { path: "/" });
}

function renderLoginPage({ error } = {}) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Sign in — Harbor Freight Center</title>
<style>
  :root{ --accent:#2da84e; --accent-dark:#228241; --ink:#1f2430; --muted:#6b7280; --bg:#f5f6f8; --card:#ffffff; --border:#e3e6ea; --danger:#c0392b; --danger-light:#fbeceb; }
  *{box-sizing:border-box;}
  html,body{margin:0;padding:0;height:100%;}
  body{
    background:var(--bg); color:var(--ink);
    font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
    display:flex; align-items:center; justify-content:center; min-height:100%; padding:20px;
  }
  .card{
    background:var(--card); border:1px solid var(--border); border-radius:12px;
    box-shadow:0 1px 2px rgba(20,20,30,0.04), 0 1px 8px rgba(20,20,30,0.04);
    padding:32px 28px; width:100%; max-width:360px;
  }
  h1{ font-size:17px; margin:0 0 4px; font-weight:700; letter-spacing:-0.01em; }
  p.sub{ font-size:13px; color:var(--muted); margin:0 0 20px; }
  label{ font-size:12.5px; font-weight:600; color:var(--muted); display:block; margin-bottom:6px; }
  input[type="password"]{
    width:100%; font-size:15px; padding:10px 12px; border:1px solid var(--border);
    border-radius:8px; font-family:inherit; margin-bottom:16px;
  }
  input[type="password"]:focus{ outline:2px solid var(--accent); outline-offset:1px; }
  button{
    width:100%; font-size:14px; font-weight:600; padding:10px 13px; border-radius:8px;
    border:1px solid var(--accent-dark); background:var(--accent); color:#fff; cursor:pointer;
  }
  button:hover{ background:var(--accent-dark); }
  .error{
    background:var(--danger-light); color:var(--danger); border:1px solid var(--danger);
    border-radius:8px; padding:9px 12px; font-size:13px; margin-bottom:16px;
  }
</style>
</head>
<body>
  <div class="card">
    <h1>Harbor Freight Center</h1>
    <p class="sub">Enter the passcode to continue.</p>
    ${error ? '<div class="error">Incorrect passcode. Please try again.</div>' : ""}
    <form method="POST" action="/login" autocomplete="off">
      <label for="passcode">Passcode</label>
      <input type="password" id="passcode" name="passcode" autofocus required>
      <button type="submit">Continue</button>
    </form>
  </div>
</body>
</html>`;
}

// Public, always reachable: robots.txt disallows all crawlers.
app.get("/robots.txt", (req, res) => {
  res.type("text/plain").send("User-agent: *\nDisallow: /\n");
});

// Public: the login page and the endpoint that verifies the passcode.
app.get("/login", (req, res) => {
  const cookies = parseCookies(req.headers.cookie);
  if (isValidSessionCookie(cookies[COOKIE_NAME])) {
    return res.redirect(302, "/");
  }
  res.status(200).send(renderLoginPage());
});

app.post("/login", (req, res) => {
  const candidate = req.body && req.body.passcode;
  if (checkPasscode(candidate)) {
    setSessionCookie(res);
    return res.redirect(303, "/");
  }
  clearSessionCookie(res);
  res.status(401).send(renderLoginPage({ error: true }));
});

// Everything below this line is gated: no page, static asset, or API route
// is reachable without a valid session cookie.
app.use((req, res, next) => {
  const cookies = parseCookies(req.headers.cookie);
  if (isValidSessionCookie(cookies[COOKIE_NAME])) {
    // Slide the expiry forward on every authenticated request so a visitor
    // who returns at least once a month is never re-prompted.
    setSessionCookie(res);
    return next();
  }
  if (req.path.startsWith("/api/")) {
    return res.status(401).json({ error: "unauthorized" });
  }
  return res.redirect(302, "/login");
});

app.use(express.static(path.join(__dirname, "public")));

app.use((req, res) => {
  res.status(404).send("Not found");
});

if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Listening on port ${port}`);
  });
}

module.exports = app;
