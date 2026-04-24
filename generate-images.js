// OpenAI gpt-image-1 을 사용한 클레이 3D 일러스트 일괄 생성 스크립트
// 실행: node --env-file=.env generate-images.js
//     (스킵 없이 재생성: node --env-file=.env generate-images.js --force)

import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { CLOTHING_BANDS } from './clothing.js';
import { ITEM_DEFS } from './items.js';

const API_KEY = process.env.OPENAI_API_KEY;
if (!API_KEY) { console.error('❌ OPENAI_API_KEY 없음'); process.exit(1); }

const FORCE = process.argv.includes('--force');
const CONCURRENCY = 2;  // OpenAI gpt-image-1 Tier 1 rate limit: 5 images/min
const MAX_RETRIES = 5;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// 공통 스타일 키워드 (모든 이미지 톤 통일)
const STYLE = `Style: cute 3D clay render, chubby rounded plump shapes with visible matte clay plasticine texture, pastel color palette with soft saturation, gentle soft studio lighting with subtle shadows, centered composition, completely transparent background with nothing else in the scene, no floor, no ground, no wall, kawaii minimalist aesthetic, high quality modern 3D render in the style of cute clay animation, absolutely no text, no letters, no numbers, no words anywhere in the image.`;

// ── UI 아이콘 (CTA 배너용) ────────────────────────────
const UI_ICON_PROMPTS = {
  'ui-bookmark': 'A cute 3D clay illustration of a single bookmark in warm peach beige color with a pointed notch at the bottom ribbon tail, slightly tilted view, chubby rounded plump shape',
  'ui-bell':     'A cute 3D clay illustration of a single cute notification bell in warm golden yellow color with a small round clapper visible at the bottom, plump rounded chubby shape',
};

// ── 날씨 아이콘 (3D 클레이 스타일) ─────────────────────
const WEATHER_PROMPTS = {
  'weather-sunny':         'A cute 3D clay illustration of a single plump smiling sun in warm yellow with soft rounded rays',
  'weather-partly-cloudy': 'A cute 3D clay illustration of a warm yellow sun peeking from behind a small fluffy white cloud',
  'weather-cloudy':        'A cute 3D clay illustration of two plump fluffy white clouds with a small yellow sun behind',
  'weather-overcast':      'A cute 3D clay illustration of several thick soft gray fluffy clouds overlapping each other',
  'weather-rain':          'A cute 3D clay illustration of a soft gray cloud with three cute blue round raindrops falling below',
  'weather-shower':        'A cute 3D clay illustration of a dark gray cloud with a cute small yellow lightning bolt and blue raindrops falling',
  'weather-snow':          'A cute 3D clay illustration of a white fluffy cloud with three small round white snowflakes floating below',
  'weather-sleet':         'A cute 3D clay illustration of a gray cloud with a mix of one raindrop and one snowflake falling below',
};

// ── 히어로 프롬프트 (구간별 완성 코디) ────────────────
const HERO_PROMPTS = {
  'hero-summer-hot':   'A cute 3D clay illustration of a summer outfit set: a pastel yellow sleeveless tank top, light blue denim shorts, and a small straw sun hat arranged together floating in mid-air with soft shadow.',
  'hero-summer-mild':  'A cute 3D clay illustration of a casual summer outfit set: a soft peach short-sleeve t-shirt, beige cotton shorts, and a pair of white sneakers arranged together floating in mid-air.',
  'hero-spring':       'A cute 3D clay illustration of a spring outfit set: a cream light blouse, soft beige cotton pants, and a thin pastel cardigan arranged together floating in mid-air.',
  'hero-autumn-mild':  'A cute 3D clay illustration of a transitional autumn outfit set: a pastel cream sweatshirt, light blue jeans, and a pair of white sneakers arranged together floating in mid-air.',
  'hero-autumn-cool':  'A cute 3D clay illustration of an outfit for cool autumn: a soft peach light trench jacket, a cream knit top, and blue jeans arranged together floating in mid-air.',
  'hero-late-autumn':  'A cute 3D clay illustration of a late autumn outfit: a tan trench coat, a beige knit sweater folded next to it, and brown ankle boots arranged together floating in mid-air.',
  'hero-early-winter': 'A cute 3D clay illustration of an early winter outfit: a warm lavender wool coat, a chunky cream knit sweater, and dark brown leather boots arranged together floating in mid-air.',
  'hero-winter':       'A cute 3D clay illustration of a winter outfit: a fluffy pastel pink puffy padded jacket, a soft cream knit scarf wrapped around, and warm mittens floating beside, arranged together in mid-air.',
};

