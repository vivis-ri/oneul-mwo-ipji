import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import pg from 'pg';
import { fileURLToPath } from 'url';
import path from 'path';
import { REGIONS, CITY_GROUPS, searchRegions, findRegion } from './gridCoords.js';
import { CLOTHING_BANDS, getBandByTemp } from './clothing.js';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Render 등 리버스 프록시 뒤에서 실제 클라이언트 IP로 rate limit 카운트
app.set('trust proxy', 1);

// Render 헬스체크용 경량 엔드포인트
app.get('/health', (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.status(200).json({ ok: true, revision: 'sample-fix-2' });
});

// ─── 보안: Helmet (CSP + 기본 보안 헤더) ────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],   // onerror 인라인 핸들러 허용
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      fontSrc: ["'self'", "https://cdn.jsdelivr.net", "data:"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// 요청 바디 크기 제한
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));

// ─── 보안: 민감 파일 접근 차단 ─────────────────────────
const BLOCKED_PATHS = [/^\/\./, /^\/node_modules\b/, /^\/server\.js$/, /^\/generate-images\.js$/, /^\/test-image\.js$/, /^\/package(-lock)?\.json$/];
app.use((req, res, next) => {
  if (BLOCKED_PATHS.some(re => re.test(req.path))) {
    return res.status(404).send('Not found');
  }
  next();
});

// 정적 파일 (dotfiles 거부 — .env, .gitignore, .claude/ 등)
app.use(express.static(__dirname, { dotfiles: 'deny', index: 'index.html' }));

// ─── 보안: Rate Limiting ──────────────────────────────
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,           // 1분
  max: 200,                      // IP당 200회
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
});
app.use('/api/', apiLimiter);

// ─── 보안: 입력 검증 헬퍼 ──────────────────────────────
function validateRegionInput(s) {
  if (typeof s !== 'string') return null;
  const trimmed = s.trim();
  if (trimmed.length === 0 || trimmed.length > 50) return null;
  // 한글/영문/숫자/공백/괄호/점/하이픈/언더스코어만 허용
  if (!/^[\uAC00-\uD7A3a-zA-Z0-9 ()._\-]+$/.test(trimmed)) return null;
  return trimmed;
}
function validateIntRange(v, min, max) {
  const n = parseInt(v, 10);
  if (!Number.isInteger(n) || n < min || n > max) return null;
  return n;
}

// ─── 캐시 (같은 지역 반복 호출 시 기상청 API 부하 감소) ─
const CACHE_TTL_MS = 10 * 60 * 1000;   // 10분
const weatherCache = new Map();
function getCached(key) {
  const entry = weatherCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) { weatherCache.delete(key); return null; }
  return entry.data;
}
function setCached(key, data) {
  weatherCache.set(key, { ts: Date.now(), data });
  // 메모리 보호: 최대 500개 지역
  if (weatherCache.size > 500) {
    const oldestKey = weatherCache.keys().next().value;
    weatherCache.delete(oldestKey);
  }
}

// ─── 기상청 API 호출 시각 계산 (KST 고정) ──────────────
// 단기예보 발표시각: 02, 05, 08, 11, 14, 17, 20, 23시 (+10분 후 데이터 제공)
// ⚠️ Render 등 UTC 기본 서버에서도 한국 시간으로 동작하도록 모든 시각 계산을 KST로 고정
function kstNow() {
  // Date.now()는 플랫폼 무관 UTC ms. +9h 보정 후 getUTC*()로 읽으면 KST의 벽시계 시간
  return new Date(Date.now() + 9 * 60 * 60 * 1000);
}
function formatDate(d) {
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
}

