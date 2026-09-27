# ZANSHIN: BLADE OF RESOLVE (残心 — 刃の覚悟)
### A 3D Precision Third-Person Melee Combat Game Inspired by Sekiro

**Zanshin: Blade of Resolve** is a complete, polished, playable 3D melee action game built with **Three.js**, **TypeScript**, and **Vite**. The game focuses strictly on **pure, responsive precision sword combat**—eliminating tedious narrative bloat, crafting, and grinding in favor of intense, rhythmic martial duels.

---

## ⚔️ The Core Combat Loop

```
ATTACK  ──>  DEFLECT / PARRY  ──>  POSTURE DAMAGE  ──>  COUNTER  ──>  DODGE  ──>  REPOSITION  ──>  DEATHBLOW EXECUTION
```

* **Aggressive Defense**: Victory is attained not through chip damage or stat-checking, but by holding ground, timing deflections, dismantling enemy posture, and landing lethal deathblows.
* **Posture Break**: Both player and enemies feature dual meters: **Health** and **Posture**. Posture naturally recovers when combat slows, but recovery rate drops drastically at lower health.
* **Perilous Attacks & Counters**: Dangerous unblockable thrusts and sweeps flash a crimson **『危』** warning kanji. Thrusts can be crushed with the **Thrust Counter (Mikiri)**; sweeps must be evaded.

---

## 🎮 Controls

| Action | Input | Description |
| :--- | :--- | :--- |
| **Move** | `W`, `A`, `S`, `D` | Omnidirectional combat movement relative to camera look. |
| **Camera** | `Mouse` | Smooth 3rd-person orbital camera (Pointer Locked on click). |
| **Attack / Combo** | `Left Click` | 3-hit fluid sword chain (`Slash 1` ➔ `Slash 2` ➔ `Overhead Cleave`). |
| **Heavy Strike** | Hold `Left Click` | Charges a heavy lunging strike that breaks through guards. |
| **Guard / Deflect** | `Right Click` | Raise blade. Timed within window (150ms) triggers **Perfect Deflect**. |
| **Directional Dodge** | `Space` + `WASD` | Quick-step dodge with 250ms active invulnerability frames (i-frames). |
| **Sprint** | `Shift` | High-speed dash to close distance or reposition. |
| **Lock-On Target** | `Q` | Lock camera & facing toward nearest enemy. |
| **Cycle Lock Target** | `Mouse Wheel` | Switch lock-on focus to next/previous alive opponent. |
| **Action / Execute** | `E` | Performs **Deathblow Execution** on broken enemies, or **Thrust Counter** during enemy thrusts. |
| **Special Attack** | `R` | Spends 1 Spirit Pip to unleash a rapid multi-hit whirlwind slash. |
| **Healing Gourd** | `1` | Drink restorative flask (3 charges, restores 60 HP). |
| **Pause / Resume** | `ESC` | Opens pause menu; unlocks pointer. |
| **Debug Console** | `F1` or `` ` `` | Toggle debug HUD (FPS, god mode, slow-mo, states). |

---

## 🛡️ Combat Systems & Mechanics

### 1. Deflection & Guard States
* **Perfect Deflection (0.15s window)**:
  * Generates bright white/gold spark burst and expanding shockwave ring.
  * Resonant crystal bell overtone and heavy steel clash sound.
  * Micro-freeze hit-stop (110ms) and camera impact shake.
  * Deals heavy posture damage to the attacker.
  * Charges the player's Spirit Meter.
  * Zero damage taken!
* **Normal Block**:
  * Reduces incoming damage, but inflicts posture buildup on the defender.
* **Failed / Mistimed**:
  * Clean hit connects; causes blood splatter, flesh slicing audio, stagger flinch, and full health/posture damage.

### 2. Posture & Execution Deathblow
* As deflections and heavy strikes connect, posture accumulates.
* When posture hits 100%, the target suffers a **Posture Break**:
  * Shivering golden aura shatter effect and deep temple gong resonance.
  * Target drops to one knee into a vulnerable stagger.
  * The **DEATHBLOW [E]** execution prompt appears.
  * Pressing `E` plays a visceral finishing execution that slays normal enemies or shatters a boss death marker.

### 3. Contextual Perilous Counters
* When an enemy begins an unblockable perilous strike, a crimson kanji **『危』** appears.
* **Thrust Attack**: Press `E` within the timing window to step forward, pin the enemy's blade to the earth, deal massive posture damage, and create a ground dust shockwave.
* **Sweep Attack**: Low circular spin that cannot be blocked. Must be evaded via directional dodge.

---

## 👹 Enemy Archetypes & Bosses

1. **Sparring Swordsman**: Balanced martial opponent teaching fundamentals of combos, guard timing, and thrust counters.
2. **Crimson Duelist**: High-speed warrior focusing on relentless attack chains, parries, and aggressive pressure.
3. **Iron Mountain Brute**: Massive armored combatant wielding a heavy kanabo club with sweeping strikes and super armor.
4. **Sohei Spear Master**: Extended reach and lethal thrust chains teaching precision Mikiri timing.
5. **Shadow Shinobi**: Elusive assassin utilizing rapid side-steps, flash retreats, and swift multi-blade flurries.
6. **Elite Kurogane Knight**: Master swordsman equipped with full armor who regularly deflects and counters player aggression.
7. **Yamabushi Ascetic**: Monk fighter utilizing palm strikes and stance changes.
8. **Minibosses**:
   * **Kensei Hikaru**: Master of the Obsidian Edge (Parry duel master).
   * **Gouki the Crusher**: Juggernaut of Ash with crushing unblockables.
   * **Crimson Phantom**: Dual-life assassin with blitz strikes.
9. **Final Boss — Lord Genjiro (Sovereign of the Severed Wind)**:
   * **3-Phase Climax** featuring 3 death markers.
   * **Phase 1**: Traditional master duel with feints and 3-hit combos.
   * **Phase 2**: Fiery red blade infusion, heightened aggression, faster combo chains.
   * **Phase 3**: Lightning-infused blade, tempestuous arena winds, and lethal 4-hit flurries.

---

## 🏛️ Arenas & Environments

* **Arena 1 — Training Courtyard**: Stone ring, gravel borders, wooden training dummies, and Torii gate.
* **Arena 2 — Whispering Bamboo Forest**: Mist-veiled bamboo groves, mossy boulders, and quiet stone lanterns.
* **Arena 3 — Sunken Temple of Ash**: Ancient ruined shrine with towering stone pillars and blazing braziers.
* **Arena 4 — Storm-Swept Rooftops**: High pagoda rooftops with ornamental gold ridges in a moonlit storm.
* **Arena 5 — Moonlit Sovereign's Courtyard**: Expansive octagonal ceremonial arena under a massive glowing full moon with red fallen leaves and guardian statues.

---

## 🔊 Procedural Audio & Visual Polish

* **Zero Missing Assets**: All audio is synthesized in real-time via the **Web Audio API** (harmonic crystal bells, metallic transient cracks, taiko heartbeat pulses, razor blade slicing, and gong resonances).
* **VFX Suite**: Custom Three.js particle systems for spark showers, expanding shockwaves, blood bursts, and dynamic ribbon sword trails that trace swing arcs.
* **Camera System**: Dynamic 3rd-person camera with lock-on tracking, trauma-based screen shake, and hit-stop zoom pulses.

---

## 🚀 Running & Building

### Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in any modern desktop browser (Chrome, Edge, Firefox, Brave).

### Production Build
```bash
npm run build
npm run preview
```
