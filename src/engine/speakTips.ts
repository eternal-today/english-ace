/**
 * 발음 포인트 — 한국 아이가 틀리기 쉬운 소리 다섯 가지를 글자에서 찾아 입 모양 그림과 한 줄 설명으로 보여 줌.
 * AI 없이 글자 규칙으로만 찾음 (th, f, v, r, l). 한 문장에 하나만, 앞에 적은 소리를 먼저.
 */
export type SoundTip = 'th' | 'f' | 'v' | 'r' | 'l';

export const TIP_TEXT: Record<SoundTip, { title: string; say: string }> = {
  th: { title: 'th는 혀를 살짝 내밀어요', say: '혀끝을 윗니와 아랫니 사이에 살짝 물고 소리 내요. "땡큐"가 아니라 혀를 내밀어 "th-ank you"' },
  f: { title: 'f는 윗니로 아랫입술을 살짝', say: '윗니를 아랫입술에 살짝 대고 바람을 "ffff" 내보내요. "ㅍ"처럼 입술을 붙이지 않아요' },
  v: { title: 'v도 윗니로 아랫입술을 살짝', say: 'f와 같은 입 모양인데 목을 울려서 "vvvv". 입술이 간질간질하면 잘한 거예요' },
  r: { title: 'r은 입술을 동그랗게', say: '입술을 동그랗게 모으고, 혀는 입천장에 닿지 않게 뒤로 살짝 말아요' },
  l: { title: 'l은 혀끝을 윗니 뒤에', say: '혀끝을 윗니 바로 뒤에 붙였다가 떼면서 소리 내요' },
};

/** 문장에서 찾을 소리와 그 글자 위치 */
const RULES: { tip: SoundTip; re: RegExp }[] = [
  { tip: 'th', re: /th/i },
  { tip: 'f', re: /\b(?!of\b)\w*?(f|ph)/i },     // "of"의 f는 v 소리라 뺌
  { tip: 'v', re: /v/i },
  { tip: 'r', re: /\br|(?<=[^aeiou])r(?=[aeiou])/i },   // 단어 첫 r, 자음 뒤 r (green, three)
  { tip: 'l', re: /\bl|(?<=[^aeiou])l(?=[aeiou])/i },
];

export function tipFor(text: string): { tip: SoundTip; at: [number, number] } | null {
  for (const r of RULES) {
    const m = r.re.exec(text);
    if (!m) continue;
    const letters = r.tip === 'th' ? 'th' : r.tip === 'f' ? (/ph/i.test(m[0].slice(-2)) ? 'ph' : 'f') : r.tip;
    const start = m.index + m[0].toLowerCase().lastIndexOf(letters);
    return { tip: r.tip, at: [start, start + letters.length] };
  }
  return null;
}