function getBaseDateTime() {
  const now = kstNow();
  const baseTimes = ['2300', '2000', '1700', '1400', '1100', '0800', '0500', '0200'];
  const cur = now.getUTCHours() * 60 + now.getUTCMinutes();
  for (const bt of baseTimes) {
    const btMin = parseInt(bt.slice(0, 2), 10) * 60 + parseInt(bt.slice(2), 10) + 10;
    if (cur >= btMin) {
      return { baseDate: formatDate(now), baseTime: bt };
    }
  }
  const y = new Date(now);
  y.setUTCDate(y.getUTCDate() - 1);
  return { baseDate: formatDate(y), baseTime: '2300' };
}

// ─── KMA API 프록시 ───────────────────────────────────
async function fetchKMA(nx, ny) {
  const { baseDate, baseTime } = getBaseDateTime();
  const key = process.env.KMA_API_KEY;
  if (!key) throw new Error('KMA_API_KEY 미설정');

  const url = `https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst?serviceKey=${key}&pageNo=1&numOfRows=1000&dataType=JSON&base_date=${baseDate}&base_time=${baseTime}&nx=${nx}&ny=${ny}`;

  const r = await fetch(url);
  const text = await r.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`KMA API 응답이 JSON이 아님: ${text.substring(0, 200)}`);
  }

  const header = data?.response?.header;
  if (header?.resultCode !== '00') {
    throw new Error(`KMA 에러: ${header?.resultMsg || '알 수 없음'} (${header?.resultCode})`);
  }

  return { items: data.response.body.items.item, baseDate, baseTime };
}

// PCP 문자열 → 숫자(mm). "강수없음"=0, "1.0mm"=1, "30.0~50.0mm"=30, "50.0mm 이상"=50
function parsePcp(raw) {
  if (!raw || raw === '강수없음' || raw === '-') return 0;
  const m = String(raw).match(/[\d.]+/);
  return m ? parseFloat(m[0]) : 0;
}

// 체감온도 계산 (기상청 공식)
// - 겨울(T≤10°C, 풍속>4.8km/h): Wind Chill 공식
// - 여름(T≥27°C, 습도≥40%): 간이 heat index 근사
// - 그 외: 실제 기온 그대로
function calcFeelsLike(T, windSpeed_mps, humidity) {
  if (T === null || T === undefined || isNaN(T)) return null;
  const V_kmh = (windSpeed_mps || 0) * 3.6;
  if (T <= 10 && V_kmh > 4.8) {
    const V16 = Math.pow(V_kmh, 0.16);
    return 13.12 + 0.6215 * T - 11.37 * V16 + 0.3965 * T * V16;
  }
  if (T >= 27 && humidity && humidity >= 40) {
    // 간이 근사: 습도 10%당 체감 1°C 상승 (40% 기준)
    return T + (humidity - 40) * 0.06;
  }
  return T;
}

