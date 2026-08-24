import fs from "fs";

const filePath = "content.json";
const content = JSON.parse(fs.readFileSync(filePath, "utf-8"));

let updated = 0;

for (const item of content) {
  const isShorts =
    item.format === "shorts" ||
    item.link?.includes("/shorts");

  if (isShorts) {
    item.format = "shorts";
    item.length_bucket = "under1";
    updated++;
  }

  // 예전 1~5분 값을 새로운 2~5분 값으로 변경
  if (item.length_bucket === "1to5") {
    item.length_bucket = "2to5";
  }
}

fs.writeFileSync(
  filePath,
  JSON.stringify(content, null, 2) + "\n",
  "utf-8"
);

console.log(`완료: 쇼츠 ${updated}개를 자동 분류했어요.`);