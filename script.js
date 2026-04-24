// 오늘 뭐 입지? - Frontend logic
import { ITEM_DEFS, getItemImagePath } from './items.js';

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// ─── 보안: HTML 이스케이프 헬퍼 (XSS 방어) ───
const escapeHtml = (s) => String(s ?? '').replace(/[&<>"'`/]/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;',
  '"': '&quot;', "'": '&#39;', '`': '&#96;', '/': '&#x2F;',
}[c]));

// 지역명 화이트리스트 검증 (localStorage/URL에서 유입된 값에 적용)
const isValidRegionName = (s) =>
  typeof s === 'string' && s.length > 0 && s.length <= 50 &&
  /^[\uAC00-\uD7A3a-zA-Z0-9 ()._\-]+$/.test(s);

// ─── 공용 상태 ───
const STATE = {
  region: null,       // 현재 선택된 지역 이름
  weather: null,      // 현재 날씨 데이터
  forecast3d: null,   // 3일 예보
  timeMode: 'day',    // 'now' | 'day' | 'night' - 히어로 카드 기준 시간대
};

const FAV_KEY = 'oneul-favorites-v1';
const EMPTY_ICON_CALENDAR = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3v3M17 3v3M4.5 9h15M6.5 5h11A2.5 2.5 0 0 1 20 7.5v10A2.5 2.5 0 0 1 17.5 20h-11A2.5 2.5 0 0 1 4 17.5v-10A2.5 2.5 0 0 1 6.5 5Z"/><path d="M8 13h2M12 13h2M16 13h1M8 16h2M12 16h2"/></svg>`;
const EMPTY_ICON_HEART = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.1 6.6a4.8 4.8 0 0 0-6.8 0L12 7.9l-1.3-1.3a4.8 4.8 0 1 0-6.8 6.8L12 21l8.1-7.6a4.8 4.8 0 0 0 0-6.8Z"/></svg>`;
const PIN_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s7-5.4 7-12A7 7 0 0 0 5 9c0 6.6 7 12 7 12Z"/><circle cx="12" cy="9" r="2.4"/></svg>`;

// ─── 아이템 이모지 폴백 ───
const ITEM_EMOJI = {
  '민소매': '👚', '반소매': '👕', '반바지': '🩳', '원피스': '👗', '린넨바지': '👖', '샌들': '🩴',
  '얇은 셔츠': '👔', '긴소매 티': '👕', '블라우스': '👚', '면바지': '👖', '슬랙스': '👖',
  '스니커즈': '👟', '얇은 가디건': '🧥', '맨투맨': '👕', '후드티': '🧥', '니트': '🧶',
  '얇은 니트': '🧶', '가디건': '🧥', '청바지': '👖', '긴 바지': '👖', '자켓': '🧥',
  '청자켓': '🧥', '스타킹': '🧦', '트렌치코트': '🧥', '야상': '🧥', '점퍼': '🧥',
  '기모바지': '👖', '부츠': '👢', '울 코트': '🧥', '가죽 자켓': '🧥', '히트텍': '👕',
  '두꺼운 니트': '🧶', '레깅스': '🩱', '패딩': '🧥', '두꺼운 코트': '🧥', '목도리': '🧣',
  '장갑': '🧤', '목티': '👕',
};
const getItemEmoji = (name) => ITEM_EMOJI[name] || '👕';

// ─── 날씨 아이콘 (이미지 경로 + 이모지 폴백) ───
function weatherIconSlug(sky, pty) {
  if (pty === 1) return 'rain';
  if (pty === 2) return 'sleet';
  if (pty === 3) return 'snow';
  if (pty === 4) return 'shower';
  if (sky === 1) return 'sunny';
  if (sky === 3) return 'partly-cloudy';
  if (sky === 4) return 'overcast';
  return 'partly-cloudy';
}
function weatherIconImg(sky, pty) {
  return `images/weather/weather-${weatherIconSlug(sky, pty)}.png`;
}
function weatherIconEmoji(sky, pty) {
  if (pty === 1) return '🌧️';
  if (pty === 2) return '🌨️';
  if (pty === 3) return '❄️';
  if (pty === 4) return '⛈️';
  if (sky === 1) return '☀️';
  if (sky === 3) return '⛅';
  if (sky === 4) return '☁️';
  return '🌤️';
}
function skyDesc(sky, pty) {
  if (pty === 1) return '비';
  if (pty === 2) return '비/눈';
  if (pty === 3) return '눈';
  if (pty === 4) return '소나기';
  if (sky === 1) return '맑음';
  if (sky === 3) return '구름 많음';
  if (sky === 4) return '흐림';
  return '맑음';
}

// 헬퍼: img + emoji 폴백 동시 삽입
function renderWeatherIcon(sky, pty, size = 'md') {
  const imgPath = weatherIconImg(sky, pty);
  const emoji = weatherIconEmoji(sky, pty);
  return `<img src="${imgPath}" alt="${skyDesc(sky, pty)}" onerror="this.style.display='none';this.nextElementSibling.style.display='inline';" /><span class="weather-emoji-fallback" style="display:none;">${emoji}</span>`;
}

