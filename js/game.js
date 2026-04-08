const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = true;

const ui = UIModule.getUI();
let lastMenuScreen = 'homeScreen';
const mobileBlockScreen = document.getElementById('mobileBlockScreen');

function isMobileDevice() {
  return (
    /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|Mobile/i.test(navigator.userAgent) ||
    window.innerWidth <= 900 ||
    (('ontouchstart' in window || navigator.maxTouchPoints > 0) && window.innerWidth <= 1024)
  );
}

function applyDeviceAccess() {
  const blocked = isMobileDevice();

  if (blocked) {
    game.state = 'blocked';
    ui.hud.classList.remove('active');
    UIModule.showScreen(ui, 'mobileBlockScreen');
    Music.stop();
  } else {
    if (game.state === 'blocked') {
      game.state = 'home';
      UIModule.showScreen(ui, 'loadingScreen');
    }
    if (mobileBlockScreen) {
      mobileBlockScreen.classList.remove('active');
    }
  }

  return blocked;
}

const settings = {
  musicVolume: 0.5,
  sfxVolume: 0.7,
  difficulty: 'medium',
  shootSfx: true
};

const difficultyMap = {
  easy: { enemySpeed: 0.92, spawnRate: 0.88, enemyShoot: 0.8, bossHealth: 0.85 },
  medium: { enemySpeed: 1, spawnRate: 1, enemyShoot: 1, bossHealth: 1 },
  hard: { enemySpeed: 1.12, spawnRate: 1.12, enemyShoot: 1.08, bossHealth: 1.18 }
};


const game = {
  state: 'home',
  keys: {},
  lastTime: 0,
  score: 0,
  highScore: Number(localStorage.getItem('skyReaperHighScore') || 0),
  stars: [],
  bullets: [],
  enemyBullets: [],
  enemies: [],
  explosions: [],
  particles: [],
  powerups: [],
  boss: null,
  bossSpawned: false,
  bossDefeated: false,
  bossDying: false,
  bossAlertUntil: 0,
  nextBossAllowedAt: 0,
  shake: 0,
  spawnTimer: 0,
  playerShootTimer: 0,
  enemyIdCounter: 0,
  progressLevel: 1,
  combo: 1,
  comboTimer: 0,
  bossWave: 1,
  nextBossScore: 500,
  lastBossScore: 0,
  difficultyScale: 1,
  bossFireCycle: 0
};

const player = PlayerModule.createPlayer(canvas);

const assets = {
  hero: new Image(),
  level1: new Image(),
  level2: new Image(),
  level3: new Image(),
  level4: new Image(),
  boss: new Image(),
  explosion: new Image()
};

assets.hero.src = 'assets/hero.png';
assets.level1.src = 'assets/level1.png';
assets.level2.src = 'assets/level2.png';
assets.level3.src = 'assets/level3.png';
assets.level4.src = 'assets/level4.png';
assets.boss.src = 'assets/boss.png';
assets.explosion.src = 'assets/explosion.gif';

function getPlayerMuzzles() {
  return [
    { x: player.x + player.w * 0.33, y: player.y + player.h * 0.12 },
    { x: player.x + player.w * 0.67, y: player.y + player.h * 0.12 }
  ];
}

function resizeCanvas() {
  const aspect = 16 / 9;

  let width = window.innerWidth;
  let height = window.innerHeight;

  if (width / height > aspect) {
    width = height * aspect;
  } else {
    height = width / aspect;
  }

  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  canvas.style.left = `${(window.innerWidth - width) / 2}px`;
  canvas.style.top = `${(window.innerHeight - height) / 2}px`;

  positionHud();
}

window.addEventListener('resize', () => {
  resizeCanvas();
  applyDeviceAccess();
});
resizeCanvas();
applyDeviceAccess();

function positionHud() {
  const width = parseFloat(canvas.style.width) || canvas.clientWidth;
  const height = parseFloat(canvas.style.height) || canvas.clientHeight;
  const left = parseFloat(canvas.style.left) || 0;
  const top = parseFloat(canvas.style.top) || 0;

  ui.hud.style.left = `${left + 16}px`;
  ui.hud.style.right = `${window.innerWidth - left - width + 16}px`;
  ui.hud.style.top = `${top + 16}px`;
}