// ── API 호출 (rate limit 재시도 포함) ──────────────────
async function generateImage(prompt, quality = 'medium', attempt = 0) {
  const fullPrompt = prompt + ' ' + STYLE;
  const r = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify({
      model: 'gpt-image-1', prompt: fullPrompt,
      size: '1024x1024', quality,
      background: 'transparent', output_format: 'png', n: 1,
    }),
  });
  const data = await r.json();
  if (!r.ok) {
    const msg = data?.error?.message || '';
    if (msg.includes('Rate limit') && attempt < MAX_RETRIES) {
      const match = msg.match(/try again in ([\d.]+)s/);
      const waitSec = match ? Math.ceil(parseFloat(match[1])) + 2 : 15;
      console.log(`  ⏳ Rate limit, ${waitSec}s 대기 후 재시도 (attempt ${attempt + 1}/${MAX_RETRIES})`);
      await sleep(waitSec * 1000);
      return generateImage(prompt, quality, attempt + 1);
    }
    throw new Error(`API error: ${msg.substring(0, 150)}`);
  }
  return Buffer.from(data.data[0].b64_json, 'base64');
}

// ── 이미지 저장 + 최적화 ──────────────────────────────
async function saveOptimized(buffer, outputPath, targetSize) {
  const optimized = await sharp(buffer)
    .resize(targetSize, targetSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ quality: 85, compressionLevel: 9 })
    .toBuffer();
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, optimized);
  return optimized.length;
}

// ── 작업 실행 (병렬 제한) ─────────────────────────────
async function runTasks(tasks) {
  const results = { ok: 0, skip: 0, fail: 0, bytes: 0 };
  let idx = 0;
  const total = tasks.length;

  async function worker() {
    while (idx < tasks.length) {
      const myIdx = idx++;
      const task = tasks[myIdx];
      const label = `[${myIdx + 1}/${total}] ${task.name}`;
      if (!FORCE && fs.existsSync(task.outputPath)) {
        console.log(`⏭️  ${label} → 이미 존재 (skip)`);
        results.skip++;
        continue;
      }
      const start = Date.now();
      try {
        console.log(`🎨 ${label} → 생성 시작...`);
        const buffer = await generateImage(task.prompt, task.quality);
        const size = await saveOptimized(buffer, task.outputPath, task.targetSize);
        const elapsed = ((Date.now() - start) / 1000).toFixed(1);
        console.log(`✅ ${label} → ${(size / 1024).toFixed(1)}KB · ${elapsed}s`);
        results.ok++;
        results.bytes += size;
      } catch (err) {
        console.error(`❌ ${label} → ${err.message}`);
        results.fail++;
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  return results;
}

// ── 메인 ──────────────────────────────────────────────
async function main() {
  console.log(`🚀 이미지 일괄 생성 시작 (concurrency=${CONCURRENCY}${FORCE ? ', FORCE' : ''})`);
  console.log(`📋 날씨 ${Object.keys(WEATHER_PROMPTS).length}장 + 히어로 ${Object.keys(HERO_PROMPTS).length}장 + 아이템 ${Object.keys(ITEM_DEFS).length}장\n`);

  const tasks = [];

  // UI 아이콘 (CTA 배너용, 256x256)
  for (const [slug, prompt] of Object.entries(UI_ICON_PROMPTS)) {
    tasks.push({
      name: slug, prompt, quality: 'low',
      outputPath: path.join('images', 'ui', `${slug}.png`),
      targetSize: 256,
    });
  }

  // 날씨 아이콘 (256x256 소형 아이콘)
  for (const [slug, prompt] of Object.entries(WEATHER_PROMPTS)) {
    tasks.push({
      name: slug, prompt, quality: 'low',
      outputPath: path.join('images', 'weather', `${slug}.png`),
      targetSize: 256,
    });
  }

  // 히어로 이미지 (512x512로 최적화)
  for (const [slug, prompt] of Object.entries(HERO_PROMPTS)) {
    tasks.push({
      name: slug, prompt, quality: 'medium',
      outputPath: path.join('images', `${slug}.png`),
      targetSize: 512,
    });
  }

  // 아이템 아이콘 (256x256으로 최적화, low quality로 비용 절감)
  for (const [kname, def] of Object.entries(ITEM_DEFS)) {
    tasks.push({
      name: `item:${def.slug} (${kname})`,
      prompt: `A cute 3D clay illustration of ${def.prompt}. Single item only, no other objects.`,
      quality: 'low',
      outputPath: path.join('images', 'items', `${def.slug}.png`),
      targetSize: 256,
    });
  }

  const startTime = Date.now();
  const results = await runTasks(tasks);
  const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`🎉 완료!`);
  console.log(`   ✅ 성공: ${results.ok}장  ⏭️  스킵: ${results.skip}장  ❌ 실패: ${results.fail}장`);
  console.log(`   📦 총 용량: ${(results.bytes / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   ⏱️  총 시간: ${totalElapsed}초`);
}

main().catch(err => { console.error(err); process.exit(1); });
