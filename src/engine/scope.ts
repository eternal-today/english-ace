/**
 * 학습 범위 — 메뉴마다 저절로 열린 만큼과 부모님이 먼저 열어 준 만큼 중 큰 쪽.
 * 부모님 체험 중에는 모두 열림.
 */
import { Card, Config, Progress } from '../types';
import { MAX_LEVEL } from '../data/phrases';
import { GROUPS } from '../data/phonics';
import { SONGS, TOPICS } from '../data/songs';
import { fillOf, openLevel } from './phrases';
import { openGroups } from './phonics';
import { openSongCount, openTopicCount } from './songs';

interface S { config: Config; cards: Record<string, Card>; progress: Progress; preview: boolean }

export const phraseLevelOf = (s: S) => (s.preview ? MAX_LEVEL : Math.min(MAX_LEVEL, Math.max(openLevel(s.cards, fillOf(s.config)), s.config.openPhrases || 0)));
export const phonicsGroupsOf = (s: S) => (s.preview ? GROUPS.length : Math.min(GROUPS.length, Math.max(openGroups(s.cards, s.progress.phonicsOpen), s.config.openPhonics || 0)));
export const songCountOf = (s: S) => (s.preview ? SONGS.length : openSongCount(s.cards, s.config.openSongs || 0));
export const topicCountOf = (s: S) => (s.preview ? TOPICS.length : openTopicCount(s.cards, s.config.openTopics || 0));
