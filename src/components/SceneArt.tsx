import React from 'react';
import { Bed, Cake, Cloud, CloudRain, Gift, Milk, Moon, Snowflake, Sun, Sunrise, ThumbsUp, TriangleAlert, Users, Utensils, Wind } from 'lucide-react';

/**
 * 상황 그림 — 둥근 바탕 위의 선 아이콘 (이모지 그림이 기기마다 달라 보이고 어색해서 바꿈).
 * 아이콘이 없는 상황(동물, 부모님이 넣은 표현)은 이모지를 그대로 씀.
 */
const ICONS: Record<string, { Icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>; bg: string; fg: string }> = {
  Sunrise: { Icon: Sunrise, bg: 'bg-orange-100', fg: 'text-orange-500' },
  Moon: { Icon: Moon, bg: 'bg-indigo-100', fg: 'text-indigo-500' },
  Utensils: { Icon: Utensils, bg: 'bg-amber-100', fg: 'text-amber-600' },
  Bed: { Icon: Bed, bg: 'bg-violet-100', fg: 'text-violet-500' },
  Users: { Icon: Users, bg: 'bg-sky-100', fg: 'text-sky-600' },
  Gift: { Icon: Gift, bg: 'bg-rose-100', fg: 'text-rose-500' },
  Milk: { Icon: Milk, bg: 'bg-slate-100', fg: 'text-slate-500' },
  ThumbsUp: { Icon: ThumbsUp, bg: 'bg-emerald-100', fg: 'text-emerald-600' },
  Cake: { Icon: Cake, bg: 'bg-pink-100', fg: 'text-pink-500' },
  TriangleAlert: { Icon: TriangleAlert, bg: 'bg-red-100', fg: 'text-red-500' },
  Sun: { Icon: Sun, bg: 'bg-yellow-100', fg: 'text-yellow-500' },
  CloudRain: { Icon: CloudRain, bg: 'bg-sky-100', fg: 'text-sky-600' },
  Cloud: { Icon: Cloud, bg: 'bg-slate-100', fg: 'text-slate-500' },
  Snowflake: { Icon: Snowflake, bg: 'bg-cyan-100', fg: 'text-cyan-500' },
  Wind: { Icon: Wind, bg: 'bg-teal-100', fg: 'text-teal-600' },
};

export function SceneArt({ scene, size = 'lg', dim = false }: { scene: { emoji: string; icon?: string }; size?: 'lg' | 'md' | 'sm'; dim?: boolean }) {
  const box = size === 'lg' ? 'w-[clamp(5.5rem,20vmin,8rem)] h-[clamp(5.5rem,20vmin,8rem)] rounded-[2rem]' : size === 'md' ? 'w-16 h-16 rounded-2xl' : 'w-14 h-14 rounded-2xl';
  const iconSize = size === 'lg' ? 56 : size === 'md' ? 32 : 28;
  const it = scene.icon ? ICONS[scene.icon] : undefined;
  if (it) {
    const { Icon, bg, fg } = it;
    return (
      <div className={`${box} ${dim ? 'bg-slate-50 text-slate-200' : `${bg} ${fg}`} flex items-center justify-center shrink-0`}>
        <Icon size={iconSize} strokeWidth={2.2} />
      </div>
    );
  }
  return (
    <div className={`${box} ${dim ? 'opacity-30' : ''} bg-brand-50 flex items-center justify-center shrink-0`}>
      <span className={size === 'lg' ? 'text-[clamp(3rem,11vmin,4.5rem)] leading-none' : 'text-3xl leading-none'}>{scene.emoji}</span>
    </div>
  );
}
