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
<title>Sign in — Harbor Freight Billing Tool</title>
<style>
  :root{ --accent:#2da84e; --accent-dark:#3f7d3f; --ink:#1f2430; --muted:#6b7280; --bg:#f2f3f5; --card:#ffffff; --border:#e3e6ea; --danger:#c0392b; --danger-light:#fbeceb; }
  *{box-sizing:border-box;}
  html,body{margin:0;padding:0;height:100%;}
  body{
    background:var(--bg); color:var(--ink);
    font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
    display:flex; align-items:center; justify-content:center; min-height:100%; padding:20px;
  }
  .card{
    background:var(--card); border-radius:14px; overflow:hidden;
    box-shadow:0 8px 24px rgba(20,20,30,0.10), 0 1px 3px rgba(20,20,30,0.06);
    width:100%; max-width:460px;
  }
  .card-bar{ height:6px; background:var(--accent); }
  .card-body{ padding:32px 36px 36px; }
  .brand{ display:flex; align-items:center; gap:9px; margin-bottom:8px; }
  .brand svg{ flex:none; }
  .brand .word{ font-size:26px; font-weight:800; letter-spacing:.01em; color:var(--ink); }
  .tagline{
    font-size:12px; font-weight:600; letter-spacing:.045em; color:var(--muted);
    text-transform:uppercase; margin:0 0 26px; white-space:nowrap;
  }
  label{ font-size:14.5px; font-weight:700; color:var(--ink); display:block; margin-bottom:8px; }
  input[type="password"]{
    width:100%; font-size:15px; padding:12px 14px; border:1.5px solid var(--accent);
    border-radius:8px; font-family:inherit; margin-bottom:20px;
  }
  input[type="password"]:focus{ outline:2px solid var(--accent); outline-offset:1px; }
  button{
    width:100%; font-size:15px; font-weight:700; padding:13px 13px; border-radius:8px;
    border:1px solid var(--accent-dark); background:var(--accent-dark); color:#fff; cursor:pointer;
  }
  button:hover{ background:#356b35; }
  .error{
    background:var(--danger-light); color:var(--danger); border:1px solid var(--danger);
    border-radius:8px; padding:9px 12px; font-size:13px; margin-bottom:16px;
  }
</style>
</head>
<body>
  <div class="card">
    <div class="card-bar"></div>
    <div class="card-body">
      <div class="brand">
        <svg width="18" height="24" viewBox="0 0 18 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <polygon points="0,0 0,24 18,24" fill="#2da84e"/>
        </svg>
        <span class="word">TRIANGLE</span>
      </div>
      <p class="tagline">Investment Group &middot; Harbor Freight Billing Tool</p>
      ${error ? '<div class="error">Incorrect passcode. Please try again.</div>' : ""}
      <form method="POST" action="/login" autocomplete="off">
        <label for="passcode">Passcode</label>
        <input type="password" id="passcode" name="passcode" autofocus required>
        <button type="submit">Enter</button>
      </form>
    </div>
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
