let loading = true;

let backgroundAlpha = 1;
let maxFps = 60;
let lastCalledTime;
let fps;
let targetDelta = 1000/maxFps;
let delta;

let g_gravity = 0;
let g_tileSize = 64;
let g_particles_enabled = true;
let g_paused = false;
let g_shake = 0;
let g_gamepadConnected = false;
let g_lastInput = 'computer';
let g_scale = 1;
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
	up: 'w',
	left: 'a',
	down: 's',
	right: 'd',
	space: 'space',
	// Inventory
	inv1: '1',
	inv2: '2',
	inv3: '3',
	inv4: '4',
	inv5: '5',
}

let upPressed = false;
let downPressed = false;
let leftPressed = false;
let rightPressed = false;
let spacePressed = false;

let leftJoystick  = {x: 0, y: 0};
let rightJoystick = {x: 0, y: 0};
let leftDeadzone  = 0.25;
let rightDeadzone = 0.25;

let backgroundManager;
let entityManager;
let particleSystem;
let player;

let score = Number();

var Game = {
	width: 1280,
	height: 720,
	canvas: null,
	c: null,

	stateStack: new StateStack(),

	getCurrentState: function() {
		return this.stateStack.stateList.top();
	},
	setState: function(state) {
		Game.stateStack.pop();
		Game.stateStack.push(state);
	},

	update: function() {
		this.stateStack.update();
	},
	display: function() {
		this.stateStack.display();
	},
	run: function() {
		requestAnimationFrame(Game.run);
		// Set loading to false once pace completes asset preload
		if (Pace.bar.progress == 100) loading = false;
		// Set scale based on window size
		g_scale = canvas.width / 1280;
		// Apply deadzones to gamepad to stop drifting
		if (g_gamepadConnected) {
			let gp = navigator.getGamepads()[0];

			leftJoystick.x = applyDeadzone(gp.axes[0], leftDeadzone);
			leftJoystick.y = applyDeadzone(gp.axes[1], leftDeadzone);

			rightJoystick.x = applyDeadzone(gp.axes[2], rightDeadzone);
			rightJoystick.y = applyDeadzone(gp.axes[3], rightDeadzone);
		}

		g_paused ? Game.stateStack.pause() : Game.stateStack.resume();

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
				Game.stateStack.update();
			}
			Game.stateStack.display();
		}
	},

	startGame: function() {
		// this.stateStack.push(new Level01());
		this.setState(new Level01());
	},
	pauseGame: function() {
		g_paused = !g_paused;
	},
	showPauseMenu: function() {
		// Show pause menu
		document.getElementById("pause_menu").style.display = 'block';
		canvas.style.cursor = 'auto';
		canvas.style.filter = 'brightness(0.5)';

		if (window.fullscreen) {
			document.getElementById("toggle_fullscreen").value = "Fullscreen: ON";
		} else {
			document.getElementById("toggle_fullscreen").value = "Fullscreen: OFF";
		}
	},
	hidePauseMenu: function() {
		// Hide pause menu
		document.getElementById("pause_menu").style.display = 'none';
		canvas.style.cursor = 'auto';
		canvas.style.filter = 'brightness(1)';
	},

	setupCanvas: function(wrapper) {
		this.canvas = document.createElement('canvas');
		this.canvas.id = 'canvas';
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.c = this.canvas.getContext('2d');

        wrapper.appendChild(this.canvas);
	},
	init: function() {
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

		this.mouseX = mousePos.x / g_scale;
		this.mouseY = mousePos.y / g_scale;

		g_lastInput = 'computer';
	}, true);
};

document.addEventListener('visibilitychange', () => {
	if (document.hidden) {
		console.log('Window hidden.')
		g_paused = true;
	} else {
		// Do something...
	}
}, false);

document.getElementById('resume').addEventListener('click', (e) => {
	g_paused = false;
});

document.addEventListener('keypress', (e) => {
	g_lastInput = 'computer';
});

window.addEventListener('resize', function() {
	Game.canvas.width = window.innerWidth;
	Game.canvas.height = window.innerHeight;

	//width = Game.canvas.width / g_scale;
	//height = Game.canvas.height / g_scale;
});
