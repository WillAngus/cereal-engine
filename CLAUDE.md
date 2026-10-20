# Cereal Engine

A small 2D top-down shooter engine written in plain JavaScript, running in Electron. The current game built on it is a meme-themed arena shooter called **Windows Defender**. The player survives waves of enemies coming in from the screen edges, using an inventory of guns, a dash, powerups, and turrets they can spawn.

The goal is for the game to handle **as many enemies and bullets on screen as possible**, so performance matters in every change.

## Running

```bash
npm install
npm start        # electron . --no-sandbox
```

`--no-sandbox` is needed on Linux because Electron's `chrome-sandbox` helper isn't set up as root.

To check the game boots without errors and see its console output in the terminal (DevTools otherwise only shows it in the window):

```bash
timeout 20 ./node_modules/.bin/electron . --no-sandbox --enable-logging=stderr 2>&1 | grep -i console
```

There are no automated tests. Use `node --check <file>` for syntax and the boot check above for runtime errors.

## Gameplay

Most gameplay is set up in the level file, `WindowsDefender.js`.

- **Weapons** (`initializeWeapons`): a 4-slot `Inventory` (keys 1–4) holding the chicken, dorito, banana and Dew guns. Each `Gun` sets its own projectile count, speed, spread (`dither`), damage, fire rate and hit sound. Guns with `explosive = true` fire bullets that explode on hit, dealing area damage with screen shake and custom particles. `onEquip`/`onHolster` hooks run when a gun is switched to or away from (the Dew gun uses them to start and stop music).
- **Dash** (`dashEvent`, Space): multiplies the player's velocity and sets off a harmless emoji explosion straight away, then a damaging explosion where the dash ends. It recharges, shown on the player's dash bar.
- **Enemies** (`spawnWave`): spawners on the top, left and right edges roll a weighted chance each tick. Snoop/Steve grunts (50%), a bigger, faster variant (25%), and an explosive Creeper (10%) whose death explosion damages other enemies. Spawn intervals shrink by 0.01 every frame down to a floor of 10 (`spawnRamp`/`minSpawnTime`), so difficulty ramps up over time.
- **Boss** (`spawnAlert`): an "Alert" boss spawns from the top every ~500 ticks (`bossSpawner`, run in `tick()` so it doesn't ramp up). It has 1000 HP, a rectangular hitbox and strong knockback, and changes sprite at 66% and 33% health (`sprite_dmg_enabled`).
- **Powerups** (`dropPowerup`): a chance-based drop on enemy death (`settings.powerupDropRate`) that despawns after a while. It gives a random temporary weapon for 5 seconds, +50 max health, or triggers trippy mode.
- **Turrets** (`spawnTurret`, I): allied AI that follows the player at a random distance, has its own weapon inventory, and leads its shots using intercept aiming from the worker.
- **Trippy mode** (Y or the joint powerup): 0.25× game speed, a wormhole GIF background, boosted saturation and screen shake. **Spooky mode** (U): grayscale and high contrast, and spawners produce tougher skulls instead of the normal enemies.
- **Anti-camping**: after 500 frames without input, screen shake builds up and "stop camping" is shown.
- **Global time scale** (`settings.speed`): timers, spawners, GIF playback and movement all scale with it, so slow motion affects the whole game.

Built but not active:
- **A\* pathfinding** (easystar.js, `findEntityPath` in `Maths.js`, path following in `Enemy.update`) is disabled by `settings.pathfindingEnabled = false`. Enemies home straight at the player.
- **Gamepad** (`Controller.js`): d-pad, shoulder weapon switching and dash are bound, but analog movement is broken (see Known bugs).
- **Enemy health bars**: `StatBar` supports them, but the `Enemy` constructor always sets `showHealthBar = false` and ignores its argument.

## Architecture

### Project layout
- `main.js`, `preload.js`, `index.html`, `package.json`: the Electron app shell, at the root.
- `engine/`: the reusable engine. `core/` (Game, Level, StateStack in `setup.js`, Timer), `entities/`, `weapons/` (Gun, Inventory), `systems/` (EntityManager, SpatialGrid, collision, particles, backgrounds, spawners), `input/` (gamepad, dev keys), `assets/` (image and sound loaders), `ui/` (StatBar, `styles.css`), `util/` (Vector, Maths), `workers/` (turret aiming) and `lib/` (third-party libraries).
- `game/`: Windows Defender. `levels/`, `states/` (DeathScreen01), `assets/`, and `config.js`.
- `archive/`: old code that isn't loaded (SnoopSlayer, pre-EntityManager levels, `PowerupScripts.js`, `AudioAnalyser.js`). Don't update it.
- **The engine must not name game classes.** Game-specific choices go in `game/config.js` (`Game.startLevel`, `Game.deathScreen`), which loads last. Engine classes still use some game sprites and sounds by name (see Improvement ideas).

### No modules, everything is global
Scripts are loaded in order by `<script>` tags in `index.html`. There is no bundler and no `import`/`export`. Classes, sprites (`spr_*`, `p_*`, `bg_*`, `gif_*`), sounds (`audio.*`, `music.*`) and managers (`entityManager`, `particleSystem`, `backgroundManager`, `player`) are globals. **When adding a file, add a script tag in the right place in `index.html`**: anything a file uses at load time must be loaded before it. Engine scripts go in the engine section, and game levels and states in the game section before `game/config.js`. Runtime settings live in the `settings` object at the top of `engine/core/Game.js` (`settings.speed` for slow motion, `settings.shake`, `settings.scale`, `settings.pixelated` for nearest neighbour sprite scaling, `settings.shadowsEnabled`, `settings.logSpriteSizes`, etc).

The renderer has full Node access (`nodeIntegration: true`, `contextIsolation: false`), which is used for `fs` in asset loading.

### Boot and game loop
- `main.js`: Electron main process. A frameless 1280x720 window that opens DevTools.
- `engine/core/setup.js`: the state machine (`StateStack`). States have `onEnter`, `onExit`, `onPause`, `onResume`, `update` and `display`.
- State changes go through `Game.setState()` / `Game.restartState()`, which call `Game.exitState()`. It runs the state's `onExit`, then clears timers, unbinds the state's keys, resets input, unpauses, resets CSS filters, stops audio and resets `shake`/`speed`. **States bind keys with `Game.bind()`** (unbound automatically on exit). Session-wide dev keys use `Game.bindGlobal()` in `engine/input/KeyBinds.js` and are restored if a state overrode them. A state's `onExit` only needs to clean up its own resources (workers, managers, globals it set).
- `engine/assets/LoadAssets.js` and `engine/assets/Sound.js`: auto-load all assets (see below).
- `engine/core/Game.js`: when the Pace loading bar finishes, it runs `prescaleSprites()`, then `Game.init()` (which starts `Game.startLevel`) and `Game.run()`. The `requestAnimationFrame` loop computes `deltaTime` (1.0 = 60fps) and updates and draws the top state.

### Entities (`engine/entities/`, `engine/weapons/`, `engine/systems/`)
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
Turret aiming is done in a Web Worker (`engine/workers/CalculateAngle.js`). Each frame the level sends **one batched message** with every turret and candidate target (`updateTurretWorker()`). The worker picks the nearest target and calculates an intercept angle, and the level applies the results to `turret.aimAngle` by id. Only one request is in flight at a time.

### Rendering
- Canvas 2D. Each level draws inside a `Camera` (`engine/lib/camera.js`) used for screen shake and zoom, scaled by `settings.scale`. `Game.resize()` (on boot and window resize) fits a `baseWidth`×`baseHeight` (1280×720) area into the window. With `settings.responsive` (the default), the world (`width`/`height`) grows on the spare axis so nothing stretches or letterboxes; otherwise it stays 1280×720 and is letterboxed. Use `width`/`height` for world-space layout, never 1280/720 or the window size.
- **Shadows** are generated on first use by `Entity.drawShadow()`, on the GPU (a `source-in` composite on a canvas capped at 512px). They are toggled with `settings.shadowsEnabled`.
- Visual effects (trippy and spooky mode, pause dimming) are CSS filters on the canvas, driven by CSS variables on `:root` (`Game.setFilter`).
- The pause menu and title bar are HTML styled with XP.css.

### Levels (`game/levels/`)
- `engine/core/Level.js` is the base class for playable levels (`class MyLevel extends Level`). It handles the camera, managers, audio groups, screen shake, spawners, the death check, draw order, cursor, pause and default controls. A level overrides hooks (`setup`, `tick`, `drawWorld`, `drawHud`, `cleanup`, `dropPowerup`, `dashEvent`) and uses helpers (`spawnPlayer`, `addBackground`, `addSpawner`, `edgePoint`). The header comment lists the hooks and options.
- `game/states/DeathScreen01(level)` restarts into the level class it's given (default `Game.startLevel`). `Level` uses `Game.deathScreen` unless a level sets its own `deathScreen`.
- `WindowsDefender.js` is the main level, built on `Level`. `Reskin.js` is a pixel art variant.
- `LevelTemplate.js` is a minimal playable level built on `Level`, to copy when starting a new one (player, two guns, edge spawners, health powerup, dash explosion, HUD). It isn't loaded by `index.html`.
- `archive/SnoopSlayer.js` is a near-copy of an older `WindowsDefender` with different sprites and enemy sizes, and `archive/old-before-EntityManager-refactor/` has older levels. Neither is loaded, so don't update them.

## Assets

- **Images:** every file in `game/assets/img/` (including subfolders) becomes a global named after its file (`slayer/spr_snoop.png` becomes `spr_snoop`). `.gif` files load as animated GIFs. `assetAliases` in `LoadAssets.js` maps the few names that don't match their file. A file whose name isn't a valid identifier or is already a global (a browser built-in, library, or earlier `let`/`const`/`var`) is refused with a console error. Scripts loaded after `LoadAssets.js` can still take over an asset's name, so `checkAssetGlobals()` reports that at startup.
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

- **Sprite size tuning.** `settings.logSpriteSizes = true` (in `engine/core/Game.js`) records the largest size each sprite is drawn at. Play a full session and press O. Use the verdicts to tune `spriteMaxSize` in `LoadAssets.js`, then turn logging off or remove it (the hooks are in `Entity.drawSprite`, `Particle.display` and `Gun.display`, plus the O keybind in `KeyBinds.js`).
- **Electron upgrade (6 to 38, now 44.9.1).** It boots and plays. `main.js` still has dead `remote` and `enableRemoteModule` code from the old version. The title-bar buttons work because `setup.js` requires the whole `electron` module. `preload.js` only contains leftover quick-start boilerplate that fills version elements the page doesn't have.

## Known bugs

- `Player.update` calls a bare `moveTo(...)` instead of `this.moveTo(...)`, and passes Vectors where angles are expected. Gamepad movement will throw.
- `Creature.setSize` resizes `this.dashBar`, which only `Player` has. It crashes on any other creature.
- Bullet check `this.rotation == NaN` in `Bullet.js` is always false. It should use `isNaN`.
- Entity ids are built from `'enemy' + entities.length` and similar, so they **aren't unique** after removals. `getEntityById` and the turret id lookup can match the wrong entity.
- The audio slider `onclick` is assigned twice in `Game.js`, so the first assignment is dead.
- `BackgroundScreen` stores the return value of `timerManager.addTimer`, which is always `undefined`.
- `archive/PowerupScripts.js` is invalid JS and `archive/AudioAnalyser.js` is unused. Neither is loaded.
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
- Give entities unique ids (for example a global counter).
- Move input state (`upPressed`, `mouseDown`, etc) into an input object.
- Stop engine classes using game assets by name: sounds in `Bullet`, `Turret`, `Player`, `Powerup` and `Enemy` (`mp3_vine_boom`, `mp3_hurt`, `mp3_pop`, `mp3_tnt`), sprites in `Enemy` and `Turret` (`p_plus_1`, `gif_tnt_exp`, `spr_dew_logo`), default particles in `Gun` and `Explosion`, `cur_pixel` in `Level`, and the startup background in `engine/ui/styles.css`. Make them properties with defaults a game can override.

## Conventions

- Match the existing style: tabs, comments describing each step, constructor signatures documented in a comment above each class (`// Gun Class : Gun(id, sprite, ...)`).
- Avoid per-frame allocations in hot paths (entity and particle loops, collision). Reuse arrays and objects.
- Test performance changes with real numbers (a Node benchmark or an in-game timing), not guesses.
- **Git commits: don't add a Claude `Co-Authored-By` line.**
