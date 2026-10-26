/**
 * Port `buildSeed` z `design/PoleChamp v2.dc.html` (IMP-450, FX-SEED). Algorytm losowania i kolejność
 * wywołań generatora są identyczne z prototypem – zmiana kolejności zmienia wszystkie dane.
 * Zamiast PIN-ów demo (1234…5678) sędziowie mają nietrywialne PIN-y testowe z `fixtures/pins.ts`.
 */
import { SEED_PINS } from './fixtures/pins.js';

export const SEED = 20260914;

export type SeedStatus = 'trwa' | 'przygotowanie' | 'zakończona';
export type SeedStyle = 'Pole Sport' | 'Pole Art' | 'Exotic';
export type SeedLevel = 'Beginner' | 'Intermediate' | 'Advanced' | 'Pro' | 'Elite';

export interface SeedJudge {
  id: string;
  name: string;
  pin: string;
}

export interface SeedTournament {
  id: string;
  name: string;
  date: string;
  place: string;
  status: SeedStatus;
}

export interface SeedCriterion {
  id: string;
  name: string;
  scale: number;
  /** Waga jak w prototypie (liczba dziesiętna: 2, 1.5, 1). */
  weight: number;
  desc: string;
}

export interface SeedPenalty {
  id: string;
  name: string;
  value: number;
  max: number;
}

export interface SeedParticipant {
  id: string;
  number: number;
  name: string;
  club: string;
}

export interface SeedCategory {
  id: string;
  tournamentId: string;
  name: string;
  style: SeedStyle;
  level: SeedLevel;
  ageGroup: string;
  status: SeedStatus;
  locked: boolean;
  participantIds: string[];
  criteria: SeedCriterion[];
  penalties: SeedPenalty[];
}

export interface SeedSheet {
  /** Noty jak w prototypie (krok 0,5). */
  vals: Record<string, number>;
  pens: Record<string, number>;
  comment: string;
}

export interface SeedData {
  tournaments: SeedTournament[];
  currentTournamentId: string;
  judges: SeedJudge[];
  participants: Record<string, SeedParticipant>;
  categories: SeedCategory[];
  /** scores[categoryId][participantId][judgeId]. */
  scores: Record<string, Record<string, Record<string, SeedSheet>>>;
}

export function defaultCriteria(p: string): SeedCriterion[] {
  return [
    { id: p + '_k1', name: 'Technika', scale: 10, weight: 2, desc: 'Siła, elementy na rurze' },
    {
      id: p + '_k2',
      name: 'Artyzm / interpretacja muzyki',
      scale: 10,
      weight: 1.5,
      desc: 'Muzykalność i wyraz',
    },
    { id: p + '_k3', name: 'Choreografia', scale: 10, weight: 1, desc: 'Struktura i pomysłowość układu' },
    {
      id: p + '_k4',
      name: 'Płynność i przejścia',
      scale: 10,
      weight: 1,
      desc: 'Płynność ruchu i transferów',
    },
    { id: p + '_k5', name: 'Wrażenie ogólne', scale: 10, weight: 1, desc: 'Ogólne wrażenie sceniczne' },
  ];
}

export function defaultPenalties(p: string): SeedPenalty[] {
  return [
    { id: p + '_p1', name: 'Upadek', value: 2, max: 3 },
    { id: p + '_p2', name: 'Przekroczenie czasu', value: 1, max: 2 },
  ];
}

