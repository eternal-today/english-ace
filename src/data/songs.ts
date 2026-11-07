/**
 * 주제 여행 — 단원 = 노래 1곡 + 노래 속 단어 (설계 문서 5-3)
 * 저작권이 끝난 오래된 동요만 씀. 가사는 앱에 넣을 수 있고, 영상은 부모님이 넣은 유튜브 주소로만 연결함.
 */

export interface SongWord {
  id: string;          // 기억 상자 카드 번호에 씀 (w:cow)
  word: string;
  emoji: string;       // 그림 (동물처럼 그림 자체가 단어인 것만)
  ko: string;
  sound?: string;      // 동물 소리 (Old MacDonald)
  lyricOnly?: boolean; // 그림 문제에는 내지 않음
}

export interface LyricLine {
  text: string;        // ___ 자리가 빈칸
  answer: string;      // 빈칸에 들어갈 단어 id
}

export interface SongUnit {
  id: string;
  title: string;
  known: boolean;      // 아이가 이미 아는 노래
  topic?: boolean;     // 노래 없는 주제 단어 단원 (가사·영상 없음)
  ko?: string;         // 주제 단원의 한국어 이름
  words: SongWord[];
  lyrics: LyricLine[];
}

const W = (word: string, emoji: string, ko: string, sound?: string): SongWord => ({ id: word, word, emoji, ko, ...(sound ? { sound } : {}) });

