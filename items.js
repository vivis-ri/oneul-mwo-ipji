// 고유 옷차림 아이템 정의 (slug + 이미지 프롬프트)
// 클레이 3D 스타일로 생성할 아이템들

export const ITEM_DEFS = {
  '민소매':      { slug: 'sleeveless',    prompt: 'a single cute sleeveless tank top in soft pastel pink' },
  '반팔':        { slug: 'short-sleeve',  prompt: 'a single cute short-sleeve t-shirt in soft pastel orange' },
  '반바지':      { slug: 'shorts',        prompt: 'a pair of casual cute shorts in pastel blue denim' },
  '원피스':      { slug: 'dress',         prompt: 'a cute short summer dress in pastel yellow' },
  '린넨바지':    { slug: 'linen-pants',   prompt: 'a pair of loose beige linen pants' },
  '샌들':        { slug: 'sandals',       prompt: 'a pair of cute pastel cream sandals' },
  '얇은 셔츠':   { slug: 'thin-shirt',    prompt: 'a thin button-up shirt in soft pastel cream white' },
  '면바지':      { slug: 'cotton-pants',  prompt: 'a pair of beige cotton chino pants' },
  '스니커즈':    { slug: 'sneakers',      prompt: 'a pair of cute white sneakers with pastel accents' },
  '블라우스':    { slug: 'blouse',        prompt: 'a feminine blouse in soft cream with gentle ruffles' },
  '긴팔 티':     { slug: 'long-sleeve',   prompt: 'a long-sleeve t-shirt in pastel navy with cream stripes' },
  '슬랙스':      { slug: 'slacks',        prompt: 'a pair of formal slacks in dark gray' },
  '얇은 가디건': { slug: 'thin-cardigan', prompt: 'a thin cardigan in soft pastel sage green' },
  '얇은 니트':   { slug: 'thin-knit',     prompt: 'a thin knit sweater in pastel blue' },
  '맨투맨':      { slug: 'sweatshirt',    prompt: 'a cozy crewneck sweatshirt in soft pastel gray' },
  '후드티':      { slug: 'hoodie',        prompt: 'a cream pastel hoodie with a soft drawstring' },
  '가디건':      { slug: 'cardigan',      prompt: 'a button-up cardigan in soft beige' },
  '긴 바지':     { slug: 'long-pants',    prompt: 'a pair of neutral long trousers in warm taupe' },
  '니트':        { slug: 'knit',          prompt: 'a cozy knit sweater in soft mustard yellow' },
  '트렌치코트':  { slug: 'trench-coat',   prompt: 'a tan beige double-breasted trench coat' },
  '청바지':      { slug: 'jeans',         prompt: 'a pair of light blue denim jeans' },
  '야상':        { slug: 'field-jacket',  prompt: 'a khaki olive field jacket with pockets' },
  '점퍼':        { slug: 'jumper',        prompt: 'a puffy bomber jacket in soft navy' },
  '기모바지':    { slug: 'fleece-pants',  prompt: 'a pair of warm fleece-lined pants in dark gray' },
  '부츠':        { slug: 'boots',         prompt: 'a pair of brown leather ankle boots' },
  '울 코트':     { slug: 'wool-coat',     prompt: 'a long elegant wool overcoat in warm beige' },
  '가죽 자켓':   { slug: 'leather-jacket',prompt: 'a classic black leather biker jacket' },
  '히트텍':      { slug: 'heattech',      prompt: 'a thin thermal long-sleeve undershirt in soft gray' },
  '두꺼운 니트': { slug: 'thick-knit',    prompt: 'a chunky oversized knit sweater in cream white' },
  '레깅스':      { slug: 'leggings',      prompt: 'a pair of sleek black leggings' },
  '패딩':        { slug: 'padding',       prompt: 'a fluffy puffy padded jacket in pastel pink' },
  '두꺼운 코트': { slug: 'thick-coat',    prompt: 'a thick wool winter coat in dark forest green' },
  '목도리':      { slug: 'scarf',         prompt: 'a long soft knit scarf in pastel cream' },
  '장갑':        { slug: 'gloves',        prompt: 'a pair of warm mittens in soft pink' },
};

// 헬퍼: 아이템명 → 이미지 경로 (없으면 null)
export function getItemImagePath(name) {
  const def = ITEM_DEFS[name];
  return def ? `images/items/${def.slug}.png` : null;
}
