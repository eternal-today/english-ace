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

export type PhraseGroup = '인사' | '고마워·미안해' | '기분' | '부탁' | '감탄·칭찬' | '나 소개' | '날씨' | '이게 뭐야'
  | '놀이·차례' | '유치원에서' | '허락·도움' | '주고받기' | '색깔' | '먹을 때' | '몸과 마음' | '우리 집 표현';

export interface PhraseItem {
  id: string;
  level: number;              // 단계 (앞 단계를 익히면 자동으로 열림)
  group: PhraseGroup;
  say?: string;               // 상대가 하는 말 (소리로 들려줌)
  scene?: { emoji: string; ko: string; icon?: string; name?: string };   // name: "언제 하는 말일까" 보기에 쓸 이름 (없으면 ko)   // 상황 그림(icon: 아이콘 이름, 없으면 emoji)과 한국어 설명
  answers: string[];          // 어울리는 대답 (모두 맞는 대답)
  oddEasy: string[];          // 쉬움: 상황이 완전히 다른 표현
  oddNormal: string[];        // 보통: 때가 틀린 표현
  custom?: boolean;           // 부모님이 넣은 표현
}

export const PHRASES: PhraseItem[] = [
  // ── 1단계: 인사 ──
  { id: 'hi-howareyou', level: 1, group: '인사', say: 'How are you?',
    answers: ["I'm fine, thank you.", "I'm good.", "I'm great!", 'Not bad.', "I'm tired.", "I'm fine.", "I'm okay."],
    oddEasy: ['Happy birthday!', 'Be careful!', 'Yummy!'], oddNormal: ['Goodbye!', 'Good night!', 'Nice to meet you.'] },
  { id: 'hi-hello', level: 1, group: '인사', say: 'Hello!',
    answers: ['Hello!', 'Hi!', 'Hi there!'],
    oddEasy: ["I'm sorry.", 'Oops!', 'Yummy!'], oddNormal: ['Good night!', 'Goodbye!', 'See you later!'] },
  { id: 'hi-morning', level: 1, group: '인사', scene: { emoji: '🌅', ko: '아침에 만나면', icon: 'Sunrise' },
    answers: ['Good morning!', 'Morning!', 'Hello!'],
    oddEasy: ['Be careful!', 'Happy birthday!', "I'm hungry!"], oddNormal: ['Good night!', 'Goodbye!', 'Sweet dreams!'] },
  { id: 'hi-bye', level: 1, group: '인사', say: 'Goodbye!',
    answers: ['Bye!', 'See you!', 'See you later!', 'Bye-bye!'],
    oddEasy: ["You're welcome.", 'Yummy!', 'Wow!'], oddNormal: ['Hello!', 'Nice to meet you.', 'Good morning!'] },
  { id: 'hi-night', level: 1, group: '인사', scene: { emoji: '🌙', ko: '잘 때', icon: 'Moon' },
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
  { id: 'fe-hungry', level: 1, group: '기분', scene: { emoji: '😋', ko: '배고플 때', icon: 'Utensils' },
    answers: ["I'm hungry!", "Let's eat!", 'I want some food.'],
    oddEasy: ['Excuse me.', 'See you!', 'Hooray!'], oddNormal: ["I'm sleepy.", "I'm full.", 'Good night!'] },
  { id: 'fe-sleepy', level: 1, group: '기분', scene: { emoji: '😴', ko: '졸릴 때', icon: 'Bed' },
    answers: ["I'm sleepy.", "I'm tired.", 'Good night!'],
    oddEasy: ['Hooray!', 'Happy birthday!', 'Yummy!'], oddNormal: ["I'm hungry!", 'Good morning!', "Let's go!"] },
  // ── 1단계: 부탁 ──
  { id: 'as-water', level: 1, group: '부탁', say: 'Can I have some water?',
    answers: ['Sure!', 'Here you are.', 'Of course!'],
    oddEasy: ['Good night!', 'Oops!', 'Happy birthday!'], oddNormal: ['Good job!', "You're welcome.", 'Nice to meet you.'] },
  { id: 'as-play', level: 1, group: '부탁', say: "Let's play!",
    answers: ['Okay!', 'Sure!', "Let's go!"],
    oddEasy: ['Good night!', "I'm sorry.", 'Yummy!'], oddNormal: ['Excuse me.', 'See you later!', 'Good morning!'] },
  { id: 'as-excuse', level: 1, group: '부탁', scene: { emoji: '🚶', ko: '사람들 사이로 지나가야 할 때', icon: 'Users' },
    answers: ['Excuse me.', 'Excuse me, please.'],
    oddEasy: ['Good job!', 'Yummy!', 'Hooray!'], oddNormal: ['Thank you!', 'Good morning!', 'See you!'] },
  // ── 1단계: 감탄·칭찬 ──
  { id: 'wo-gift', level: 1, group: '감탄·칭찬', scene: { emoji: '🎁', ko: '선물을 받았을 때', icon: 'Gift' },
    answers: ['Wow!', 'Thank you!', 'Hooray!', 'I love it!'],
    oddEasy: ['Excuse me.', "I'm sleepy.", 'Be careful!'], oddNormal: ['Oh no!', 'Oops!', "I'm sorry."] },
  { id: 'wo-spill', level: 1, group: '감탄·칭찬', scene: { emoji: '🥛', ko: '우유를 쏟았을 때', icon: 'Milk' },
    answers: ['Oops!', 'Oh no!', "I'm sorry."],
    oddEasy: ['Happy birthday!', 'Good morning!', "Let's eat!"], oddNormal: ['Hooray!', 'Wow!', 'Good job!'] },
  { id: 'wo-goodjob', level: 1, group: '감탄·칭찬', scene: { emoji: '👍', ko: '친구가 잘했을 때', icon: 'ThumbsUp' },
    answers: ['Good job!', 'Great!', 'Well done!'],
    oddEasy: ['Good night!', "I'm hungry!", 'Excuse me.'], oddNormal: ['Oops!', 'Oh no!', "I'm sorry."] },
  { id: 'wo-birthday', level: 1, group: '감탄·칭찬', scene: { emoji: '🎂', ko: '친구 생일에', icon: 'Cake' },
    answers: ['Happy birthday!', 'Happy birthday to you!'],
    oddEasy: ["I'm tired.", 'Excuse me.', 'Good night!'], oddNormal: ['Good job!', 'Nice to meet you.', 'Oops!'] },
  { id: 'wo-careful', level: 1, group: '감탄·칭찬', scene: { emoji: '⚠️', ko: '친구가 위험할 때', icon: 'TriangleAlert' },
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
  { id: 'we-sunny', level: 2, group: '날씨', say: "How's the weather today?", scene: { emoji: '☀️', ko: '오늘 날씨는?', icon: 'Sun', name: '맑은 날' },
    answers: ["It's sunny.", "It's sunny today.", "It's a sunny day."],
    oddEasy: ["It's a cat.", 'Good job!', 'Thank you!'], oddNormal: ["It's rainy.", "It's snowy.", "It's cloudy."] },
  { id: 'we-rainy', level: 2, group: '날씨', say: "How's the weather today?", scene: { emoji: '🌧️', ko: '오늘 날씨는?', icon: 'CloudRain', name: '비 오는 날' },
    answers: ["It's rainy.", "It's raining.", "It's a rainy day."],
    oddEasy: ["It's a dog.", 'Hello!', 'Good night!'], oddNormal: ["It's sunny.", "It's snowy.", "It's windy."] },
  { id: 'we-cloudy', level: 2, group: '날씨', say: "How's the weather today?", scene: { emoji: '☁️', ko: '오늘 날씨는?', icon: 'Cloud', name: '흐린 날' },
    answers: ["It's cloudy.", "It's cloudy today.", "It's a cloudy day."],
    oddEasy: ["It's a duck.", 'Thank you!', 'Oops!'], oddNormal: ["It's sunny.", "It's snowy.", "It's windy."] },
  { id: 'we-snowy', level: 2, group: '날씨', say: "How's the weather today?", scene: { emoji: '❄️', ko: '오늘 날씨는?', icon: 'Snowflake', name: '눈 오는 날' },
    answers: ["It's snowy.", "It's snowing.", "It's a snowy day."],
    oddEasy: ["It's a cow.", 'Hello!', "I'm sorry."], oddNormal: ["It's sunny.", "It's rainy.", "It's windy."] },
  { id: 'we-windy', level: 2, group: '날씨', say: "How's the weather today?", scene: { emoji: '💨', ko: '오늘 날씨는?', icon: 'Wind', name: '바람 부는 날' },
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
  // ── 3단계: 놀이·차례 (2026-10-20 추가. 상황 그림은 넣지 않음: icon '-') ──
  { id: 'pl-myturn', level: 3, group: '놀이·차례', scene: { emoji: '🎲', ko: '내 차례일 때', icon: '-' },
    answers: ['My turn!', "It's my turn.", 'Me next!'],
    oddEasy: ['Good night!', 'Yummy!', "It's snowy."], oddNormal: ['Your turn!', 'Good game!', 'I won!'] },
  { id: 'pl-yourturn', level: 3, group: '놀이·차례', scene: { emoji: '🎲', ko: '친구 차례일 때', icon: '-' },
    answers: ['Your turn!', "It's your turn.", 'You go first.'],
    oddEasy: ['Good morning!', "I'm hungry!", 'Thank you!'], oddNormal: ['My turn!', 'Me next!', 'I won!'] },
  { id: 'pl-join', level: 3, group: '놀이·차례', say: 'Can I play with you?',
    answers: ['Sure!', 'Of course!', "Okay! Let's play!"],
    oddEasy: ['Good night!', "It's rainy.", 'Happy birthday!'], oddNormal: ["You're welcome.", 'Nice to meet you, too.', 'See you later!'] },
  { id: 'pl-ready', level: 3, group: '놀이·차례', say: 'Are you ready?',
    answers: ["Yes, I'm ready!", 'Ready!', 'Not yet.'],
    oddEasy: ["It's a dog.", 'Happy birthday!', 'Good night!'], oddNormal: ['Good job!', 'Here you are.', 'See you!'] },
  { id: 'pl-win', level: 3, group: '놀이·차례', scene: { emoji: '🏆', ko: '놀이에서 이겼을 때', icon: '-' },
    answers: ['I won!', 'Hooray!', 'I did it!'],
    oddEasy: ['Excuse me.', 'Good morning!', "It's cloudy."], oddNormal: ['Oh no!', 'Good game!', 'Oops!'] },
  { id: 'pl-lose', level: 3, group: '놀이·차례', scene: { emoji: '🎮', ko: '놀이에서 졌을 때', icon: '-' },
    answers: ['Oh no!', 'Good game!', "Let's play again!"],
    oddEasy: ['Good morning!', 'Yummy!', "It's sunny."], oddNormal: ['I won!', 'Hooray!', 'I did it!'] },
  { id: 'pl-hide', level: 3, group: '놀이·차례', scene: { emoji: '🙈', ko: '숨바꼭질할 때', icon: '-' },
    answers: ['Ready or not, here I come!', 'Where are you?', 'I found you!'],
    oddEasy: ["Let's eat!", 'Good morning!', 'Thank you!'], oddNormal: ['Good night!', "I'm full.", 'Here you are.'] },
  // ── 3단계: 유치원에서 ──
  { id: 'sc-morning', level: 3, group: '유치원에서', say: 'Good morning, everyone!',
    answers: ['Good morning!', 'Good morning, teacher!', 'Morning!'],
    oddEasy: ["I'm full.", 'Oops!', "It's a cow."], oddNormal: ['Good night!', 'Goodbye!', 'See you tomorrow!'] },
  { id: 'sc-sit', level: 3, group: '유치원에서', say: 'Please sit down.',
    answers: ['Okay!', 'Yes, teacher.', 'Sure!'],
    oddEasy: ['Happy birthday!', "It's windy.", 'Yummy!'], oddNormal: ["You're welcome.", 'Nice to meet you.', 'Good game!'] },
  { id: 'sc-understand', level: 3, group: '유치원에서', say: 'Do you understand?',
    answers: ['Yes, I do.', 'Yes!', "No, I don't."],
    oddEasy: ["It's snowy.", 'Good night!', 'Yummy!'], oddNormal: ["You're welcome.", 'Nice to meet you.', 'See you!'] },
  { id: 'sc-help', level: 3, group: '유치원에서', scene: { emoji: '🙋', ko: '도움이 필요할 때', icon: '-' },
    answers: ['Help me, please.', 'Can you help me?', 'I need help.'],
    oddEasy: ['Hooray!', 'Happy birthday!', 'Good night!'], oddNormal: ["You're welcome.", 'Good job!', 'Here you are.'] },

  // ── 4단계: 허락·도움 ──
  { id: 'pe-bathroom', level: 4, group: '허락·도움', scene: { emoji: '🚻', ko: '화장실에 가고 싶을 때', icon: '-' },
    answers: ['Can I go to the bathroom?', 'I need to go to the bathroom.', 'May I go to the bathroom?'],
    oddEasy: ['Happy birthday!', 'Good job!', "It's sunny."], oddNormal: ['Can I have some water?', "I'm hungry!", "Let's play!"] },
  { id: 'pe-cookie', level: 4, group: '허락·도움', say: 'Can I have a cookie?',
    answers: ['Sure!', 'Here you are.', 'Not now.', 'After dinner.'],
    oddEasy: ['Good morning!', "It's snowy.", 'Watch out!'], oddNormal: ['Thank you!', 'Nice to meet you.', 'I won!'] },
  { id: 'pe-open', level: 4, group: '허락·도움', scene: { emoji: '🫙', ko: '뚜껑이 안 열릴 때', icon: '-' },
    answers: ['Can you open this?', 'Help me, please.', "It's too hard."],
    oddEasy: ['Good night!', 'Happy birthday!', "It's a cat."], oddNormal: ['Here you are.', 'Good job!', 'I did it!'] },
  { id: 'pe-borrow', level: 4, group: '허락·도움', say: 'Can I use your crayon?',
    answers: ['Sure!', 'Here you are.', 'Okay!'],
    oddEasy: ['Good night!', "It's rainy.", 'Oops!'], oddNormal: ['Thank you!', "You're welcome.", 'Nice to meet you.'] },
  { id: 'pe-wait', level: 4, group: '허락·도움', say: 'Wait a minute.',
    answers: ['Okay!', 'Sure!', "Okay, I'll wait."],
    oddEasy: ['Happy birthday!', 'Yummy!', "It's a duck."], oddNormal: ['Hurry up!', "Let's go!", 'Goodbye!'] },
  { id: 'pe-hurry', level: 4, group: '허락·도움', scene: { emoji: '⏰', ko: '늦어서 빨리 가야 할 때', icon: '-' },
    answers: ['Hurry up!', "Let's go!", 'Quick, quick!'],
    oddEasy: ['Good night!', 'Yummy!', 'Thank you!'], oddNormal: ['Wait a minute.', 'Take your time.', 'Sweet dreams!'] },
  // ── 4단계: 주고받기 ──
  { id: 'gv-give', level: 4, group: '주고받기', scene: { emoji: '🎁', ko: '친구에게 물건을 줄 때', icon: '-' },
    answers: ['Here you are.', 'Here you go.', 'This is for you.'],
    oddEasy: ['Good night!', "It's windy.", 'Oops!'], oddNormal: ['Thank you!', "You're welcome.", 'Can I have some water?'] },
  { id: 'gv-get', level: 4, group: '주고받기', scene: { emoji: '🎀', ko: '물건을 받았을 때', icon: '-' },
    answers: ['Thank you!', 'Thanks!', 'Thank you so much!'],
    oddEasy: ['Good night!', "It's rainy.", 'Watch out!'], oddNormal: ["You're welcome.", 'Here you are.', 'Excuse me.'] },
  { id: 'gv-where', level: 4, group: '주고받기', say: 'Where is my bag?',
    answers: ["It's here.", 'Here it is.', "I don't know."],
    oddEasy: ['Happy birthday!', 'Good night!', 'Hooray!'], oddNormal: ["It's sunny.", "It's a dog.", "I'm fine, thank you."] },
  // ── 4단계: 색깔 ──
  { id: 'co-red', level: 4, group: '색깔', say: 'What color is it?', scene: { emoji: '🍎', ko: '무슨 색이야?', name: '빨간 사과' },
    answers: ["It's red.", 'Red!', "It's a red apple."],
    oddEasy: ["It's sunny.", 'Thank you!', 'Good night!'], oddNormal: ["It's yellow.", "It's green.", "It's blue."] },
  { id: 'co-yellow', level: 4, group: '색깔', say: 'What color is it?', scene: { emoji: '🍌', ko: '무슨 색이야?', name: '노란 바나나' },
    answers: ["It's yellow.", 'Yellow!', "It's a yellow banana."],
    oddEasy: ["It's rainy.", 'Hello!', 'Oops!'], oddNormal: ["It's red.", "It's green.", "It's blue."] },
  { id: 'co-green', level: 4, group: '색깔', say: 'What color is it?', scene: { emoji: '🐸', ko: '무슨 색이야?', name: '초록 개구리' },
    answers: ["It's green.", 'Green!', "It's a green frog."],
    oddEasy: ["It's cloudy.", "You're welcome.", 'Yummy!'], oddNormal: ["It's red.", "It's yellow.", "It's blue."] },
  { id: 'co-blue', level: 4, group: '색깔', say: 'What color is it?', scene: { emoji: '💙', ko: '무슨 색이야?', name: '파란 하트' },
    answers: ["It's blue.", 'Blue!', "It's a blue heart."],
    oddEasy: ["It's windy.", 'Good morning!', 'Be careful!'], oddNormal: ["It's red.", "It's yellow.", "It's green."] },

  // ── 5단계: 먹을 때 ──
  { id: 'ea-dinner', level: 5, group: '먹을 때', say: 'Dinner is ready!',
    answers: ["Let's eat!", "I'm coming!", 'Okay!'],
    oddEasy: ['Happy birthday!', "It's snowy.", 'Excuse me.'], oddNormal: ["I'm full.", 'Good night!', 'See you later!'] },
  { id: 'ea-taste', level: 5, group: '먹을 때', say: 'How is it?',
    answers: ["It's yummy!", "It's delicious!", "It's good."],
    oddEasy: ['Good night!', 'Excuse me.', 'My turn!'], oddNormal: ["I'm fine, thank you.", "It's sunny.", "It's a cat."] },
  { id: 'ea-more', level: 5, group: '먹을 때', say: 'Do you want some more?',
    answers: ['Yes, please.', 'No, thank you.', "I'm full."],
    oddEasy: ['Good morning!', 'Watch out!', 'My turn!'], oddNormal: ["You're welcome.", 'Here you are.', 'Good job!'] },
  { id: 'ea-full', level: 5, group: '먹을 때', scene: { emoji: '🍽️', ko: '배부를 때', icon: '-' },
    answers: ["I'm full.", "I'm so full.", 'No more, thank you.'],
    oddEasy: ['Good morning!', 'Happy birthday!', 'Your turn!'], oddNormal: ["I'm hungry!", "Let's eat!", 'Can I have some more?'] },
  { id: 'ea-like', level: 5, group: '먹을 때', say: 'Do you like apples?',
    answers: ['Yes, I do.', 'I love apples!', "No, I don't."],
    oddEasy: ['Good night!', 'Excuse me.', 'Hurry up!'], oddNormal: ["It's red.", "It's a cat.", "I'm fine, thank you."] },
  // ── 5단계: 몸과 마음 ──
  { id: 'bd-wrong', level: 5, group: '몸과 마음', say: "What's wrong?",
    answers: ["I'm sick.", 'My tummy hurts.', 'My head hurts.', 'I fell down.'],
    oddEasy: ['Happy birthday!', 'Hooray!', 'Yummy!'], oddNormal: ['Nice to meet you.', 'Good job!', 'See you later!'] },
  { id: 'bd-fell', level: 5, group: '몸과 마음', scene: { emoji: '🩹', ko: '친구가 넘어졌을 때', icon: '-' },
    answers: ['Are you okay?', 'Are you hurt?', 'Be careful!'],
    oddEasy: ['Happy birthday!', 'Yummy!', 'My turn!'], oddNormal: ['Good job!', 'Hooray!', 'Wow!'] },
  { id: 'bd-sneeze', level: 5, group: '몸과 마음', scene: { emoji: '🤧', ko: '친구가 재채기했을 때', icon: '-' },
    answers: ['Bless you!', 'Are you okay?'],
    oddEasy: ['Yummy!', 'My turn!', "It's sunny."], oddNormal: ['Thank you!', 'Good job!', 'Happy birthday!'] },
  { id: 'bd-cold', level: 5, group: '몸과 마음', scene: { emoji: '🥶', ko: '추울 때', icon: '-' },
    answers: ["It's cold!", "I'm cold.", "It's so cold!"],
    oddEasy: ['Good job!', 'My turn!', 'Thank you!'], oddNormal: ["It's hot!", "I'm hot.", "I'm hungry!"] },
  { id: 'bd-hot', level: 5, group: '몸과 마음', scene: { emoji: '🥵', ko: '더울 때', icon: '-' },
    answers: ["It's hot!", "I'm hot.", "It's so hot!"],
    oddEasy: ['Good job!', 'Your turn!', 'Excuse me.'], oddNormal: ["It's cold!", "I'm cold.", "It's snowy."] },
  { id: 'bd-picture', level: 5, group: '몸과 마음', say: 'Look at my picture!',
    answers: ['Wow!', "It's beautiful!", 'Good job!', 'I like it!'],
    oddEasy: ['Good night!', 'Excuse me.', "I'm full."], oddNormal: ['Oops!', 'Oh no!', "I'm sorry."] },
  { id: 'bd-love', level: 5, group: '몸과 마음', scene: { emoji: '💕', ko: '엄마 아빠에게 마음을 말할 때', icon: '-' },
    answers: ['I love you!', 'I love you, Mom!', 'I love you, Dad!'],
    oddEasy: ['Excuse me.', "It's a dog.", 'Hurry up!'], oddNormal: ['Nice to meet you.', 'Goodbye!', "You're welcome."] },
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
  // 3~5단계 (2026-10-20)
  'My turn!': '내 차례!', "It's my turn.": '내 차례야', 'Me next!': '다음은 나!', 'Your turn!': '네 차례!', "It's your turn.": '네 차례야',
  'You go first.': '너 먼저 해', 'Can I play with you?': '같이 놀아도 돼?', "Okay! Let's play!": '좋아! 같이 놀자!', 'Are you ready?': '준비됐어?',
  "Yes, I'm ready!": '응, 준비됐어!', 'Ready!': '준비 완료!', 'Not yet.': '아직이야', 'I won!': '내가 이겼다!', 'I did it!': '해냈다!',
  'Good game!': '재밌는 게임이었어!', "Let's play again!": '또 하자!', 'Ready or not, here I come!': '준비됐든 안 됐든, 찾으러 간다!',
  'Where are you?': '어디 있어?', 'I found you!': '찾았다!', 'Good morning, everyone!': '여러분, 좋은 아침이에요!', 'Good morning, teacher!': '선생님, 좋은 아침이에요!',
  'Please sit down.': '앉아 주세요', 'Yes, teacher.': '네, 선생님', 'Do you understand?': '알겠어요?', 'Yes, I do.': '네, 알아요',
  'Yes!': '네!', "No, I don't.": '아니요, 몰라요', 'Help me, please.': '도와주세요', 'Can you help me?': '도와줄 수 있어요?', 'I need help.': '도움이 필요해요',
  'Can I go to the bathroom?': '화장실 가도 돼요?', 'I need to go to the bathroom.': '화장실 가야 해요', 'May I go to the bathroom?': '화장실 가도 될까요?',
  'Can I have a cookie?': '쿠키 먹어도 돼요?', 'Not now.': '지금은 안 돼', 'After dinner.': '저녁 먹고 나서', 'Can you open this?': '이것 좀 열어 줄래요?',
  "It's too hard.": '너무 어려워요 (안 돼요)', 'Can I use your crayon?': '네 크레용 써도 돼?', 'Wait a minute.': '잠깐만 기다려', "Okay, I'll wait.": '알았어, 기다릴게',
  'Hurry up!': '서둘러!', 'Quick, quick!': '빨리 빨리!', 'Take your time.': '천천히 해', 'Here you go.': '여기 있어', 'This is for you.': '이거 너 줄게',
  'Thanks!': '고마워!', 'Thank you so much!': '정말 고마워요!', 'Where is my bag?': '내 가방 어디 있어?', "It's here.": '여기 있어', 'Here it is.': '여기 있다',
  "I don't know.": '모르겠어', 'What color is it?': '무슨 색이야?',
  "It's red.": '빨간색이야', 'Red!': '빨강!', "It's a red apple.": '빨간 사과야', "It's yellow.": '노란색이야', 'Yellow!': '노랑!', "It's a yellow banana.": '노란 바나나야',
  "It's green.": '초록색이야', 'Green!': '초록!', "It's a green frog.": '초록 개구리야', "It's blue.": '파란색이야', 'Blue!': '파랑!', "It's a blue heart.": '파란 하트야',
  'Dinner is ready!': '저녁 다 됐어!', "I'm coming!": '지금 가요!', 'How is it?': '(맛이) 어때?', "It's yummy!": '맛있어요!', "It's delicious!": '아주 맛있어요!',
  "It's good.": '좋아요 (맛있어요)', 'Do you want some more?': '더 먹을래?', 'Yes, please.': '네, 주세요', 'No, thank you.': '아니요, 괜찮아요',
  "I'm so full.": '정말 배불러요', 'No more, thank you.': '그만 먹을게요, 고마워요', 'Can I have some more?': '더 먹어도 돼요?', 'Do you like apples?': '사과 좋아해?',
  'I love apples!': '사과 정말 좋아!', "What's wrong?": '무슨 일이야? (어디 아파?)', "I'm sick.": '아파요', 'My tummy hurts.': '배가 아파요', 'My head hurts.': '머리가 아파요',
  'I fell down.': '넘어졌어요', 'Are you hurt?': '다쳤어?', 'Bless you!': '몸조심해! (재채기한 사람에게 하는 말)',
  "It's cold!": '추워!', "I'm cold.": '나 추워', "It's so cold!": '너무 추워!', "It's hot!": '더워!', "I'm hot.": '나 더워', "It's so hot!": '너무 더워!',
  'Look at my picture!': '내 그림 봐!', "It's beautiful!": '예쁘다!', 'I like it!': '마음에 들어!', 'I love you!': '사랑해요!', 'I love you, Mom!': '엄마, 사랑해요!', 'I love you, Dad!': '아빠, 사랑해요!',
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
