const AUTH_TOKEN_KEY = "angela_mc_token";
const AUTH_ROLE_KEY = "angela_mc_role";
const TABLES = ["1", "2", "3", "4", "5", "6"];
const AUTO_MS = 15000;

const gate = document.getElementById("adminGate");
const app = document.getElementById("adminApp");
const passwordInput = document.getElementById("adminPasswordInput");
const gateError = document.getElementById("adminGateError");
const alertBox = document.getElementById("adminAlert");
const connectionBadge = document.getElementById("connectionBadge");
const lastRefreshEl = document.getElementById("lastRefresh");
const autoBtn = document.getElementById("autoRefreshToggle");
const menuToggle = document.getElementById("menuToggle");
const sidebarBackdrop = document.getElementById("sidebarBackdrop");
const pageTitle = document.getElementById("pageTitle");
const pageNote = document.getElementById("pageNote");
const announcePreview = document.getElementById("announcePreview");

let autoRefresh = true;
let autoTimer = null;
let legacyFilter = "all";
let latestEntries = [];
let latestMessages = [];
let usingLiveDb = false;

function getToken(){
  return sessionStorage.getItem(AUTH_TOKEN_KEY) || "";
}

function isUnlocked(){
  return Boolean(getToken());
}

function showApp(){
  gate.classList.add("hidden");
  app.classList.remove("hidden");
  render();
  startAutoRefresh();
}

function showGate(){
  stopAutoRefresh();
  closeSidebar();
  sessionStorage.removeItem(AUTH_TOKEN_KEY);
  sessionStorage.removeItem(AUTH_ROLE_KEY);
  app.classList.add("hidden");
  gate.classList.remove("hidden");
  gateError.classList.add("hidden");
  passwordInput.value = "";
  passwordInput.focus();
}

async function tryUnlock(){
  const typed = String(passwordInput.value || "").trim();
  if(!typed){
    gateError.textContent = "Enter the host password.";
    gateError.classList.remove("hidden");
    return;
  }

  gateError.classList.add("hidden");
  try{
    const res = await fetch("/api/admin-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: typed })
    });
    const data = await res.json().catch(() => ({}));
    if(!res.ok || !data.token){
      gateError.textContent = data.error || "Incorrect password.";
      gateError.classList.remove("hidden");
      passwordInput.focus();
      passwordInput.select();
      return;
    }
    sessionStorage.setItem(AUTH_TOKEN_KEY, data.token);
    sessionStorage.setItem(AUTH_ROLE_KEY, data.role || "admin");
    showApp();
  }catch(e){
    gateError.textContent = "Could not reach the login service. Is the server running?";
    gateError.classList.remove("hidden");
  }
}

function setAlert(message, type = "info"){
  if(!message){
    alertBox.classList.add("hidden");
    alertBox.textContent = "";
    return;
  }
  alertBox.textContent = message;
  alertBox.className = `admin-alert ${type}`;
}

function startAutoRefresh(){
  stopAutoRefresh();
  if(!autoRefresh) return;
  autoTimer = setInterval(() => {
    if(!document.hidden) render({ quiet: true });
  }, AUTO_MS);
}

function stopAutoRefresh(){
  if(autoTimer) clearInterval(autoTimer);
  autoTimer = null;
}

function syncAutoButton(){
  autoBtn.textContent = autoRefresh ? "Auto-refresh: On" : "Auto-refresh: Off";
}

function openSidebar(){
  app.classList.add("sidebar-open");
  sidebarBackdrop.classList.remove("hidden");
}

function closeSidebar(){
  app.classList.remove("sidebar-open");
  sidebarBackdrop.classList.add("hidden");
}

function showPage(pageId){
  document.querySelectorAll(".admin-page").forEach((page) => {
    page.classList.toggle("active", page.id === `page-${pageId}`);
  });
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.classList.toggle("active", item.dataset.page === pageId);
  });

  const activePage = document.getElementById(`page-${pageId}`);
  if(activePage){
    pageTitle.textContent = activePage.dataset.title || pageId;
    pageNote.textContent = activePage.dataset.note || "";
  }
  closeSidebar();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.getElementById("adminUnlock").addEventListener("click", tryUnlock);
passwordInput.addEventListener("keydown", (e) => {
  if(e.key === "Enter") tryUnlock();
});
document.getElementById("adminLock").addEventListener("click", showGate);
document.getElementById("refreshDashboard").addEventListener("click", () => render());
autoBtn.addEventListener("click", () => {
  autoRefresh = !autoRefresh;
  syncAutoButton();
  if(autoRefresh) startAutoRefresh();
  else stopAutoRefresh();
});
menuToggle.addEventListener("click", () => {
  if(app.classList.contains("sidebar-open")) closeSidebar();
  else openSidebar();
});
sidebarBackdrop.addEventListener("click", closeSidebar);

