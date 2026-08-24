const TAGS = ["일상회화", "비즈니스", "드라마·영화", "여행", "시사"];
const LEVEL_LABEL = { beginner: "초급", intermediate: "중급", advanced: "고급" };
const FORMAT_LABEL = { channel: "채널", shorts: "쇼츠" };

const state = {
  level: null,
  tags: new Set(),
  content: [],
};

const tagRow = document.getElementById("tag-row");
const levelRow = document.getElementById("level-row");
const recommendBtn = document.getElementById("recommend-btn");
const resetBtn = document.getElementById("reset-btn");
const picker = document.getElementById("picker");
const results = document.getElementById("results");
const cardGrid = document.getElementById("card-grid");
const emptyState = document.getElementById("empty-state");
const resultsTitle = document.getElementById("results-title");

function renderTags() {
  tagRow.innerHTML = "";
  TAGS.forEach((tag) => {
    const btn = document.createElement("button");
    btn.className = "chip";
    btn.textContent = tag;
    btn.setAttribute("aria-pressed", "false");
    btn.addEventListener("click", () => toggleTag(tag, btn));
    tagRow.appendChild(btn);
  });
}

function toggleTag(tag, btn) {
  if (state.tags.has(tag)) {
    state.tags.delete(tag);
    btn.setAttribute("aria-pressed", "false");
  } else {
    if (state.tags.size >= 2) return;
    state.tags.add(tag);
    btn.setAttribute("aria-pressed", "true");
  }
  updateRecommendState();
}

levelRow.querySelectorAll(".chip").forEach((btn) => {
  btn.addEventListener("click", () => {
    levelRow.querySelectorAll(".chip").forEach((b) => b.setAttribute("aria-checked", "false"));
    btn.setAttribute("aria-checked", "true");
    state.level = btn.dataset.level;
    updateRecommendState();
  });
});

function updateRecommendState() {
  recommendBtn.disabled = !state.level;
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
  const selectedTags = [...state.tags];
  const matches = state.content.filter((item) => {
    const levelMatch = item.level === state.level;
    const tagMatch =
      selectedTags.length === 0 ||
      selectedTags.some((t) => item.tags.includes(t));
    return levelMatch && tagMatch;
  });

  resultsTitle.textContent = `${LEVEL_LABEL[state.level]} 추천 콘텐츠 (${matches.length}개)`;
  cardGrid.innerHTML = matches.map(cardTemplate).join("");
  emptyState.hidden = matches.length > 0;
  picker.hidden = true;
  results.hidden = false;
}

recommendBtn.addEventListener("click", renderResults);

resetBtn.addEventListener("click", () => {
  results.hidden = true;
  picker.hidden = false;
});

async function loadContent() {
  try {
    const res = await fetch("content.json");
    state.content = await res.json();
  } catch (err) {
    console.error("콘텐츠를 불러오지 못했습니다", err);
    state.content = [];
  }
}

renderTags();
loadContent();