function renderMiniItems(items = [], { limit = 4, cardClass = 'mini-item-card', nameClass = 'mini-item-name' } = {}) {
  return items.slice(0, limit).map(name => {
    const imgPath = getItemImagePath(name);
    const emoji = getItemEmoji(name);
    const media = imgPath
      ? `<img src="${imgPath}" alt="${name}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" />
         <span class="item-emoji-fallback" style="display:none;">${emoji}</span>`
      : `<span class="item-emoji-fallback" style="display:flex;">${emoji}</span>`;
    return `
      <div class="${cardClass}">
        <div class="mini-item-media">${media}</div>
        <div class="${nameClass}">${escapeHtml(name)}</div>
      </div>
    `;
  }).join('');
}

// ─── 미세먼지 등급 ───
function pmBadge(grade) {
  if (!grade) return null;
  const map = {
    1: { label: '좋음', cls: 'good' },
    2: { label: '보통', cls: 'normal' },
    3: { label: '나쁨', cls: 'bad' },
    4: { label: '매우나쁨', cls: 'verybad' },
  };
  return map[grade] || null;
}

// ═══════════════════════════════════════════════════════
// 즐겨찾기 (LocalStorage)
// ═══════════════════════════════════════════════════════
function getFavorites() {
  try {
    const raw = JSON.parse(localStorage.getItem(FAV_KEY));
    if (!Array.isArray(raw)) return [];
    // 보안: 화이트리스트 통과한 항목만 유지 (localStorage 변조 방어)
    return raw.filter(isValidRegionName);
  } catch { return []; }
}
function setFavorites(list) {
  const clean = list.filter(isValidRegionName);
  localStorage.setItem(FAV_KEY, JSON.stringify(clean));
  updateFavUI();
}
function isFavorite(name) {
  return getFavorites().some(f => f === name);
}
function toggleFavorite(name) {
  if (!isValidRegionName(name) || name === '현재 위치') return;
  const list = getFavorites();
  const idx = list.indexOf(name);
  if (idx >= 0) list.splice(idx, 1);
  else list.push(name);
  setFavorites(list);
}
function removeFavorite(name) {
  setFavorites(getFavorites().filter(f => f !== name));
}

function updateFavUI() {
  const list = getFavorites();
  const badge = $('#favBadge');
  badge.style.display = list.length > 0 ? 'flex' : 'none';
  badge.textContent = list.length;

  // 드롭다운 리스트
  const ul = $('#favList');
  if (list.length === 0) {
    ul.innerHTML = `<div class="fav-list-empty">즐겨찾기를 추가해보세요</div>`;
  } else {
    ul.innerHTML = list.map(name => {
      const safe = escapeHtml(name);
      return `
      <div class="fav-list-item" data-region="${safe}">
        <span class="fav-list-icon">${PIN_ICON}</span>
        <span class="fav-list-name">${safe}</span>
        <button class="fav-list-remove" data-remove="${safe}" aria-label="삭제">✕</button>
      </div>`;
    }).join('');
    ul.querySelectorAll('.fav-list-item').forEach(el => {
      el.addEventListener('click', (e) => {
        if (e.target.closest('[data-remove]')) return;
        loadWeatherByName(el.dataset.region);
        switchView('home');
        closeFavDropdown();
      });
    });
    ul.querySelectorAll('[data-remove]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        removeFavorite(btn.dataset.remove);
      });
    });
  }

  // 검색창 별 아이콘 활성화 상태
  const starBtn = $('#starBtn');
  if (starBtn && STATE.region) {
    starBtn.classList.toggle('active', isFavorite(STATE.region));
  }

  // 즐겨찾기 뷰가 열려 있으면 같이 업데이트
  if ($('#view-favorites').dataset.active === 'true') {
    renderFavoritesView();
  }
}

function openFavDropdown() { $('#favDropdown').classList.add('open'); closeMenuDropdown(); }
function closeFavDropdown() { $('#favDropdown').classList.remove('open'); }
function openMenuDropdown() { $('#menuDropdown').classList.add('open'); closeFavDropdown(); }
function closeMenuDropdown() { $('#menuDropdown').classList.remove('open'); }

$('#favBtn').addEventListener('click', (e) => {
  e.stopPropagation();
  const open = $('#favDropdown').classList.contains('open');
  if (open) closeFavDropdown(); else openFavDropdown();
});
$('#favClose').addEventListener('click', closeFavDropdown);

$('#menuBtn').addEventListener('click', (e) => {
  e.stopPropagation();
  const open = $('#menuDropdown').classList.contains('open');
  if (open) closeMenuDropdown(); else openMenuDropdown();
});

document.addEventListener('click', (e) => {
  if (!e.target.closest('.favorites-wrap')) closeFavDropdown();
  if (!e.target.closest('.menu-wrap')) closeMenuDropdown();
});

$('#starBtn').addEventListener('click', () => {
  if (!STATE.region) return;
  toggleFavorite(STATE.region);
});

