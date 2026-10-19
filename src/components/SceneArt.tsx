import React from 'react';

/**
 * 상황 그림 — 동물처럼 그림 자체가 문제 내용인 경우와 부모님이 넣은 표현만 이모지로 보여 줌.
 * 아침·밤·선물 같은 상황 그림은 어색해 보여서 없앰 (scene.icon이 있는 상황은 글로만 보여 줌).
 */
export function SceneArt({ scene, size = 'lg', dim = false }: { scene: { emoji: string; icon?: string }; size?: 'lg' | 'md' | 'sm'; dim?: boolean }) {
  if (scene.icon || !scene.emoji) return null;
  const box = size === 'lg' ? 'w-[clamp(5.5rem,20vmin,8rem)] h-[clamp(5.5rem,20vmin,8rem)] rounded-[2rem]' : size === 'md' ? 'w-16 h-16 rounded-2xl' : 'w-14 h-14 rounded-2xl';
  return (
    <div className={`${box} ${dim ? 'opacity-30' : ''} bg-brand-50 flex items-center justify-center shrink-0`}>
      <span className={size === 'lg' ? 'text-[clamp(3rem,11vmin,4.5rem)] leading-none' : 'text-3xl leading-none'}>{scene.emoji}</span>
    </div>
  );
}
