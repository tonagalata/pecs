// Built-in sound effects: animals, vehicles and everyday sounds. A word with `sound` set plays
// this clip *instead of* saying the word (tap "cow", hear a moo). The clips ship inside the app, so
// they work offline, and a shared or backed-up board only carries the key, never the audio.
// Sources and licences (all CC0 / public domain): assets/sounds/CREDITS.md
import type { Word } from './types';
import type { Clip } from './speech';

export const SOUND_CATEGORIES = ['Animals', 'Vehicles', 'Everyday'] as const;
export type SoundCategory = (typeof SOUND_CATEGORIES)[number];

export interface BuiltinSound { key: string; label: string; category: SoundCategory; file: number }

export const SOUNDS: BuiltinSound[] = [
  { key: 'dog', label: 'Dog', category: 'Animals', file: require('../../assets/sounds/dog.m4a') },
  { key: 'cat', label: 'Cat', category: 'Animals', file: require('../../assets/sounds/cat.m4a') },
  { key: 'cow', label: 'Cow', category: 'Animals', file: require('../../assets/sounds/cow.m4a') },
  { key: 'pig', label: 'Pig', category: 'Animals', file: require('../../assets/sounds/pig.m4a') },
  { key: 'horse', label: 'Horse', category: 'Animals', file: require('../../assets/sounds/horse.m4a') },
  { key: 'sheep', label: 'Sheep', category: 'Animals', file: require('../../assets/sounds/sheep.m4a') },
  { key: 'duck', label: 'Duck', category: 'Animals', file: require('../../assets/sounds/duck.m4a') },
  { key: 'rooster', label: 'Rooster', category: 'Animals', file: require('../../assets/sounds/rooster.m4a') },
  { key: 'lion', label: 'Lion', category: 'Animals', file: require('../../assets/sounds/lion.m4a') },
  { key: 'elephant', label: 'Elephant', category: 'Animals', file: require('../../assets/sounds/elephant.m4a') },
  { key: 'frog', label: 'Frog', category: 'Animals', file: require('../../assets/sounds/frog.m4a') },
  { key: 'bird', label: 'Bird', category: 'Animals', file: require('../../assets/sounds/bird.m4a') },
  { key: 'owl', label: 'Owl', category: 'Animals', file: require('../../assets/sounds/owl.m4a') },
  { key: 'bee', label: 'Bee', category: 'Animals', file: require('../../assets/sounds/bee.m4a') },
  { key: 'car', label: 'Car', category: 'Vehicles', file: require('../../assets/sounds/car.m4a') },
  { key: 'bus', label: 'Bus', category: 'Vehicles', file: require('../../assets/sounds/bus.m4a') },
  { key: 'train', label: 'Train', category: 'Vehicles', file: require('../../assets/sounds/train.m4a') },
  { key: 'airplane', label: 'Airplane', category: 'Vehicles', file: require('../../assets/sounds/airplane.m4a') },
  { key: 'helicopter', label: 'Helicopter', category: 'Vehicles', file: require('../../assets/sounds/helicopter.m4a') },
  { key: 'ambulance', label: 'Ambulance', category: 'Vehicles', file: require('../../assets/sounds/ambulance.m4a') },
  { key: 'police', label: 'Police car', category: 'Vehicles', file: require('../../assets/sounds/police.m4a') },
  { key: 'motorcycle', label: 'Motorcycle', category: 'Vehicles', file: require('../../assets/sounds/motorcycle.m4a') },
  { key: 'boat', label: 'Boat', category: 'Vehicles', file: require('../../assets/sounds/boat.m4a') },
  { key: 'bell', label: 'Bell', category: 'Everyday', file: require('../../assets/sounds/bell.m4a') },
  { key: 'doorbell', label: 'Doorbell', category: 'Everyday', file: require('../../assets/sounds/doorbell.m4a') },
  { key: 'phone', label: 'Phone', category: 'Everyday', file: require('../../assets/sounds/phone.m4a') },
  { key: 'clapping', label: 'Clapping', category: 'Everyday', file: require('../../assets/sounds/clapping.m4a') },
];

const BY_KEY: Record<string, BuiltinSound> = Object.fromEntries(SOUNDS.map((s) => [s.key, s]));

export const soundFile = (key?: string): number | undefined => (key ? BY_KEY[key]?.file : undefined);
export const soundLabel = (key: string): string => BY_KEY[key]?.label ?? key;

/** What a word plays instead of being spoken: the family recording first, else its built-in sound. */
export const wordAudio = (w?: Pick<Word, 'recording' | 'sound'>): Clip | undefined => w?.recording ?? soundFile(w?.sound);