// ═══════════════════════════════════════════════════════
// 뷰 전환
// ═══════════════════════════════════════════════════════
function switchView(name) {
  $$('.view').forEach(v => v.dataset.active = 'false');
  const target = $(`#view-${name}`);
  if (target) target.dataset.active = 'true';
  $$('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.view === name));
  $$('.menu-item').forEach(n => n.classList.toggle('active', n.dataset.view === name));
  closeMenuDropdown();  // 메뉴 클릭 후 자동 닫기
  location.hash = name === 'home' ? '' : `#${name}`;

  if (name === 'forecast') renderForecastView();
  if (name === 'favorites') renderFavoritesView();
  if (name === 'community') renderCommunityView();
}

$$('[data-view]').forEach(el => {
  el.addEventListener('click', (e) => {
    e.preventDefault();
    switchView(el.dataset.view);
  });
});

$('#ctaBtn').addEventListener('click', () => switchView('favorites'));

window.addEventListener('hashchange', () => {
  const v = location.hash.slice(1) || 'home';
  switchView(v);
});

// ═══════════════════════════════════════════════════════
// 커뮤니티 (실시간 체감 후기)
// ═══════════════════════════════════════════════════════
const COMMUNITY = {
  regions: null,         // 시 단위 전체 목록 (lazy load)
  selectedFeel: null,    // 현재 폼에서 선택된 체감
  selectedItems: new Set(),
  filterRegion: '',      // 통계 필터 (빈 문자열 = 전체)
};
const FEEL_ICONS = {
  cold: `<span class="recent-feel-icon recent-feel-cold" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 2v20M4.9 6.1l14.2 11.8M4.9 17.9 19.1 6.1M2 12h20"/></svg></span>`,
  good: `<span class="recent-feel-icon recent-feel-good" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M8.5 13.5c1 1.2 2.1 1.8 3.5 1.8s2.5-.6 3.5-1.8M9 10h.01M15 10h.01"/></svg></span>`,
  hot: `<span class="recent-feel-icon recent-feel-hot" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.3M12 19.2v2.3M4.8 4.8l1.6 1.6M17.6 17.6l1.6 1.6M2.5 12h2.3M19.2 12h2.3M4.8 19.2l1.6-1.6M17.6 6.4l1.6-1.6"/></svg></span>`,
};
const FEEL_LABELS = { cold: '춥다', good: '딱 좋다', hot: '덥다' };
const COMMUNITY_ITEMS = [
  '반소매','긴소매','블라우스','맨투맨','후드티','니트','가디건',
  '자켓','코트','패딩','트렌치코트',
  '반바지','청바지','슬랙스','면바지','기모바지',
  '원피스','스커트',
];

async function loadCommunityRegions() {
  if (COMMUNITY.regions) return COMMUNITY.regions;
  const r = await fetch('/api/community/regions');
  COMMUNITY.regions = await r.json();
  return COMMUNITY.regions;
}

function populateRegionSelects(regions) {
  const filterSel = $('#communityRegionFilter');
  const postSel = $('#postRegion');
  const opts = regions.map(r => `<option value="${escapeHtml(r)}">${escapeHtml(r)}</option>`).join('');
  filterSel.innerHTML = `<option value="">전체 지역</option>${opts}`;
  postSel.innerHTML = opts;
  // 현재 홈에서 선택된 지역이 시 단위면 기본값
  if (STATE.region && regions.includes(STATE.region)) {
    postSel.value = STATE.region;
  }
}

function renderItemsCheckGrid() {
  $('#itemsCheckGrid').innerHTML = COMMUNITY_ITEMS.map(name => `
    <label class="item-check" data-item="${escapeHtml(name)}">
      <span class="item-check-ico"></span>
      <span>${escapeHtml(name)}</span>
    </label>
  `).join('');
  $$('#itemsCheckGrid .item-check').forEach(el => {
    el.addEventListener('click', () => {
      const name = el.dataset.item;
      if (COMMUNITY.selectedItems.has(name)) {
        COMMUNITY.selectedItems.delete(name);
        el.classList.remove('active');
      } else {
        if (COMMUNITY.selectedItems.size >= 8) {
          setFormMsg('옷은 최대 8개까지 선택할 수 있어요', 'error');
          return;
        }
        COMMUNITY.selectedItems.add(name);
        el.classList.add('active');
      }
    });
  });
}

// 체감 버튼 이벤트
document.addEventListener('click', (e) => {
  const btn = e.target.closest('#feelChoice .feel-btn');
  if (!btn) return;
  $$('#feelChoice .feel-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  COMMUNITY.selectedFeel = btn.dataset.feel;
});

function setFormMsg(msg, type = '') {
  const el = $('#formMsg');
  el.textContent = msg;
  el.className = `form-msg ${type}`;
  if (msg) setTimeout(() => { if (el.textContent === msg) { el.textContent = ''; el.className = 'form-msg'; } }, 3500);
}

// 후기 제출
async function submitPost() {
  const region = $('#postRegion').value;
  const feel = COMMUNITY.selectedFeel;
  const items = Array.from(COMMUNITY.selectedItems);

  if (!region) return setFormMsg('지역을 선택해주세요', 'error');
  if (!feel) return setFormMsg('체감을 선택해주세요', 'error');
  if (items.length === 0) return setFormMsg('입은 옷을 하나 이상 선택해주세요', 'error');

  const btn = $('#postSubmitBtn');
  btn.disabled = true;
  try {
    const r = await fetch('/api/community/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ region, feel, items }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || '저장 실패');
  setFormMsg('✓ 후기가 저장됐어요. 오늘 자정 이후 초기화됩니다.', 'success');
    // 폼 초기화
    COMMUNITY.selectedFeel = null;
    COMMUNITY.selectedItems.clear();
    $$('#feelChoice .feel-btn').forEach(b => b.classList.remove('active'));
    $$('#itemsCheckGrid .item-check').forEach(el => el.classList.remove('active'));
    // 피드 리로드
    loadCommunityFeed();
  } catch (err) {
    setFormMsg(err.message, 'error');
  } finally {
    btn.disabled = false;
  }
}

async function loadCommunityFeed() {
  const region = COMMUNITY.filterRegion;
  const url = region ? `/api/community/feed?region=${encodeURIComponent(region)}` : '/api/community/feed';
  try {
    const r = await fetch(url);
    const data = await r.json();
    renderCommunityStats(data);
    renderRecentList(data.recent);
  } catch (err) {
    console.error('[community]', err);
  }
}

function renderCommunityStats({ total, feelStats, topItems, regionFilter }) {
  const statsCard = $('#communityStats');
  $('#statsRegionLabel').textContent = regionFilter || '전체 지역';
  $('#statsTotal').textContent = `${total}명 참여 (오늘 기준)`;
  $('.feel-pct[data-feel="cold"]').textContent = `${feelStats.cold}%`;
  $('.feel-pct[data-feel="good"]').textContent = `${feelStats.good}%`;
  $('.feel-pct[data-feel="hot"]').textContent = `${feelStats.hot}%`;
  $('.feel-bar-fill.cold').style.width = `${feelStats.cold}%`;
  $('.feel-bar-fill.good').style.width = `${feelStats.good}%`;
  $('.feel-bar-fill.hot').style.width = `${feelStats.hot}%`;
  statsCard.classList.toggle('is-empty', total === 0);

  if (topItems && topItems.length > 0) {
    $('#topItemsList').innerHTML = topItems.map(it =>
      `<span class="top-item-chip">${escapeHtml(it.name)}<span class="count">${it.count}</span></span>`
    ).join('');
  } else {
    $('#topItemsList').innerHTML = '<span class="empty-tiny">아직 데이터 없음</span>';
  }
}

function renderRecentList(recent) {
  const list = $('#recentList');
  if (!recent || recent.length === 0) {
    list.innerHTML = `
      <div class="recent-empty">
        <div class="community-empty-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M6 8.5A2.5 2.5 0 0 1 8.5 6h7A2.5 2.5 0 0 1 18 8.5v4A2.5 2.5 0 0 1 15.5 15H11l-4 3v-3.5A2.5 2.5 0 0 1 6 12.5v-4Z"/></svg>
        </div>
        <strong>아직 후기가 없어요</strong>
        <span>첫 번째로 남겨보면 다른 사람들도 참고할 수 있어요.</span>
      </div>
    `;
    return;
  }
  list.innerHTML = recent.map(p => `
    <div class="recent-item">
      <div class="recent-feel">${FEEL_ICONS[p.feel] || FEEL_ICONS.good}</div>
      <div class="recent-body">
        <div class="recent-top">
          <span class="recent-region">${escapeHtml(p.region)}</span>
          <span class="recent-ago">${escapeHtml(p.ago)}</span>
        </div>
        <div class="recent-items">${p.items.map(escapeHtml).join(' · ')}</div>
      </div>
    </div>
  `).join('');
}

// 필터 변경
$('#communityRegionFilter').addEventListener('change', (e) => {
  COMMUNITY.filterRegion = e.target.value;
  loadCommunityFeed();
});

$('#postSubmitBtn').addEventListener('click', submitPost);

async function renderCommunityView() {
  const regions = await loadCommunityRegions();
  populateRegionSelects(regions);
  renderItemsCheckGrid();
  await loadCommunityFeed();
}

// ═══════════════════════════════════════════════════════
// 지역 검색 / 자동완성
// ═══════════════════════════════════════════════════════
const regionInput = $('#regionInput');
const autocomplete = $('#autocomplete');
const gpsBtn = $('#gpsBtn');

let searchTimer;
regionInput.addEventListener('input', () => {
  clearTimeout(searchTimer);
  const q = regionInput.value.trim();
  if (!q) { autocomplete.classList.remove('open'); return; }
  searchTimer = setTimeout(async () => {
    try {
      const r = await fetch(`/api/regions?q=${encodeURIComponent(q)}`);
      const list = await r.json();
      renderAutocomplete(list);
    } catch (e) { console.warn(e); }
  }, 150);
});

regionInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const first = autocomplete.querySelector('.autocomplete-item');
    if (first) selectRegion(first.dataset.name);
    else loadWeatherByName(regionInput.value.trim());
  }
  if (e.key === 'Escape') autocomplete.classList.remove('open');
});
regionInput.addEventListener('blur', () => {
  setTimeout(() => autocomplete.classList.remove('open'), 150);
});

