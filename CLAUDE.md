# Cereal Engine

A small 2D top-down shooter engine written in plain JavaScript, running in Electron. The current game built on it is a meme-themed arena shooter with two near-identical level variants: **Windows Defender** (the default) and **Snoop Slayer**. The player survives waves of enemies coming in from the screen edges, using an inventory of guns, a dash, powerups, and turrets they can spawn.

The goal is for the game to handle **as many enemies and bullets on screen as possible**, so performance matters in every change.

## Running

```bash
npm install
npm start        # electron . --no-sandbox
```

`--no-sandbox` is needed on Linux because Electron's `chrome-sandbox` helper isn't set up as root (see Electron 38 notes below).

To check the game boots without errors and see its console output in the terminal (DevTools otherwise only shows it in the window):

```bash
timeout 20 ./node_modules/.bin/electron . --no-sandbox --enable-logging=stderr 2>&1 | grep -i console
```

There are no automated tests. Use `node --check <file>` for syntax and the boot check above for runtime errors.

## Architecture

### No modules, everything is global
Scripts are loaded in order by `<script>` tags in `index.html`. There is no bundler and no `import`/`export`. Classes, sprites (`spr_*`, `p_*`, `bg_*`, `gif_*`), sounds (`audio.*`, `music.*`) and managers (`entityManager`, `particleSystem`, `backgroundManager`, `player`) are globals. **When adding a file, add a script tag in the right place in `index.html`**: anything a file uses at load time must be loaded before it. Runtime settings are `g_*` globals in `game/Game.js` (`g_speed` for slow motion, `g_shake`, `g_scale`, `g_shadows_enabled`, `g_log_sprite_sizes`, etc).

The renderer has full Node access (`nodeIntegration: true`, `contextIsolation: false`), which is used for `fs` in asset loading.

### Boot and game loop
- `main.js`: Electron main process. A frameless 1280x720 window that opens DevTools.
- `setup.js`: the state machine (`StateStack`). States have `onEnter`, `onExit`, `onPause`, `onResume`, `update` and `display`.
- `game/LoadAssets.js` and `game/Sound.js`: auto-load all assets (see below).
- `game/Game.js`: when the Pace loading bar finishes, it runs `prescaleSprites()`, then `Game.init()` and `Game.run()`. The `requestAnimationFrame` loop computes `deltaTime` (1.0 = 60fps) and updates and draws the top state.

### Entities (`game/`)
- `Entity`: position, velocity, sprite drawing with rotation and flip, shadows, collision.
  - `Creature` adds health, movement and smoothed rotation.
    - `Player`, `Enemy` and `Turret` extend it.
  - `Bullet`, `Powerup` and `Explosion` extend `Entity` directly.
- `Particle` is not an entity. Particles are managed by `ParticleSystem`.
- `Gun` and `Inventory` handle weapon slots. `Gun.shoot()` spawns `Bullet`s.
- Entity kinds are identified by the **`entityType` string** (`'player'`, `'enemy'`, `'bullet'`, `'turret'`, `'powerup'`, `'explosion'`).

### Collision
- `EntityManager` keeps **one `SpatialGrid` per entity type**, rebuilt every frame with 64px cells.
- `Entity.handleCollision(exclude, callback)` asks `EntityManager.queryNearby()` for nearby entities. It skips its own type and the `exclude` type, so enemies never search through other enemies.
- Removed entities are flagged `removed = true` so they can't be hit again later in the same frame.
- Query results are reused arrays. Don't hold onto them.

### Turrets
Turret aiming is done in a Web Worker (`game/CalculateAngle.js`). Each frame the level sends **one batched message** with every turret and candidate target (`updateTurretWorker()`). The worker picks the nearest target and calculates an intercept angle, and the level applies the results to `turret.aimAngle` by id. Only one request is in flight at a time.

### Rendering
- Canvas 2D. Each level draws inside a `Camera` (`game/lib/camera.js`) used for screen shake and zoom, scaled by `g_scale`. In responsive mode, `g_scale` is the device pixel ratio, because the world grows with the window rather than stretching.
- **Shadows** are generated on first use by `Entity.drawShadow()`, on the GPU (a `source-in` composite on a canvas capped at 512px). They are toggled with `g_shadows_enabled`.
- Visual effects (trippy and spooky mode, pause dimming) are CSS filters on the canvas, driven by CSS variables on `:root` (`Game.setFilter`).
- The pause menu and title bar are HTML styled with XP.css.