// 응답 파싱
function parseForecast(items) {
  const now = kstNow();
  const today = formatDate(now);
  const todayItems = items.filter(i => i.fcstDate === today);

  const curHour = String(now.getUTCHours()).padStart(2, '0') + '00';

  const byCategoryAtTime = (cat, time) =>
    todayItems.find(i => i.category === cat && i.fcstTime === time)?.fcstValue;

  // 현재 시간대 TMP (없으면 가장 가까운 것)
  const tmpItems = todayItems.filter(i => i.category === 'TMP').sort((a, b) => a.fcstTime.localeCompare(b.fcstTime));
  let currentTmp = byCategoryAtTime('TMP', curHour);
  if (!currentTmp && tmpItems.length > 0) {
    // 가장 가까운 미래 시간
    currentTmp = tmpItems.find(i => i.fcstTime >= curHour)?.fcstValue || tmpItems[tmpItems.length - 1].fcstValue;
  }

  // 최고/최저
  const tmx = todayItems.find(i => i.category === 'TMX')?.fcstValue;
  const tmn = todayItems.find(i => i.category === 'TMN')?.fcstValue;

  // TMX/TMN 없으면 TMP에서 계산
  const tmpValues = tmpItems.map(i => parseFloat(i.fcstValue));
  const maxTemp = tmx ? parseFloat(tmx) : (tmpValues.length > 0 ? Math.max(...tmpValues) : null);
  const minTemp = tmn ? parseFloat(tmn) : (tmpValues.length > 0 ? Math.min(...tmpValues) : null);

  // 하늘상태/강수형태 (현재 시간)
  const sky = byCategoryAtTime('SKY', curHour) || tmpItems[0] && byCategoryAtTime('SKY', tmpItems[0].fcstTime);
  const pty = byCategoryAtTime('PTY', curHour) || tmpItems[0] && byCategoryAtTime('PTY', tmpItems[0].fcstTime);

  // 습도, 풍속
  const reh = byCategoryAtTime('REH', curHour);
  const wsd = byCategoryAtTime('WSD', curHour);
  // 강수 (현재/가장 가까운 시간)
  const pop = byCategoryAtTime('POP', curHour) || tmpItems[0] && byCategoryAtTime('POP', tmpItems[0].fcstTime);
  const pcp = byCategoryAtTime('PCP', curHour) || tmpItems[0] && byCategoryAtTime('PCP', tmpItems[0].fcstTime);

  // 시간별 예보 (현재 + 3시간 간격, 6개 슬롯)
  const curH = now.getUTCHours();
  const hourly = [];
  const allItems = items; // 오늘 + 내일까지 포함

  for (let offset = 0; offset < 18 && hourly.length < 6; offset += 3) {
    const future = new Date(now);
    future.setUTCHours(curH + offset, 0, 0, 0);
    const fcstDate = formatDate(future);
    const fcstTime = String(future.getUTCHours()).padStart(2, '0') + '00';
    const match = allItems.filter(i => i.fcstDate === fcstDate && i.fcstTime === fcstTime);
    const tmp = match.find(i => i.category === 'TMP')?.fcstValue;
    const sky = match.find(i => i.category === 'SKY')?.fcstValue;
    const pty = match.find(i => i.category === 'PTY')?.fcstValue;
    const popH = match.find(i => i.category === 'POP')?.fcstValue;
    const pcpH = match.find(i => i.category === 'PCP')?.fcstValue;
    if (tmp) {
      hourly.push({
        time: fcstTime,
        date: fcstDate,
        isToday: fcstDate === today,
        temp: parseFloat(tmp),
        sky: sky ? parseInt(sky, 10) : null,
        pty: pty ? parseInt(pty, 10) : null,
        pop: popH ? parseInt(popH, 10) : 0,
        pcp: parsePcp(pcpH),
      });
    }
  }

  // 저녁/밤 기온 — 오늘 21시 예보 (없으면 내일 00시/03시, 최후엔 TMN)
  const todayStr = today;
  const tomorrowStr = formatDate(new Date(now.getTime() + 86400000));
  const pickTemp = (date, time, category = 'TMP') =>
    allItems.find(i => i.fcstDate === date && i.fcstTime === time && i.category === category)?.fcstValue;

  let nightTempRaw = pickTemp(todayStr, '2100') || pickTemp(todayStr, '2200') || pickTemp(todayStr, '2300')
                  || pickTemp(tomorrowStr, '0000') || pickTemp(tomorrowStr, '0300');
  const nightSky = allItems.find(i => (i.fcstDate === todayStr && i.fcstTime === '2100')
                                   || (i.fcstDate === todayStr && i.fcstTime === '2200')
                                   || (i.fcstDate === tomorrowStr && i.fcstTime === '0000'))?.category === 'SKY';
  const nightTemp = nightTempRaw ? parseFloat(nightTempRaw) : (minTemp ?? null);

  // 체감온도
  const windMps = wsd ? parseFloat(wsd) : 0;
  const rehVal = reh ? parseInt(reh, 10) : null;
  const curT = currentTmp ? parseFloat(currentTmp) : null;
  const feelsLike = calcFeelsLike(curT, windMps, rehVal);

  return {
    current: curT,
    feelsLike: feelsLike !== null ? Math.round(feelsLike * 10) / 10 : null,
    max: maxTemp,
    min: minTemp,
    nightTemp: nightTemp !== null ? Math.round(nightTemp * 10) / 10 : null,
    sky: sky ? parseInt(sky, 10) : null,
    pty: pty ? parseInt(pty, 10) : null,
    humidity: rehVal,
    windSpeed: wsd ? parseFloat(wsd) : null,
    pop: pop ? parseInt(pop, 10) : 0,
    pcp: parsePcp(pcp),
    hourly,
  };
}

