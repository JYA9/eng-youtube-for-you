/* ---------- 데이터 정의 ---------- */

const LEVELS = [
  {
    value: "beginner",
    label: "초급",
    desc: "알파벳은 아는데 문장은 아직 버벅여요 😅 천천히, 또박또박 말해주는 영상이 필요해요.",
  },
  {
    value: "intermediate",
    label: "중급",
    desc: "일상 대화는 되는데 원어민 speed엔 아직 진땀나요 💦 자막 있으면 충분히 따라가요.",
  },
  {
    value: "advanced",
    label: "고급",
    desc: "웬만한 대화엔 낄 수 있어요. 이제는 더 자연스럽고 있어 보이게 말하고 싶어요 ✨",
  },
];

const CONCERNS = [
  { value: "grammar", emoji: "😞", label: "문법 지키기가 너무 어려워요" },
  { value: "vocab", emoji: "🤔", label: "말하려는 순간 단어가 싹 날아가요" },
  { value: "casual", emoji: "😜", label: "그냥 웃긴 거나 보고 싶어요, 몰라요 몰라" },
  { value: "advanced", emoji: "🤓", label: "이왕 하는 거 있어 보이게 배우고 싶어요" },
  { value: "listening", emoji: "👂", label: "원어민이 뭐라는지 하나도 안 들려요" },
];

const LENGTHS = [
  { value: "under1", emoji: "⚡", label: "1분 미만" },
  { value: "1to5", emoji: "🎬", label: "1~5분" },
  { value: "5to10", emoji: "📺", label: "5~10분" },
  { value: "10to20", emoji: "☕", label: "10~20분" },
  { value: "over20", emoji: "🍿", label: "20분 이상" },
];

const ACCENTS = [
  { value: "us", emoji: "🇺🇸", label: "미국식" },
  { value: "uk", emoji: "🇬🇧", label: "영국식" },
  { value: "au", emoji: "🇦🇺", label: "호주식" },
  { value: "any", emoji: "🌍", label: "상관없어요, 다양하게 듣고 싶어요" },
];

const TOPICS = [
  "일상회화",
  "발음·억양",
  "문법·기초",
  "비즈니스·회의",
  "시사·뉴스",
  "드라마·영화",
  "케이팝·연예인",
  "코미디·밈",
  "여행·문화",
  "자기계발·동기부여",
];
const TOPIC_MIN = 3;
const TOPIC_MAX = 5;

const LEVEL_LABEL = { beginner: "초급", intermediate: "중급", advanced: "고급" };
const FORMAT_LABEL = { channel: "채널", shorts: "쇼츠" };

const LOADING_MESSAGES = [
  "J님 완전 맞춤형 영상을 찾고 있어요 🔍",
  "레벨에 딱 맞는 채널만 골라내는 중이에요 🎯",
  "취향 저격 영상, 거의 다 찾았어요 ⏳",
];

/* ---------- 상태 ---------- */

const state = {
  content: [],
  answers: {
    level: null,
    concern: null,
    length: null,
    accent: null,
    topics: [],
  },
  step: "level",
};

const STEP_ORDER_FULL = ["level", "concern", "length", "accent", "topic", "loading", "results"];

function nextStep(current) {
  const idx = STEP_ORDER_FULL.indexOf(current);
  // 캐주얼(그냥 웃긴 거) 선택 시 length/accent/topic 건너뛰고 바로 로딩으로
  if (current === "concern" && state.answers.concern === "casual") {
    return "loading";
  }
  return STEP_ORDER_FULL[idx + 1];
}

function prevStep(current) {
  const idx = STEP_ORDER_FULL.indexOf(current);
  if (current === "loading" && state.answers.concern === "casual") {
    return "concern";
  }
  for (let i = idx - 1; i >= 0; i--) {
    return STEP_ORDER_FULL[i];
  }
  return current;
}

/* ---------- 렌더링 ---------- */

const app = document.getElementById("app");
const progressTrack = document.getElementById("progress-track");
const heroTitle = document.getElementById("hero-title");
const heroSub = document.getElementById("hero-sub");

function renderProgress() {
  const visibleSteps =
    state.answers.concern === "casual"
      ? ["level", "concern", "loading"]
      : ["level", "concern", "length", "accent", "topic", "loading"];

  if (state.step === "results") {
    progressTrack.hidden = true;
    return;
  }

  progressTrack.hidden = false;
  const currentIdx = visibleSteps.indexOf(state.step);
  progressTrack.innerHTML = visibleSteps
    .filter((s) => s !== "loading")
    .map((s, i) => {
      const cls = i < currentIdx ? "done" : i === currentIdx ? "active" : "";
      return `<span class="progress-dot ${cls}"></span>`;
    })
    .join("");
}

