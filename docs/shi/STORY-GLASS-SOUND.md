# Story Glass Sound — Original Sonic Clothing

**Status:** Protected · always on · Phase G  
**Live:** https://storyhome-1-eqmg.vercel.app  
Companion: [`STORY-GLASS.md`](./STORY-GLASS.md) · [`../MOTION.md`](../MOTION.md)

## What this is

Story Glass sound is **original Story Home code** — not stock SFX, not licensed tracks, not sample packs.

Cues are synthesized at runtime with the Web Audio API from our own frequency / envelope recipes in:

- `src/lib/sound/cues.ts` — vocabulary (enter · back · study · select · tap · success)
- `src/lib/sound/engine.ts` — oscillator engine
- `src/components/sound/SoundProvider.tsx` — always-on experience bridge

**No** `.mp3` / `.wav` / `.ogg` assets. **No** third-party sound libraries.

## Ownership

The cue recipes, temperature scaling, and playback behavior are **Story Home proprietary presentation IP** — clothing of the Continuum, same class as motion temperatures and glass tokens.

Copyright © Story Home. All rights reserved in the synthesized vocabulary and arrangement.

You may evolve the tones (gain, pitch, sparse new cues) — you may **not**:

1. Strip sound or add a mute toggle that makes silence the default product  
2. Replace synthesis with stock / Marketplace / “UI kit” audio packs  
3. Ship arcade spam on every `story-press`  
4. Pretend these tones are a third-party brand’s sonic identity  

## Product rules

| Rule | Why |
|---|---|
| Always on | Sound *is* the experience — fiddling between rooms is the point |
| Sparse | Room travel + intentional gold/success — addiction without noise |
| Reduced-motion silent | Accessibility only — not a Settings mute |
| Synthesized forever | Keeps legal + brand ownership clean |

## Armor

`npm run test:glass` (Phase G script) asserts: synthesis-only, always-on, no Settings mute, SoundProvider wired, IP notice present.