function renderAutocomplete(list) {
  if (!list || list.length === 0) { autocomplete.classList.remove('open'); return; }
  autocomplete.innerHTML = list
    .map(r => {
      const safe = escapeHtml(r.name);
      return `<div class="autocomplete-item" data-name="${safe}">${safe}</div>`;
    })
    .join('');
  autocomplete.classList.add('open');
  autocomplete.querySelectorAll('.autocomplete-item').forEach(el => {
    el.addEventListener('mousedown', (e) => {
      e.preventDefault();
      selectRegion(el.dataset.name);
    });
  });
}

function selectRegion(name) {
  regionInput.value = name;
  autocomplete.classList.remove('open');
  loadWeatherByName(name);
}

$$('.chip').forEach(chip => {
  chip.addEventListener('click', () => {
    const region = chip.dataset.region;
    if (region === '현재위치') return tryGeolocation();
    regionInput.value = region;
    loadWeatherByName(region);
  });
});
gpsBtn.addEventListener('click', tryGeolocation);

// LCC 좌표 변환 (GPS → nx,ny)
function dfsXyConv(lat, lon) {
  const RE = 6371.00877, GRID = 5.0;
  const SLAT1 = 30.0, SLAT2 = 60.0, OLON = 126.0, OLAT = 38.0;
  const XO = 43, YO = 136, DEGRAD = Math.PI / 180.0;
  const re = RE / GRID;
  const slat1 = SLAT1 * DEGRAD, slat2 = SLAT2 * DEGRAD;
  const olon = OLON * DEGRAD, olat = OLAT * DEGRAD;
  let sn = Math.tan(Math.PI * 0.25 + slat2 * 0.5) / Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(sn);
  let sf = Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sf = Math.pow(sf, sn) * Math.cos(slat1) / sn;
  let ro = Math.tan(Math.PI * 0.25 + olat * 0.5);
  ro = re * sf / Math.pow(ro, sn);
  let ra = Math.tan(Math.PI * 0.25 + lat * DEGRAD * 0.5);
  ra = re * sf / Math.pow(ra, sn);
  let theta = lon * DEGRAD - olon;
  if (theta > Math.PI) theta -= 2.0 * Math.PI;
  if (theta < -Math.PI) theta += 2.0 * Math.PI;
  theta *= sn;
  const nx = Math.floor(ra * Math.sin(theta) + XO + 0.5);
  const ny = Math.floor(ro - ra * Math.cos(theta) + YO + 0.5);
  return { nx, ny };
}

