var SnoopSlayer = function() {

	this.name = 'snoop_slayer';

	this.bossSpawnerTop;
	this.snoopSpawnerTop;
	this.snoopSpawnerLeft;
	this.snoopSpawnerRight;

	this.score;

	this.camera;

	this.onEnter = function() {
		// Set image rendering mode
		Game.c.imageSmoothingEnabled = true;
		Game.canvas.style.cursor = 'none';
		// Set mouse position
		Game.canvas.mouseX = width;
		Game.canvas.mouseY = height / 2;
		// Set global variables
		g_tileSize = 64;
		g_shake = 0;
		g_shadows_enabled = false;
		g_pathfinding_enabled = false;
		// Create audio groups if undefined
		if (audio.Group == null && music.group == null) {

			createAudioGroup(audio, audioArray);
			createAudioGroup(music, musicArray);

			audioLoaded = true;
		}
		// Setup camera
		this.camera = new Camera(Game.c);
		this.camera.moveTo(Game.canvas.width / 2, Game.canvas.height / 2);
		this.camera.zoomTo(Game.canvas.width);
		// Define the backgound manager
		backgroundManager = new BackgroundManager(10, 0);
		// Create backgrounds
		backgroundManager.screens.push(new BackgroundScreen('bg_windows_bliss', [bg_windows_bliss], 1));
		backgroundManager.screens.push(new BackgroundScreen('bg_level_01_trippy', [vid_tunnel, bg_trip_full, bg_windows_bliss], 0.1));
		// Define the entity manager
		entityManager = new EntityManager(5000);
		// Create enemy spawners
		this.bossSpawnerTop = new EnemySpawner(250, 500, 25, true, function() {
			console.log('alert')
			Game.getCurrentState().spawnAlert(width/2, -120, 420, 1000, 10);
		}, 1);

		this.snoopSpawnerTop = new EnemySpawner(250, 55, 25, true, function() {
			if (Math.round(random(0, 5)) != 5) {
				Game.getCurrentState().spawnSnoop(random(150, width - 150), -55, 55, 10, random(1.2, 3));
			} else {
				Game.getCurrentState().spawnSnoop(random(150, width - 150), -80, 80, 25, random(3.5, 5));
			}
		}, 1);

		this.snoopSpawnerLeft = new EnemySpawner(250, 75, 25, true, function() {
			if (Math.round(random(0, 1)) == 0) {
				Game.getCurrentState().spawnSnoop(-55, random(150, height - 150), 55, 10, random(1.2, 3));
			} else {
				Game.getCurrentState().spawnSnoop(-80, random(150, height - 150), 80, 25, random(3.5, 5));
			}
		}, 1);

		this.snoopSpawnerRight = new EnemySpawner(250, 75, 25, true, function() {
			if (Math.round(random(0, 1)) == 0) {
				Game.getCurrentState().spawnSnoop(width + 45, random(150, height - 150), 55, 10, random(1.2, 3));
			} else {
				Game.getCurrentState().spawnSnoop(width + 80, random(150, height - 150), 80, 25, random(3.5, 5));
			}
		}, 1);

		particleSystem = new ParticleSystem(2000);

		// Spawn player and initialize instructions
		entityManager.spawnPlayer('player', spr_player_slayer, width / 2, height - 75, 85, 85, 7, 0.875, 15);
		// Assign player entity to global varible for ease of use
		player = entityManager.getEntityById('player');
		// Add weapons to inventory (id, gun sprite, bullet sprite, parent, width, height, amount, speed, dither, damage, hit sound, hit particle, eqipped)
		player.inventory.contents.push( new Gun('chicken_gun', spr_chicken_gun, p_chicken, player, player.width, player.height, 24, 16, 1, 20, 1, 15, audio.mp3_hitmarker, p_hitmarker, true ) );
		player.inventory.contents.push( new Gun('dorito_gun',  spr_dorito_gun,  p_dorito,  player, player.width, player.height, 24, 24, 2, 10, 2, 25, audio.mp3_hitmarker, p_hitmarker, false) );
		player.inventory.contents.push( new Gun('banana_gun',  spr_banana_gun,  p_banana,  player, player.width, player.height, 24, 24, 2, 15, 2, 20, audio.mp3_hitmarker, p_hitmarker, false) );
		player.inventory.contents.push( new Gun('dew_gun',     spr_dew_gun,     p_dew_can, player, player.width, player.height, 24, 16, 2, 15, 2, 20, audio.mp3_hitmarker, p_hitmarker, false) );
		// Set additional weapon properties
		player.inventory.getInventoryItem('dew_gun').explosive = true;
		player.inventory.getInventoryItem('dew_gun').firerate = 3;
		player.inventory.getInventoryItem('dew_gun').p1 = p_explosion;
		player.inventory.getInventoryItem('dew_gun').p2 = spr_dew_logo;
		player.inventory.getInventoryItem('dew_gun').p3 = p_hitmarker;
		player.inventory.getInventoryItem('dew_gun').onEquip = function() {
			console.log('dew_gun equipped');
			music.mp3_skrillex.play(0, 0, true);
		}
		player.inventory.getInventoryItem('dew_gun').onHolster = function() {
			console.log('dew_gun holstered');
			music.mp3_skrillex.stop();
		}
		// Player starting velocity
		player.vel.x =   0;
		player.vel.y = -25;

		this.score = 0;

		this.initializeControls();

		console.log(this.name + ' entered.');
	}
	this.onExit = function() {
		// CLose turret worker threads
		for (let i = 0; i < entityManager.turrets.length; i++) {
			entityManager.turrets[i].worker.terminate();
		}

		// Destroy enemy spawners
		this.bossSpawnerTop = null;
		this.snoopSpawnerTop = null;
		this.snoopSpawnerLeft = null;
		this.snoopSpawnerRight = null;

		// Reset managers
		backgroundManager = null;
		entityManager = null;
		particleSystem = null;

		// Reset player
		player = null;

		// Add level score to global score
		score = this.score;
		g_shake = 0;

		// Stop all audio
		audio.Group.stop();
		music.Group.stop();

		// Reset controls
		Object.keys(controls).forEach(function(key) {
			Mousetrap.bind(controls[key], function() {}, 'keydown');
		});

		Mousetrap.bind('i', function() {}, 'keydown');
		Mousetrap.bind('t', function() {}, 'keydown');
		Mousetrap.bind('y', function() {}, 'keydown');

		console.log(this.name + ' left.');
	}

	this.update = function() {

		// this.camera.moveTo(player.pos.x * g_scale, player.pos.y * g_scale);
		this.camera.moveTo(Game.canvas.width / 2, Game.canvas.height / 2);
		this.camera.zoomTo(Game.canvas.width);

		this.bossSpawnerTop.run();

		this.snoopSpawnerTop.run();
		this.snoopSpawnerLeft.run();
		this.snoopSpawnerRight.run();

		if ( this.snoopSpawnerTop.spawnTime   > 10 ) this.snoopSpawnerTop.spawnTime   -= 0.01;
		if ( this.snoopSpawnerLeft.spawnTime  > 10 ) this.snoopSpawnerLeft.spawnTime  -= 0.01;
		if ( this.snoopSpawnerRight.spawnTime > 10 ) this.snoopSpawnerRight.spawnTime -= 0.01;

	}
	this.display = function() {

		this.camera.begin();

		Game.c.save();

		Game.c.scale(g_scale, g_scale);

		Game.c.translate(random(-g_shake, g_shake), random(-g_shake, g_shake));

		if (!g_paused) {

			backgroundManager.run();

			entityManager.run();

			if (g_particles_enabled) particleSystem.run();

			Game.c.save();

		    Game.c.translate(Game.canvas.mouseX, Game.canvas.mouseY);
			Game.c.drawImage(cur_pixel, -20, -20, 40, 40);

			Game.c.restore();
		}

		// Draw HUD
		Game.c.font = '50px Comic Sans MS';
		Game.c.fillStyle = '#ff0000';
		Game.c.fillText('fps: ' + Math.floor(fps), 10, 50);
		Game.c.fillStyle = 'white';
		Game.c.fillText('enemies: ' + entityManager.enemies.length, 10, 100);
		Game.c.fillStyle = '#ffff00';
		Game.c.fillText('scubs rekt: ' + this.score, 10, 150);

		Game.c.drawImage(spr_hypercam, (width / 2) - 125, 0, 250, 22);

		Game.c.restore();

		this.camera.end();

	}

	this.onPause  = function() {
		Game.showPauseMenu();
	}
	this.onResume = function() {
		Game.hidePauseMenu();
		canvas.style.cursor = 'none';
	}

	this.initializeControls = function() {
		// Player controls
		Mousetrap.bind( controls.up,    () => { upPressed    = true;  },'keydown' );
		Mousetrap.bind( controls.up,    () => { upPressed    = false; }, 'keyup'  );

		Mousetrap.bind( controls.left,  () => { leftPressed  = true;  },'keydown' );
		Mousetrap.bind( controls.left,  () => { leftPressed  = false; }, 'keyup'  );

		Mousetrap.bind( controls.down,  () => { downPressed  = true;  },'keydown' );
		Mousetrap.bind( controls.down,  () => { downPressed  = false; }, 'keyup'  );

		Mousetrap.bind( controls.right, () => { rightPressed = true; }, 'keydown' );
		Mousetrap.bind( controls.right, () => { rightPressed = false; }, 'keyup'  );

		Mousetrap.bind( controls.space, () => { spacePressed = true; }, 'keydown' );
		Mousetrap.bind( controls.space, () => { spacePressed = false, player.dash(player.dashVel) }, 'keyup'  );

		Mousetrap.bind( controls.inv1,  () => { player.inventory.selectSlot(0); }, 'keydown' );
		Mousetrap.bind( controls.inv2,  () => { player.inventory.selectSlot(1); }, 'keydown' );
		Mousetrap.bind( controls.inv3,  () => { player.inventory.selectSlot(2); }, 'keydown' );
		Mousetrap.bind( controls.inv4,  () => { player.inventory.selectSlot(3); }, 'keydown' );
		Mousetrap.bind( controls.inv5,  () => { player.inventory.selectSlot(4); }, 'keydown' );

		Mousetrap.bind('t', () => { new Explosion(player.pos.x, player.pos.y, 24, 24, 15, 10, 10, p_explosion, spr_dew_logo, p_hitmarker) }, 'keyup');

		// Spawn bot
		Mousetrap.bind('i', () => {
			entityManager.spawnTurret(
				'player_turret' + entityManager.turrets.length,
				spr_player_slayer,
				entityManager.enemies,
				player.pos.x - player.width/2,
				player.pos.y - player.width/2,
				80/1.25, 75/1.25,
				25, 25,
				random(0.75, 0.9),
				false,
				'dorito_gun'
			);
		}, 'keydown');

		// Background script(s)
		Mousetrap.bind('y', () => {
			let _this = this;
			backgroundManager.selectBackgroundScreen('bg_level_01_trippy', function() {
				// Apply filter to canvas
				document.getElementById('body').style.filter = 'saturate(1.2)';
				// Set shake amount
				g_shake += 1;
				// Start video
				vid_tunnel.play();
				// Create timer to reset changes and refer to default backgound
				let timer = new Timer(function() {
					// Only execute if game is still in current level
					if (Game.getCurrentState() == _this) {
						document.getElementById('body').style.filter = '';
						backgroundManager.selectBackgroundScreen('bg_windows_bliss');
						g_shake -= 1;
						vid_tunnel.pause();
					}
				}, 6000);
			});
		}, 'keydown');
	}
	this.spawnSnoop = function(x, y, size, health, speed) {
		entityManager.spawnEnemy('enemy' + entityManager.enemies.length, spr_snoop, player, x, y, size, size, false, speed, health, audio.mp3_hitmarker, 1, spr_misc_bag);
	}
	this.spawnAlert = function(x, y, size, health, speed) {
		let id = 'alert' + + entityManager.enemies.length;
		entityManager.spawnEnemy(id, spr_alert_boss_1, player, x, y, size, size*0.29, false, speed, 1000, audio.mp3_hitmarker, 1, spr_misc_bag);
	    entityManager.getEntityById(id).sprite_dmg_enabled = true;
	    entityManager.getEntityById(id).sprite_dmg_1 = spr_alert_boss_2;
	    entityManager.getEntityById(id).sprite_dmg_2 = spr_alert_boss_3;
	    entityManager.getEntityById(id).faceTarget = false;
		entityManager.getEntityById(id).hitbox.type = 1;
	}
}
