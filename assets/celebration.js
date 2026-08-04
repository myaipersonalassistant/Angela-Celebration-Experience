const VALID_TABLES = new Set(["1", "2", "3", "4", "5", "6"]);
const params = new URLSearchParams(location.search);
const hashParams = new URLSearchParams(location.hash.replace(/^#/, "").replace(/^\?/, ""));

function resolveTable(){
  // URL wins every time. Do not fall back to an old session table —
  // that made Table 2 keep showing Table 1 after testing Table 1.
  let value = (params.get("table") || "").trim();
  if(!value){
    const pathMatch = location.pathname.match(/\/t\/(\d+)\/?$/i);
    if(pathMatch) value = pathMatch[1];
  }
  if(!value){
    value = (hashParams.get("table") || "").trim();
  }

  if(value && !VALID_TABLES.has(value)){
    sessionStorage.removeItem("angela_table");
    return { table: "", invalid: value };
  }

  if(value){
    sessionStorage.setItem("angela_table", value);
    const next = `challenge.html?table=${encodeURIComponent(value)}#table=${encodeURIComponent(value)}`;
    const current = `${location.pathname.split("/").pop() || "challenge.html"}${location.search}${location.hash}`;
    if(current !== next && location.protocol !== "file:"){
      history.replaceState(null, "", next);
    }
  }else{
    sessionStorage.removeItem("angela_table");
  }

  return { table: value, invalid: "" };
}

const resolved = resolveTable();
const table = resolved.table;
const tableLabel = table ? `Table ${table}` : "Celebration Guest";
const screens = [...document.querySelectorAll(".screen")];
const homeHref = table
  ? `challenge.html?table=${encodeURIComponent(table)}#table=${encodeURIComponent(table)}`
  : "challenge.html";

const brandHome = document.getElementById("brandHome");
if(brandHome) brandHome.href = homeHref;

const welcomeCopy = document.getElementById("welcomeCopy");
const tableBanner = document.getElementById("tableBanner");
const tablePill = document.getElementById("tablePill");
const resultTable = document.getElementById("resultTable");

if(table){
  if(welcomeCopy){
    welcomeCopy.textContent = `Welcome — you are playing as Table ${table}. Choose an experience and enjoy it together.`;
  }
  if(tableBanner){
    tableBanner.textContent = `TABLE ${table}`;
    tableBanner.classList.remove("hidden");
  }
  if(tablePill) tablePill.textContent = `TABLE ${table}`;
  if(resultTable) resultTable.textContent = table;
}else{
  if(resolved.invalid && tableBanner){
    tableBanner.textContent = `TABLE ${resolved.invalid} IS NOT VALID · USE 1–6`;
    tableBanner.classList.remove("hidden");
    tableBanner.classList.add("table-banner-error");
  }
  if(welcomeCopy && resolved.invalid){
    welcomeCopy.textContent = `Table ${resolved.invalid} is not part of this event. Please scan the QR code for tables 1 to 6.`;
  }
  if(tablePill) tablePill.textContent = "TABLE CHALLENGE";
  if(resultTable) resultTable.textContent = "—";
}

function go(id){
  screens.forEach(s => s.classList.toggle("active", s.id === id));
  scrollTo({top:0, behavior:"smooth"});
}
document.querySelectorAll("[data-go]").forEach(b => b.addEventListener("click",()=>go(b.dataset.go)));
document.getElementById("homeButton").addEventListener("click",()=>go("landing"));

function revealKey(token){
  try{ return Number(atob(token)); }catch(e){ return -1; }
}

const questions = [
  ["What is Angela’s middle name?",["Adeola","Olubunmi","Omolara","Oluwaseun"],"MQ=="],
  ["What does Olubunmi mean?",["God has honoured me","God has given me this gift","God has remembered me","God has answered me"],"MQ=="],
  ["Which three words form the official theme of Angela’s celebration?",["Faith, Hope and Love","Strength, Dignity and Grace","Peace, Joy and Kindness","Courage, Integrity and Compassion"],"MQ=="],
  ["Angela is widely admired for her inner qualities, but which outward quality is also undeniable?",["Her baking skills","Her height","Her beauty","Her table tennis skills"],"Mg=="],
  ["What is Angela’s profession?",["Medical doctor","Accountant","Barrister","Architect"],"Mg=="],
  ["Which description of Angela is most accurate?",["Wise","Intelligent","Compassionate","All of the above"],"Mw=="],
  ["How many children do Angela and Chris have?",["Two","Three","Four","Five"],"MQ=="],
  ["For approximately how long have Angela and Chris served as pastors in Northern Ireland?",["Five years","Ten years","Fifteen years","Twenty years"],"Mw=="],
  ["Which statement best describes Angela’s life?",["A successful professional","A devoted wife and mother","A faithful servant of God","All of the above"],"Mw=="],
  ["In which city is tonight’s celebration taking place?",["Belfast","London","Barcelona","Lagos"],"Mg=="],
  ["Which word best describes the way Angela leads?",["Fame","Grace","Popularity","Pressure"],"MQ=="],
  ["What is one of Angela’s recognised intellectual qualities?",["Wisdom","Carelessness","Indecision","Forgetfulness"],"MA=="],
  ["Which legal title belongs to Angela?",["Barrister","Surveyor","Pharmacist","Engineer"],"MA=="],
  ["Angela’s beauty is best described as…",["Only visible in photographs","Only outward","Both inside and out","Dependent on the occasion"],"Mg=="],
  ["Which value is central to Angela’s life?",["Faith","Fame","Competition","Status"],"MA=="],
  ["Angela is known for serving…",["Only her family","Only her church","Only her profession","God, family and people"],"Mw=="],
  ["Which phrase best captures Angela’s character?",["Quiet strength","Restless ambition","Public recognition","Personal achievement"],"MA=="],
  ["What kind of impact does Angela make?",["Temporary","Beautiful and lasting","Only professional","Only within her family"],"MQ=="],
  ["What should every guest do before leaving?",["Leave Angela a Legacy Wall message","Search the answers online","Change tables","Skip dessert"],"MA=="],
  ["Tonight’s celebration is ultimately about…",["Barcelona","The venue","Honouring Angela and thanking God for her life","Winning the quiz"],"Mg=="]
];

let qIndex=0, score=0, chosen=null, seconds=600, timerHandle=null, quizStart=0;
const qText=document.getElementById("questionText");
const aList=document.getElementById("answerList");
const next=document.getElementById("nextQuestion");

function renderQuestion(){
  chosen=null; next.disabled=true;
  const [question, answers] = questions[qIndex];
  qText.textContent=question;
  document.getElementById("questionCount").textContent=`QUESTION ${qIndex+1} OF ${questions.length}`;
  document.getElementById("progressFill").style.width=`${((qIndex+1)/questions.length)*100}%`;
  aList.innerHTML="";
  answers.forEach((a,i)=>{
    const b=document.createElement("button");
    b.type="button"; b.className="answer";
    b.innerHTML=`<span class="answer-letter">${String.fromCharCode(65+i)}</span><span>${a}</span>`;
    b.addEventListener("click",()=>{
      [...aList.children].forEach(x=>x.classList.remove("selected"));
      b.classList.add("selected"); chosen=i; next.disabled=false;
    });
    aList.appendChild(b);
  });
}
function fmt(s){return `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`}
document.getElementById("startQuiz").addEventListener("click",()=>{
  qIndex=0;score=0;seconds=600;quizStart=Date.now();go("quiz");renderQuestion();
  clearInterval(timerHandle);
  timerHandle=setInterval(()=>{
    seconds--;document.getElementById("timer").textContent=fmt(Math.max(0,seconds));
    if(seconds<=0) finish();
  },1000);
});
next.addEventListener("click",()=>{
  if(chosen===revealKey(questions[qIndex][2])) score++;
  qIndex++;
  qIndex<questions.length ? renderQuestion() : finish();
});
function finish(){
  clearInterval(timerHandle);
  const elapsed=Math.min(600,Math.round((Date.now()-quizStart)/1000));
  document.getElementById("scoreValue").textContent=`${score}/${questions.length}`;
  document.getElementById("resultTeam").textContent=document.getElementById("teamName").value || tableLabel;
  document.getElementById("resultTime").textContent=fmt(elapsed);
  const h=document.getElementById("scoreHeading"),m=document.getElementById("scoreMessage");
  if(score===20){h.textContent="Angela’s Inner Circle!";m.textContent="A perfect score. Your table knows Angela exceptionally well."}
  else if(score>=16){h.textContent="Outstanding teamwork!";m.textContent="A brilliant performance. Your table is firmly in contention."}
  else if(score>=12){h.textContent="Excellent teamwork!";m.textContent="A strong performance and a wonderful celebration of Angela."}
  else{h.textContent="Well played!";m.textContent="The joy was learning and celebrating Angela together."}
  go("result");
}
async function apiInsert(tableName, payload){
  const endpoint = tableName === "legacy_messages" ? "/api/legacy" : "/api/challenge";
  try{
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if(!res.ok) throw new Error(await res.text());
    return true;
  }catch(e){
    return false;
  }
}
function localPush(key,obj){
  const data=JSON.parse(localStorage.getItem(key)||"[]");data.push(obj);localStorage.setItem(key,JSON.stringify(data));
}
document.getElementById("submitScore").addEventListener("click",async()=>{
  const payload={
    table_number:table || "General",
    team_name:document.getElementById("resultTeam").textContent,
    captain_name:document.getElementById("captainName").value,
    score,
    elapsed_seconds:Math.min(600,Math.round((Date.now()-quizStart)/1000)),
    tribute_word:document.getElementById("tableWord").value,
    created_at:new Date().toISOString()
  };
  try{
    const sent=await apiInsert("challenge_entries",payload);
    if(!sent)localPush("angela_challenge_entries",payload);
    document.getElementById("submitMessage").classList.remove("hidden");
    document.getElementById("submitScore").disabled=true;
  }catch(e){alert("The entry could not be submitted. Please ask the MC for help.");}
});
document.getElementById("submitLegacy").addEventListener("click",async()=>{
  const payload={
    message_type:document.getElementById("legacyType").value,
    guest_name:document.getElementById("legacyName").value,
    message:document.getElementById("legacyMessage").value,
    table_number:table || "General",
    created_at:new Date().toISOString()
  };
  if(!payload.message.trim()){alert("Please write your message for Angela.");return;}
  try{
    const sent=await apiInsert("legacy_messages",payload);
    if(!sent)localPush("angela_legacy_messages",payload);
    document.getElementById("legacySuccess").classList.remove("hidden");
    document.getElementById("submitLegacy").disabled=true;
  }catch(e){alert("The message could not be submitted. Please ask the MC for help.");}
});

/*
Guess the Year — guest-facing copy only.
Answer keys are encoded so they are not readable in plain view-source.
*/
function revealYear(token){
  if(!token) return null;
  try{ return atob(token); }catch(e){ return null; }
}

const yearData = [
  {
    title: "Surprise Ladies’ Garden Party",
    story: "Angela in a floral dress during a garden celebration.",
    image: "assets/guess-the-year/01-floral-garden.jpg",
    options: ["2023", "2024", "2025", "2026"],
    answerToken: "MjAyNg=="
  },
  {
    title: "Soultrain Belfast",
    story: "A special garden-party moment captured against a dark backdrop.",
    image: "assets/guess-the-year/02-singing-tea-party.jpg",
    options: ["2021", "2022", "2023", "2024"],
    answerToken: "MjAyNA=="
  },
  {
    title: "Final Portrait",
    story: "A bright portrait reflecting Angela’s warmth and grace.",
    image: "assets/guess-the-year/03-pink-professional-portrait.jpg",
    options: ["2008", "2009", "2010", "2011"],
    answerToken: "MjAxMA=="
  },
  {
    title: "Album Launch",
    story: "A striking studio portrait from a memorable creative milestone.",
    image: "assets/guess-the-year/04-red-background-portrait.jpg",
    options: ["2015", "2016", "2017", "2018"],
    answerToken: "MjAxNw=="
  },
  {
    title: "Wedding Day",
    story: "Chris and Angela on their wedding day.",
    image: "assets/guess-the-year/05-wedding-day.jpg",
    options: ["2002", "2003", "2004", "2005"],
    answerToken: "MjAwNA=="
  },
  {
    title: "Pastor E. A. Adeboye’s Visit",
    story: "Angela sharing a joyful moment in a yellow dress during a special church visit.",
    image: "assets/guess-the-year/06-yellow-church-outfit.jpg",
    options: ["2016", "2017", "2018", "2019"],
    answerToken: "MjAxOA=="
  },
  {
    title: "Angela’s Grandpa Burial",
    story: "Chris and Angela dressed in traditional attire.",
    image: "assets/guess-the-year/07-traditional-attire.jpg",
    options: ["2022", "2023", "2024", "2025"],
    answerToken: "MjAyNQ=="
  }
];

let yearIndex = 0;
const yearAnswers = Array(yearData.length).fill(null);
const yearPlay = document.getElementById("yearPlay");
const yearStartPanel = document.getElementById("yearStartPanel");
const yearResult = document.getElementById("yearResult");
const yearNext = document.getElementById("yearNext");
const yearPrev = document.getElementById("yearPrev");
const yearsIntro = document.getElementById("yearsIntro");

function answeredCount(){
  return yearAnswers.filter(Boolean).length;
}

function renderYearQuestion(){
  const item = yearData[yearIndex];
  document.getElementById("yearCount").textContent = `PHOTO ${yearIndex + 1} OF ${yearData.length}`;
  document.getElementById("yearKicker").textContent = `PHOTO ${yearIndex + 1} OF ${yearData.length}`;
  document.getElementById("yearProgressLabel").textContent = `${answeredCount()} answered`;
  document.getElementById("yearProgressFill").style.width = `${((yearIndex + 1) / yearData.length) * 100}%`;
  document.getElementById("yearPhoto").src = item.image;
  document.getElementById("yearPhoto").alt = item.title;
  document.getElementById("yearTitle").textContent = item.title;
  document.getElementById("yearStory").textContent = item.story;

  const options = document.getElementById("yearOptions");
  options.innerHTML = "";
  item.options.forEach(year => {
    const label = document.createElement("label");
    label.className = "year-choice";
    if(yearAnswers[yearIndex] === year) label.classList.add("selected");
    label.innerHTML = `<input type="radio" name="yearChoice" value="${year}" ${yearAnswers[yearIndex] === year ? "checked" : ""}><span>${year}</span>`;
    label.addEventListener("click", () => {
      yearAnswers[yearIndex] = year;
      [...options.children].forEach(c => c.classList.remove("selected"));
      label.classList.add("selected");
      yearNext.disabled = false;
      document.getElementById("yearProgressLabel").textContent = `${answeredCount()} answered`;
    });
    options.appendChild(label);
  });

  yearPrev.disabled = yearIndex === 0;
  yearPrev.style.visibility = yearIndex === 0 ? "hidden" : "visible";
  yearNext.disabled = !yearAnswers[yearIndex];
  yearNext.textContent = yearIndex === yearData.length - 1 ? "SEE RESULTS →" : "NEXT PHOTO →";
}

function showYearResults(){
  yearPlay.classList.add("hidden");
  yearsIntro.classList.add("hidden");
  yearResult.classList.remove("hidden");

  const scored = yearData
    .map((item, index) => ({ item, index, correct: revealYear(item.answerToken) }))
    .filter((row) => row.correct);

  let points = 0;
  scored.forEach(({ index, correct }) => {
    if(yearAnswers[index] === correct) points++;
  });

  const pending = yearData.length - scored.length;
  yearResult.innerHTML = `
    <p class="smallcaps">YOUR SCORE</p>
    <div class="score">${points}/${scored.length}</div>
    <p>${
      points === scored.length
        ? "Time travellers! A perfect memory."
        : points >= Math.ceil(scored.length * 0.7)
        ? "Excellent memory!"
        : "A lovely journey through Angela’s story."
    }</p>
    ${pending ? `<p class="year-pending-note">One portrait is still awaiting a confirmed year and was not scored.</p>` : ""}
    <button class="gold-button" id="yearReplay" type="button">PLAY AGAIN →</button>`;

  document.getElementById("yearReplay").addEventListener("click", startYearGame);
}

function startYearGame(){
  yearIndex = 0;
  for(let i = 0; i < yearAnswers.length; i++) yearAnswers[i] = null;
  yearStartPanel.classList.add("hidden");
  yearResult.classList.add("hidden");
  yearsIntro.classList.remove("hidden");
  yearPlay.classList.remove("hidden");
  renderYearQuestion();
}

document.getElementById("startYears").addEventListener("click", startYearGame);
yearNext.addEventListener("click", () => {
  if(!yearAnswers[yearIndex]) return;
  if(yearIndex === yearData.length - 1){
    showYearResults();
    return;
  }
  yearIndex++;
  renderYearQuestion();
});
yearPrev.addEventListener("click", () => {
  if(yearIndex === 0) return;
  yearIndex--;
  renderYearQuestion();
});

document.querySelector('[data-go="years"]')?.addEventListener("click", () => {
  yearStartPanel.classList.remove("hidden");
  yearPlay.classList.add("hidden");
  yearResult.classList.add("hidden");
  yearsIntro.classList.remove("hidden");
});