function tryGeolocation() {
  if (!navigator.geolocation) {
    alert('이 브라우저는 위치 기능을 지원하지 않아요. 지역 검색을 이용해주세요.');
    return;
  }
  if (!window.isSecureContext) {
    alert('위치 기능은 HTTPS 환경에서만 사용할 수 있어요.');
    return;
  }
  const prevValue = regionInput.value;
  regionInput.value = '현재 위치 찾는 중...';
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords;
      // 한국 영역 벗어남 체크 (위도 33~39, 경도 124~132 대략)
      if (latitude < 32 || latitude > 39 || longitude < 124 || longitude > 132) {
        regionInput.value = prevValue;
        alert('한국 내 위치만 지원해요. 지역을 직접 선택해주세요.');
        return;
      }
      const { nx, ny } = dfsXyConv(latitude, longitude);
      regionInput.value = '현재 위치';
      loadWeatherByCoords(nx, ny);
    },
    (err) => {
      regionInput.value = prevValue;
      let msg = '위치를 가져올 수 없어요.';
      if (err.code === 1) msg = '위치 권한이 차단돼 있어요. 브라우저 설정에서 허용해주세요.';
      else if (err.code === 2) msg = '현재 위치를 찾지 못했어요. 잠시 후 다시 시도하거나 지역을 직접 선택해주세요.';
      else if (err.code === 3) msg = '위치 확인 시간이 초과됐어요. 다시 시도하거나 지역을 직접 선택해주세요.';
      alert(msg);
    },
    { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
  );
}

// ═══════════════════════════════════════════════════════
// 날씨 로드 + 렌더
// ═══════════════════════════════════════════════════════
async function loadWeatherByName(name) {
  if (!name) return;
  regionInput.value = name;  // 검색창 input도 항상 동기화
  await loadWeather(`/api/weather?region=${encodeURIComponent(name)}`, name);
}
async function loadWeatherByCoords(nx, ny) {
  await loadWeather(`/api/weather?nx=${nx}&ny=${ny}`, null);
}