document.querySelectorAll(".nav-item").forEach((item) => {
  item.addEventListener("click", () => showPage(item.dataset.page));
});

document.getElementById("clearDemo").addEventListener("click", () => {
  if(usingLiveDb){
    setAlert("Live Supabase data cannot be cleared from this page. Clear rows in the Supabase dashboard if needed.", "warn");
    return;
  }
  if(confirm("Clear local demonstration results on this device?")){
    localStorage.removeItem("angela_challenge_entries");
    localStorage.removeItem("angela_legacy_messages");
    render();
  }
});

document.getElementById("copyAnnouncement").addEventListener("click", async () => {
  const script = buildWinnerScript(latestEntries);
  try{
    await navigator.clipboard.writeText(script);
    setAlert("Winner announcement copied. Paste it into your notes or read it live.", "ok");
  }catch(e){
    prompt("Copy this announcement:", script);
  }
});

document.getElementById("legacyFilters").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-filter]");
  if(!btn) return;
  legacyFilter = btn.dataset.filter;
  [...document.getElementById("legacyFilters").children].forEach((el) => {
    el.classList.toggle("active", el === btn);
  });
  renderLegacy(latestMessages);
});

async function apiRead(endpoint){
  const token = getToken();
  if(!token) return null;
  const res = await fetch(endpoint, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if(res.status === 401){
    showGate();
    throw new Error("Session expired");
  }
  if(!res.ok) throw new Error(await res.text());
  return await res.json();
}

function fmt(s){
  const n = Number(s) || 0;
  return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`;
}

function escapeHtml(value){
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function bestByTable(entries){
  const map = new Map();
  entries.forEach((entry) => {
    const key = String(entry.table_number || "");
    const prev = map.get(key);
    if(!prev){
      map.set(key, entry);
      return;
    }
    const betterScore = entry.score > prev.score;
    const betterTime = entry.score === prev.score && entry.elapsed_seconds < prev.elapsed_seconds;
    if(betterScore || betterTime) map.set(key, entry);
  });
  return map;
}

function rankedEntries(entries){
  return [...entries].sort(
    (a, b) => (b.score - a.score) || (a.elapsed_seconds - b.elapsed_seconds)
  );
}

function buildWinnerScript(entries){
  if(!entries.length){
    return "No table has submitted The Angela Challenge yet.";
  }
  const ranked = rankedEntries(entries);
  const top = ranked[0];
  const second = ranked[1];
  const third = ranked[2];
  let script = `Ladies and gentlemen, the results of The Angela Challenge.\n\n`;
  script += `In first place: ${top.team_name}, Table ${top.table_number}, with ${top.score} out of 20 in ${fmt(top.elapsed_seconds)}.\n`;
  if(second){
    script += `In second place: ${second.team_name}, Table ${second.table_number}, with ${second.score} out of 20 in ${fmt(second.elapsed_seconds)}.\n`;
  }
  if(third){
    script += `In third place: ${third.team_name}, Table ${third.table_number}, with ${third.score} out of 20 in ${fmt(third.elapsed_seconds)}.\n`;
  }
  if(top.tribute_word){
    script += `\nTheir one-word tribute: Angela’s life has taught us… ${top.tribute_word}.`;
  }
  return script;
}

function renderStats(entries, messages){
  const byTable = bestByTable(entries);
  const submitted = TABLES.filter((t) => byTable.has(t)).length;
  const top = rankedEntries(entries)[0];
  document.getElementById("statGrid").innerHTML = `
    <div class="stat-card"><small>Tables in</small><strong>${submitted}/6</strong></div>
    <div class="stat-card"><small>Entries</small><strong>${entries.length}</strong></div>
    <div class="stat-card"><small>Top score</small><strong>${top ? top.score : "—"}</strong></div>
    <div class="stat-card"><small>Legacy notes</small><strong>${messages.length}</strong></div>
  `;
}

function renderWinner(entries){
  const card = document.getElementById("winnerCard");
  if(!entries.length){
    card.innerHTML = `<p class="empty">Waiting for the first table submission…</p>`;
    return;
  }
  const ranked = rankedEntries(entries);
  const top = ranked[0];
  card.innerHTML = `
    <div class="podium-lead">
      <div class="podium-crown">Currently leading</div>
      <h3>${escapeHtml(top.team_name)}</h3>
      <p class="podium-scoreline">Table ${escapeHtml(top.table_number)} · ${top.score}/20 · ${fmt(top.elapsed_seconds)}</p>
      <div class="podium-details">
        <div><small>Captain</small><strong>${escapeHtml(top.captain_name || "—")}</strong></div>
        <div><small>Tribute</small><strong>${escapeHtml(top.tribute_word || "—")}</strong></div>
      </div>
      <div class="podium-runners">
        ${ranked[1] ? `<div class="runner"><span>2nd · ${escapeHtml(ranked[1].team_name)} · Table ${escapeHtml(ranked[1].table_number)}</span><strong>${ranked[1].score}/20</strong></div>` : ""}
        ${ranked[2] ? `<div class="runner"><span>3rd · ${escapeHtml(ranked[2].team_name)} · Table ${escapeHtml(ranked[2].table_number)}</span><strong>${ranked[2].score}/20</strong></div>` : ""}
      </div>
    </div>
  `;
}

function renderTracker(entries){
  const byTable = bestByTable(entries);
  document.getElementById("tableTracker").innerHTML = TABLES.map((t) => {
    const entry = byTable.get(t);
    if(entry){
      return `<div class="seat in">
        <span class="seat-num">${t}</span>
        <span class="seat-team">${escapeHtml(entry.team_name)}</span>
        <span class="seat-meta">${entry.score}/20 · ${fmt(entry.elapsed_seconds)}</span>
      </div>`;
    }
    return `<div class="seat out">
      <span class="seat-num">${t}</span>
      <span class="seat-team">Waiting…</span>
      <span class="seat-meta">No submission yet</span>
    </div>`;
  }).join("");
}

function renderLeaderboard(entries){
  const ranked = rankedEntries(entries);
  document.getElementById("leaderboard").innerHTML = ranked.length
    ? ranked.map((e, i) => `
      <div class="standing-row ${i === 0 ? "is-first" : ""}">
        <span class="standing-rank">${i + 1}</span>
        <div>
          <strong>${escapeHtml(e.team_name)}</strong>
          <small>Table ${escapeHtml(e.table_number)} · Captain ${escapeHtml(e.captain_name || "—")}</small>
          ${e.tribute_word ? `<small class="tribute">“${escapeHtml(e.tribute_word)}”</small>` : ""}
        </div>
        <span class="standing-score">${e.score}/20</span>
        <span class="standing-time">${fmt(e.elapsed_seconds)}</span>
      </div>`).join("")
    : `<p class="empty">No table entries yet.</p>`;
}

function renderLegacy(messages){
  const filtered = legacyFilter === "all"
    ? messages
    : messages.filter((m) => m.message_type === legacyFilter);

  document.getElementById("legacyFeed").innerHTML = filtered.length
    ? filtered.map((m) => `
      <article class="legacy-card">
        <small>${escapeHtml(m.message_type)} · ${escapeHtml(m.guest_name || "Guest")}${m.table_number ? ` · Table ${escapeHtml(m.table_number)}` : ""}</small>
        <p>${escapeHtml(m.message)}</p>
      </article>`).join("")
    : `<p class="empty">No Legacy Wall messages${legacyFilter === "all" ? "" : " in this filter"} yet.</p>`;
}

function renderAnnounce(entries){
  announcePreview.textContent = buildWinnerScript(entries);
}

async function render({ quiet = false } = {}){
  let entries = null;
  let messages = null;
  let live = false;

  try{
    entries = await apiRead("/api/challenge");
    messages = await apiRead("/api/legacy");
    if(Array.isArray(entries) && Array.isArray(messages)) live = true;
  }catch(e){
    if(!quiet){
      setAlert("Could not load live results. Showing local demo data if available.", "warn");
    }
    connectionBadge.textContent = "Offline";
    connectionBadge.className = "live-pill bad";
  }

  if(!entries) entries = JSON.parse(localStorage.getItem("angela_challenge_entries") || "[]");
  if(!messages) messages = JSON.parse(localStorage.getItem("angela_legacy_messages") || "[]");

  usingLiveDb = live;
  latestEntries = entries;
  latestMessages = messages;

  if(live){
    connectionBadge.textContent = "Live";
    connectionBadge.className = "live-pill ok";
    if(!quiet) setAlert("");
  }else if(!connectionBadge.classList.contains("bad")){
    connectionBadge.textContent = "Local demo";
    connectionBadge.className = "live-pill warn";
  }

  lastRefreshEl.textContent = `Updated ${new Date().toLocaleTimeString()}`;
  renderStats(entries, messages);
  renderWinner(entries);
  renderTracker(entries);
  renderLeaderboard(entries);
  renderLegacy(messages);
  renderAnnounce(entries);
}

syncAutoButton();
document.addEventListener("visibilitychange", () => {
  if(!document.hidden && isUnlocked() && autoRefresh) render({ quiet: true });
});

if(isUnlocked()) showApp();
else showGate();
