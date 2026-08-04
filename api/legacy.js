const { verifySessionToken, getBearerToken } = require("../lib/auth");
const { supabaseRequest } = require("../lib/supabase");

function sendJson(res, status, payload){
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

async function readBody(req){
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8") || "{}";
  return JSON.parse(raw);
}

module.exports = async function handler(req, res){
  try{
    if(req.method === "GET"){
      const session = verifySessionToken(getBearerToken(req));
      if(!session){
        sendJson(res, 401, { error: "Unauthorized" });
        return;
      }
      const rows = await supabaseRequest("legacy_messages", { method: "GET" });
      sendJson(res, 200, rows);
      return;
    }

    if(req.method === "POST"){
      const body = await readBody(req);
      await supabaseRequest("legacy_messages", { method: "POST", body });
      sendJson(res, 200, { ok: true });
      return;
    }

    sendJson(res, 405, { error: "Method not allowed" });
  }catch(e){
    sendJson(res, e.status || 500, { error: e.message || "Request failed" });
  }
};
