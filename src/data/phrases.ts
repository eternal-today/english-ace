/**
 * 오늘의 한 마디 — 표현 목록 (설계 문서 5-2)
 *
 * 원칙
 * - 엉뚱한 대답도 실제로 쓰는 표현만 씀. "I'm a banana!"처럼 안 쓰는 문장은 넣지 않음.
 * - 쉬움: 상황이 완전히 다른 표현 / 보통: 비슷한 상황인데 때가 틀린 표현.
 * - 엉뚱한 대답은 상황마다 직접 골라 둠 (자동으로 고르면 맞는 대답이 섞일 수 있어서).
 * - 새 표현은 TTS로 들어 보고 넣음 (Yay!는 어색해서 뺌).
 *
 * {name} {age}는 부모 설정의 아이 이름·나이로 바뀜. 값이 없으면 그 상황은 나오지 않음.
 */

export type PhraseGroup = '인사' | '고마워·미안해' | '기분' | '부탁' | '감탄·칭찬' | '나 소개' | '날씨' | '이게 뭐야' | '우리 집 표현';

export interface PhraseItem {
  id: string;
  level: number;              // 단계 (앞 단계를 익히면 자동으로 열림)
  group: PhraseGroup;
  say?: string;               // 상대가 하는 말 (소리로 들려줌)
  scene?: { emoji: string; ko: string };   // 상황 그림과 한국어 설명
  answers: string[];          // 어울리는 대답 (모두 맞는 대답)
  oddEasy: string[];          // 쉬움: 상황이 완전히 다른 표현
  oddNormal: string[];        // 보통: 때가 틀린 표현
  custom?: boolean;           // 부모님이 넣은 표현
}