const FIRST = [
  'Julia',
  'Zofia',
  'Maja',
  'Hanna',
  'Lena',
  'Alicja',
  'Oliwia',
  'Amelia',
  'Wiktoria',
  'Natalia',
  'Emilia',
  'Aleksandra',
  'Zuzanna',
  'Laura',
  'Pola',
  'Nikola',
  'Gabriela',
  'Antonina',
  'Marta',
  'Karolina',
  'Weronika',
  'Magdalena',
  'Agnieszka',
  'Paulina',
  'Klaudia',
  'Sara',
  'Iga',
  'Kinga',
  'Ewa',
  'Monika',
  'Dominika',
  'Patrycja',
  'Joanna',
  'Barbara',
  'Ida',
];
const LAST = [
  'Kamińska',
  'Zielińska',
  'Wójcik',
  'Lewandowska',
  'Kowalczyk',
  'Szymańska',
  'Dąbrowska',
  'Kaczmarek',
  'Piotrowska',
  'Mazur',
  'Krawczyk',
  'Grabowska',
  'Pawlak',
  'Michalska',
  'Nowicka',
  'Adamczyk',
  'Dudek',
  'Wieczorek',
  'Jabłońska',
  'Król',
  'Majewska',
  'Olszewska',
  'Stępień',
  'Malinowska',
  'Jaworska',
  'Witkowska',
  'Walczak',
  'Rutkowska',
  'Sikora',
  'Baran',
  'Szewczyk',
  'Ostrowska',
  'Tomaszewska',
  'Pietrzak',
  'Marciniak',
];
const CLUBS = [
  'Aerial Dreams Warszawa',
  'PoleFit Kraków',
  'Studio Vertical Wrocław',
  'Pole Passion Gdańsk',
  'Spin City Poznań',
  'Up&Down Łódź',
  'Pole Art Studio Katowice',
  'Fly High Lublin',
  'Gravity Szczecin',
  'Pole Dance Academy Rzeszów',
  'Vertigo Bydgoszcz',
  'Twist Studio Toruń',
];
const COMMENTS = [
  'Bardzo pewny występ.',
  'Świetna muzykalność.',
  'Czyste przejścia.',
  'Brakowało energii w końcówce.',
  'Mocne elementy siłowe.',
  'Ciekawa choreografia.',
  'Drobne niedociągnięcia w spinach.',
  'Piękna linia nóg.',
  'Do poprawy praca na podłodze.',
  'Znakomity kontakt z publicznością.',
];

const DEFS: [string, string, SeedStyle, SeedLevel, string, SeedStatus, number][] = [
  ['t1', 'Pole Sport Beginner', 'Pole Sport', 'Beginner', 'Senior 18+', 'zakończona', 9],
  ['t1', 'Pole Sport Intermediate', 'Pole Sport', 'Intermediate', 'Senior 18+', 'zakończona', 10],
  ['t1', 'Pole Sport Advanced', 'Pole Sport', 'Advanced', 'Senior 18+', 'trwa', 9],
  ['t1', 'Pole Sport Junior', 'Pole Sport', 'Intermediate', 'Junior 12–15', 'trwa', 7],
  ['t1', 'Pole Art Intermediate', 'Pole Art', 'Intermediate', 'Open', 'trwa', 8],
  ['t1', 'Pole Art Masters', 'Pole Art', 'Advanced', 'Masters 40+', 'przygotowanie', 5],
  ['t1', 'Exotic Pro', 'Exotic', 'Pro', 'Open', 'przygotowanie', 7],
  ['t1', 'Exotic Elite', 'Exotic', 'Elite', 'Open', 'przygotowanie', 6],
  ['t2', 'Pole Sport Beginner', 'Pole Sport', 'Beginner', 'Senior 18+', 'przygotowanie', 8],
  ['t2', 'Pole Art Advanced', 'Pole Art', 'Advanced', 'Open', 'przygotowanie', 6],
  ['t2', 'Exotic Intermediate', 'Exotic', 'Intermediate', 'Open', 'przygotowanie', 6],
  ['t3', 'Pole Sport Beginner', 'Pole Sport', 'Beginner', 'Senior 18+', 'zakończona', 10],
  ['t3', 'Pole Sport Advanced', 'Pole Sport', 'Advanced', 'Senior 18+', 'zakończona', 8],
  ['t3', 'Pole Art Open', 'Pole Art', 'Intermediate', 'Open', 'zakończona', 9],
  ['t3', 'Exotic Pro', 'Exotic', 'Pro', 'Open', 'zakończona', 6],
  ['t4', 'Pole Sport Intermediate', 'Pole Sport', 'Intermediate', 'Senior 18+', 'zakończona', 8],
  ['t4', 'Pole Art Advanced', 'Pole Art', 'Advanced', 'Open', 'zakończona', 7],
  ['t4', 'Exotic Elite', 'Exotic', 'Elite', 'Open', 'zakończona', 5],
];

const LEVEL_BASE: Record<SeedLevel, number> = {
  Beginner: 6.2,
  Intermediate: 7,
  Advanced: 7.7,
  Pro: 8.1,
  Elite: 8.5,
};

