window.BossModule = (() => {
  function getBossMuzzle(boss, key = 'center') {
    const points = {
      center: { x: 0.5, y: 0.78 },
      left: { x: 0.22, y: 0.62 },
      right: { x: 0.78, y: 0.62 },
      core: { x: 0.5, y: 0.55 }
    };
    const p = points[key] || points.center;
    return {
      x: boss.x + boss.w * p.x,
      y: boss.y + boss.h * p.y
    };
  }

  function getBossHitbox(boss) {
    return {
      x: boss.x + boss.w * 0.14,
      y: boss.y + boss.h * 0.14,
      w: boss.w * 0.72,
      h: boss.h * 0.68
    };
  }

  function spawnBoss(game, settings, ui, now, canvas, difficultyBoost = 1) {
    const difficultyMap = {
      easy: { bossHealth: 0.8 },
      medium: { bossHealth: 1 },
      hard: { bossHealth: 1.4 }
    };

    const cfg = difficultyMap[settings.difficulty];
    const hp = Math.round(900 * cfg.bossHealth * difficultyBoost);
    const wave = game.bossWave || 1;

    game.boss = {
      x: canvas.width / 2 - 170,
      y: -300,
      targetY: 60,
      entering: true,
      w: 340,
      h: 280,
      health: hp,
      maxHealth: hp,
      vx: 110 + difficultyBoost * 10 + wave * 4,
      shootTimer: Math.max(0.45, 1.1 - wave * 0.06),
      phase: 1,
      fireAngle: 0,
      wave
    };

    game.bossSpawned = true;
    game.bossAlertUntil = now + 2600;
    ui.bossAlert.style.display = 'block';
    SFX.bossAlert();

    setTimeout(() => {
      if (game.bossSpawned && game.boss) {
        ui.bossAlert.style.display = 'none';
      }
    }, 2600);
  }

  function shootFan(game, boss, color, speed, count) {
    const origin = getBossMuzzle(boss, 'center');
    const mid = (count - 1) / 2;

    for (let i = 0; i < count; i++) {
      const vx = (i - mid) * 90;
      game.enemyBullets.push({
        x: origin.x - 6,
        y: origin.y,
        w: 12,
        h: 24,
        vx,
        vy: speed,
        damage: 16,
        color
      });
    }
  }

  function shootCircular(game, boss, color, speed, count) {
    const origin = getBossMuzzle(boss, 'core');

    for (let i = 0; i < count; i++) {
      const angle = boss.fireAngle + (Math.PI * 2 * i) / count;
      game.enemyBullets.push({
        x: origin.x - 6,
        y: origin.y - 6,
        w: 12,
        h: 24,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        damage: 18,
        color
      });
    }

    boss.fireAngle += 0.35;
  }

  function shootSides(game, boss, color, speed) {
    const left = getBossMuzzle(boss, 'left');
    const right = getBossMuzzle(boss, 'right');

    game.enemyBullets.push({
      x: left.x - 6,
      y: left.y,
      w: 12,
      h: 24,
      vx: -speed,
      vy: 25,
      damage: 18,
      color
    });

    game.enemyBullets.push({
      x: right.x - 6,
      y: right.y,
      w: 12,
      h: 24,
      vx: speed,
      vy: 25,
      damage: 18,
      color
    });
  }

  function shootDoubleSpiral(game, boss, color, speed, count) {
    const origin = getBossMuzzle(boss, 'core');

    for (let i = 0; i < count; i++) {
      const angle1 = boss.fireAngle + (Math.PI * 2 * i) / count;
      const angle2 = angle1 + Math.PI / count;

      for (const angle of [angle1, angle2]) {
        game.enemyBullets.push({
          x: origin.x - 6,
          y: origin.y - 6,
          w: 10,
          h: 20,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          damage: 16,
          color
        });
      }
    }

    boss.fireAngle += 0.28;
  }

  function shootAimed(game, boss, color, speed, count = 1) {
    const origin = getBossMuzzle(boss, 'center');
    if (!game._playerRef) return;

    const px = game._playerRef.x + game._playerRef.w / 2;
    const py = game._playerRef.y + game._playerRef.h / 2;
    const dx = px - origin.x;
    const dy = py - origin.y;
    const dist = Math.hypot(dx, dy) || 1;
    const spread = 0.18;

    for (let i = 0; i < count; i++) {
      const angleOffset = (i - (count - 1) / 2) * spread;
      const cos = Math.cos(angleOffset);
      const sin = Math.sin(angleOffset);
      const nx = (dx / dist) * cos - (dy / dist) * sin;
      const ny = (dx / dist) * sin + (dy / dist) * cos;

      game.enemyBullets.push({
        x: origin.x - 6,
        y: origin.y,
        w: 14,
        h: 26,
        vx: nx * speed,
        vy: ny * speed,
        damage: 22,
        color
      });
    }
  }

  function shootCross(game, boss, color, speed) {
    const origin = getBossMuzzle(boss, 'core');
    const angles = [0, Math.PI / 2, Math.PI, Math.PI * 1.5];

    for (const angle of angles) {
      game.enemyBullets.push({
        x: origin.x - 6,
        y: origin.y - 6,
        w: 12,
        h: 24,
        vx: Math.cos(angle + boss.fireAngle) * speed,
        vy: Math.sin(angle + boss.fireAngle) * speed,
        damage: 20,
        color
      });
    }

    boss.fireAngle += 0.2;
  }

  function shootLaserWall(game, boss, color, speed, canvas) {
    const y = boss.y + boss.h * 0.7;
    const cols = 9;
    const startX = boss.x + boss.w * 0.1;
    const step = (boss.w * 0.8) / (cols - 1);

    for (let i = 0; i < cols; i++) {
      game.enemyBullets.push({
        x: startX + i * step - 5,
        y,
        w: 10,
        h: 22,
        vy: speed,
        damage: 18,
        color
      });
    }
  }

  function bossShoot(game, boss, cycle, canvas) {
    const wave = boss.wave || 1;
    const baseSpeed = 260 + wave * 12;
    SFX.bossShoot();

    if (wave === 1) {
      const mode = cycle % 2;
      if (mode === 0) shootFan(game, boss, '#ff7849', baseSpeed, 3);
      if (mode === 1) shootAimed(game, boss, '#ffaa44', baseSpeed + 20, 1);
      return;
    }

    if (wave === 2) {
      const mode = cycle % 3;
      if (mode === 0) shootFan(game, boss, '#ff7849', baseSpeed + 10, 5);
      if (mode === 1) shootSides(game, boss, '#ff4d4d', baseSpeed + 30);
      if (mode === 2) shootAimed(game, boss, '#ffdd44', baseSpeed + 40, 2);
      return;
    }

    if (wave === 3) {
      const mode = cycle % 4;
      if (mode === 0) shootFan(game, boss, '#ff7849', baseSpeed + 20, 5);
      if (mode === 1) shootCircular(game, boss, '#ffd166', baseSpeed - 20, 10);
      if (mode === 2) shootSides(game, boss, '#ff4d4d', baseSpeed + 40);
      if (mode === 3) shootAimed(game, boss, '#ff55ff', baseSpeed + 50, 3);
      return;
    }

    if (wave === 4) {
      const mode = cycle % 5;
      if (mode === 0) shootFan(game, boss, '#ff7849', baseSpeed + 25, 7);
      if (mode === 1) shootCircular(game, boss, '#ffd166', baseSpeed, 12);
      if (mode === 2) {
        shootSides(game, boss, '#ff4d4d', baseSpeed + 50);
        shootFan(game, boss, '#ff7849', baseSpeed + 10, 3);
      }
      if (mode === 3) shootDoubleSpiral(game, boss, '#ff88ff', baseSpeed - 30, 6);
      if (mode === 4) shootAimed(game, boss, '#44ffdd', baseSpeed + 60, 3);
      return;
    }

    if (wave === 5) {
      const mode = cycle % 5;
      if (mode === 0) shootFan(game, boss, '#ff7849', baseSpeed + 30, 9);
      if (mode === 1) shootDoubleSpiral(game, boss, '#ff88ff', baseSpeed - 10, 8);
      if (mode === 2) shootAimed(game, boss, '#ffdd00', baseSpeed + 70, 4);
      if (mode === 3) shootCross(game, boss, '#ff44aa', baseSpeed);
      if (mode === 4) {
        shootSides(game, boss, '#ff4d4d', baseSpeed + 60);
        shootCircular(game, boss, '#ffd166', baseSpeed - 40, 8);
      }
      return;
    }

    const mode = cycle % 6;
    if (mode === 0) shootFan(game, boss, '#ff7849', baseSpeed + 35, 9);
    if (mode === 1) shootDoubleSpiral(game, boss, '#ff88ff', baseSpeed, 10);
    if (mode === 2) shootAimed(game, boss, '#ffdd00', baseSpeed + 80, 5);
    if (mode === 3) shootCross(game, boss, '#ff44aa', baseSpeed + 20);
    if (mode === 4) shootLaserWall(game, boss, '#ff2222', baseSpeed + 40, canvas);
    if (mode === 5) {
      shootDoubleSpiral(game, boss, '#aa44ff', baseSpeed - 20, 8);
      shootAimed(game, boss, '#44ffdd', baseSpeed + 50, 3);
    }
  }

  function drawBoss(ctx, boss, bossImage, canvas) {
    if (!boss) return;

    if (bossImage && bossImage.complete && bossImage.naturalWidth > 0) {
      ctx.drawImage(bossImage, boss.x, boss.y, boss.w, boss.h);
    } else {
      ctx.fillStyle = '#f97316';
      ctx.fillRect(boss.x, boss.y, boss.w, boss.h);
    }

    const barW = 360;
    const barH = 16;
    const x = canvas.width / 2 - barW / 2;
    const y = 18;
    const percent = Math.max(0, Math.ceil((boss.health / boss.maxHealth) * 10) * 10);

    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(x, y, barW, barH);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(x, y, barW * Math.max(0, boss.health / boss.maxHealth), barH);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.strokeRect(x, y, barW, barH);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px Arial';
    ctx.fillText('BOSS', x + 8, y - 4);
    ctx.fillText(`${percent}%`, x + barW - 38, y - 4);
  }

  return {
    spawnBoss,
    bossShoot,
    getBossHitbox,
    drawBoss
  };
})();