export const PHRASES: PhraseItem[] = [
  // ── 1단계: 인사 ──
  { id: 'hi-howareyou', level: 1, group: '인사', say: 'How are you?',
    answers: ["I'm fine, thank you.", "I'm good.", "I'm great!", 'Not bad.', "I'm tired."],
    oddEasy: ['Happy birthday!', 'Be careful!', 'Yummy!'], oddNormal: ['Goodbye!', 'Good night!', 'Nice to meet you.'] },
  { id: 'hi-hello', level: 1, group: '인사', say: 'Hello!',
    answers: ['Hello!', 'Hi!', 'Hi there!'],
    oddEasy: ["I'm sorry.", 'Oops!', 'Yummy!'], oddNormal: ['Good night!', 'Goodbye!', 'See you later!'] },
  { id: 'hi-morning', level: 1, group: '인사', scene: { emoji: '🌅', ko: '아침에 만나면' },
    answers: ['Good morning!', 'Morning!', 'Hello!'],
    oddEasy: ['Be careful!', 'Happy birthday!', "I'm hungry!"], oddNormal: ['Good night!', 'Goodbye!', 'Sweet dreams!'] },
  { id: 'hi-bye', level: 1, group: '인사', say: 'Goodbye!',
    answers: ['Bye!', 'See you!', 'See you later!', 'Bye-bye!'],
    oddEasy: ["You're welcome.", 'Yummy!', 'Wow!'], oddNormal: ['Hello!', 'Nice to meet you.', 'Good morning!'] },
  { id: 'hi-night', level: 1, group: '인사', scene: { emoji: '🌙', ko: '잘 때' },
    answers: ['Good night!', 'Sweet dreams!', 'See you tomorrow!'],
    oddEasy: ["Let's go!", 'Hooray!', 'Yummy!'], oddNormal: ['Good morning!', 'Hello!', 'Nice to meet you.'] },
  { id: 'hi-nice', level: 1, group: '인사', say: 'Nice to meet you.',
    answers: ['Nice to meet you, too.', 'Hi! Nice to meet you!', 'Hello!'],
    oddEasy: ['Oops!', "I'm sleepy.", 'Be careful!'], oddNormal: ['See you later!', 'Good night!', 'Goodbye!'] },
  // ── 1단계: 고마워·미안해 ──
  { id: 'th-thanks', level: 1, group: '고마워·미안해', say: 'Thank you!',
    answers: ["You're welcome.", 'No problem.', 'Sure!', 'My pleasure.'],
    oddEasy: ['Good night!', "I'm hungry!", 'Oh no!'], oddNormal: ["I'm sorry.", 'Excuse me.', 'Good job!'] },
  { id: 'th-sorry', level: 1, group: '고마워·미안해', say: "I'm sorry.",
    answers: ["It's okay.", "That's okay.", 'No problem.', "Don't worry."],
    oddEasy: ['Happy birthday!', 'Hooray!', 'Yummy!'], oddNormal: ["You're welcome.", 'Thank you!', 'Excuse me.'] },
  // ── 1단계: 기분 ──
  { id: 'fe-okay', level: 1, group: '기분', say: 'Are you okay?',
    answers: ["I'm okay.", "I'm fine.", "Yes, I'm okay."],
    oddEasy: ['Good morning!', 'Happy birthday!', "Let's go!"], oddNormal: ["You're welcome.", 'Nice to meet you.', 'Good night!'] },
  { id: 'fe-hungry', level: 1, group: '기분', scene: { emoji: '😋', ko: '배고플 때' },
    answers: ["I'm hungry!", "Let's eat!", 'I want some food.'],
    oddEasy: ['Excuse me.', 'See you!', 'Hooray!'], oddNormal: ["I'm sleepy.", "I'm full.", 'Good night!'] },
  { id: 'fe-sleepy', level: 1, group: '기분', scene: { emoji: '😴', ko: '졸릴 때' },
    answers: ["I'm sleepy.", "I'm tired.", 'Good night!'],
    oddEasy: ['Hooray!', 'Happy birthday!', 'Yummy!'], oddNormal: ["I'm hungry!", 'Good morning!', "Let's go!"] },
  // ── 1단계: 부탁 ──
  { id: 'as-water', level: 1, group: '부탁', say: 'Can I have some water?',
    answers: ['Sure!', 'Here you are.', 'Of course!'],
    oddEasy: ['Good night!', 'Oops!', 'Happy birthday!'], oddNormal: ['Good job!', "You're welcome.", 'Nice to meet you.'] },
  { id: 'as-play', level: 1, group: '부탁', say: "Let's play!",
    answers: ['Okay!', 'Sure!', "Let's go!"],
    oddEasy: ['Good night!', "I'm sorry.", 'Yummy!'], oddNormal: ['Excuse me.', 'See you later!', 'Good morning!'] },
  { id: 'as-excuse', level: 1, group: '부탁', scene: { emoji: '🚶', ko: '사람들 사이로 지나가야 할 때' },
    answers: ['Excuse me.', 'Excuse me, please.'],
    oddEasy: ['Good job!', 'Yummy!', 'Hooray!'], oddNormal: ['Thank you!', 'Good morning!', 'See you!'] },
  // ── 1단계: 감탄·칭찬 ──
  { id: 'wo-gift', level: 1, group: '감탄·칭찬', scene: { emoji: '🎁', ko: '선물을 받았을 때' },
    answers: ['Wow!', 'Thank you!', 'Hooray!', 'I love it!'],
    oddEasy: ['Excuse me.', "I'm sleepy.", 'Be careful!'], oddNormal: ['Oh no!', 'Oops!', "I'm sorry."] },
  { id: 'wo-spill', level: 1, group: '감탄·칭찬', scene: { emoji: '🥛', ko: '우유를 쏟았을 때' },
    answers: ['Oops!', 'Oh no!', "I'm sorry."],
    oddEasy: ['Happy birthday!', 'Good morning!', "Let's eat!"], oddNormal: ['Hooray!', 'Wow!', 'Good job!'] },
  { id: 'wo-goodjob', level: 1, group: '감탄·칭찬', scene: { emoji: '👍', ko: '친구가 잘했을 때' },
    answers: ['Good job!', 'Great!', 'Well done!'],
    oddEasy: ['Good night!', "I'm hungry!", 'Excuse me.'], oddNormal: ['Oops!', 'Oh no!', "I'm sorry."] },
  { id: 'wo-birthday', level: 1, group: '감탄·칭찬', scene: { emoji: '🎂', ko: '친구 생일에' },
    answers: ['Happy birthday!', 'Happy birthday to you!'],
    oddEasy: ["I'm tired.", 'Excuse me.', 'Good night!'], oddNormal: ['Good job!', 'Nice to meet you.', 'Oops!'] },
  { id: 'wo-careful', level: 1, group: '감탄·칭찬', scene: { emoji: '⚠️', ko: '친구가 위험할 때' },
    answers: ['Be careful!', 'Watch out!'],
    oddEasy: ['Yummy!', 'Happy birthday!', 'Nice to meet you.'], oddNormal: ['Good job!', 'Hooray!', 'Wow!'] },

  // ── 2단계: 나 소개 ──
  { id: 'me-name', level: 2, group: '나 소개', say: "What's your name?",
    answers: ['My name is {name}.', "I'm {name}."],
    oddEasy: ["It's sunny.", 'Good night!', 'Yummy!'], oddNormal: ["I'm fine, thank you.", 'Nice to meet you.', "It's a cat."] },
  { id: 'me-age', level: 2, group: '나 소개', say: 'How old are you?',
    answers: ["I'm {age}.", "I'm {age} years old."],
    oddEasy: ["It's rainy.", 'Good job!', 'Oops!'], oddNormal: ["I'm fine, thank you.", "It's a dog.", "I'm hungry!"] },
  // ── 2단계: 날씨 ──
  { id: 'we-sunny', level: 2, group: '날씨', say: "How's the weather today?", scene: { emoji: '☀️', ko: '오늘 날씨는?' },
    answers: ["It's sunny.", "It's sunny today.", "It's a sunny day."],
    oddEasy: ["It's a cat.", 'Good job!', 'Thank you!'], oddNormal: ["It's rainy.", "It's snowy.", "It's cloudy."] },
  { id: 'we-rainy', level: 2, group: '날씨', say: "How's the weather today?", scene: { emoji: '🌧️', ko: '오늘 날씨는?' },
    answers: ["It's rainy.", "It's raining.", "It's a rainy day."],
    oddEasy: ["It's a dog.", 'Hello!', 'Good night!'], oddNormal: ["It's sunny.", "It's snowy.", "It's windy."] },
  { id: 'we-cloudy', level: 2, group: '날씨', say: "How's the weather today?", scene: { emoji: '☁️', ko: '오늘 날씨는?' },
    answers: ["It's cloudy.", "It's cloudy today.", "It's a cloudy day."],
    oddEasy: ["It's a duck.", 'Thank you!', 'Oops!'], oddNormal: ["It's sunny.", "It's snowy.", "It's windy."] },
  { id: 'we-snowy', level: 2, group: '날씨', say: "How's the weather today?", scene: { emoji: '❄️', ko: '오늘 날씨는?' },
    answers: ["It's snowy.", "It's snowing.", "It's a snowy day."],
    oddEasy: ["It's a cow.", 'Hello!', "I'm sorry."], oddNormal: ["It's sunny.", "It's rainy.", "It's windy."] },
  { id: 'we-windy', level: 2, group: '날씨', say: "How's the weather today?", scene: { emoji: '💨', ko: '오늘 날씨는?' },
    answers: ["It's windy.", "It's windy today.", "It's a windy day."],
    oddEasy: ["It's a cat.", 'Good job!', 'Yummy!'], oddNormal: ["It's sunny.", "It's rainy.", "It's snowy."] },
  // ── 2단계: 이게 뭐야 ──
  { id: 'wh-cat', level: 2, group: '이게 뭐야', say: "What's this?", scene: { emoji: '🐱', ko: '이게 뭐야?' },
    answers: ["It's a cat.", 'A cat.', "That's a cat."],
    oddEasy: ["It's sunny.", 'Good night!', 'Thank you!'], oddNormal: ["It's a dog.", "It's a pig.", "It's a duck."] },
  { id: 'wh-dog', level: 2, group: '이게 뭐야', say: "What's this?", scene: { emoji: '🐶', ko: '이게 뭐야?' },
    answers: ["It's a dog.", 'A dog.', "That's a dog."],
    oddEasy: ["It's rainy.", 'Hello!', 'Oops!'], oddNormal: ["It's a cat.", "It's a cow.", "It's a duck."] },
  { id: 'wh-cow', level: 2, group: '이게 뭐야', say: "What's this?", scene: { emoji: '🐄', ko: '이게 뭐야?' },
    answers: ["It's a cow.", 'A cow.', "That's a cow."],
    oddEasy: ["It's windy.", "You're welcome.", 'Yummy!'], oddNormal: ["It's a pig.", "It's a dog.", "It's a cat."] },
  { id: 'wh-duck', level: 2, group: '이게 뭐야', say: "What's this?", scene: { emoji: '🦆', ko: '이게 뭐야?' },
    answers: ["It's a duck.", 'A duck.', "That's a duck."],
    oddEasy: ["It's snowy.", 'Good morning!', 'Be careful!'], oddNormal: ["It's a cat.", "It's a cow.", "It's a pig."] },
];

