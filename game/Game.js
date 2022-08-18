let loading = true;
let tick = 0;

let backgroundAlpha = 1;
let maxFps = 60;
let lastCalledTime;
let fps;
let targetDelta = 1000/maxFps;
let delta;
let inputTime = 0;
let lastScreen;
let root = document.querySelector(':root');

let g_speed = 1;
let g_gravity = 0;
let g_tileSize = 64;
let g_particles_enabled = true;
let g_paused = false;
let g_shake = 0;
let g_gamepadConnected = false;
let g_lastInput = 'computer';
let g_scale = 1;
let g_powerup_drop_rate = 5;
let g_shadow_distance = 3;
let g_shadows_enabled = true;
let g_pathfinding_enabled = true;

let width = 1280;
let height = 720;

let mouseX;
let mouseY;

let mouseDown = false;
let mouseUp = false;
let mouseMoving = false;

let controls = {
	// Movement
	up:   'w',
	left: 'a',
	down: 's',
	right:'d',
	space:'space',
	// Inventory
	inv1: '1',
	inv2: '2',
	inv3: '3',
	inv4: '4',
	inv5: '5',
}

let upPressed    = false;
let downPressed  = false;
let leftPressed  = false;
let rightPressed = false;
let spacePressed = false;

let leftJoystick  = {x: 0, y: 0};
let rightJoystick = {x: 0, y: 0};
let leftDeadzone  = 0.25;
let rightDeadzone = 0.25;

let timerManager = new TimerManager();
let backgroundManager;
let entityManager;
let particleSystem;
let player;

let score = 0;

let Game = new GameObject();

function GameObject() {
	this.width  = width;
	this.height = height;
	this.canvas = null;
	this.c      = null;

	this.stateStack = new StateStack();

	this.getCurrentState = function() {
		return this.stateStack.stateList.top();
	}
	this.setState = function(state) {
		this.stateStack.pop();
		this.stateStack.push(state);
	}
	this.update = function() {
		this.stateStack.update();
	}
	this.display = function() {
		this.stateStack.display();
	}
	this.run = function() {
		requestAnimationFrame(this.run.bind(this));
		// Set scale based on window size
		g_scale = canvas.width / 1280;
		// Prevent speed going below 0
		if (g_speed < 0) g_speed = 0;
		// Apply deadzones to gamepad to stop drifting
		if (g_gamepadConnected) {
			let gp = navigator.getGamepads()[0];

			leftJoystick.x = applyDeadzone(gp.axes[0], leftDeadzone);
			leftJoystick.y = applyDeadzone(gp.axes[1], leftDeadzone);

			rightJoystick.x = applyDeadzone(gp.axes[2], rightDeadzone);
			rightJoystick.y = applyDeadzone(gp.axes[3], rightDeadzone);
		}

		// Handle pause menu inputs
		g_paused ? this.stateStack.pause() : this.stateStack.resume();

		// Calculate current framerate
		if (!lastCalledTime) {
			lastCalledTime = performance.now();
			fps = 0;
			return;
		}
		delta = (performance.now() - lastCalledTime);
		deltaTime = delta / targetDelta;
		lastCalledTime = performance.now();
		fps = 1000 / delta;
		// Update and render current state
		if (!loading) {
			if (!g_paused) {
				this.stateStack.update();
			}
			this.stateStack.display();
		}
		tick++;
	}
	this.startGame = function() {
		this.setState(new SnoopSlayer());
	}
	this.pauseGame = function() {
		g_paused = !g_paused; 
		if (g_paused) {
			pauseActiveSounds();
			timerManager.pauseTimers();
		} else {
			resumeActiveSounds();
			timerManager.resumeTimers();
		}
	}
	this.showPauseMenu = function() {
		if (pause_menu.style.display !== 'block') {
			// Set html body background as canvas data
			// body.style.backgroundImage = 'url(' + Game.canvas.toDataURL() + ')';
			// Show pause menu if hidden
			pause_menu.style.display = 'block';
			// Set game cursor style
			canvas.style.cursor = 'auto';
			// Apply canvas filter
			root.style.setProperty('--brightness', 0.5);
		}
	}
	this.hidePauseMenu = function() {
		if (pause_menu.style.display !== 'none') {
			// Hide pause menu if visible
			pause_menu.style.display = 'none';
			// Set game cursor style
			canvas.style.cursor = 'auto';
			// Remove canvas filter
			root.style.setProperty('--brightness', 1);
		}
	}
	this.setFilter = function(filter, value) {
		// Apply canvas filter
		root.style.setProperty(filter, value);
	}
	this.resetFilters = function() {
		root.style.setProperty('--blur',       0);
		root.style.setProperty('--contrast',   1);
		root.style.setProperty('--brightness', 1);
		root.style.setProperty('--grayscale',  0);
		root.style.setProperty('--hue-rotate', 0);
		root.style.setProperty('--opacity',    1);
		root.style.setProperty('--saturate',   1);
		root.style.setProperty('--sepia',      0);
	}
	this.clearCanvas = function(context) {
		context.clearRect(0, 0, width, height);
	}
	this.setupCanvas = function(wrapper) {
		this.canvas = document.createElement('canvas');
		this.canvas.id = 'canvas';
        this.canvas.width = window.innerWidth * window.devicePixelRatio;
        this.canvas.height = window.innerHeight * window.devicePixelRatio;
        this.c = this.canvas.getContext('2d');

        wrapper.appendChild(this.canvas);
	}
	this.getWindowSize = function() {
		return {
			width  : window.innerWidth * window.devicePixelRatio,
			height : window.innerHeight * window.devicePixelRatio
		};
	}
	this.init = function() {
		this.setupCanvas(document.getElementById('body'));
		this.startGame();
	}
}