### Levels (`game/states/levels/`)
- `WindowsDefender.js` and `SnoopSlayer.js` are ~600-line near-duplicates. They differ only in the player and enemy sprites and the enemy sizes. **Any change to one usually needs making in the other.**
- `DeathScreen01.js` restarts into `WindowsDefender`.
- `old-before-EntityManager-refactor/` contains archived levels that aren't loaded.

## Assets

- **Images:** every file in `game/assets/img/` (including subfolders) becomes a global named after its file (`slayer/spr_snoop.png` becomes `spr_snoop`). `.gif` files load as animated GIFs. `assetAliases` in `LoadAssets.js` maps the few names that don't match their file.
- **Prescaling:** at startup, `spr_*` and `p_*` images larger than their limit in `spriteMaxSize` (game pixels × device pixel ratio) are replaced with smaller `ImageBitmap`s. Backgrounds (`bg_*`) are not scaled, because `bg_windows_bliss.src` is used as a CSS background.
- **Sounds:** files in `game/assets/sound/sfx/` load into `audio.<name>`, and files in `game/assets/sound/music/` into `music.<name>`. Per-sound volumes are set in the `soundVolumes` table in `Sound.js`.
- Prefix conventions: `spr_` sprites, `p_` particles and bullets, `bg_` backgrounds, `gif_` animations, `cur_` cursors, `mp3_`/`wav_` sounds.

## Dev keys

| Key | Action |
|---|---|
| R | Reload the window |
| Q | Restart the current state |
| O | Print the sprite size report (`spriteSizeReport()`) |
| I | Spawn a turret |
| Y | Trippy mode |
| U | Spooky mode |
| Esc | Pause |

## Work in progress

- **Sprite size tuning.** `g_log_sprite_sizes = true` (in `Game.js`) records the largest size each sprite is drawn at. Play a full session and press O. Use the verdicts to tune `spriteMaxSize` in `LoadAssets.js`, then turn logging off or remove it (the hooks are in `Entity.drawSprite`, `Particle.display` and `Gun.display`, plus the O keybind in `KeyBinds.js`).
- **Electron 6 to 38 upgrade.** It boots and plays. `main.js` still has dead `remote` and `enableRemoteModule` code from the old version. The title-bar buttons work because `setup.js` requires the whole `electron` module.

## Known bugs

- `Player.update` calls a bare `moveTo(...)` instead of `this.moveTo(...)`, and passes Vectors where angles are expected. Gamepad movement will throw.
- `Creature.setSize` resizes `this.dashBar`, which only `Player` has. It crashes on any other creature.
- Bullet check `this.rotation == NaN` in `Bullet.js` is always false. It should use `isNaN`.
- Entity ids are built from `'enemy' + entities.length` and similar, so they **aren't unique** after removals. `getEntityById` and the turret id lookup can match the wrong entity.
- The audio slider `onclick` is assigned twice in `Game.js`, so the first assignment is dead.
- `BackgroundScreen` stores the return value of `timerManager.addTimer`, which is always `undefined`.
- `PowerupScripts.js` is invalid JS and `AudioAnalyser.js` is unused. Neither is loaded.
- `darkenImage` and `contrastImage` in `Maths.js` are unused.

## Improvement ideas

The performance roadmap, roughly in order:
1. **Object pools** for bullets and particles. Each shot currently allocates a `Bullet`, two `Vector`s and a `CollisionBody`, which causes garbage-collection stutters.
2. **`setTransform` instead of `save`/`translate`/`rotate`/`restore`** for each entity and particle.
3. **Static background on its own canvas layer**, moved by CSS transform for screen shake, instead of being redrawn every frame.
4. **A single shadow pass**: draw entities to an offscreen layer and draw it once, offset and darkened, instead of one shadow draw per entity.
5. **A WebGL renderer** (such as PixiJS) with a texture atlas, for tens of thousands of sprites. This is the largest change, and the CSS filter effects would need replacing with shaders.
6. **A stress-test key** plus a DevTools performance trace, to confirm where frame time actually goes before choosing between 3, 4 and 5.

Code health:
- Merge `WindowsDefender` and `SnoopSlayer` into one level class configured per theme.
- Give entities unique ids (for example a global counter).
- Move global `g_*` settings and input state into a settings or input object.

## Conventions

- Match the existing style: tabs, comments describing each step, constructor signatures documented in a comment above each class (`// Gun Class : Gun(id, sprite, ...)`).
- Avoid per-frame allocations in hot paths (entity and particle loops, collision). Reuse arrays and objects.
- Test performance changes with real numbers (a Node benchmark or an in-game timing), not guesses.
- **Git commits: don't add a Claude `Co-Authored-By` line.**
