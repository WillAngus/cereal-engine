// Player Class : Player(id, sprite, x, y, width, height, speed, friction, knockback)
class Player {
	constructor(id, sprite, x, y, w, h, s, f, k) {
		this.entityType = 'player';
		this.id = id;
		this.showId = false;
		this.sprite = sprite;
		this.pos = new Vector(x, y);
		this.vel = new Vector(0, 0);
		this.tile = new Vector();
		this.width = w;
		this.height = h;
		this.hitbox = {w: w, h: h};
		this.speed = s;
		this.friction = f;
		this.knockBack = k
		this.health = 100;
		this.maxHealth = 100;
		this.angle = 1;
		this.rotation = 1;
		this.rotationSpeed = 0.75;
		this.dashing = false;
		// Create varible to store last object collided with
		this.lastCollision = Object();
		// Create player inventory to store weapons
		this.inventory = new Inventory(10);
		// Create a health bar for the player
		this.healthBar = new HealthBar('player_health_bar', this, 55, 7, '#41C1E8', '#E85D41');
		// Timer to keep track of powerups
		this.timer = new Timer(function(){}, 0);
	}
	update() {
		this.pos.add(this.vel);
		this.vel.multiply(this.friction);
		
		if (this.friction > 1) this.friction = 1;

		this.tile.x = Math.floor(this.pos.x/g_tileSize)*g_tileSize;
		this.tile.y = Math.floor(this.pos.y/g_tileSize)*g_tileSize;
		// Bind movement listeners to player velocity
		if (upPressed) this.moveUp();
		if (downPressed) this.moveDown();
		if (leftPressed) this.moveLeft();
		if (rightPressed) this.moveRight();

		// Handle controller movement
		if (g_gamepadConnected && g_lastInput == 'controller') {
			// Add joystick pos to player velocity
			this.vel.x += leftJoystick.x;
			this.vel.y += leftJoystick.y;
			// Shoot when aiming with right joystick
			if (rightJoystick.x != 0 || rightJoystick.y != 0) {
				this.inventory.getEquippedItem().shoot(this.inventory.getEquippedItem().amount);
				this.angle = Math.atan2(rightJoystick.y, rightJoystick.x);
				this.rotation = averageNums(this.rotation, this.angle, this.rotationSpeed);
			} else {
				this.angle = 1;
			}
		} else {
			// Calculate player angle in relation to mouse
			this.dx = canvas.mouseX - (this.pos.x);
			this.dy = canvas.mouseY - (this.pos.y);
			this.angle = Math.atan2(this.dy, this.dx);
			this.rotation = this.angle;
		}
		// Constrain player to screen
		if (this.pos.x < this.width/2) {
			this.vel.x = 0;
			this.pos.x = this.width/2;
		}
		if (this.pos.x > width - this.width/2) {
			this.vel.x = 0;
			this.pos.x = width - this.width/2;
		}
		if (this.pos.y < this.height/2) {
			this.vel.y = 0;
			this.pos.y = this.height/2;
		}
		if (this.pos.y > height - this.height/2) {
			this.vel.y = 0;
			this.pos.y = height - this.height/2;
		}
		// Set flipped variable depending if player is facing left or right
		if (this.rotation < -1.5 || this.rotation > 1.5) {
			this.flipped = true;
		} else {
			this.flipped = false;
		}
		// Update player health bar percent
		this.healthBar.update();
		// Manage inventory slots
		if (this.inventory.slotActive == 0) this.inventory.selectSlot(0);
		if (this.inventory.slotActive == 1) this.inventory.selectSlot(1);
		if (this.inventory.slotActive == 2) this.inventory.selectSlot(2);
		if (this.inventory.slotActive == 3) this.inventory.selectSlot(3);
		if (this.inventory.slotActive == 4) this.inventory.selectSlot(4);
	}
	display() {

		Game.c.save();
		// Draw Shadow
		Game.c.translate(this.pos.x, this.pos.y + Math.sin(this.rotation)*10);
		Game.c.drawImage(spr_shadow, -this.width/2, (this.height/2)-8, this.width, 16);

		Game.c.restore();

		Game.c.save();
		// Flip sprite on Y axis when updside down
		if (this.flipped) {
			Game.c.scale(1, -1);
			Game.c.translate(this.pos.x, -this.pos.y);
			Game.c.rotate(-this.rotation);
		} else {
			Game.c.scale(1, 1);
			Game.c.translate(this.pos.x, this.pos.y);
			Game.c.rotate(this.rotation);
		}
		// Draw player sprite
		Game.c.drawImage(this.sprite, -this.width / 2, -this.height / 2, this.width, this.height);
		// Run health bar and inventory within the save restore to inherit player position and rotation
		this.healthBar.display(0, this.height / 1.5);
		// Run inventory and render ontop of the player
		this.inventory.run();

		Game.c.restore();
		// Handle Timer
		if (g_paused && !this.timer.paused) {
	      console.log(this.id + ' timer paused.');
	      this.timer.pause();
	    }
	    if (!g_paused && this.timer.paused) {
	      console.log(this.id + ' timer resumed.');
	      this.timer.resume();
	    }
	}
	moveUp() {
		if (this.vel.y > -this.speed) this.vel.y--;
	}
	moveDown() {
		if (this.vel.y <  this.speed) this.vel.y++;
	}
	moveLeft() {
		if (this.vel.x > -this.speed) this.vel.x--;
	}
	moveRight() {
		if (this.vel.x <  this.speed) this.vel.x++;
	}
	dash(vel, callback) {
		if (!this.dashing) {
			this.dashing = true;
			this.vel.multiply(vel);
			callback();
		}
	}
	run() {
		this.update();
		this.display();
	}
}