function optionCard({ value, emoji, label, desc, selected, dataAttr }) {
  return `
    <button class="option-card ${selected ? "selected" : ""}" data-${dataAttr}="${value}">
      ${emoji ? `<span class="option-emoji">${emoji}</span>` : ""}
      <span class="option-text">
        <span class="option-label">${label}</span>
        ${desc ? `<span class="option-desc">${desc}</span>` : ""}
      </span>
    </button>
  `;
}

function renderBackButton(show) {
  return show ? `<button class="btn-back" id="back-btn">← 이전</button>` : "";
}

function render() {
  renderProgress();

  if (state.step === "level") {
    heroTitle.innerHTML = "먼저, 지금 내 영어 레벨부터<br>체크해볼까요?";
    heroSub.textContent = "정확할수록 더 잘 맞는 영상을 찾아드려요.";
    app.innerHTML = `
      <div class="step-panel">
        <div class="option-list">
          ${LEVELS.map((l) =>
            optionCard({ value: l.value, label: l.label, desc: l.desc, dataAttr: "level" })
          ).join("")}
        </div>
      </div>
    `;
    app.querySelectorAll("[data-level]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.answers.level = btn.dataset.level;
        state.step = nextStep("level");
        render();
      });
    });
    return;
  }

  if (state.step === "concern") {
    heroTitle.textContent = "요즘 영어로 말할 때";
    heroSub.textContent = "제일 걸리는 거, 뭐예요? 솔직하게 골라주세요.";
    app.innerHTML = `
      <div class="step-panel">
        ${renderBackButton(true)}
        <div class="option-list">
          ${CONCERNS.map((c) =>
            optionCard({ value: c.value, emoji: c.emoji, label: c.label, dataAttr: "concern" })
          ).join("")}
        </div>
      </div>
    `;
    app.querySelectorAll("[data-concern]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.answers.concern = btn.dataset.concern;
        state.step = nextStep("concern");
        render();
      });
    });
    bindBack("concern");
    return;
  }

  if (state.step === "length") {
    heroTitle.textContent = "영상은 얼마나";
    heroSub.textContent = "볼 수 있어요? 자투리 시간이어도 괜찮아요.";
    app.innerHTML = `
      <div class="step-panel">
        ${renderBackButton(true)}
        <div class="option-list option-list-compact">
          ${LENGTHS.map((l) =>
            optionCard({ value: l.value, emoji: l.emoji, label: l.label, dataAttr: "length" })
          ).join("")}
        </div>
      </div>
    `;
    app.querySelectorAll("[data-length]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.answers.length = btn.dataset.length;
        state.step = nextStep("length");
        render();
      });
    });
    bindBack("length");
    return;
  }

  if (state.step === "accent") {
    heroTitle.textContent = "어떤 억양으로";
    heroSub.textContent = "배우고 싶어요?";
    app.innerHTML = `
      <div class="step-panel">
        ${renderBackButton(true)}
        <div class="option-list option-list-compact">
          ${ACCENTS.map((a) =>
            optionCard({ value: a.value, emoji: a.emoji, label: a.label, dataAttr: "accent" })
          ).join("")}
        </div>
      </div>
    `;
    app.querySelectorAll("[data-accent]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.answers.accent = btn.dataset.accent;
        state.step = nextStep("accent");
        render();
      });
    });
    bindBack("accent");
    return;
  }

  if (state.step === "topic") {
    const count = state.answers.topics.length;
    heroTitle.textContent = "어떤 주제가";
    heroSub.textContent = `제일 끌려요? ${TOPIC_MIN}개 이상 ${TOPIC_MAX}개 이하로 골라주세요. (${count}/${TOPIC_MAX})`;
    app.innerHTML = `
      <div class="step-panel">
        ${renderBackButton(true)}
        <div class="chip-row" id="topic-row"></div>
        <button class="btn-primary" id="topic-next-btn" disabled>영상 찾으러 가기</button>
      </div>
    `;
    const topicRow = document.getElementById("topic-row");
    TOPICS.forEach((tag) => {
      const btn = document.createElement("button");
      btn.className = "chip";
      btn.textContent = tag;
      const selected = state.answers.topics.includes(tag);
      btn.setAttribute("aria-pressed", selected ? "true" : "false");
      if (!selected && count >= TOPIC_MAX) btn.disabled = true;
      btn.addEventListener("click", () => {
        if (state.answers.topics.includes(tag)) {
          state.answers.topics = state.answers.topics.filter((t) => t !== tag);
        } else {
          if (state.answers.topics.length >= TOPIC_MAX) return;
          state.answers.topics.push(tag);
        }
        render();
      });
      topicRow.appendChild(btn);
    });
    document.getElementById("topic-next-btn").disabled = count < TOPIC_MIN;
    document.getElementById("topic-next-btn").addEventListener("click", () => {
      state.step = nextStep("topic");
      render();
    });
    bindBack("topic");
    return;
  }

  if (state.step === "loading") {
    heroTitle.textContent = "잠깐만 기다려주세요";
    heroSub.textContent = "";
    const msg = LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)];
    app.innerHTML = `
      <div class="loading-screen">
        <div class="loading-spinner"></div>
        <p class="loading-msg">${msg}</p>
      </div>
    `;
    setTimeout(() => {
      state.step = "results";
      render();
    }, 1400);
    return;
  }

  if (state.step === "results") {
    renderResults();
    return;
  }
}

