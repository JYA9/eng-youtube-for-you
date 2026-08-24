// content.json을 보강합니다 (thumbnail, link 등 기존 값은 절대 안 건드림).
// - accent: country를 기반으로 자동 계산 (us/uk/au/other)
// - focus: 고민 유형 태그 (grammar/vocab/casual/advanced/listening) - 아래 표 기반
// - length_bucket: 예상 영상 길이 (under1/1to5/5to10/10to20/over20) - 아래 표 기반
// - tags: 관심 주제 태그 (10종) - 채널 실제 소개글 기반으로 재분류, 기존 tags를 덮어씀
//
// 여러 번 실행해도 안전합니다 (매번 같은 결과로 덮어씀).
// 실행: node enrich-content.js

import fs from "fs";

const ACCENT_MAP = {
  "미국/캐나다": "us",
  "영국": "uk",
  "호주": "au",
  "기타": "other",
};

// id -> { focus: [...], length_bucket: "..." }
const TABLE = {
  "yt-voa-learning-english": { focus: ["vocab", "listening"], length_bucket: "1to5" },
  "yt-bbc-learning-english": { focus: ["grammar", "listening"], length_bucket: "1to5" },
  "yt-british-council-learnenglish": { focus: ["grammar", "vocab"], length_bucket: "5to10" },
  "yt-english-singsing": { focus: ["vocab"], length_bucket: "1to5" },
  "yt-englishclass101-com": { focus: ["vocab"], length_bucket: "5to10" },
  "yt-jenniferesl": { focus: ["grammar"], length_bucket: "10to20" },
  "yt-oxford-online-english": { focus: ["grammar"], length_bucket: "10to20" },
  "yt-learn-english-with-bob-the-canadian": { focus: ["vocab"], length_bucket: "5to10" },
  "yt-engvid": { focus: ["grammar"], length_bucket: "10to20" },
  "yt-speak-english-with-vanessa": { focus: ["vocab"], length_bucket: "10to20" },
  "yt-easy-english": { focus: ["listening"], length_bucket: "10to20" },
  "yt-rachel-s-english": { focus: ["listening"], length_bucket: "10to20" },
  "yt-english-with-lucy": { focus: ["grammar", "listening"], length_bucket: "10to20" },
  "yt-mmmenglish": { focus: ["vocab"], length_bucket: "10to20" },
  "yt-go-natural-english": { focus: ["vocab"], length_bucket: "5to10" },
  "yt-reallife-english": { focus: ["listening"], length_bucket: "10to20" },
  "yt-learn-english-with-tv-series": { focus: ["vocab", "listening"], length_bucket: "5to10" },
  "yt-business-english-pod": { focus: ["vocab"], length_bucket: "10to20" },
  "yt-linguamarina": { focus: ["vocab", "listening"], length_bucket: "10to20" },
  "yt-etj-english": { focus: ["listening"], length_bucket: "10to20" },
  "yt-english-speaking-success": { focus: ["vocab", "advanced"], length_bucket: "10to20" },
  "yt-english-addict-with-mr-duncan": { focus: ["listening", "casual"], length_bucket: "over20" },
  "yt-canguro-english": { focus: ["vocab"], length_bucket: "10to20" },
  "yt-ted-ed": { focus: ["listening"], length_bucket: "1to5" },
  "yt-ted": { focus: ["advanced"], length_bucket: "10to20" },
  "yt-cnn-10": { focus: ["advanced", "vocab"], length_bucket: "5to10" },
  "yt-dw-news": { focus: ["listening", "advanced"], length_bucket: "5to10" },
  "yt-the-wall-street-journal": { focus: ["advanced"], length_bucket: "5to10" },
  "yt-bloomberg-television": { focus: ["advanced", "listening"], length_bucket: "5to10" },
  "yt-national-geographic": { focus: ["advanced", "vocab"], length_bucket: "5to10" },
  "yt-tablo-hey-tablo": { focus: ["advanced", "casual"], length_bucket: "under1" },
  "yt-in": { focus: ["vocab", "casual"], length_bucket: "under1" },
  "yt-channel": { focus: ["listening"], length_bucket: "under1" },
  "yt-channel-2": { focus: ["vocab", "casual"], length_bucket: "1to5" },
  "yt-hello-jennie": { focus: ["grammar", "vocab"], length_bucket: "under1" },
  "yt-channel-3": { focus: ["listening", "vocab"], length_bucket: "under1" },
  "yt-heechan": { focus: ["casual"], length_bucket: "under1" },
  "yt-busan-english-broadcasting": { focus: ["listening"], length_bucket: "under1" },
  "yt-channel-4": { focus: ["casual", "vocab"], length_bucket: "under1" },
  "yt-channel-5": { focus: ["advanced", "casual"], length_bucket: "under1" },
  "yt-channel-6": { focus: ["listening", "casual"], length_bucket: "under1" },
  "yt-intelligence": { focus: ["advanced", "vocab"], length_bucket: "under1" },
  "yt-channel-7": { focus: ["casual", "advanced"], length_bucket: "under1" },
  "yt-talk-like-a-star": { focus: ["vocab", "casual"], length_bucket: "under1" },
  "yt-channel-8": { focus: ["casual", "vocab"], length_bucket: "5to10" },
  "yt-channel-9": { focus: ["casual", "advanced"], length_bucket: "5to10" },
};