// ─── 지역 → 시도명 매핑 (AirKorea API용) ──────────────
const SIDO_MAP = {
  경기: ['수원','성남','고양','용인','부천','안산','안양','남양주','화성','평택','의정부','시흥','파주','김포','광주(경기)','광명','군포','하남','이천','오산','양주','구리','안성','포천','의왕','여주','동두천','과천','가평','양평','연천'],
  강원: ['춘천','원주','강릉','동해','태백','속초','삼척','홍천','횡성','영월','평창','정선','철원','화천','양구','인제','고성(강원)','양양'],
  충북: ['청주','충주','제천','보은','옥천','영동','증평','진천','괴산','음성','단양'],
  충남: ['천안','공주','보령','아산','서산','논산','계룡','당진','금산','부여','서천','청양','홍성','예산','태안'],
  전북: ['전주','군산','익산','정읍','남원','김제','완주','진안','무주','장수','임실','순창','고창','부안'],
  전남: ['목포','여수','순천','나주','광양','담양','곡성','구례','고흥','보성','화순','장흥','강진','해남','영암','무안','함평','영광','장성','완도','진도','신안'],
  경북: ['포항','경주','김천','안동','구미','영주','영천','상주','문경','경산','의성','청송','영양','영덕','청도','고령','성주','칠곡','예천','봉화','울진','울릉'],
  경남: ['창원','진주','통영','사천','김해','밀양','거제','양산','의령','함안','창녕','남해','하동','산청','함양','거창','합천','고성(경남)'],
};
const SIDO_PREFIX = { 서울: '서울', 부산: '부산', 인천: '인천', 대구: '대구', 광주: '광주', 대전: '대전', 울산: '울산', 세종: '세종', 제주: '제주', 서귀포: '제주' };

function regionToSido(regionName) {
  if (!regionName) return '서울';
  for (const [prefix, sido] of Object.entries(SIDO_PREFIX)) {
    if (regionName.startsWith(prefix)) return sido;
  }
  for (const [sido, cities] of Object.entries(SIDO_MAP)) {
    if (cities.some(c => regionName.startsWith(c))) return sido;
  }
  return '서울';
}

// ─── 미세먼지 (AirKorea API) ──────────────────────────
async function fetchAirQuality(sidoName) {
  const key = process.env.KMA_API_KEY; // 동일 인증키 사용
  const url = `https://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getCtprvnRltmMesureDnsty?serviceKey=${key}&returnType=json&numOfRows=100&pageNo=1&sidoName=${encodeURIComponent(sidoName)}&ver=1.0`;
  const r = await fetch(url);
  const text = await r.text();
  let data;
  try { data = JSON.parse(text); } catch { throw new Error('AirKorea 응답 파싱 실패'); }

  const header = data?.response?.header;
  if (header?.resultCode !== '00') {
    throw new Error(`AirKorea 에러: ${header?.resultMsg || '알 수 없음'}`);
  }
  const items = data.response.body.items || [];
  if (items.length === 0) return null;

  // 가장 최신 측정값을 가진 첫 스테이션 (pm10Grade가 유효한 것)
  const valid = items.find(i => i.pm10Grade && i.pm10Grade !== '-') || items[0];
  return {
    station: valid.stationName,
    pm10: valid.pm10Value === '-' ? null : parseInt(valid.pm10Value, 10),
    pm10Grade: parseInt(valid.pm10Grade, 10) || null,
    pm25: valid.pm25Value === '-' ? null : parseInt(valid.pm25Value, 10),
    pm25Grade: parseInt(valid.pm25Grade, 10) || null,
    dataTime: valid.dataTime,
  };
}

