import fs from 'fs';
import path from 'path';

const API_KEY = process.env.OPENAI_API_KEY;
if (!API_KEY) {
  console.error('OPENAI_API_KEY 환경변수를 찾을 수 없습니다. .env 파일 확인!');
  process.exit(1);
}

const prompt = `Cute 3D clay render illustration of a winter outfit: a fluffy puffy pastel pink padded jacket with visible quilting, a soft cream-colored knit scarf wrapped around, and small warm mittens floating next to it. Chubby rounded plump shapes with soft matte clay/plasticine texture, pastel color palette (baby pink, cream, light blue accents), gentle soft studio lighting with subtle soft shadows, 3/4 isometric view, centered composition, transparent background, kawaii aesthetic, minimalist, high quality 3D render in the style of cute modern clay animation, no text, no letters.`;

console.log('🎨 이미지 생성 중... (약 20~40초 소요)');
console.log('프롬프트:', prompt.substring(0, 80) + '...\n');

const startTime = Date.now();

try {
  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-image-1',
      prompt,
      size: '1024x1024',
      quality: 'medium',
      background: 'transparent',
      output_format: 'png',
      n: 1
    })
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('❌ API 에러:');
    console.error(JSON.stringify(data, null, 2));
    process.exit(1);
  }

  const b64 = data.data[0].b64_json;
  const outputDir = 'images';
  fs.mkdirSync(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, 'test-winter.png');
  fs.writeFileSync(outputPath, Buffer.from(b64, 'base64'));

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const sizeKB = (fs.statSync(outputPath).size / 1024).toFixed(1);

  console.log(`✅ 생성 완료! (${elapsed}초)`);
  console.log(`📁 저장 위치: ${path.resolve(outputPath)}`);
  console.log(`📦 파일 크기: ${sizeKB} KB`);
  if (data.usage) {
    console.log(`💰 토큰 사용량:`, data.usage);
  }
} catch (err) {
  console.error('❌ 요청 실패:', err.message);
  process.exit(1);
}