function initStars() {
  game.stars = Array.from({ length: 120 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    size: Math.random() * 2 + 1,
    speed: Math.random() * 80 + 40,
    alpha: Math.random() * 0.8 + 0.2
  }));
}

initStars();
UIModule.syncVolumeUI(ui, settings);
UIModule.updateHUD(ui, game, player);

function resetGame() {
  game.score = 0;
  game.bullets = [];
  game.enemyBullets = [];
  game.enemies = [];
  game.explosions = [];
  game.particles = [];
  game.powerups = [];
  game.boss = null;
  game.bossSpawned = false;
  game.bossDefeated = false;
  game.bossDying = false;
  game.bossAlertUntil = 0;
  game.nextBossAllowedAt = 0;
  game.shake = 0;
  game.spawnTimer = 0;
  game.playerShootTimer = 0;
  game.enemyIdCounter = 0;
  game.progressLevel = 1;
  game.combo = 1;
  game.comboTimer = 0;
  game.bossWave = 1;
  game.nextBossScore = 500;
  game.lastBossScore = 0;
  game.difficultyScale = 1;
  game.bossFireCycle = 0;
  PlayerModule.resetPlayer(player, canvas);
  player.powerLevel = 1;
  player.ammoLevel = 1;
  player.vShot = false;
  player.vShotTimer = 0;
  player.vShotTier = 0;
  player.shieldActive = false;
  player.shieldHealth = 0;
  player.shieldTimer = 0;
  UIModule.updateHUD(ui, game, player);
}

function startGame() {
  if (applyDeviceAccess()) return;

  resetGame();
  game.state = 'playing';
  UIModule.showScreen(ui, null);
  ui.hud.classList.add('active');
}

function pauseGame() {
  if (game.state !== 'playing') return;
  game.state = 'paused';
  Music.pause();
  UIModule.showScreen(ui, 'pauseScreen');
}

function resumeGame() {
  if (game.state !== 'paused') return;
  game.state = 'playing';
  Music.resume();
  UIModule.showScreen(ui, null);
}

function exitToHome() {
  if (applyDeviceAccess()) return;

  game.state = 'home';
  ui.hud.classList.remove('active');
  lastMenuScreen = 'homeScreen';
  Music.playHome();
  UIModule.showScreen(ui, 'homeScreen');
}

function showGameOver() {
  game.state = 'gameover';
  ui.hud.classList.remove('active');
  lastMenuScreen = 'gameOverScreen';
  UIModule.showScreen(ui, 'gameOverScreen');
}