// ─── 3일 예보 (단기예보 확장) ─────────────────────────
function parse3DayForecast(items) {
  const today = kstNow();  // KST 기준
  const days = [0, 1, 2].map(offset => {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() + offset);
    return formatDate(d);
  });

  return days.map((date, idx) => {
    const dayItems = items.filter(i => i.fcstDate === date);
    if (dayItems.length === 0) return null;

    const tmpVals = dayItems.filter(i => i.category === 'TMP').map(i => parseFloat(i.fcstValue));
    const tmx = dayItems.find(i => i.category === 'TMX')?.fcstValue;
    const tmn = dayItems.find(i => i.category === 'TMN')?.fcstValue;
    const maxT = tmx ? parseFloat(tmx) : (tmpVals.length ? Math.max(...tmpVals) : null);
    const minT = tmn ? parseFloat(tmn) : (tmpVals.length ? Math.min(...tmpVals) : null);

    // 대표 하늘상태 (정오 기준)
    const noonSky = dayItems.find(i => i.category === 'SKY' && i.fcstTime === '1200')?.fcstValue;
    const noonPty = dayItems.find(i => i.category === 'PTY' && i.fcstTime === '1200')?.fcstValue;
    const sky = noonSky || dayItems.find(i => i.category === 'SKY')?.fcstValue;
    const pty = noonPty || dayItems.find(i => i.category === 'PTY')?.fcstValue;

    // 강수: 하루 중 최대 확률 + 총 강수량 근사
    const popValues = dayItems.filter(i => i.category === 'POP').map(i => parseInt(i.fcstValue, 10)).filter(Number.isFinite);
    const pcpValues = dayItems.filter(i => i.category === 'PCP').map(i => parsePcp(i.fcstValue));
    const maxPop = popValues.length ? Math.max(...popValues) : 0;
    const totalPcp = pcpValues.reduce((a, b) => a + b, 0);

    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    // Date.UTC()로 생성 후 getUTCDay() — 서버 타임존 무관하게 안정적
    const jsDate = new Date(Date.UTC(+date.slice(0,4), parseInt(date.slice(4,6))-1, parseInt(date.slice(6,8))));

    return {
      date,
      dayLabel: idx === 0 ? '오늘' : idx === 1 ? '내일' : '모레',
      weekday: dayNames[jsDate.getUTCDay()],
      max: maxT,
      min: minT,
      sky: sky ? parseInt(sky, 10) : null,
      pty: pty ? parseInt(pty, 10) : null,
      maxPop,
      totalPcp: Math.round(totalPcp * 10) / 10,
    };
  }).filter(Boolean);
}

// ─── API Routes ───────────────────────────────────────
app.get('/api/regions', (req, res) => {
  const q = validateRegionInput(req.query.q || '');
  if (!q) {
    // 주요 도시 반환
    const popular = ['서울', '부산', '인천', '대구', '광주', '대전', '울산', '세종', '수원', '제주'];
    return res.json(popular.map(n => REGIONS.find(r => r.name === n)).filter(Boolean));
  }
  res.json(searchRegions(q, 15));
});