async function loadWeather(url, regionName) {
  setLoadingState(true);
  try {
    const r = await fetch(url);
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || '알 수 없는 오류');
    STATE.region = regionName || data.region;
    STATE.weather = data.weather;
    STATE.forecast3d = data.forecast3d;
    STATE.band = data.band;
    STATE.bands = data.bands || { now: data.band, day: data.band, night: data.band };
    STATE.airQuality = data.airQuality;
    render(data);
    updateFavUI();
    // 현재 forecast 뷰가 열려 있으면 재렌더 (첫 로드 시 empty state → 데이터 반영)
    if ($('#view-forecast').dataset.active === 'true') renderForecastView();
  } catch (err) {
    alert('날씨 정보를 가져오지 못했어요: ' + err.message);
    console.error(err);
  } finally {
    setLoadingState(false);
  }
}

function setLoadingState(loading) {
  $('#weatherCard').classList.toggle('loading', loading);
  $('#heroCard').classList.toggle('loading', loading);
}

function render({ region, weather, band, airQuality }) {
  // 왼쪽 날씨 카드
  $('#weatherIcon').innerHTML = renderWeatherIcon(weather.sky, weather.pty);
  $('#currentTemp').textContent = weather.current !== null ? Math.round(weather.current) : '--';
  $('#weatherDesc').textContent = skyDesc(weather.sky, weather.pty);

  const feelRaw = weather.feelsLike ?? weather.current;
  const feel = feelRaw !== null && feelRaw !== undefined ? Math.round(feelRaw) : '--';
  $('#statFeel').textContent = `${feel}°C`;
  $('#statHumidity').textContent = weather.humidity !== null ? `${weather.humidity}%` : '--';
  $('#statWind').textContent = weather.windSpeed !== null ? `${weather.windSpeed.toFixed(1)} m/s` : '--';
  // 강수: 확률 위주, 양이 있으면 괄호로
  const pop = weather.pop ?? 0;
  const pcp = weather.pcp ?? 0;
  const precipEl = $('#statPrecip');
  precipEl.textContent = pcp > 0 ? `${pop}% · ${pcp}mm` : `${pop}%`;
  precipEl.classList.toggle('pop-active', pop >= 30);

  const now = new Date();
  const timeStr = `${now.getHours()}:${String(now.getMinutes()).padStart(2,'0')}`;
  $('#weatherMeta').textContent = `${region} · 오늘 ${timeStr} 기준`;

  // 미세먼지 배지 (실제 데이터)
  renderAirQualityBadges(airQuality);

  // 시간별 예보
  renderHourly(weather.hourly);

  // 히어로 카드 (시간대별 band는 STATE.bands에, 선택은 applyTimeMode 안에서)
  if (band) {
    renderHero(band, weather);
  }
}

function renderAirQualityBadges(air) {
  if (!air) {
    $('#weatherBadges').innerHTML = `<span class="mini-badge" style="background:#f0f0f0;color:#888;">미세먼지 정보 없음</span>`;
    return;
  }
  const parts = [];
  const pm10 = pmBadge(air.pm10Grade);
  const pm25 = pmBadge(air.pm25Grade);
  if (pm10) parts.push(`<span class="mini-badge pm-${pm10.cls}">미세먼지 ${pm10.label}</span>`);
  if (pm25) parts.push(`<span class="mini-badge pm-${pm25.cls}">초미세 ${pm25.label}</span>`);
  $('#weatherBadges').innerHTML = parts.join('') || '<span class="mini-badge" style="background:#f0f0f0;color:#888;">측정 데이터 없음</span>';
}

function renderHourly(hourly) {
  if (!hourly || hourly.length === 0) { $('#hourlyList').innerHTML = ''; return; }
  const html = hourly.slice(0, 6).map((h, idx) => {
    const hh = parseInt(h.time.slice(0, 2), 10);
    let label;
    if (idx === 0) label = '지금';
    else if (h.isToday === false) label = '내일';
    else label = `${hh}시`;
    const popBadge = h.pop >= 20 ? `<div class="hourly-pop">💧 ${h.pop}%</div>` : '';
    return `
      <div class="hourly-item ${idx === 0 ? 'now' : ''}">
        <div class="hourly-time">${label}</div>
        <div class="hourly-ico">${renderWeatherIcon(h.sky, h.pty)}</div>
        <div class="hourly-temp">${Math.round(h.temp)}°</div>
        ${popBadge}
      </div>
    `;
  }).join('');
  $('#hourlyList').innerHTML = html;
}

function renderHero(_unusedBand, weather) {
  // 시간대 토글 버튼에 각 시간대별 기온 표시
  const nowT = weather.current;
  const dayT = weather.max;
  const nightT = weather.nightTemp;
  $('#timeNowTemp').textContent = nowT !== null && nowT !== undefined ? `${Math.round(nowT)}°` : '--°';
  $('#timeDayTemp').textContent = dayT !== null && dayT !== undefined ? `${Math.round(dayT)}°` : '--°';
  $('#timeNightTemp').textContent = nightT !== null && nightT !== undefined ? `${Math.round(nightT)}°` : '--°';

  // 선택된 시간대의 band 렌더
  applyTimeMode(STATE.timeMode, { updateButtons: true });

  // 기온 badge (낮~밤 범위 표시)
  const minShow = weather.min ?? weather.nightTemp;
  const maxShow = weather.max;
  const rangeText = minShow !== null && maxShow !== null
    ? `기온 ${Math.round(minShow)}°C ~ ${Math.round(maxShow)}°C`
    : `기온 ${Math.round(weather.current)}°C`;
  $('#heroTempBadge').textContent = rangeText;
}