function rectsIntersect(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function refreshDifficultyScale() {
  game.difficultyScale = 1 + Math.floor(game.score / 400) * 0.08;
}

function createExplosion(x, y, size = 56, duration = 0.45) {
  game.explosions.push({ x, y, size, duration, time: 0 });

  for (let i = 0; i < 12; i++) {
    const maxLife = 0.55 + Math.random() * 0.35;
    game.particles.push({
      x,
      y,
      vx: Math.cos((Math.PI * 2 * i) / 12 + Math.random() * 0.4) * (80 + Math.random() * 180),
      vy: Math.sin((Math.PI * 2 * i) / 12 + Math.random() * 0.4) * (80 + Math.random() * 180),
      life: maxLife,
      maxLife,
      size: 2 + Math.random() * 4,
      color: Math.random() > 0.5 ? '#fb923c' : '#facc15'
    });
  }
}

function registerKill(baseScore) {
  game.combo += 1;
  game.comboTimer = 2.2;
  const bonus = Math.round(baseScore * (1 + (game.combo - 1) * 0.12));
  game.score += bonus;
  refreshDifficultyScale();
  UIModule.showCombo(ui, game.combo);
}

function resetCombo() {
  game.combo = 1;
  game.comboTimer = 0;
}

function killEnemy(enemyIndex) {
  const enemy = game.enemies[enemyIndex];
  const ex = enemy.x + enemy.w / 2;
  const ey = enemy.y + enemy.h / 2;
  createExplosion(ex, ey, 60, 0.42);
  SFX.explosion();
  registerKill(enemy.score);
  PowerupModule.maybeSpawnPowerup(game, ex, ey);
  game.enemies.splice(enemyIndex, 1);
  UIModule.updateHUD(ui, game, player);
}

function bossDeathSequence(now) {
  if (!game.boss || game.bossDying) return;
  game.bossDying = true;
  SFX.bossExplosion();

  const bx = game.boss.x;
  const by = game.boss.y;
  const bw = game.boss.w;
  const bh = game.boss.h;

  for (let i = 0; i < 5; i++) {
    setTimeout(() => {
      createExplosion(
        bx + Math.random() * bw,
        by + Math.random() * bh,
        100 + Math.random() * 40,
        0.6
      );
      game.shake = Math.max(game.shake, 18);
    }, i * 120);
  }

  setTimeout(() => {
    const bx2 = bx + bw / 2;
    const by2 = by + bh / 2;
    registerKill(1000);
    PowerupModule.spawnBossPowerup(game, bx2, by2);
    game.boss = null;
    game.bossDefeated = true;
    game.bossSpawned = false;
    game.bossDying = false;
    game.lastBossScore = game.score;
    game.bossWave += 1;
    game.nextBossScore = game.lastBossScore + 1150 + (game.bossWave - 1) * 350;
    game.nextBossAllowedAt = now + 12000;
    game.bossFireCycle = 0;
    UIModule.updateHUD(ui, game, player);
  }, 700);
}

function damagePlayer(amount) {
  if (player.invulnerable > 0) return;

  if (player.shieldActive && player.shieldHealth > 0) {
    player.shieldHealth -= 1;
    game.shake = Math.max(game.shake, 4);
    if (player.shieldHealth <= 0) {
      player.shieldActive = false;
    }
    return;
  }

  player.health -= amount;
  player.invulnerable = 1.0;
  game.shake = Math.max(game.shake, 8);
  resetCombo();
  SFX.playerHit();

  if (player.health <= 0) {
    player.lives -= 1;
    SFX.playerDeath();
    createExplosion(player.x + player.w / 2, player.y + player.h / 2, 90, 0.5);

    player.ammoLevel = Math.max(1, (player.ammoLevel || 1) - 1);
    player.powerLevel = Math.max(1, (player.powerLevel || 1) - 1);

    if (player.lives <= 0) {
      game.highScore = Math.max(game.highScore, game.score);
      localStorage.setItem('skyReaperHighScore', game.highScore);
      showGameOver();
    } else {
      player.health = player.maxHealth;
      player.x = canvas.width / 2;
      player.y = canvas.height - 120;
      player.invulnerable = 2.0;
    }
  }

  UIModule.updateHUD(ui, game, player);
}

function update(dt, now) {
  if (game.state !== 'playing') return;

  const diff = difficultyMap[settings.difficulty];
  game.shake = Math.max(0, game.shake - dt * 30);

  if (game.comboTimer > 0) {
    game.comboTimer -= dt;
    if (game.comboTimer <= 0) {
      resetCombo();
    }
  }

  for (const star of game.stars) {
    star.y += star.speed * dt;
    if (star.y > canvas.height) {
      star.y = -4;
      star.x = Math.random() * canvas.width;
    }
  }

  PlayerModule.updatePlayer(player, game.keys, dt, canvas);
  const playerHitbox = PlayerModule.getPlayerHitbox(player);

  PowerupModule.updatePowerups(game, player, dt, playerHitbox, rectsIntersect);

  game.playerShootTimer -= dt;
  const shooting = game.keys[' '] || game.keys['Enter'] || true;
  if (shooting && game.playerShootTimer <= 0) {
    PowerupModule.firePlayerBullets(game, player);
    if (settings.shootSfx) SFX.shoot();
    game.playerShootTimer = Math.max(0.09, 0.16 - Math.min(0.04, (game.combo - 1) * 0.002));
  }

  game.spawnTimer -= dt;
  const allowRegularSpawns = !game.boss && !game.bossDying;

  if (game.spawnTimer <= 0 && allowRegularSpawns) {
    const available = [1, 2];
    if (game.score >= 140) available.push(3);
    if (game.score >= 360) available.push(4);

    game.progressLevel = game.score >= 360 ? 4 : game.score >= 140 ? 3 : 2;
    EnemyModule.spawnEnemy(game, available[Math.floor(Math.random() * available.length)], assets, settings, canvas, game.difficultyScale);
    game.spawnTimer = Math.max(0.4, ((0.88 + Math.random() * 0.55) / diff.spawnRate) - (game.difficultyScale - 1) * 0.06);
  }

  if (!game.boss && !game.bossDying && now >= game.nextBossAllowedAt && game.score >= game.nextBossScore) {
    BossModule.spawnBoss(game, settings, ui, now, canvas, game.difficultyScale + (game.bossWave - 1) * 0.08);
  }

  for (let i = game.bullets.length - 1; i >= 0; i--) {
    const bullet = game.bullets[i];
    bullet.x += (bullet.vx || 0) * dt;
    bullet.y += bullet.vy * dt;
    if (bullet.y + bullet.h < 0 || bullet.x < -60 || bullet.x > canvas.width + 60) {
      game.bullets.splice(i, 1);
    }
  }

  for (let i = game.enemyBullets.length - 1; i >= 0; i--) {
    const bullet = game.enemyBullets[i];
    bullet.x += (bullet.vx || 0) * dt;
    bullet.y += bullet.vy * dt;

    if (bullet.y > canvas.height + 50 || bullet.x < -70 || bullet.x > canvas.width + 70) {
      game.enemyBullets.splice(i, 1);
      continue;
    }

    if (rectsIntersect(bullet, playerHitbox)) {
      damagePlayer(bullet.damage || 10);
      game.enemyBullets.splice(i, 1);
    }
  }

  for (let i = game.enemies.length - 1; i >= 0; i--) {
    const enemy = game.enemies[i];
    enemy.y += enemy.vy * dt;
    enemy.x += Math.sin(now * 0.0015 + enemy.waveOffset) * (34 + enemy.type * 3) * dt + enemy.vx * dt;

    if (enemy.x < 0 || enemy.x + enemy.w > canvas.width) {
      enemy.vx *= -1;
    }

    enemy.shootTimer -= dt;
    if (enemy.shootTimer <= 0) {
      EnemyModule.enemyShoot(game, enemy, game.difficultyScale);
      enemy.shootTimer = Math.max(0.5, (1.25 + Math.random() * 1.1) / (diff.enemyShoot + (game.difficultyScale - 1) * 0.22));
    }

    const enemyHitbox = EnemyModule.getEnemyHitbox(enemy);
    if (rectsIntersect(enemyHitbox, playerHitbox)) {
      damagePlayer(18 + enemy.type * 4);
      game.enemies.splice(i, 1);
      createExplosion(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, 60, 0.35);
      continue;
    }

    if (enemy.y > canvas.height + 50) {
      game.enemies.splice(i, 1);
      continue;
    }
  }

  if (game.boss && !game.bossDying) {
    if (game.boss.entering) {
      const distance = game.boss.targetY - game.boss.y;
      game.boss.y += distance * 4 * dt;

      if (Math.abs(distance) < 2) {
        game.boss.y = game.boss.targetY;
        game.boss.entering = false;
        game.shake = Math.max(game.shake, 10);
      }
    } else if (now >= game.bossAlertUntil) {
      game.boss.x += game.boss.vx * dt;
      if (game.boss.x < 40 || game.boss.x + game.boss.w > canvas.width - 40) {
        game.boss.vx *= -1;
      }

      game.boss.shootTimer -= dt;
      if (game.boss.shootTimer <= 0) {
        game._playerRef = player;
        BossModule.bossShoot(game, game.boss, game.bossFireCycle, canvas);
        game.bossFireCycle += 1;
        game.boss.shootTimer = Math.max(0.4, 1.02 - Math.min(0.28, (game.bossWave - 1) * 0.04));
      }

      const bossHitbox = BossModule.getBossHitbox(game.boss);
      if (rectsIntersect(bossHitbox, playerHitbox)) {
        damagePlayer(35);
      }
    }
  }

  for (let i = game.bullets.length - 1; i >= 0; i--) {
    const bullet = game.bullets[i];
    let hit = false;

    for (let j = game.enemies.length - 1; j >= 0; j--) {
      const enemy = game.enemies[j];
      const enemyHitbox = EnemyModule.getEnemyHitbox(enemy);
      if (rectsIntersect(bullet, enemyHitbox)) {
        enemy.health -= bullet.damage;
        game.bullets.splice(i, 1);
        hit = true;
        if (enemy.health <= 0) {
          killEnemy(j);
        }
        break;
      }
    }

    if (hit) continue;

    if (game.boss && !game.bossDying && now >= game.bossAlertUntil) {
      const bossHitbox = BossModule.getBossHitbox(game.boss);
      if (rectsIntersect(bullet, bossHitbox)) {
        game.boss.health -= bullet.damage;
        game.bullets.splice(i, 1);
        if (game.boss.health <= 0) {
          bossDeathSequence(now);
        }
      }
    }
  }

  for (let i = game.explosions.length - 1; i >= 0; i--) {
    const explosion = game.explosions[i];
    explosion.time += dt;
    if (explosion.time >= explosion.duration) {
      game.explosions.splice(i, 1);
    }
  }

  for (let i = game.particles.length - 1; i >= 0; i--) {
    const particle = game.particles[i];
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vx *= 0.98;
    particle.vy *= 0.98;
    particle.life -= dt;
    if (particle.life <= 0) {
      game.particles.splice(i, 1);
    }
  }

  UIModule.updateHUD(ui, game, player);
}

function drawBackground() {
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, '#06111f');
  grad.addColorStop(1, '#010409');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (const star of game.stars) {
    ctx.globalAlpha = star.alpha;
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(star.x, star.y, star.size, star.size * 2);
  }

  ctx.globalAlpha = 1;
}