app.get('/api/weather', async (req, res) => {
  try {
    let coords;

    if (req.query.nx || req.query.ny) {
      const nx = validateIntRange(req.query.nx, 1, 200);
      const ny = validateIntRange(req.query.ny, 1, 200);
      if (nx === null || ny === null) {
        return res.status(400).json({ error: 'nx, ny는 1~200 범위의 정수여야 합니다' });
      }
      coords = { nx, ny, name: '현재 위치' };
    } else if (req.query.region) {
      const region = validateRegionInput(req.query.region);
      if (!region) return res.status(400).json({ error: '지역명 형식이 올바르지 않습니다' });
      const r = findRegion(region);
      if (!r) return res.status(404).json({ error: `"${region}" 지역을 찾을 수 없어요` });
      coords = r;
    } else {
      return res.status(400).json({ error: 'region 또는 nx/ny 파라미터 필요' });
    }

    // 캐시 조회
    const cacheKey = `${coords.nx}:${coords.ny}`;
    const cached = getCached(cacheKey);
    if (cached) {
      return res.json({ ...cached, _cached: true });
    }

    const { items, baseDate, baseTime } = await fetchKMA(coords.nx, coords.ny);
    const weather = parseForecast(items);
    const forecast3d = parse3DayForecast(items);

    // 각 날짜에 band 붙이기
    forecast3d.forEach(day => {
      const refTemp = day.max ?? day.min;
      day.band = getBandByTemp(refTemp);
    });

    // 옷차림 추천 — 시간대별 3가지 (지금/낮/밤)
    const bands = {
      now:   getBandByTemp(weather.current ?? weather.max),
      day:   getBandByTemp(weather.max ?? weather.current),
      night: getBandByTemp(weather.nightTemp ?? weather.min),
    };
    // 기본값: 낮 기준 (하위 호환)
    const band = bands.day;

    // 미세먼지 (실패해도 메인 응답엔 영향 없음)
    let airQuality = null;
    try {
      const sido = regionToSido(coords.name);
      airQuality = await fetchAirQuality(sido);
    } catch (airErr) {
      console.warn('[AirKorea]', airErr.message);
    }

    const response = {
      region: coords.name,
      weather,
      band,
      bands,       // { now, day, night }
      forecast3d,
      airQuality,
      meta: { baseDate, baseTime, nx: coords.nx, ny: coords.ny },
    };
    setCached(cacheKey, response);
    res.json(response);
  } catch (err) {
    console.error('[/api/weather]', err);
    res.status(500).json({ error: '날씨 정보를 가져오지 못했어요' });  // 내부 에러 메시지 감춤
  }
});

app.get('/api/bands', (req, res) => {
  res.json(CLOTHING_BANDS);
});

// ═══════════════════════════════════════════════════════
// 커뮤니티 · 실시간 체감 후기 (매일 자정 이후 초기화)
// ═══════════════════════════════════════════════════════
const FEEL_VALUES = ['cold', 'good', 'hot'];
const ALLOWED_ITEMS = [
  '반소매','긴소매','블라우스','맨투맨','후드티','니트','가디건',
  '자켓','코트','패딩','트렌치코트',
  '반바지','청바지','슬랙스','면바지','기모바지',
  '원피스','스커트',
];
// 시 단위 지역 (구/군 제외)
const CITY_REGIONS = REGIONS.filter(r => !r.name.includes(' ')).map(r => r.name);
const COMMUNITY_TIMEZONE = 'Asia/Seoul';
const kstDateFormatter = new Intl.DateTimeFormat('sv-SE', {
  timeZone: COMMUNITY_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
const dbPool = process.env.DATABASE_URL ? new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
}) : null;
const dbReady = dbPool ? initCommunityDb() : Promise.resolve();

// 메모리 저장소 — 가장 오래된 것이 배열 앞, 최신이 뒤
const posts = [];
let postIdSeq = 1;

function getKstDateKey(input = Date.now()) {
  return kstDateFormatter.format(new Date(input));
}

function isSameKstDay(ts) {
  return getKstDateKey(ts) === getKstDateKey();
}

