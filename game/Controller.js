gamepad.on('connect', e => {
    console.log(`controller ${e.index} connected!`);
	initializeGamepadControls();
    g_lastInput = 'controller';
    g_gamepadConnected = true;
});

gamepad.on('press', 'vendor', e => {
    g_lastInput = 'controller';
    g_gamepadConnected = true;
});

function initializeGamepadControls() {
	gamepad.on('hold', 'd_pad_up', () => {
	    player.moveUp();
	});

	gamepad.on('hold', 'd_pad_down', () => {
	    player.moveDown();
	});

	gamepad.on('hold', 'd_pad_left', () => {
	    player.moveLeft();
	});

	gamepad.on('hold', 'd_pad_right', () => {
	    player.moveRight();
	});

	gamepad.on('press', 'shoulder_top_left', () => {
		player.inventory.slotActive--;
	});

	gamepad.on('press', 'shoulder_top_right', () => {
		player.inventory.slotActive++;
	});

	gamepad.on('press', 'start', () => {
	    if (g_gamepadConnected) Game.pauseGame();
	});

	gamepad.on('press', 'shoulder_bottom_left', e => {
		player.dash(5, function() {
			document.getElementById('body').style.filter = 'saturate(1.5)';
			let currentBackground = backgroundManager.screens[backgroundManager.screenSelected];
			//currentBackground.alpha -= 0.5;
			g_shake += 5;
			setTimeout(function() {
				document.getElementById('body').style.filter = '';
				//currentBackground.alpha += 0.5;
				g_shake -= 5;
			}, 100);
			setTimeout(function() {
				player.dashing = false;
			}, 300)
		});
	});
}
