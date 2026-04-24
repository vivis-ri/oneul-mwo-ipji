import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const API_KEY = process.env.OPENAI_API_KEY;
if (!API_KEY) {
  console.error('OPENAI_API_KEY is required');
  process.exit(1);
}

const STYLE = [
  'Style: cute 3D clay render',
  'chubby rounded plump shapes',
  'visible matte clay plasticine texture',
  'pastel warm color palette with soft saturation',
  'gentle soft studio lighting with subtle shadows',
  'centered single object composition',
  'completely transparent background',
  'no floor, no ground, no wall',
  'high quality modern 3D render',
  'absolutely no text, no letters, no numbers, no watermark',
].join(', ');

const TASKS = [
  {
    name: 'ui-bookmark',
    outputPath: path.join('images', 'ui', 'bookmark.png'),
    prompt: 'A single cute 3D clay bookmark ribbon icon, warm muted honey ochre color, soft rounded folded paper shape, slightly puffy and tactile.',
    size: 192,
  },
  {
    name: 'ui-bell',
    outputPath: path.join('images', 'ui', 'bell.png'),
    prompt: 'A single cute 3D clay notification bell icon, warm pastel yellow gold color, puffy rounded bell body with a small clapper, friendly minimal shape.',
    size: 224,
  },
];

async function generateImage(prompt) {
  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-image-1',
      prompt: `${prompt} ${STYLE}`,
      size: '1024x1024',
      quality: 'medium',
      background: 'transparent',
      output_format: 'png',
      n: 1,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || 'image generation failed');
  }
  return Buffer.from(data.data[0].b64_json, 'base64');
}

async function saveOptimized(buffer, outputPath, targetSize) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  await sharp(buffer)
    .resize(targetSize, targetSize, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({ quality: 90, compressionLevel: 9 })
    .toFile(outputPath);
}

for (const task of TASKS) {
  console.log(`Generating ${task.name}...`);
  const buffer = await generateImage(task.prompt);
  await saveOptimized(buffer, task.outputPath, task.size);
  console.log(`Saved ${task.outputPath}`);
}
