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
];

export const SONG_BY_ID = Object.fromEntries(SONGS.map(s => [s.id, s])) as Record<string, SongUnit>;

/** 단어 사전 (여러 단원에 같은 단어가 있으면 하나로) */
export const WORDS: Record<string, SongWord> = {};
for (const s of SONGS) for (const w of s.words) WORDS[w.id] = { ...WORDS[w.id], ...w, sound: WORDS[w.id]?.sound || w.sound };

/**
 * 가사 빈칸을 소리로 읽을 때: 빈칸 자리는 "hmm"으로 읽음.
 * "had a ..."처럼 a로 끝나면 기기 음성이 a를 글자 이름("에이")으로 읽어서, 뒤에 말을 하나 붙여 관사로 읽히게 함.
 */
export const lyricSpoken = (text: string) => text.replace(/___/, 'hmm');
export const lyricFilled = (l: LyricLine) => l.text.replace('___', WORDS[l.answer].word);
