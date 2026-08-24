// content.json의 각 유튜브 채널에서 "조회수 1위 영상"의 썸네일을 가져와서 thumbnail 필드를 교체합니다.
// 실행: YOUTUBE_API_KEY=본인키 node fetch-thumbnails.js

import fs from "fs";

const API_KEY = process.env.YOUTUBE_API_KEY;
if (!API_KEY) {
  console.error("YOUTUBE_API_KEY 환경변수가 없어요. 아래처럼 실행해주세요:");
  console.error("  YOUTUBE_API_KEY=본인키 node fetch-thumbnails.js");
  process.exit(1);
}

const content = JSON.parse(fs.readFileSync("content.json", "utf-8"));

function extractHandleOrId(link) {
  const channelMatch = link.match(/youtube\.com\/channel\/([^/]+)/);
  if (channelMatch) return { type: "id", value: channelMatch[1] };
  const handleMatch = link.match(/youtube\.com\/@([^/]+)/);
  if (handleMatch) return { type: "handle", value: decodeURIComponent(handleMatch[1]) };
  return null;
}

async function getChannelId(handle) {
  const url = `https://www.googleapis.com/youtube/v3/channels?part=id&forHandle=${encodeURIComponent(
    handle
  )}&key=${API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  if (data.items && data.items.length > 0) return data.items[0].id;
  return null;
}

async function searchTopVideo(channelId, order) {
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&order=${order}&type=video&maxResults=1&key=${API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  if (data.items && data.items.length > 0) {
    const thumbs = data.items[0].snippet.thumbnails;
    return thumbs.high?.url || thumbs.medium?.url || thumbs.default?.url;
  }
  return null;
}

async function getTopVideoThumbnail(channelId) {
  // 1차: 조회수 순으로 시도
  const byViews = await searchTopVideo(channelId, "viewCount");
  if (byViews) return byViews;
  // 2차: 조회수 순으로 결과가 없으면(가끔 발생) 관련도 순으로 재시도
  return await searchTopVideo(channelId, "relevance");
}

async function main() {
  let ok = 0;
  let fail = 0;

  const forceAll = process.env.FORCE_ALL === "1";

  for (const item of content) {
    try {
      if (!forceAll && item.thumbnail && item.thumbnail.includes("ytimg.com")) {
        console.log(`SKIP  ${item.id}: 이미 처리됨 (다시 하려면 FORCE_ALL=1로 실행)`);
        continue;
      }

      const parsed = extractHandleOrId(item.link);
      if (!parsed) {
        console.log(`SKIP  ${item.id}: 링크에서 채널을 못 찾음 (${item.link})`);
        fail++;
        continue;
      }

      const channelId = parsed.type === "id" ? parsed.value : await getChannelId(parsed.value);
      if (!channelId) {
        console.log(`FAIL  ${item.id}: 채널을 찾을 수 없음 (${parsed.value})`);
        fail++;
        continue;
      }

      const thumb = await getTopVideoThumbnail(channelId);
      if (thumb) {
        item.thumbnail = thumb;
        console.log(`OK    ${item.id}`);
        ok++;
      } else {
        console.log(`FAIL  ${item.id}: 영상을 찾을 수 없음`);
        fail++;
      }
    } catch (e) {
      console.log(`ERROR ${item.id}: ${e.message}`);
      fail++;
    }
  }

  fs.writeFileSync("content.json", JSON.stringify(content, null, 2), "utf-8");
  console.log(`\n완료! 성공 ${ok}개 / 실패 ${fail}개. content.json이 업데이트됐어요.`);
}

main();
