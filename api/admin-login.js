const { matchAdminPassword, createSessionToken } = require("../lib/auth");

function sendJson(res, status, payload){
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

module.exports = async function handler(req, res){
  if(req.method !== "POST"){
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  try{
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const raw = Buffer.concat(chunks).toString("utf8") || "{}";
    const body = JSON.parse(raw);
    const result = matchAdminPassword(body.password);

    if(!result.ok){
      sendJson(res, 401, { error: "Incorrect password." });
      return;
    }

    const token = createSessionToken(result.role);
    sendJson(res, 200, { token, role: result.role });
  }catch(e){
    sendJson(res, 500, { error: "Login failed." });
  }
};