// 관심 주제 태그 10종 (실제 채널 About 소개글 기반으로 재분류)
// id -> [tag, tag, ...]  (채널당 1~3개)
const TAGS_TABLE = {
  "yt-voa-learning-english": ["시사·뉴스"],
  "yt-bbc-learning-english": ["일상회화", "시사·뉴스"],
  "yt-british-council-learnenglish": ["문법·기초", "여행·문화"],
  "yt-english-singsing": ["일상회화"],
  "yt-englishclass101-com": ["일상회화", "여행·문화"],
  "yt-jenniferesl": ["문법·기초"],
  "yt-oxford-online-english": ["문법·기초", "비즈니스·회의"],
  "yt-learn-english-with-bob-the-canadian": ["일상회화", "여행·문화"],
  "yt-engvid": ["문법·기초"],
  "yt-speak-english-with-vanessa": ["일상회화"],
  "yt-easy-english": ["일상회화", "발음·억양"],
  "yt-rachel-s-english": ["발음·억양"],
  "yt-english-with-lucy": ["일상회화", "비즈니스·회의"],
  "yt-mmmenglish": ["비즈니스·회의", "발음·억양"],
  "yt-go-natural-english": ["일상회화", "여행·문화"],
  "yt-reallife-english": ["일상회화", "발음·억양"],
  "yt-learn-english-with-tv-series": ["드라마·영화"],
  "yt-business-english-pod": ["비즈니스·회의"],
  "yt-linguamarina": ["일상회화", "비즈니스·회의"],
  "yt-etj-english": ["발음·억양"],
  "yt-english-speaking-success": ["비즈니스·회의"],
  "yt-english-addict-with-mr-duncan": ["일상회화", "코미디·밈"],
  "yt-canguro-english": ["일상회화", "비즈니스·회의"],
  "yt-ted-ed": ["시사·뉴스"],
  "yt-ted": ["시사·뉴스", "자기계발·동기부여"],
  "yt-cnn-10": ["시사·뉴스"],
  "yt-dw-news": ["시사·뉴스"],
  "yt-the-wall-street-journal": ["시사·뉴스", "비즈니스·회의"],
  "yt-bloomberg-television": ["시사·뉴스", "비즈니스·회의"],
  "yt-national-geographic": ["여행·문화", "시사·뉴스"],
  "yt-tablo-hey-tablo": ["케이팝·연예인", "일상회화"],
  "yt-in": ["케이팝·연예인", "일상회화"],
  "yt-channel": ["발음·억양"],
  "yt-channel-2": ["드라마·영화", "일상회화"],
  "yt-hello-jennie": ["일상회화", "드라마·영화"],
  "yt-channel-3": ["드라마·영화", "발음·억양"],
  "yt-heechan": ["일상회화"],
  "yt-busan-english-broadcasting": ["시사·뉴스", "일상회화"],
  "yt-channel-4": ["코미디·밈"],
  "yt-channel-5": ["코미디·밈"],
  "yt-channel-6": ["코미디·밈", "케이팝·연예인"],
  "yt-intelligence": ["자기계발·동기부여"],
  "yt-channel-7": ["코미디·밈"],
  "yt-talk-like-a-star": ["케이팝·연예인", "코미디·밈"],
  "yt-channel-8": ["드라마·영화"],
  "yt-channel-9": ["코미디·밈"],
};

const content = JSON.parse(fs.readFileSync("content.json", "utf-8"));

let updated = 0;
let missing = [];

for (const item of content) {
  item.accent = ACCENT_MAP[item.country] || "other";
  const extra = TABLE[item.id];
  if (extra) {
    item.focus = extra.focus;
    item.length_bucket = extra.length_bucket;
    updated++;
  } else {
    missing.push(item.id);
  }
  const tags = TAGS_TABLE[item.id];
  if (tags) item.tags = tags;
}

fs.writeFileSync("content.json", JSON.stringify(content, null, 2), "utf-8");

console.log(`완료! ${updated}개 항목에 focus/length_bucket/accent/tags 반영함.`);
if (missing.length) {
  console.log("테이블에 없는 id (수동 확인 필요):", missing.join(", "));
}
