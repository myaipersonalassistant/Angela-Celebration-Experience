function supabaseConfig(){
  const url = String(process.env.SUPABASE_URL || "").replace(/\/$/, "");
  const key = String(process.env.SUPABASE_ANON_KEY || "");
  if(!url || !key) return null;
  return { url, key };
}

async function supabaseRequest(table, { method = "GET", body = null } = {}){
  const config = supabaseConfig();
  if(!config){
    const error = new Error("Supabase is not configured on the server");
    error.status = 503;
    throw error;
  }

  const endpoint = method === "GET"
    ? `${config.url}/rest/v1/${table}?select=*&order=created_at.desc`
    : `${config.url}/rest/v1/${table}`;

  const headers = {
    apikey: config.key,
    Authorization: `Bearer ${config.key}`,
    "Content-Type": "application/json"
  };
  if(method === "POST") headers.Prefer = "return=minimal";

  const res = await fetch(endpoint, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  if(!res.ok){
    const error = new Error(await res.text());
    error.status = res.status;
    throw error;
  }

  if(method === "GET") return await res.json();
  return { ok: true };
}

module.exports = { supabaseConfig, supabaseRequest };
