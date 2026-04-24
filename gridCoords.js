// 기상청 동네예보 격자 좌표 (주요 시/군/구)
export const REGIONS = [
  // 서울특별시
  { name: '서울', nx: 60, ny: 127 },
  { name: '서울특별시 강남구', short: '서울 강남구', nx: 61, ny: 126 },
  { name: '서울특별시 강동구', short: '서울 강동구', nx: 62, ny: 126 },
  { name: '서울특별시 강북구', short: '서울 강북구', nx: 61, ny: 128 },
  { name: '서울특별시 강서구', short: '서울 강서구', nx: 58, ny: 126 },
  { name: '서울특별시 관악구', short: '서울 관악구', nx: 59, ny: 125 },
  { name: '서울특별시 광진구', short: '서울 광진구', nx: 62, ny: 126 },
  { name: '서울특별시 구로구', short: '서울 구로구', nx: 58, ny: 125 },
  { name: '서울특별시 금천구', short: '서울 금천구', nx: 59, ny: 124 },
  { name: '서울특별시 노원구', short: '서울 노원구', nx: 61, ny: 129 },
  { name: '서울특별시 도봉구', short: '서울 도봉구', nx: 61, ny: 129 },
  { name: '서울특별시 동대문구', short: '서울 동대문구', nx: 61, ny: 127 },
  { name: '서울특별시 동작구', short: '서울 동작구', nx: 59, ny: 125 },
  { name: '서울특별시 마포구', short: '서울 마포구', nx: 59, ny: 127 },
  { name: '서울특별시 서대문구', short: '서울 서대문구', nx: 59, ny: 127 },
  { name: '서울특별시 서초구', short: '서울 서초구', nx: 61, ny: 125 },
  { name: '서울특별시 성동구', short: '서울 성동구', nx: 61, ny: 127 },
  { name: '서울특별시 성북구', short: '서울 성북구', nx: 61, ny: 127 },
  { name: '서울특별시 송파구', short: '서울 송파구', nx: 62, ny: 126 },
  { name: '서울특별시 양천구', short: '서울 양천구', nx: 58, ny: 126 },
  { name: '서울특별시 영등포구', short: '서울 영등포구', nx: 58, ny: 126 },
  { name: '서울특별시 용산구', short: '서울 용산구', nx: 60, ny: 126 },
  { name: '서울특별시 은평구', short: '서울 은평구', nx: 59, ny: 127 },
  { name: '서울특별시 종로구', short: '서울 종로구', nx: 60, ny: 127 },
  { name: '서울특별시 중구', short: '서울 중구', nx: 60, ny: 127 },
  { name: '서울특별시 중랑구', short: '서울 중랑구', nx: 62, ny: 127 },

  // 부산광역시
  { name: '부산', nx: 98, ny: 76 },
  { name: '부산 강서구', nx: 96, ny: 76 },
  { name: '부산 금정구', nx: 98, ny: 77 },
  { name: '부산 기장군', nx: 100, ny: 77 },
  { name: '부산 남구', nx: 98, ny: 75 },
  { name: '부산 동구', nx: 98, ny: 75 },
  { name: '부산 동래구', nx: 98, ny: 76 },
  { name: '부산 부산진구', nx: 97, ny: 75 },
  { name: '부산 북구', nx: 97, ny: 77 },
  { name: '부산 사상구', nx: 96, ny: 75 },
  { name: '부산 사하구', nx: 96, ny: 74 },
  { name: '부산 서구', nx: 97, ny: 74 },
  { name: '부산 수영구', nx: 99, ny: 75 },
  { name: '부산 연제구', nx: 98, ny: 76 },
  { name: '부산 영도구', nx: 98, ny: 74 },
  { name: '부산 중구', nx: 97, ny: 74 },
  { name: '부산 해운대구', nx: 99, ny: 75 },

  // 인천광역시
  { name: '인천', nx: 55, ny: 124 },
  { name: '인천 강화군', nx: 51, ny: 130 },
  { name: '인천 계양구', nx: 56, ny: 126 },
  { name: '인천 남동구', nx: 56, ny: 124 },
  { name: '인천 동구', nx: 55, ny: 125 },
  { name: '인천 미추홀구', nx: 54, ny: 124 },
  { name: '인천 부평구', nx: 55, ny: 125 },
  { name: '인천 서구', nx: 55, ny: 126 },
  { name: '인천 연수구', nx: 55, ny: 123 },
  { name: '인천 옹진군', nx: 54, ny: 124 },
  { name: '인천 중구', nx: 54, ny: 125 },

  // 대구광역시
  { name: '대구', nx: 89, ny: 90 },
  { name: '대구 남구', nx: 89, ny: 90 },
  { name: '대구 달서구', nx: 88, ny: 90 },
  { name: '대구 달성군', nx: 86, ny: 88 },
  { name: '대구 동구', nx: 90, ny: 91 },
  { name: '대구 북구', nx: 89, ny: 91 },
  { name: '대구 서구', nx: 88, ny: 90 },
  { name: '대구 수성구', nx: 89, ny: 90 },
  { name: '대구 중구', nx: 89, ny: 90 },

  // 광주광역시
  { name: '광주', nx: 58, ny: 74 },
  { name: '광주 광산구', nx: 57, ny: 74 },
  { name: '광주 남구', nx: 59, ny: 73 },
  { name: '광주 동구', nx: 60, ny: 74 },
  { name: '광주 북구', nx: 59, ny: 75 },
  { name: '광주 서구', nx: 59, ny: 74 },

  // 대전광역시
  { name: '대전', nx: 67, ny: 100 },
  { name: '대전 대덕구', nx: 68, ny: 100 },
  { name: '대전 동구', nx: 68, ny: 100 },
  { name: '대전 서구', nx: 67, ny: 100 },
  { name: '대전 유성구', nx: 67, ny: 101 },
  { name: '대전 중구', nx: 68, ny: 100 },

  // 울산광역시
  { name: '울산', nx: 102, ny: 84 },
  { name: '울산 남구', nx: 102, ny: 84 },
  { name: '울산 동구', nx: 104, ny: 83 },
  { name: '울산 북구', nx: 103, ny: 85 },
  { name: '울산 울주군', nx: 101, ny: 84 },
  { name: '울산 중구', nx: 102, ny: 84 },

  // 세종특별자치시
  { name: '세종', nx: 66, ny: 103 },

  // 경기도
  { name: '수원', nx: 60, ny: 121 },
  { name: '수원 장안구', nx: 61, ny: 122 },
  { name: '수원 권선구', nx: 60, ny: 120 },
  { name: '수원 팔달구', nx: 61, ny: 121 },
  { name: '수원 영통구', nx: 61, ny: 121 },
  { name: '성남', nx: 63, ny: 124 },
  { name: '성남 분당구', nx: 62, ny: 123 },
  { name: '성남 수정구', nx: 63, ny: 124 },
  { name: '성남 중원구', nx: 63, ny: 124 },
  { name: '고양', nx: 57, ny: 128 },
  { name: '고양 덕양구', nx: 57, ny: 128 },
  { name: '고양 일산동구', nx: 56, ny: 129 },
  { name: '고양 일산서구', nx: 56, ny: 129 },
  { name: '용인', nx: 64, ny: 119 },
  { name: '부천', nx: 56, ny: 125 },
  { name: '안산', nx: 58, ny: 121 },
  { name: '안양', nx: 59, ny: 123 },
  { name: '남양주', nx: 64, ny: 128 },
  { name: '화성', nx: 57, ny: 119 },
  { name: '평택', nx: 62, ny: 114 },
  { name: '의정부', nx: 61, ny: 130 },
  { name: '시흥', nx: 57, ny: 123 },
  { name: '파주', nx: 56, ny: 131 },
  { name: '김포', nx: 55, ny: 128 },
  { name: '광주(경기)', nx: 65, ny: 123 },
  { name: '광명', nx: 58, ny: 125 },
  { name: '군포', nx: 59, ny: 122 },
  { name: '하남', nx: 63, ny: 126 },
  { name: '이천', nx: 68, ny: 121 },
  { name: '오산', nx: 62, ny: 118 },
  { name: '양주', nx: 61, ny: 131 },
  { name: '구리', nx: 62, ny: 127 },
  { name: '안성', nx: 65, ny: 115 },
  { name: '포천', nx: 64, ny: 134 },
  { name: '의왕', nx: 60, ny: 122 },
  { name: '여주', nx: 71, ny: 121 },
  { name: '동두천', nx: 61, ny: 134 },
  { name: '과천', nx: 60, ny: 124 },
  { name: '가평', nx: 69, ny: 133 },
  { name: '양평', nx: 69, ny: 125 },
  { name: '연천', nx: 61, ny: 138 },

  // 강원특별자치도
  { name: '춘천', nx: 73, ny: 134 },
  { name: '원주', nx: 76, ny: 122 },
  { name: '강릉', nx: 92, ny: 131 },
  { name: '동해', nx: 97, ny: 127 },
  { name: '태백', nx: 95, ny: 119 },
  { name: '속초', nx: 87, ny: 141 },
  { name: '삼척', nx: 98, ny: 125 },
  { name: '홍천', nx: 75, ny: 130 },
  { name: '횡성', nx: 77, ny: 125 },
  { name: '영월', nx: 86, ny: 119 },
  { name: '평창', nx: 84, ny: 123 },
  { name: '정선', nx: 89, ny: 123 },
  { name: '철원', nx: 65, ny: 139 },
  { name: '화천', nx: 72, ny: 139 },
  { name: '양구', nx: 77, ny: 139 },
  { name: '인제', nx: 80, ny: 138 },
  { name: '고성(강원)', nx: 85, ny: 145 },
  { name: '양양', nx: 88, ny: 138 },

  // 충청북도
  { name: '청주', nx: 69, ny: 106 },
  { name: '충주', nx: 76, ny: 114 },
  { name: '제천', nx: 81, ny: 118 },
  { name: '보은', nx: 73, ny: 103 },
  { name: '옥천', nx: 71, ny: 99 },
  { name: '영동', nx: 74, ny: 97 },
  { name: '증평', nx: 71, ny: 110 },
  { name: '진천', nx: 68, ny: 111 },
  { name: '괴산', nx: 74, ny: 111 },
  { name: '음성', nx: 72, ny: 113 },
  { name: '단양', nx: 84, ny: 115 },

  // 충청남도
  { name: '천안', nx: 63, ny: 110 },
  { name: '공주', nx: 63, ny: 103 },
  { name: '보령', nx: 54, ny: 100 },
  { name: '아산', nx: 60, ny: 110 },
  { name: '서산', nx: 51, ny: 110 },
  { name: '논산', nx: 62, ny: 97 },
  { name: '계룡', nx: 65, ny: 99 },
  { name: '당진', nx: 54, ny: 112 },
  { name: '금산', nx: 69, ny: 95 },
  { name: '부여', nx: 59, ny: 99 },
  { name: '서천', nx: 55, ny: 94 },
  { name: '청양', nx: 57, ny: 103 },
  { name: '홍성', nx: 55, ny: 106 },
  { name: '예산', nx: 58, ny: 107 },
  { name: '태안', nx: 48, ny: 109 },

  // 전북특별자치도
  { name: '전주', nx: 63, ny: 89 },
  { name: '군산', nx: 56, ny: 92 },
  { name: '익산', nx: 60, ny: 91 },
  { name: '정읍', nx: 58, ny: 83 },
  { name: '남원', nx: 68, ny: 80 },
  { name: '김제', nx: 59, ny: 88 },
  { name: '완주', nx: 63, ny: 89 },
  { name: '진안', nx: 68, ny: 88 },
  { name: '무주', nx: 72, ny: 93 },
  { name: '장수', nx: 70, ny: 85 },
  { name: '임실', nx: 66, ny: 84 },
  { name: '순창', nx: 63, ny: 79 },
  { name: '고창', nx: 56, ny: 80 },
  { name: '부안', nx: 56, ny: 87 },

  // 전라남도
  { name: '목포', nx: 50, ny: 67 },
  { name: '여수', nx: 73, ny: 66 },
  { name: '순천', nx: 70, ny: 70 },
  { name: '나주', nx: 56, ny: 71 },
  { name: '광양', nx: 73, ny: 70 },
  { name: '담양', nx: 61, ny: 78 },
  { name: '곡성', nx: 66, ny: 77 },
  { name: '구례', nx: 69, ny: 75 },
  { name: '고흥', nx: 66, ny: 62 },
  { name: '보성', nx: 62, ny: 66 },
  { name: '화순', nx: 61, ny: 72 },
  { name: '장흥', nx: 59, ny: 64 },
  { name: '강진', nx: 57, ny: 63 },
  { name: '해남', nx: 54, ny: 61 },
  { name: '영암', nx: 56, ny: 66 },
  { name: '무안', nx: 52, ny: 71 },
  { name: '함평', nx: 52, ny: 72 },
  { name: '영광', nx: 52, ny: 77 },
  { name: '장성', nx: 57, ny: 77 },
  { name: '완도', nx: 57, ny: 56 },
  { name: '진도', nx: 48, ny: 59 },
  { name: '신안', nx: 50, ny: 66 },

  // 경상북도
  { name: '포항', nx: 102, ny: 94 },
  { name: '경주', nx: 100, ny: 91 },
  { name: '김천', nx: 80, ny: 96 },
  { name: '안동', nx: 91, ny: 106 },
  { name: '구미', nx: 84, ny: 96 },
  { name: '영주', nx: 89, ny: 111 },
  { name: '영천', nx: 95, ny: 93 },
  { name: '상주', nx: 81, ny: 102 },
  { name: '문경', nx: 81, ny: 106 },
  { name: '경산', nx: 91, ny: 90 },
  { name: '의성', nx: 90, ny: 101 },
  { name: '청송', nx: 96, ny: 103 },
  { name: '영양', nx: 97, ny: 108 },
  { name: '영덕', nx: 102, ny: 103 },
  { name: '청도', nx: 91, ny: 86 },
  { name: '고령', nx: 83, ny: 87 },
  { name: '성주', nx: 83, ny: 91 },
  { name: '칠곡', nx: 85, ny: 93 },
  { name: '예천', nx: 86, ny: 107 },
  { name: '봉화', nx: 90, ny: 113 },
  { name: '울진', nx: 102, ny: 115 },
  { name: '울릉', nx: 127, ny: 127 },

  // 경상남도
  { name: '창원', nx: 90, ny: 77 },
  { name: '진주', nx: 81, ny: 75 },
  { name: '통영', nx: 87, ny: 68 },
  { name: '사천', nx: 80, ny: 71 },
  { name: '김해', nx: 95, ny: 77 },
  { name: '밀양', nx: 92, ny: 83 },
  { name: '거제', nx: 90, ny: 69 },
  { name: '양산', nx: 97, ny: 79 },
  { name: '의령', nx: 83, ny: 78 },
  { name: '함안', nx: 86, ny: 77 },
  { name: '창녕', nx: 87, ny: 83 },
  { name: '고성(경남)', nx: 85, ny: 71 },
  { name: '남해', nx: 77, ny: 68 },
  { name: '하동', nx: 74, ny: 73 },
  { name: '산청', nx: 76, ny: 80 },
  { name: '함양', nx: 74, ny: 82 },
  { name: '거창', nx: 77, ny: 86 },
  { name: '합천', nx: 81, ny: 84 },

  // 제주특별자치도
  { name: '제주', nx: 53, ny: 38 },
  { name: '서귀포', nx: 52, ny: 33 },
];

// 검색어로 지역 매칭 (fuzzy)
export function searchRegions(query, limit = 10) {
  if (!query || !query.trim()) return [];
  const q = query.trim().toLowerCase().replace(/\s+/g, '');
  const results = [];
  for (const r of REGIONS) {
    const name = r.name.toLowerCase().replace(/\s+/g, '');
    const short = (r.short || '').toLowerCase().replace(/\s+/g, '');
    if (name.includes(q) || short.includes(q)) {
      results.push(r);
      if (results.length >= limit) break;
    }
  }
  return results;
}

export function findRegion(name) {
  const q = name.trim().toLowerCase().replace(/\s+/g, '');
  return REGIONS.find(r => {
    const n = r.name.toLowerCase().replace(/\s+/g, '');
    const s = (r.short || '').toLowerCase().replace(/\s+/g, '');
    return n === q || s === q;
  }) || REGIONS.find(r => {
    const n = r.name.toLowerCase().replace(/\s+/g, '');
    return n.includes(q);
  });
}
