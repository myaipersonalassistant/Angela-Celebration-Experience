# Local Node server only — used by `npm run dev`.
# Vercel must NOT run this file. Production uses static files + /api/* functions.
require("dotenv").config();

const http = require("http");
const path = require("path");
const fs = require("fs");
const { URL } = require("url");

const adminLogin = require("./api/admin-login");
const challenge = require("./api/challenge");
const legacy = require("./api/legacy");

const PORT = Number(process.env.PORT || 3456);
const ROOT = __dirname;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".json": "application/json",
  ".md": "text/markdown; charset=utf-8",
  ".txt": "text/plain; charset=utf-8"
};

function send(res, status, body, headers = {}){
  res.writeHead(status, headers);
  res.end(body);
}

function sendNotFound(res){
  const file = path.join(ROOT, "404.html");
  if(fs.existsSync(file)){
    send(res, 404, fs.readFileSync(file), {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store"
    });
    return;
  }
  send(res, 404, "Not found");
}

function serveStatic(req, res, pathname){
  let filePath = pathname === "/" ? "/challenge.html" : pathname;
  filePath = decodeURIComponent(filePath.split("?")[0]);
  const absolute = path.normalize(path.join(ROOT, filePath));
  if(!absolute.startsWith(ROOT)){
    send(res, 403, "Forbidden");
    return;
  }
  if(!fs.existsSync(absolute) || fs.statSync(absolute).isDirectory()){
    sendNotFound(res);
    return;
  }
  const ext = path.extname(absolute).toLowerCase();
  const type = MIME[ext] || "application/octet-stream";
  send(res, 200, fs.readFileSync(absolute), {
    "Content-Type": type,
    "Cache-Control": ext === ".html" || ext === ".js" ? "no-store" : "public, max-age=3600"
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  if(pathname === "/api/admin-login") return adminLogin(req, res);
  if(pathname === "/api/challenge") return challenge(req, res);
  if(pathname === "/api/legacy") return legacy(req, res);

  if(pathname === "/admin" || pathname === "/admin/"){
    return serveStatic(req, res, "/admin.html");
  }
  const tableMatch = pathname.match(/^\/t\/(\d+)\/?$/);
  if(tableMatch){
    res.writeHead(302, { Location: `/challenge.html?table=${tableMatch[1]}` });
    res.end();
    return;
  }

  try{
    serveStatic(req, res, pathname);
  }catch(e){
    send(res, 500, "Server error");
  }
});

server.listen(PORT, () => {
  console.log(`Angela celebration running at http://localhost:${PORT}`);
  if(!process.env.ADMIN_PASSWORD || !process.env.SUPABASE_URL){
    console.warn("Warning: check your .env — some secrets may be missing.");
  }
});