/** Deterministyczny seed prototypu (generator Parka–Millera, ziarno 20260914). */
export function buildSeed(): SeedData {
  let seed = SEED;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rnd() * arr.length)]!;
  const half = (v: number) => Math.round(v * 2) / 2;
  const judges: SeedJudge[] = [
    { id: 'jA', name: 'Katarzyna Nowak', pin: SEED_PINS.jA },
    { id: 'jB', name: 'Michał Woźniak', pin: SEED_PINS.jB },
    { id: 'jC', name: 'Aleksandra Kot', pin: SEED_PINS.jC },
    { id: 'jD', name: 'Tomasz Zając', pin: SEED_PINS.jD },
    { id: 'jE', name: 'Joanna Wrona', pin: SEED_PINS.jE },
  ];
  const tournaments: SeedTournament[] = [
    {
      id: 't1',
      name: 'Mistrzostwa Polski Pole Sport 2026',
      date: '3–4 października 2026',
      place: 'Warszawa, Hala Torwar',
      status: 'trwa',
    },
    {
      id: 't2',
      name: 'Puchar Wiosny PoleChamp',
      date: '18 kwietnia 2027',
      place: 'Poznań, Arena',
      status: 'przygotowanie',
    },
    {
      id: 't3',
      name: 'Zimowy Puchar PoleChamp',
      date: '8 lutego 2026',
      place: 'Kraków, Tauron Arena',
      status: 'zakończona',
    },
    {
      id: 't4',
      name: 'Otwarte Mistrzostwa Śląska',
      date: '22 listopada 2025',
      place: 'Katowice, Spodek',
      status: 'zakończona',
    },
  ];
  const used = new Set<string>();
  const participants: Record<string, SeedParticipant> = {};
  const categories: SeedCategory[] = [];
  const scores: SeedData['scores'] = {};
  let uid = 1;
  const newParticipant = () => {
    let name: string;
    do {
      name = pick(FIRST) + ' ' + pick(LAST);
    } while (used.has(name));
    used.add(name);
    const id = 'u' + uid++;
    participants[id] = { id, number: 0, name, club: pick(CLUBS) };
    return id;
  };
  DEFS.forEach(([tid, name, style, level, ageGroup, status, count], ci) => {
    const id = 'c' + (ci + 1);
    const criteria = defaultCriteria(id);
    if (style === 'Exotic') {
      criteria.splice(3, 0, {
        id: id + '_k6',
        name: 'Praca na podłodze',
        scale: 10,
        weight: 1,
        desc: 'Floorwork i przejścia parterowe',
      });
    }
    const pids: string[] = [];
    for (let i = 0; i < count; i++) pids.push(newParticipant());
    const startNo = 1 + ci * 20;
    pids.forEach((pid, i) => {
      participants[pid]!.number = startNo + i;
    });
    categories.push({
      id,
      tournamentId: tid,
      name,
      style,
      level,
      ageGroup,
      status,
      locked: status === 'zakończona',
      participantIds: pids,
      criteria,
      penalties: defaultPenalties(id),
    });
    const catScores: Record<string, Record<string, SeedSheet>> = {};
    scores[id] = catScores;
    if (status === 'przygotowanie') return;
    pids.forEach((pid, i) => {
      let judgeSet: SeedJudge[];
      if (status === 'zakończona' || i < Math.ceil(count * 0.5)) judgeSet = judges;
      else if (i < Math.ceil(count * 0.75))
        judgeSet = judges.slice(1, 1 + 1 + Math.floor(rnd() * (judges.length - 2)));
      else judgeSet = [];
      if (!judgeSet.length) return;
      const skill = LEVEL_BASE[level] + (rnd() - 0.5) * 2.4;
      const fell = rnd() < 0.14 ? (rnd() < 0.25 ? 2 : 1) : 0;
      const overtime = rnd() < 0.08 ? 1 : 0;
      const entry: Record<string, SeedSheet> = {};
      catScores[pid] = entry;
      judgeSet.forEach((j) => {
        const bias = (rnd() - 0.5) * 0.6;
        const vals: Record<string, number> = {};
        criteria.forEach((k) => {
          vals[k.id] = Math.min(k.scale, Math.max(0, half(skill + bias + (rnd() - 0.5) * 1.4)));
        });
        entry[j.id] = {
          vals,
          pens: { [id + '_p1']: fell, [id + '_p2']: overtime },
          comment: rnd() < 0.3 ? pick(COMMENTS) : '',
        };
      });
    });
  });
  return { tournaments, currentTournamentId: 't1', judges, participants, categories, scores };
}