function bindBack(current) {
  const backBtn = document.getElementById("back-btn");
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      state.step = prevStep(current);
      render();
    });
  }
}

/* ---------- 추천 로직 ---------- */

function scoreItem(item, answers) {
  if (item.level !== answers.level) return null; // 레벨은 필수 조건
  let score = 0;
  if (answers.concern && answers.concern !== "casual" && item.focus?.includes(answers.concern)) {
    score += 3;
  }
  if (answers.length && item.length_bucket === answers.length) {
    score += 1;
  }
  if (answers.accent && answers.accent !== "any" && item.accent === answers.accent) {
    score += 1;
  }
  if (answers.topics && answers.topics.length) {
    const overlap = answers.topics.filter((t) => item.tags.includes(t)).length;
    score += overlap * 2;
  }
  return score;
}

function getRecommendations() {
  const { level, concern } = state.answers;

  if (concern === "casual") {
    const sameLevel = state.content.filter((item) => item.level === level);
    // 1순위: 웃긴/캐주얼로 태그된 것 -> 2순위: 쇼츠 포맷 -> 3순위: 그냥 이 레벨 아무거나
    const pool =
      sameLevel.filter((item) => item.focus?.includes("casual")).length > 0
        ? sameLevel.filter((item) => item.focus?.includes("casual"))
        : sameLevel.filter((item) => item.format === "shorts").length > 0
        ? sameLevel.filter((item) => item.format === "shorts")
        : sameLevel;
    return shuffle(pool).slice(0, 4);
  }

  const scored = state.content
    .map((item) => ({ item, score: scoreItem(item, state.answers) }))
    .filter((s) => s.score !== null)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, 6).map((s) => s.item);
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function cardTemplate(item) {
  const tagBadges = item.tags.map((t) => `<span class="badge tag">${t}</span>`).join("");
  return `
    <article class="card">
      <img src="${item.thumbnail}" alt="${item.title}" loading="lazy" />
      <div class="card-body">
        <div class="badge-row">
          <span class="badge">${LEVEL_LABEL[item.level] || item.level}</span>
          <span class="badge tag">${FORMAT_LABEL[item.format] || item.format}</span>
          <span class="badge tag">${item.country}</span>
          ${tagBadges}
        </div>
        <h3 class="card-title">${item.title}</h3>
        <p class="card-reason">${item.reason}</p>
        <a class="card-link" href="${item.link}" target="_blank" rel="noopener">채널 보러 가기 →</a>
      </div>
    </article>
  `;
}

function renderResults() {
  const results = getRecommendations();
  heroTitle.textContent =
    state.answers.concern === "casual" ? "짜잔, 이거 어때요? 🎉" : "J님 취향 저격 추천이에요 🎯";
  heroSub.textContent =
    results.length > 0
      ? "마음에 드는 채널 클릭해서 바로 보러 가세요."
      : "조건에 딱 맞는 영상을 못 찾았어요. 다시 골라볼까요?";

  app.innerHTML = `
    <div class="results">
      <div class="results-head">
        <button class="btn-ghost" id="reset-btn">처음부터 다시</button>
      </div>
      <div class="card-grid">${results.map(cardTemplate).join("")}</div>
    </div>
  `;

  document.getElementById("reset-btn").addEventListener("click", () => {
    state.answers = { level: null, concern: null, length: null, accent: null, topics: [] };
    state.step = "level";
    render();
  });
}

/* ---------- 초기화 ---------- */

async function loadContent() {
  try {
    const res = await fetch("content.json");
    state.content = await res.json();
  } catch (err) {
    console.error("콘텐츠를 불러오지 못했습니다", err);
    state.content = [];
  }
  render();
}

loadContent();