function applyTimeMode(mode, { updateButtons = false } = {}) {
  STATE.timeMode = mode;
  const band = STATE.bands?.[mode];
  if (!band) return;

  // 버튼 active 상태
  if (updateButtons) {
    $$('.time-btn').forEach(b => b.classList.toggle('active', b.dataset.time === mode));
  } else {
    $$('.time-btn').forEach(b => b.classList.toggle('active', b.dataset.time === mode));
  }

  // 히어로 카드 배경은 레퍼런스 톤에 맞춰 CSS 기본값을 유지
  $('#heroCard').style.background = '';

  // 히어로 본문
  $('#heroTitle').textContent = band.heroTitle;
  $('#heroDesc').textContent = band.heroDesc;
  $('#chipTemp').querySelector('.chip-text').textContent = band.range;
  $('#chipTemp').classList.add('highlight');
  $('#chipSeason').querySelector('.chip-text').textContent = band.season;
  // 칩: band.tags 마지막 (산책, 데이트, 한파 같은 테마)
  $('#chipOccasion').querySelector('.chip-text').textContent = band.tags[band.tags.length - 1] || '외출';

  // 히어로 이미지
  const img = $('#heroImage');
  const placeholder = $('#heroImagePlaceholder');
  img.classList.remove('loaded');
  img.onload = () => { img.classList.add('loaded'); placeholder.style.display = 'none'; };
  img.onerror = () => { img.classList.remove('loaded'); placeholder.style.display = 'block'; placeholder.textContent = getItemEmoji(band.items[0]); };
  img.src = band.heroImage;

  // 팁 텍스트도 선택된 시간대에 맞게
  $('#tipText').textContent = band.oneLineTip;

  // 아이템 그리드
  $('#itemsGrid').innerHTML = band.items.slice(0, 6).map(name => {
    const imgPath = getItemImagePath(name);
    const emoji = getItemEmoji(name);
    const inner = imgPath
      ? `<img src="${imgPath}" alt="${name}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" />
         <span class="item-emoji-fallback" style="display:none;">${emoji}</span>`
      : `<span class="item-emoji-fallback" style="display:flex;">${emoji}</span>`;
    return `
      <div class="item-card">
        <div class="item-ico">${inner}</div>
        <div class="item-name">${name}</div>
      </div>
    `;
  }).join('');
}

// 시간대 버튼 클릭 이벤트
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.time-btn');
  if (!btn) return;
  applyTimeMode(btn.dataset.time);
});