export const MAX_LEVEL = Math.max(...PHRASES.map(p => p.level));

/** 한국어 뜻 (보기 아래에 보여 주고, 엉뚱한 대답을 고른 뒤 "언제 쓰는 말인지" 알려 줄 때 씀) */
export const KO: Record<string, string> = {
  'How are you?': '잘 지내?', "I'm fine, thank you.": '잘 지내요, 고마워요', "I'm good.": '좋아요', "I'm great!": '아주 좋아요!',
  'Not bad.': '나쁘지 않아요', "I'm tired.": '피곤해요', 'Hello!': '안녕!', 'Hi!': '안녕!', 'Hi there!': '안녕!',
  'Good morning!': '좋은 아침! (아침 인사)', 'Morning!': '좋은 아침!', 'Goodbye!': '잘 가!', 'Bye!': '잘 가!', 'See you!': '또 봐!',
  'See you later!': '이따 봐!', 'Bye-bye!': '안녕, 잘 가!', 'Good night!': '잘 자! (밤 인사)', 'Sweet dreams!': '좋은 꿈 꿔!',
  'See you tomorrow!': '내일 봐!', 'Nice to meet you.': '만나서 반가워요', 'Nice to meet you, too.': '나도 만나서 반가워요',
  'Hi! Nice to meet you!': '안녕! 만나서 반가워!', 'Thank you!': '고마워요!', "You're welcome.": '천만에요', 'No problem.': '괜찮아요, 별거 아니에요',
  'Sure!': '그럼! 물론!', 'My pleasure.': '도와줘서 나도 좋아요', "I'm sorry.": '미안해요', "It's okay.": '괜찮아요', "That's okay.": '괜찮아요',
  "Don't worry.": '걱정 마요', 'Are you okay?': '괜찮아?', "I'm okay.": '괜찮아요', "I'm fine.": '괜찮아요', "Yes, I'm okay.": '응, 괜찮아',
  "I'm hungry!": '배고파요!', "Let's eat!": '밥 먹자!', 'I want some food.': '뭐 좀 먹고 싶어요', "I'm full.": '배불러요', 'Yummy!': '맛있다!',
  "I'm sleepy.": '졸려요', 'Can I have some water?': '물 좀 마셔도 돼요?', 'Here you are.': '여기 있어요', 'Of course!': '물론이지!',
  "Let's play!": '같이 놀자!', 'Okay!': '좋아!', "Let's go!": '가자!', 'Excuse me.': '실례합니다 (지나갈게요)', 'Excuse me, please.': '실례할게요',
  'Wow!': '우와!', 'Hooray!': '만세!', 'I love it!': '정말 좋아!', 'Oops!': '앗, 실수!', 'Oh no!': '오, 이런!', 'Good job!': '잘했어!',
  'Great!': '멋져!', 'Well done!': '잘했어!', 'Happy birthday!': '생일 축하해!', 'Happy birthday to you!': '생일 축하합니다!',
  'Be careful!': '조심해!', 'Watch out!': '조심해! (위험해)',
  "What's your name?": '이름이 뭐야?', 'My name is {name}.': '내 이름은 {name}', "I'm {name}.": '나는 {name}',
  'How old are you?': '몇 살이야?', "I'm {age}.": '{age}살이야', "I'm {age} years old.": '{age}살이야',
  "How's the weather today?": '오늘 날씨 어때?',
  "It's sunny.": '맑아요', "It's sunny today.": '오늘은 맑아요', "It's a sunny day.": '맑은 날이에요',
  "It's rainy.": '비가 와요', "It's raining.": '비가 오고 있어요', "It's a rainy day.": '비 오는 날이에요',
  "It's cloudy.": '흐려요', "It's cloudy today.": '오늘은 흐려요', "It's a cloudy day.": '흐린 날이에요',
  "It's snowy.": '눈이 와요', "It's snowing.": '눈이 오고 있어요', "It's a snowy day.": '눈 오는 날이에요',
  "It's windy.": '바람이 불어요', "It's windy today.": '오늘은 바람이 불어요', "It's a windy day.": '바람 부는 날이에요',
  "What's this?": '이게 뭐야?',
  "It's a cat.": '고양이야', 'A cat.': '고양이', "That's a cat.": '그건 고양이야',
  "It's a dog.": '강아지야', 'A dog.': '강아지', "That's a dog.": '그건 강아지야',
  "It's a cow.": '소야', 'A cow.': '소', "That's a cow.": '그건 소야',
  "It's a duck.": '오리야', 'A duck.': '오리', "That's a duck.": '그건 오리야',
  "It's a pig.": '돼지야',
};

/** 나이를 영어로 (1~12) */
const AGE_WORDS = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];

export interface Fill { name: string; age: number }

/** {name} {age}를 채움. 채울 값이 없으면 null */
export function fill(text: string, f: Fill): string | null {
  if (text.includes('{name}') && !f.name.trim()) return null;
  if (text.includes('{age}') && !(f.age >= 1 && f.age <= 12)) return null;
  return text.replace(/\{name\}/g, f.name.trim()).replace(/\{age\}/g, AGE_WORDS[f.age] || String(f.age));
}
export function koOf(text: string, f: Fill): string {
  const raw = KO[text];
  if (!raw) return '';
  return raw.replace(/\{name\}/g, f.name.trim()).replace(/\{age\}/g, String(f.age));
}

/** 채운 문장(My name is Jimin.)의 한국어 뜻 */
export function koFilled(text: string, f: Fill): string {
  if (KO[text]) return koOf(text, f);
  for (const key of Object.keys(KO)) {
    if (key.includes('{') && fill(key, f) === text) return koOf(key, f);
  }
  return '';
}
