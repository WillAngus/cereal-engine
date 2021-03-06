// ParticleSystem Class : ParticleSystem(Maximum_Particles)
class ParticleSystem {
  constructor(max) {
    this.max = max;
    this.particles = [];
  }
  run() {
    // Loop through particles array
    for (let i = this.particles.length-1; i >= 0; i--) {
      var p = this.particles[i];

      if (!g_paused) p.update();
      p.display();
    }
  }
  spawnParticle(id, spr, x, y, w, h, v, a, hl, d) {
    if (this.particles.length < this.max) {
      this.particles.push(new Particle(id, spr, x, y, w, h, v, a, hl, d));
    } else {
      // Log warning if particle limit reached or exceeded
      console.warn('Could not spawn particle. Maximum number of particles reached: ' + this.max);
    }
  }
  removeParticle(p) {
    // Remove particle from array when killed
    let i = this.particles.indexOf(p);
    return this.particles.splice(i, 1);
  }
}