async function initCommunityDb() {
  await dbPool.query(`
    CREATE TABLE IF NOT EXISTS community_posts (
      id BIGSERIAL PRIMARY KEY,
      region TEXT NOT NULL,
      feel TEXT NOT NULL,
      items TEXT[] NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await dbPool.query(`
    CREATE INDEX IF NOT EXISTS idx_community_posts_created_at
    ON community_posts (created_at DESC);
  `);
  await dbPool.query(`
    CREATE INDEX IF NOT EXISTS idx_community_posts_region_created_at
    ON community_posts (region, created_at DESC);
  `);
}

// 자정(KST) 지난 포스트 정리
function cleanupExpiredPosts() {
  const firstValid = posts.findIndex(p => isSameKstDay(p.ts));
  if (firstValid === -1 && posts.length > 0) {
    posts.length = 0;
  } else if (firstValid > 0) {
    posts.splice(0, firstValid);
  }
}

async function cleanupExpiredDbPosts() {
  if (!dbPool) return;
  await dbReady;
  await dbPool.query(`
    DELETE FROM community_posts
    WHERE (created_at AT TIME ZONE '${COMMUNITY_TIMEZONE}')::date
      < (NOW() AT TIME ZONE '${COMMUNITY_TIMEZONE}')::date
  `);
}

function normalizeSamplePostsInMemory() {
  posts.forEach((post) => {
    if (!isSameKstDay(post.ts) || post.region !== '서울') return;
    const itemsKey = [...post.items].sort().join('|');
    if (itemsKey === '면바지|반팔' || itemsKey === '반팔|슬랙스'
     || itemsKey === '면바지|반소매' || itemsKey === '반소매|슬랙스') {
      post.feel = 'good';
      post.items = ['블라우스', '슬랙스'];
    }
  });
}

async function normalizeSamplePostsInDb() {
  if (!dbPool) return;
  await dbReady;
  await dbPool.query(
    `UPDATE community_posts
     SET feel = 'good',
         items = ARRAY['블라우스', '슬랙스']::text[]
     WHERE (created_at AT TIME ZONE '${COMMUNITY_TIMEZONE}')::date
         = (NOW() AT TIME ZONE '${COMMUNITY_TIMEZONE}')::date
       AND region = '서울'
       AND (
         (items @> ARRAY['반팔', '면바지']::text[] AND cardinality(items) = 2)
         OR
         (items @> ARRAY['반팔', '슬랙스']::text[] AND cardinality(items) = 2)
         OR
         (items @> ARRAY['반소매', '면바지']::text[] AND cardinality(items) = 2)
         OR
         (items @> ARRAY['반소매', '슬랙스']::text[] AND cardinality(items) = 2)
       )`
  );
}

setInterval(() => {
  cleanupExpiredPosts();
  cleanupExpiredDbPosts().catch((err) => {
    console.warn('[community cleanup]', err.message);
  });
}, 30 * 60 * 1000);

async function saveCommunityPost({ region, feel, items }) {
  if (!dbPool) {
    cleanupExpiredPosts();
    const post = {
      id: postIdSeq++,
      region,
      feel,
      items,
      ts: Date.now(),
    };
    posts.push(post);
    normalizeSamplePostsInMemory();
    return { id: post.id };
  }

  await cleanupExpiredDbPosts();
  const { rows } = await dbPool.query(
    `INSERT INTO community_posts (region, feel, items)
     VALUES ($1, $2, $3::text[])
     RETURNING id`,
    [region, feel, items],
  );
  await normalizeSamplePostsInDb();
  return { id: rows[0].id };
}

async function getCommunityPosts(regionFilter) {
  if (!dbPool) {
    cleanupExpiredPosts();
    normalizeSamplePostsInMemory();
    return regionFilter && CITY_REGIONS.includes(regionFilter)
      ? posts.filter(p => p.region === regionFilter)
      : [...posts];
  }

  await cleanupExpiredDbPosts();
  await normalizeSamplePostsInDb();
  const params = [];
  let where = `
    WHERE (created_at AT TIME ZONE '${COMMUNITY_TIMEZONE}')::date
      = (NOW() AT TIME ZONE '${COMMUNITY_TIMEZONE}')::date
  `;

  if (regionFilter && CITY_REGIONS.includes(regionFilter)) {
    params.push(regionFilter);
    where += ` AND region = $${params.length}`;
  }

  const { rows } = await dbPool.query(
    `SELECT id, region, feel, items, created_at
     FROM community_posts
     ${where}
     ORDER BY created_at ASC`,
    params,
  );

  return rows.map(row => ({
    id: Number(row.id),
    region: row.region,
    feel: row.feel,
    items: Array.isArray(row.items) ? row.items : [],
    ts: new Date(row.created_at).getTime(),
  }));
}

// 지역 목록 (커뮤니티 드롭다운용)
app.get('/api/community/regions', (req, res) => {
  // 도/광역시별로 그룹핑된 시 목록 반환 (클라이언트 optgroup용)
  res.json({ groups: CITY_GROUPS, flat: CITY_REGIONS });
});

// 후기 작성
app.post('/api/community/posts', async (req, res) => {
  const { region, feel, items } = req.body || {};

  try {
    // 검증
    if (!region || !CITY_REGIONS.includes(region)) {
      return res.status(400).json({ error: '유효하지 않은 지역입니다' });
    }
    if (!FEEL_VALUES.includes(feel)) {
      return res.status(400).json({ error: '체감 값이 유효하지 않습니다' });
    }
    if (!Array.isArray(items) || items.length === 0 || items.length > 8) {
      return res.status(400).json({ error: '옷은 1~8개 선택해주세요' });
    }
    const cleanItems = Array.from(new Set(
      items.filter(i => typeof i === 'string' && ALLOWED_ITEMS.includes(i)),
    ));
    if (cleanItems.length === 0) {
      return res.status(400).json({ error: '유효한 옷 항목이 없습니다' });
    }

    const saved = await saveCommunityPost({ region, feel, items: cleanItems });
    res.json({ ok: true, id: saved.id });
  } catch (err) {
    console.error('[/api/community/posts]', err);
    res.status(500).json({ error: '후기를 저장하지 못했어요' });
  }
});

// 통계 + 최근 후기 조회
app.get('/api/community/feed', async (req, res) => {
  try {
    const regionFilter = typeof req.query.region === 'string' ? req.query.region : null;
    const filtered = await getCommunityPosts(regionFilter);

    // 통계 집계
    const total = filtered.length;
    const feelCounts = { cold: 0, good: 0, hot: 0 };
    const itemCounts = new Map();
    filtered.forEach(p => {
      feelCounts[p.feel]++;
      p.items.forEach(it => itemCounts.set(it, (itemCounts.get(it) || 0) + 1));
    });
    const feelStats = total > 0
      ? {
          cold: Math.round(feelCounts.cold / total * 100),
          good: Math.round(feelCounts.good / total * 100),
          hot: Math.round(feelCounts.hot / total * 100),
        }
      : { cold: 0, good: 0, hot: 0 };
    const topItems = Array.from(itemCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    // 최근 100건 (최신순)
    const recent = filtered.slice(-100).reverse().map(p => ({
      id: p.id,
      region: p.region,
      feel: p.feel,
      items: p.items,
      ago: formatAgo(Date.now() - p.ts),
    }));

    res.json({ total, feelStats, topItems, recent, regionFilter: regionFilter || null });
  } catch (err) {
    console.error('[/api/community/feed]', err);
    res.status(500).json({ error: '커뮤니티 데이터를 불러오지 못했어요' });
  }
});

function formatAgo(ms) {
  const m = Math.floor(ms / 60000);
  if (m < 1) return '방금 전';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return '하루 전';
}

app.listen(PORT, () => {
  console.log(`🌤️  오늘 뭐 입지? 서버 실행 중 → http://localhost:${PORT}`);
});
