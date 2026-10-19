/**
 * 숫자 영어 개념 정리 — 수학 에이스 개념노트와 같은 순서
 * ① 개념 쏙 → ② 이렇게 해요 → ③ 조심해요 → ④ 개념 확인(3문제, 별 없음) → 문제 풀기
 */
import { NumStage, Question } from '../types';
import { makeQuestion, shuffle, TEEN_TY_PAIRS } from './numbers';

export interface Careful { wrong: string; right: string; note: string; play?: number[] }
export interface ConceptNote {
  id: string;
  stage: NumStage;
  title: string;
  core: string;              // ① 한두 문장
  coreExamples: number[];    // 누르면 소리가 나는 예시
  how: string[];             // ② 한 줄씩
  howExample: number;        // 덩어리로 보여 주고 끊어 읽기
  careful: Careful[];        // ③
  check: () => Question[];   // ④
}

export const CONCEPTS: ConceptNote[] = [
  {
    id: 'teen', stage: 'n100', title: '-teen과 -ty',
    core: '13부터 19까지는 끝이 -teen이고, 20 · 30 · 40 … 90은 끝이 -ty예요.',
    coreExamples: [13, 30, 15, 50],
    how: [
      '-teen은 뒤를 길게 말해요. thir-TEEN (13)',
      '-ty는 앞을 세게 말해요. THIR-ty (30)',
      '21부터는 -ty 뒤에 하나를 더 붙여요. forty-seven (47)',
    ],
    howExample: 47,
    careful: [
      { wrong: 'fifteen = 50', right: 'fifteen = 15', note: '끝소리가 길게 "틴"이면 15, 짧게 "티"면 50이에요.', play: [15, 50] },
      { wrong: 'thirteen = 30', right: 'thirteen = 13', note: '13과 30은 소리가 비슷해요. 끝을 잘 들어요.', play: [13, 30] },
    ],
    check: () => shuffle(TEEN_TY_PAIRS).slice(0, 3).map(([a, b]) => makeQuestion('listen', Math.random() < 0.5 ? a : b, 'n100', 1, 1)!),
  },
  {
    id: 'hundred', stage: 'n999', title: 'hundred 읽기',
    core: '백의 자리 숫자를 읽고 hundred를 붙여요. 그다음 남은 두 자리를 읽어요.',
    coreExamples: [100, 325, 800],
    how: [
      '3 → three hundred',
      '25 → twenty-five',
      '이어서 읽으면 three hundred twenty-five',
    ],
    howExample: 325,
    careful: [
      { wrong: '305 = three hundred zero five', right: '305 = three hundred five', note: '가운데 0은 읽지 않고 건너뛰어요.', play: [305] },
      { wrong: '100 = hundred', right: '100 = one hundred', note: '100은 앞에 one을 붙여요.', play: [100] },
    ],
    check: () => [418, 250, 307].map(n => makeQuestion('listen', n, 'n999', 1)!),
  },
  {
    id: 'comma', stage: 'n9999', title: '쉼표에서 끊어 읽기',
    core: '쉼표 앞은 thousand예요. 쉼표 앞 숫자를 읽고 thousand를 붙인 뒤, 뒤의 세 자리를 hundred처럼 읽어요.',
    coreExamples: [1000, 4520, 9999],
    how: [
      '4 , 520 에서 쉼표 앞 4 → four thousand',
      '520 → five hundred twenty',
      '이어서 읽으면 four thousand five hundred twenty',
    ],
    howExample: 4520,
    careful: [
      { wrong: '10,000 = 만', right: '10,000 = ten thousand', note: '한국어 "만"은 영어에 따로 없어요. 천이 열 개라서 ten thousand예요.', play: [10000] },
      { wrong: '1,000 = thousand', right: '1,000 = one thousand', note: '1,000은 앞에 one을 붙여요.', play: [1000] },
    ],
    check: () => [2300, 7045, 5618].map(n => makeQuestion('listen', n, 'n9999', 1)!),
  },
];
export const CONCEPT_BY_STAGE = Object.fromEntries(CONCEPTS.map(c => [c.stage, c])) as Record<NumStage, ConceptNote>;