function drawBullets() {
  for (const bullet of game.bullets) {
    ctx.fillStyle = bullet.color || '#60a5fa';
    ctx.shadowColor = bullet.color || '#60a5fa';
    ctx.shadowBlur = 12;
    ctx.fillRect(bullet.x, bullet.y, bullet.w, bullet.h);
  }

  for (const bullet of game.enemyBullets) {
    ctx.fillStyle = bullet.color || '#fb7185';
    ctx.shadowColor = bullet.color || '#fb7185';
    ctx.shadowBlur = 10;
    ctx.fillRect(bullet.x, bullet.y, bullet.w, bullet.h);
  }

  ctx.shadowBlur = 0;
}

function drawExplosions() {
  for (const explosion of game.explosions) {
    const scale = 1 + (explosion.time / explosion.duration) * 0.8;
    const size = explosion.size * scale;

    if (assets.explosion.complete && assets.explosion.naturalWidth > 0) {
      ctx.globalAlpha = 1 - explosion.time / explosion.duration;
      ctx.drawImage(assets.explosion, explosion.x - size / 2, explosion.y - size / 2, size, size);
      ctx.globalAlpha = 1;
    } else {
      const radius = size / 2;
      const gradient = ctx.createRadialGradient(explosion.x, explosion.y, 0, explosion.x, explosion.y, radius);
      gradient.addColorStop(0, 'rgba(255,255,180,0.95)');
      gradient.addColorStop(0.5, 'rgba(255,140,0,0.85)');
      gradient.addColorStop(1, 'rgba(255,0,0,0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(explosion.x, explosion.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  for (const particle of game.particles) {
    ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
    ctx.fillStyle = particle.color;
    ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
  }

  ctx.globalAlpha = 1;
}

function render() {
  ctx.save();

  if (game.shake > 0) {
    ctx.translate((Math.random() - 0.5) * game.shake, (Math.random() - 0.5) * game.shake);
  }

  drawBackground();
  EnemyModule.drawEnemies(ctx, game.enemies);
  BossModule.drawBoss(ctx, game.boss, assets.boss, canvas);

  if (!game.boss) {
    const barW = 360;
    const barH = 16;
    const x = canvas.width / 2 - barW / 2;
    const y = 18;
    const denom = Math.max(1, game.nextBossScore - game.lastBossScore);
    const progress = Math.max(0, Math.min(1, (game.score - game.lastBossScore) / denom));
    const percent = Math.round(progress * 100);

    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(x, y, barW, barH);

    ctx.fillStyle = '#22c55e';
    ctx.fillRect(x, y, barW * progress, barH);

    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.strokeRect(x, y, barW, barH);

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px Arial';
    ctx.fillText('BOSS INCOMING', x + 8, y - 4);
    ctx.fillText(`${percent}%`, x + barW - 38, y - 4);
  }

  drawBullets();
  PowerupModule.drawPowerups(ctx, game.powerups);
  PowerupModule.drawShield(ctx, player);
  PlayerModule.drawPlayer(ctx, player, assets.hero);
  drawExplosions();

  ctx.restore();
}

function loop(timestamp) {
  if (game.state === 'blocked') {
    render();
    requestAnimationFrame(loop);
    return;
  }

  const dt = Math.min(0.033, (timestamp - game.lastTime) / 1000 || 0);
  game.lastTime = timestamp;
  update(dt, timestamp);
  render();
  requestAnimationFrame(loop);
}

document.addEventListener('keydown', event => {
  game.keys[event.key] = true;

  if (event.key === 'Escape') {
    if (game.state === 'playing') pauseGame();
    else if (game.state === 'paused') resumeGame();
  }
});

document.addEventListener('keyup', event => {
  game.keys[event.key] = false;
});

ui.continueBtn.addEventListener('click', () => {
  if (applyDeviceAccess()) return;

  Music.unlockAudio();
  Music.playHome();
  lastMenuScreen = 'homeScreen';
  UIModule.showScreen(ui, 'homeScreen');
});

ui.playBtn.addEventListener('click', () => {
  if (applyDeviceAccess()) return;

  SFX.init();
  Music.unlockAudio();
  Music.playGame();
  startGame();
});

ui.retryBtn.addEventListener('click', startGame);

ui.changeDifficultyBtn.addEventListener('click', () => {
  lastMenuScreen = 'gameOverScreen';
  UIModule.showScreen(ui, 'settingsScreen');
});

ui.gameOverHomeBtn.addEventListener('click', exitToHome);

ui.settingsBtn.addEventListener('click', () => {
  lastMenuScreen = 'homeScreen';
  UIModule.showScreen(ui, 'settingsScreen');
});

ui.aboutBtn.addEventListener('click', () => UIModule.showScreen(ui, 'aboutScreen'));

ui.settingsBackBtn.addEventListener('click', () => {
  UIModule.showScreen(ui, lastMenuScreen);
});

ui.aboutBackBtn.addEventListener('click', () => UIModule.showScreen(ui, 'homeScreen'));
ui.pauseBtn.addEventListener('click', pauseGame);
ui.resumeBtn.addEventListener('click', resumeGame);
ui.exitBtn.addEventListener('click', exitToHome);

function wireVolume(slider, target) {
  slider.addEventListener('input', () => {
    settings[target] = Number(slider.value);
    UIModule.syncVolumeUI(ui, settings);

    if (target === 'sfxVolume') SFX.setVolume(settings.sfxVolume);
    if (target === 'musicVolume') Music.setVolume(settings.musicVolume);
  });
}

wireVolume(ui.musicVolume, 'musicVolume');
wireVolume(ui.sfxVolume, 'sfxVolume');
wireVolume(ui.pauseMusicVolume, 'musicVolume');
wireVolume(ui.pauseSfxVolume, 'sfxVolume');

function wireShootSfxToggle(checkbox) {
  checkbox.addEventListener('change', () => {
    settings.shootSfx = checkbox.checked;
    UIModule.syncVolumeUI(ui, settings);
  });
}

wireShootSfxToggle(ui.shootSfxToggle);
wireShootSfxToggle(ui.pauseShootSfxToggle);

ui.difficulty.addEventListener('change', () => {
  settings.difficulty = ui.difficulty.value;
  UIModule.syncVolumeUI(ui, settings);
});

requestAnimationFrame(loop);