// ═══════════════════════════════════════════════════════
// 3일 예보 뷰
// ═══════════════════════════════════════════════════════
function renderForecastView() {
  if (!STATE.forecast3d) {
    $('#forecastSubtitle').textContent = '지역을 먼저 선택해주세요';
    $('#forecastGrid').innerHTML = `<div class="empty-state"><div class="empty-icon">${EMPTY_ICON_CALENDAR}</div><div class="empty-title">3일간 날씨 준비 중</div><div class="empty-desc">홈에서 지역을 선택한 뒤 다시 열어주세요</div></div>`;
    return;
  }
  $('#forecastSubtitle').textContent = `${STATE.region} · 향후 3일 날씨`;
  $('#forecastGrid').innerHTML = STATE.forecast3d.map(day => {
    const band = day.band;
    const condition = skyDesc(day.sky, day.pty);
    const precipPill = day.maxPop >= 20
      ? `<span class="forecast-info-pill forecast-info-pill-precip">강수 ${day.maxPop}%${day.totalPcp > 0 ? ` · ${day.totalPcp}mm` : ''}</span>`
      : `<span class="forecast-info-pill">강수 낮음</span>`;
    const rangePill = band ? `<span class="forecast-info-pill forecast-info-pill-accent">${escapeHtml(band.range)}</span>` : '';
    return `
      <div class="forecast-card">
        <div class="forecast-card-head">
          <div class="forecast-date">
            <span class="forecast-day-label">${day.dayLabel}</span>
            <span class="forecast-weekday">${day.weekday}요일</span>
          </div>
          <span class="forecast-day-chip">${condition}</span>
        </div>
        <div class="forecast-hero">
          <div class="forecast-icon-shell">
            <div class="forecast-icon">${renderWeatherIcon(day.sky, day.pty)}</div>
          </div>
          <div class="forecast-hero-copy">
            <div class="forecast-condition">${band ? escapeHtml(band.heroTitle) : condition}</div>
            <div class="forecast-temps">
              <span class="forecast-temp-max">${day.max !== null ? Math.round(day.max) + '°' : '--'}</span>
              <span class="forecast-temp-sep">/</span>
              <span class="forecast-temp-min">${day.min !== null ? Math.round(day.min) + '°' : '--'}</span>
            </div>
            <div class="forecast-hero-meta">
              ${precipPill}
              ${rangePill}
            </div>
          </div>
        </div>
        ${band ? `
          <div class="forecast-band-panel">
            <div class="forecast-band-eyebrow">추천 아이템</div>
            <div class="forecast-band-title">${band.heroTitle}</div>
            <div class="forecast-items-grid">
              ${renderMiniItems(band.items, { limit: 4, cardClass: 'forecast-item-card', nameClass: 'forecast-item-name' })}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
}

// ═══════════════════════════════════════════════════════
// 즐겨찾기 뷰 (저장된 지역 카드)
// ═══════════════════════════════════════════════════════
async function renderFavoritesView() {
  const list = getFavorites();
  const grid = $('#favoritesGrid');
  if (list.length === 0) {
    grid.innerHTML = `<div class="empty-state empty-state-compact"><div class="empty-icon">${EMPTY_ICON_HEART}</div><div class="empty-title">저장된 즐겨찾기가 없어요</div><div class="empty-desc">검색창 옆 별 아이콘으로 지역을 추가해보세요</div></div>`;
    return;
  }
  // 로딩 스켈레톤
  grid.innerHTML = list.map(name => {
    const safe = escapeHtml(name);
    return `
    <div class="fav-view-card" data-region="${safe}">
      <div class="fav-view-top">
        <div>
          <span class="fav-view-region">${safe}</span>
          <div class="fav-view-caption">지금 날씨와 추천</div>
        </div>
        <button class="fav-view-remove-btn" data-remove="${safe}">✕</button>
      </div>
      <div class="fav-view-hero">
        <div class="fav-view-copy">
          <div class="fav-view-temp">--°</div>
          <div class="fav-view-desc">로딩 중…</div>
          <div class="fav-view-line">지역별 옷차림을 준비하고 있어요</div>
        </div>
        <div class="fav-view-icon-shell">
          <div class="fav-view-icon fav-view-loading"></div>
        </div>
      </div>
      <div class="fav-view-pills">
        <span class="fav-view-pill">최저 --°</span>
        <span class="fav-view-pill">최고 --°</span>
      </div>
      <div class="fav-view-items-wrap">
        <div class="fav-view-items-label">추천 아이템</div>
        <div class="fav-view-items fav-view-items-loading"></div>
      </div>
    </div>`;
  }).join('');

  grid.onclick = (e) => {
    const removeBtn = e.target.closest('[data-remove]');
    if (removeBtn) {
      e.stopPropagation();
      removeFavorite(removeBtn.dataset.remove);
      return;
    }
    const card = e.target.closest('.fav-view-card');
    if (!card) return;
    loadWeatherByName(card.dataset.region);
    switchView('home');
  };

  // 병렬로 날씨 로드
  list.forEach(async (name) => {
    try {
      const r = await fetch(`/api/weather?region=${encodeURIComponent(name)}`);
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      const card = Array.from(grid.querySelectorAll('.fav-view-card')).find(el => el.dataset.region === name);
      if (!card) return;
      const w = data.weather;
      const band = data.band;
      card.querySelector('.fav-view-icon').classList.remove('fav-view-loading');
      card.querySelector('.fav-view-icon').innerHTML = renderWeatherIcon(w.sky, w.pty);
      card.querySelector('.fav-view-temp').textContent = `${Math.round(w.current)}°`;
      card.querySelector('.fav-view-desc').textContent = skyDesc(w.sky, w.pty);
      card.querySelector('.fav-view-line').textContent = band?.heroTitle || '오늘 날씨에 맞는 옷차림 추천';
      card.querySelector('.fav-view-pills').innerHTML = `
        <span class="fav-view-pill">최저 ${w.min !== null ? Math.round(w.min) : '--'}°</span>
        <span class="fav-view-pill">최고 ${w.max !== null ? Math.round(w.max) : '--'}°</span>
        ${band ? `<span class="fav-view-pill fav-view-pill-accent">${escapeHtml(band.range)}</span>` : ''}
      `;
      card.querySelector('.fav-view-items').classList.remove('fav-view-items-loading');
      card.querySelector('.fav-view-items').innerHTML = band
        ? renderMiniItems(band.items, { limit: 4, cardClass: 'fav-mini-item', nameClass: 'fav-mini-item-name' })
        : '';
    } catch (err) {
      console.warn(`[fav ${name}]`, err.message);
      const card = Array.from(grid.querySelectorAll('.fav-view-card')).find(el => el.dataset.region === name);
      if (!card) return;
      card.querySelector('.fav-view-desc').textContent = '불러오지 못했어요';
      card.querySelector('.fav-view-line').textContent = '잠시 후 다시 시도해주세요';
    }
  });
}

// ═══════════════════════════════════════════════════════
// 초기화
// ═══════════════════════════════════════════════════════
window.addEventListener('DOMContentLoaded', () => {
  updateFavUI();

  // 초기 뷰는 hash 또는 home
  const initialView = location.hash.slice(1) || 'home';
  switchView(initialView);

  // 초기 지역 로드 (즐겨찾기 첫 번째 or 서울)
  const favs = getFavorites();
  const initialRegion = favs[0] || '서울';
  regionInput.value = initialRegion;
  loadWeatherByName(initialRegion);
});