export const SONGS: SongUnit[] = [
  {
    id: 'oldmac', title: 'Old MacDonald Had a Farm', known: true,
    words: [
      { ...W('farm', '🏡', '농장'), lyricOnly: true },   // 농장은 그림 하나로 나타내기 어려워서 가사 빈칸으로만 냄
      W('cow', '🐄', '소', 'moo'),
      W('pig', '🐷', '돼지', 'oink'),
      W('duck', '🦆', '오리', 'quack'),
      W('sheep', '🐑', '양', 'baa'),
      W('horse', '🐴', '말', 'neigh'),
      W('dog', '🐶', '강아지', 'woof'),
    ],
    lyrics: [
      { text: 'Old MacDonald had a ___.', answer: 'farm' },
      { text: 'And on his farm he had a ___, with a moo moo here!', answer: 'cow' },
      { text: 'And on his farm he had a ___, with an oink oink here!', answer: 'pig' },
      { text: 'And on his farm he had a ___, with a quack quack here!', answer: 'duck' },
      { text: 'And on his farm he had a ___, with a baa baa here!', answer: 'sheep' },
      { text: 'And on his farm he had a ___, with a neigh neigh here!', answer: 'horse' },
      { text: 'And on his farm he had a ___, with a woof woof here!', answer: 'dog' },
    ],
  },
  {
    id: 'diddle', title: 'Hey Diddle Diddle', known: false,
    words: [
      W('cat', '🐱', '고양이'),
      W('fiddle', '🎻', '바이올린'),
      W('cow', '🐄', '소'),
      W('moon', '🌙', '달'),
      W('dog', '🐶', '강아지'),
      W('dish', '🍽️', '접시'),
      W('spoon', '🥄', '숟가락'),
    ],
    lyrics: [
      { text: 'Hey diddle diddle, the ___ and the fiddle.', answer: 'cat' },
      { text: 'Hey diddle diddle, the cat and the ___.', answer: 'fiddle' },
      { text: 'The ___ jumped over the moon.', answer: 'cow' },
      { text: 'The cow jumped over the ___.', answer: 'moon' },
      { text: 'The little ___ laughed to see such sport.', answer: 'dog' },
      { text: 'And the ___ ran away with the spoon.', answer: 'dish' },
      { text: 'And the dish ran away with the ___.', answer: 'spoon' },
    ],
  },
  // ── 2026-10-20 추가 (모두 1929년 전에 나온 노래만: 가사를 앱에 넣을 수 있음) ──
  {
    id: 'twinkle', title: 'Twinkle, Twinkle, Little Star', known: true,
    words: [W('star', '⭐', '별'), W('diamond', '💎', '다이아몬드'), W('world', '🌍', '세상'), { ...W('sky', '🌌', '하늘'), lyricOnly: true }],
    lyrics: [
      { text: 'Twinkle, twinkle, little ___.', answer: 'star' },
      { text: 'Up above the ___ so high.', answer: 'world' },
      { text: 'Like a ___ in the sky.', answer: 'diamond' },
      { text: 'Like a diamond in the ___.', answer: 'sky' },
    ],
  },
  {
    id: 'itsy', title: 'Itsy Bitsy Spider', known: false,
    words: [W('spider', '🕷️', '거미'), W('rain', '🌧️', '비'), W('sun', '☀️', '해')],
    lyrics: [
      { text: 'The itsy bitsy ___ climbed up the water spout.', answer: 'spider' },
      { text: 'Down came the ___ and washed the spider out.', answer: 'rain' },
      { text: 'Out came the ___ and dried up all the rain.', answer: 'sun' },
    ],
  },
  {
    id: 'baa', title: 'Baa, Baa, Black Sheep', known: false,
    words: [W('sheep', '🐑', '양'), W('wool', '🧶', '털실'), W('boy', '👦', '남자아이')],
    lyrics: [
      { text: 'Baa, baa, black ___, have you any wool?', answer: 'sheep' },
      { text: 'Baa, baa, black sheep, have you any ___?', answer: 'wool' },
      { text: 'And one for the little ___ who lives down the lane.', answer: 'boy' },
    ],
  },
  {
    id: 'mary', title: 'Mary Had a Little Lamb', known: false,
    words: [W('lamb', '🐑', '아기 양'), W('snow', '❄️', '눈'), W('school', '🏫', '학교')],
    lyrics: [
      { text: 'Mary had a little ___.', answer: 'lamb' },
      { text: 'Its fleece was white as ___.', answer: 'snow' },
      { text: 'It followed her to ___ one day.', answer: 'school' },
    ],
  },
  {
    id: 'row', title: 'Row, Row, Row Your Boat', known: false,
    words: [W('boat', '🚣', '배'), { ...W('stream', '🏞️', '시냇물'), lyricOnly: true }, { ...W('dream', '💭', '꿈'), lyricOnly: true }],
    lyrics: [
      { text: 'Row, row, row your ___.', answer: 'boat' },
      { text: 'Gently down the ___.', answer: 'stream' },
      { text: 'Life is but a ___.', answer: 'dream' },
    ],
  },
  {
    id: 'humpty', title: 'Humpty Dumpty', known: false,
    words: [W('egg', '🥚', '달걀'), W('wall', '🧱', '담'), W('king', '🤴', '왕')],
    lyrics: [
      { text: 'Humpty Dumpty sat on a ___.', answer: 'wall' },
      { text: "All the ___'s horses and all the king's men.", answer: 'king' },
    ],
  },
  {
    id: 'oldman', title: 'This Old Man', known: false,
    words: [W('thumb', '👍', '엄지'), W('shoe', '👟', '신발'), W('knee', '🦵', '무릎'), W('door', '🚪', '문'), W('bone', '🦴', '뼈다귀')],
    lyrics: [
      { text: 'This old man, he played one, he played knick-knack on my ___.', answer: 'thumb' },
      { text: 'This old man, he played two, he played knick-knack on my ___.', answer: 'shoe' },
      { text: 'This old man, he played three, he played knick-knack on my ___.', answer: 'knee' },
      { text: 'This old man, he played four, he played knick-knack on my ___.', answer: 'door' },
      { text: 'Give a dog a ___.', answer: 'bone' },
    ],
  },
  {
    id: 'bingo', title: 'BINGO', known: false,
    words: [W('farmer', '👨‍🌾', '농부'), W('dog', '🐶', '강아지')],
    lyrics: [
      { text: 'There was a ___ had a dog.', answer: 'farmer' },
      { text: 'There was a farmer had a ___, and Bingo was his name-o.', answer: 'dog' },
    ],
  },
  {
    id: 'jackjill', title: 'Jack and Jill', known: false,
    words: [W('hill', '⛰️', '언덕'), W('water', '💧', '물'), W('crown', '👑', '왕관')],
    lyrics: [
      { text: 'Jack and Jill went up the ___.', answer: 'hill' },
      { text: 'To fetch a pail of ___.', answer: 'water' },
      { text: 'Jack fell down and broke his ___.', answer: 'crown' },
    ],
  },
];

/**
 * 주제 단어 단원 (2026-11-07 추가) — 노래 없이 생활 단어. 설계 목표 "초3 전 생활 단어 100~150개"를 채움.
 * 그림(이모지)은 오래된 태블릿에서도 나오는 것만 (2018년 이전 이모지). 그림 하나로 뜻이 분명한 단어만.
 */
