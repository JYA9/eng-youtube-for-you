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

// id -> reason (친근한 말투로 재작성. 기존 reason을 덮어씀)
const REASONS_TABLE = {
  "yt-voa-learning-english": "천천히, 또박또박 말해주는 뉴스라서 왕초보도 부담 없이 볼 수 있어요. 뉴스로 영어 시작하고 싶다면 딱이에요!",
  "yt-bbc-learning-english": "짧은 문장 + 또렷한 영국 발음 + 반복 설명, 3박자가 딱! 영국식 영어 첫걸음으로 추천해요.",
  "yt-british-council-learnenglish": "상황극으로 배우니까 지루할 틈이 없어요. 기본 표현, 스토리로 익히고 싶다면 이 채널 어때요?",
  "yt-english-singsing": "그림이랑 짧은 대화로 술술 이해돼요. 영어가 아직 낯설다면 여기서 감 잡아보세요.",
  "yt-englishclass101-com": "길 찾기, 쇼핑 같은 생존 영어부터 시작하고 싶다면? 바로 여기!",
  "yt-jenniferesl": "차분한 목소리로 문법이랑 회화를 차근차근 짚어줘요. 기초 다지고 싶은 분께 추천!",
  "yt-oxford-online-english": "레벨별 수업 + 화면 예문까지, 느리고 선명하게 설명해줘서 따라가기 편해요.",
  "yt-learn-english-with-bob-the-canadian": "실제 물건이랑 장소를 직접 보여주면서 쉬운 캐나다 영어로 설명해줘요. 눈으로 보면서 배우고 싶다면 추천!",
  "yt-engvid": "칠판 판서 스타일 수업이라 기초 문법 잡기 딱 좋아요. 다시 기본기부터 다지고 싶다면 여기!",
  "yt-speak-english-with-vanessa": "자주 쓰는 회화 표현을 또박또박 여러 번 반복해줘요. 입에 붙을 때까지 따라 해보세요!",
  "yt-easy-english": "영국 길거리 인터뷰라서 진짜 사람들 말투를 들을 수 있어요. 리얼한 영어가 궁금하다면 이거예요.",
  "yt-rachel-s-english": "연음, 축약, 강세까지 진짜 미국 발음의 디테일을 파고들어요. 발음 업그레이드하고 싶다면 추천!",
  "yt-english-with-lucy": "자연스러운 영국식 속도인데 설명은 깔끔해서 따라가기 쉬워요.",
  "yt-mmmenglish": "호주 발음으로 일상, 직장 표현의 미묘한 뉘앙스까지 짚어줘요. 호주 영어가 궁금하다면 이 채널!",
  "yt-go-natural-english": "교과서 표현 말고 진짜 미국인들이 쓰는 관용구를 배우고 싶다면? 여기가 정답이에요.",
  "yt-reallife-english": "여러 나라 원어민들의 대화라 진짜 speed랑 다양한 억양에 익숙해질 수 있어요.",
  "yt-learn-english-with-tv-series": "드라마·영화 속 속어랑 발음을 자막·해설로 콕콕 짚어줘요. 덕질하면서 영어 배우고 싶다면 추천!",
  "yt-business-english-pod": "회의, 협상, 발표까지 업무 영어 핵심 표현만 쏙쏙 모아뒀어요. 직장인이라면 챙겨보세요!",
  "yt-linguamarina": "미국 생활, 업무 영어에서 진짜 쓰는 표현을 자연스러운 속도로 알려줘요.",
  "yt-etj-english": "요즘 영국 발음이랑 자연스러운 구어체가 궁금하다면? 이 채널이 딱이에요.",
  "yt-english-speaking-success": "IELTS 주제로 긴 답변 연습하고 싶다면 추천! 중상급 어휘까지 챙겨갈 수 있어요.",
  "yt-english-addict-with-mr-duncan": "즉흥적인 영국식 유머 영상이라 듣는 귀 트이는 데 좋아요. 긴 영상도 자신 있다면 도전해보세요.",
  "yt-canguro-english": "영국식 영어로 표현들의 미묘한 차이를 자세히 설명해줘요. 디테일하게 파고들고 싶다면 추천!",
  "yt-ted-ed": "애니메이션 + 영어 자막 조합이라 눈으로도 이해가 잘 돼요. 지식 채우면서 영어 공부하고 싶다면 여기!",
  "yt-ted": "다양한 국적의 스피커들이 전문 지식을 발표체로 풀어줘요. 좀 있어 보이는 영어 배우고 싶다면 추천!",
  "yt-cnn-10": "빠른 뉴스 속도에 정치·경제·사회 압축 어휘까지, 진짜 뉴스 영어로 실력 테스트하고 싶다면 여기예요.",
  "yt-dw-news": "국제 뉴스와 인터뷰로 유럽을 비롯한 다양한 억양을 들을 수 있어요.",
  "yt-the-wall-street-journal": "경제, 금융, 산업 전문 용어에 밀도 높은 분석까지. 비즈니스 영어 끝판왕 원한다면 추천!",
  "yt-bloomberg-television": "빠른 인터뷰에 시장·기업 전문 용어가 쏟아져요. 진짜 실전 영어 원한다면 도전!",
  "yt-national-geographic": "과학, 환경, 문화까지 미국식 내레이션으로 깊이 있게 다뤄요. 다큐 좋아한다면 강추!",
  "yt-tablo-hey-tablo": "북미식 팟캐스트라 말이 빠르고 유머, 비유, 애드립이 가득해요. 리얼 토크가 궁금하다면 이 채널!",
  "yt-in": "여러 원본 영상에 한영 자막이랑 학습 포인트까지 콕콕 짚어줘요. 편하게 표현 배우고 싶다면 추천!",
  "yt-channel": "한국어 설명 + 반복 훈련으로 영어 소리, 연음, 리듬을 기초부터 따라 할 수 있어요.",
  "yt-channel-2": "여러 나라 원어민 영상에 한영 자막이랑 표현 해설까지 붙여줘요. 편하게 시작하고 싶다면 여기!",
  "yt-hello-jennie": "미국 영어 회화 표현이랑 문법을 한국인 눈높이에서 설명해줘요.",
  "yt-channel-3": "여러 영상 클립을 연상법이랑 반복으로 재구성했어요. 쉐도잉 연습하고 싶다면 추천!",
  "yt-heechan": "세상 사람들은 어떤 생각을 하고, 어떻게 살아갈까요? 더 넓은 세상이 궁금하다면 이 채널을 추천해요.",
  "yt-busan-english-broadcasting": "여러 나라 진행자, 출연자가 함께하는 방송이라 다양한 억양을 들을 수 있어요.",
  "yt-channel-4": "코미디 영어를 자막이랑 짧게 반복해서 보여줘요. 웃으면서 일상 반응 표현 익히고 싶다면 추천!",
  "yt-channel-5": "요즘 미국 코미디 씬에서는 스탠드업 코미디가 대세! 매운 맛 코미디가 궁금하다면 이 채널을 추천해요.",
  "yt-channel-6": "영국 인터뷰, 예능 클립으로 영국 발음이랑 자연스러운 리액션을 배울 수 있어요.",
  "yt-intelligence": "동기부여, 자기계발 클립 모음이에요. 있어 보이는 표현들 많으니 자극 받고 싶다면 추천!",
  "yt-channel-7": "북미 Z세대 최신 속어, 밈, 줄임말이 궁금하다면? 여기서 트렌드 잡아가세요!",
  "yt-talk-like-a-star": "유명인 인터뷰, 대화 속 자연스러운 리액션 표현을 배울 수 있어요.",
  "yt-channel-8": "할리우드 영화 실제 대사를 장면 문맥이랑 같이 볼 수 있어요. 영화 덕질하며 배우고 싶다면 추천!",
  "yt-channel-9": "코미디, 예능식 대화라 타이밍이랑 속어, 빈정거림, 말장난까지 잡아내야 해요. 상급자용 웃음 포인트 찾고 싶다면 도전!",
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
  const reason = REASONS_TABLE[item.id];
  if (reason) item.reason = reason;
}

fs.writeFileSync("content.json", JSON.stringify(content, null, 2), "utf-8");

console.log(`완료! ${updated}개 항목에 focus/length_bucket/accent/tags 반영함.`);
if (missing.length) {
  console.log("테이블에 없는 id (수동 확인 필요):", missing.join(", "));
}