window.onload = function () {

    window.getGameDimensions = function() {
        return {
            width: Game.width,
            height: Game.height
        };
    };

	window.getMousePos = function(canvas, evt) {
		var rect = canvas.getBoundingClientRect();
		return {
			x: (evt.clientX + Game.getCurrentState().camera.lookAt[0]) - canvas.width / 2,
			y: (evt.clientY + Game.getCurrentState().camera.lookAt[1]) - canvas.height/ 2
		};
	}

	Pace.on('hide', function(e) {
		loading = false;

		Game.init();
		Game.run();

		Game.canvas.addEventListener('mousedown', function(e) {
			mouseDown = true;
			g_lastInput = 'computer';
		});

		Game.canvas.addEventListener('mouseup', function(e) {
			mouseDown = false;
			g_lastInput = 'computer';
		});

		Game.canvas.addEventListener('mousemove', function(evt) {
			var mousePos = getMousePos(canvas, evt);

			this.mouseX = (mousePos.x * window.devicePixelRatio) / g_scale;
			this.mouseY = (mousePos.y * window.devicePixelRatio) / g_scale;

			g_lastInput = 'computer';
		}, true);

		window.addEventListener('resize', function() {
			Game.canvas.width = window.innerWidth * window.devicePixelRatio;
			Game.canvas.height = window.innerHeight * window.devicePixelRatio;
		});
	});
};

document.addEventListener('visibilitychange', () => {
	if (document.hidden) {
		console.log('Window hidden.')
		Game.pauseGame();
	} else {
		// Do something...
	}
}, false);

document.addEventListener('keypress', (e) => {
	g_lastInput = 'computer';
	inputTime = 0;
});

resume.addEventListener('click', (e) => {
	Game.pauseGame();
});

audio_volume.addEventListener('click', (e) => {
	if (audioLoaded) {
		audio.Group.volume = audio_volume.value / 100;
	}
});

music_volume.addEventListener('click', (e) => {
	if (audioLoaded) {
		music.Group.volume = music_volume.value / 100;
	}
});

toggle_fullscreen.addEventListener('click', (e) => {

});
