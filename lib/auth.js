const { createHmac, timingSafeEqual } = require("crypto");

function getPasswords(){
  return [process.env.ADMIN_PASSWORD, process.env.ADMIN_PASSWORD_2]
    .map((value) => String(value || "").trim())
    .filter(Boolean);
}

function safeEqual(a, b){
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  if(left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function matchAdminPassword(password){
  const typed = String(password || "").trim();
  const passwords = getPasswords();
  for(let i = 0; i < passwords.length; i++){
    if(safeEqual(typed, passwords[i])){
      return { ok: true, role: i === 0 ? "admin" : "admin2" };
    }
  }
  return { ok: false, role: null };
}

function createSessionToken(role){
  const secret = process.env.ADMIN_SESSION_SECRET;
  if(!secret) throw new Error("ADMIN_SESSION_SECRET is not set");
  const payload = Buffer.from(JSON.stringify({
    role,
    exp: Date.now() + (1000 * 60 * 60 * 12)
  })).toString("base64url");
  const sig = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

function verifySessionToken(token){
  const secret = process.env.ADMIN_SESSION_SECRET;
  if(!secret || !token) return null;
  const [payload, sig] = String(token).split(".");
  if(!payload || !sig) return null;
  const expected = createHmac("sha256", secret).update(payload).digest("base64url");
  const left = Buffer.from(sig);
  const right = Buffer.from(expected);
  if(left.length !== right.length || !timingSafeEqual(left, right)) return null;
  try{
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if(!data.exp || data.exp < Date.now()) return null;
    return data;
  }catch(e){
    return null;
  }
}

function getBearerToken(req){
  const header = req.headers.authorization || req.headers.Authorization || "";
  const match = String(header).match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : "";
}

module.exports = {
  matchAdminPassword,
  createSessionToken,
  verifySessionToken,
  getBearerToken
};