const T = (id: string, title: string, ko: string, words: SongWord[]): SongUnit => ({ id, title, ko, known: false, topic: true, words, lyrics: [] });
export const TOPICS: SongUnit[] = [
  T('t-body', 'My Body', '몸', [W('eye', '👁️', '눈'), W('ear', '👂', '귀'), W('nose', '👃', '코'), W('mouth', '👄', '입'), W('tooth', '🦷', '이'), W('tongue', '👅', '혀'),
    W('hand', '✋', '손'), W('arm', '💪', '팔'), W('leg', '🦵', '다리'), W('foot', '🦶', '발'), W('face', '🙂', '얼굴')]),
  T('t-food', 'Food', '음식', [W('apple', '🍎', '사과'), W('banana', '🍌', '바나나'), W('grapes', '🍇', '포도'), W('strawberry', '🍓', '딸기'), W('watermelon', '🍉', '수박'),
    W('bread', '🍞', '빵'), W('milk', '🥛', '우유'), W('egg', '🥚', '달걀'), W('cheese', '🧀', '치즈'), W('pizza', '🍕', '피자'), W('cake', '🎂', '케이크'),
    W('cookie', '🍪', '쿠키'), W('rice', '🍚', '밥'), W('carrot', '🥕', '당근'), W('ice cream', '🍦', '아이스크림')]),
  T('t-ride', 'Things That Go', '탈것', [W('car', '🚗', '자동차'), W('bus', '🚌', '버스'), W('train', '🚆', '기차'), W('bike', '🚲', '자전거'), W('airplane', '✈️', '비행기'),
    W('ship', '🚢', '큰 배'), W('truck', '🚚', '트럭'), W('taxi', '🚕', '택시'), W('helicopter', '🚁', '헬리콥터'), W('rocket', '🚀', '로켓'),
    W('ambulance', '🚑', '구급차'), W('fire truck', '🚒', '소방차'), W('police car', '🚓', '경찰차'), W('subway', '🚇', '지하철')]),
  T('t-color', 'Colors', '색깔', [W('red', '❤️', '빨강'), W('orange', '🧡', '주황'), W('yellow', '💛', '노랑'), W('green', '💚', '초록'), W('blue', '💙', '파랑'),
    W('purple', '💜', '보라'), W('black', '🖤', '검정'), W('pink', '💗', '분홍')]),
  T('t-family', 'My Family', '가족', [W('mom', '👩', '엄마'), W('dad', '👨', '아빠'), W('baby', '👶', '아기'), W('grandma', '👵', '할머니'), W('grandpa', '👴', '할아버지'),
    W('sister', '👧', '언니·누나·여동생'), W('brother', '🧒', '형·오빠·남동생'), W('family', '👪', '가족')]),
  T('t-clothes', 'Clothes', '옷', [W('shirt', '👕', '티셔츠'), W('pants', '👖', '바지'), W('dress', '👗', '원피스'), W('hat', '🎩', '모자'), W('cap', '🧢', '야구 모자'),
    W('socks', '🧦', '양말'), W('shoes', '👟', '운동화'), W('coat', '🧥', '외투'), W('gloves', '🧤', '장갑'), W('scarf', '🧣', '목도리'), W('glasses', '👓', '안경'), W('boots', '👢', '부츠')]),
  T('t-school', 'At School', '학교 물건', [W('book', '📕', '책'), W('pencil', '✏️', '연필'), W('crayon', '🖍️', '크레용'), W('scissors', '✂️', '가위'), W('backpack', '🎒', '책가방'),
    W('ruler', '📏', '자'), W('paper', '📄', '종이'), W('notebook', '📓', '공책'), W('computer', '💻', '컴퓨터'), W('teacher', '👩‍🏫', '선생님'), W('paint', '🎨', '물감')]),
  T('t-home', 'At Home', '집 안 물건', [W('bed', '🛏️', '침대'), W('sofa', '🛋️', '소파'), W('bathtub', '🛁', '욕조'), W('toilet', '🚽', '변기'), W('TV', '📺', '텔레비전'),
    W('phone', '📱', '휴대폰'), W('light', '💡', '전등'), W('cup', '☕', '컵'), W('fork', '🍴', '포크'), W('key', '🔑', '열쇠'), W('clock', '⏰', '시계'), W('door', '🚪', '문')]),
];
export const SONG_BY_ID = Object.fromEntries([...SONGS, ...TOPICS].map(s => [s.id, s])) as Record<string, SongUnit>;
/** 노래와 주제를 번갈아 (오늘의 한 판에서 새 단어를 고르는 순서) */
export const UNIT_ORDER: SongUnit[] = (() => {
  const out: SongUnit[] = [];
  for (let i = 0; i < Math.max(SONGS.length, TOPICS.length); i++) { if (SONGS[i]) out.push(SONGS[i]); if (TOPICS[i]) out.push(TOPICS[i]); }
  return out;
})();

/** 단어 사전 (여러 단원에 같은 단어가 있으면 하나로) */
export const WORDS: Record<string, SongWord> = {};
for (const s of [...SONGS, ...TOPICS]) for (const w of s.words) WORDS[w.id] = { ...WORDS[w.id], ...w, sound: WORDS[w.id]?.sound || w.sound };

/**
 * 가사 빈칸을 소리로 읽을 때: 빈칸 자리는 "hmm"으로 읽음.
 * "had a ..."처럼 a로 끝나면 기기 음성이 a를 글자 이름("에이")으로 읽어서, 뒤에 말을 하나 붙여 관사로 읽히게 함.
 */
export const lyricSpoken = (text: string) => text.replace(/___/, 'hmm');
export const lyricFilled = (l: LyricLine) => l.text.replace('___', WORDS[l.answer].word);
