window.EnemyModule = (() => {
  function getEnemyConfig(level, assets, scale = 1) {
    const configs = {
      1: {
        w: 56,
        h: 74,
        health: 18,
        speed: 140,
        score: 10,
        image: assets.level1,
        bulletColor: '#ff6b6b',
        bulletSize: { w: 8, h: 18 },
        fireMode: 'single',
        hitbox: { x: 0.24, y: 0.18, w: 0.52, h: 0.60 }
      },
      2: {
        w: 68,
        h: 84,
        health: 28,
        speed: 165,
        score: 20,
        image: assets.level2,
        bulletColor: '#22c55e',
        bulletSize: { w: 10, h: 20 },
        fireMode: 'double',
        hitbox: { x: 0.20, y: 0.16, w: 0.60, h: 0.64 }
      },
      3: {
        w: 74,
        h: 90,
        health: 40,
        speed: 190,
        score: 35,
        image: assets.level3,
        bulletColor: '#a855f7',
        bulletSize: { w: 10, h: 22 },
        fireMode: 'mixedCircular',
        hitbox: { x: 0.18, y: 0.14, w: 0.64, h: 0.66 }
      },
      4: {
        w: 86,
        h: 98,
        health: 60,
        speed: 215,
        score: 55,
        image: assets.level4,
        bulletColor: '#fb923c',
        bulletSize: { w: 12, h: 24 },
        fireMode: 'sideburst',
        hitbox: { x: 0.16, y: 0.14, w: 0.68, h: 0.68 }
      }
    };

    const config = configs[level];
    return {
      ...config,
      health: Math.round(config.health * scale),
      speed: config.speed * Math.min(1.85, 1 + (scale - 1) * 0.28),
      score: Math.round(config.score * Math.min(1.8, 1 + (scale - 1) * 0.35))
    };
  }

  function getEnemyHitbox(enemy) {
    const hb = enemy.hitbox || { x: 0.2, y: 0.15, w: 0.6, h: 0.65 };
    return {
      x: enemy.x + enemy.w * hb.x,
      y: enemy.y + enemy.h * hb.y,
      w: enemy.w * hb.w,
      h: enemy.h * hb.h
    };
  }

  function spawnEnemy(game, level, assets, settings, canvas, scale = 1) {
    const difficultyMap = {
      easy: { enemySpeed: 0.9 },
      medium: { enemySpeed: 1 },
      hard: { enemySpeed: 1.15 }
    };

    const cfg = difficultyMap[settings.difficulty];
    const enemyCfg = getEnemyConfig(level, assets, scale);

    game.enemies.push({
      id: ++game.enemyIdCounter,
      type: level,
      x: 60 + Math.random() * (canvas.width - 120),
      y: -120,
      w: enemyCfg.w,
      h: enemyCfg.h,
      vx: (Math.random() * 100 - 50) * 0.4,
      vy: enemyCfg.speed * cfg.enemySpeed,
      health: enemyCfg.health,
      maxHealth: enemyCfg.health,
      score: enemyCfg.score,
      image: enemyCfg.image,
      bulletColor: enemyCfg.bulletColor,
      bulletSize: enemyCfg.bulletSize,
      fireMode: enemyCfg.fireMode,
      hitbox: enemyCfg.hitbox,
      shootTimer: 0.7 + Math.random() * 1.7,
      waveOffset: Math.random() * Math.PI * 2,
      fireAngle: Math.random() * Math.PI * 2
    });
  }

  function enemyShoot(game, enemy, difficultyScale) {
    const baseSpeed = 170 + enemy.type * 18;
    const scoreBoost = Math.max(0, difficultyScale - 1) * 65;
    const speed = baseSpeed + scoreBoost;
    const size = enemy.bulletSize;

    const centerX = enemy.x + enemy.w / 2;
    const centerY = enemy.y + enemy.h / 2;

    if (enemy.fireMode === 'single') {
      game.enemyBullets.push({
        x: centerX - size.w / 2,
        y: centerY - size.h / 2,
        w: size.w,
        h: size.h,
        vy: speed,
        damage: 10 + enemy.type * 2,
        color: enemy.bulletColor
      });
      return;
    }

    if (enemy.fireMode === 'double') {
      const spread = enemy.w * 0.18;

      game.enemyBullets.push({
        x: centerX - spread - size.w / 2,
        y: centerY - size.h / 2,
        w: size.w,
        h: size.h,
        vy: speed,
        damage: 12 + enemy.type * 2,
        color: enemy.bulletColor
      });

      game.enemyBullets.push({
        x: centerX + spread - size.w / 2,
        y: centerY - size.h / 2,
        w: size.w,
        h: size.h,
        vy: speed,
        damage: 12 + enemy.type * 2,
        color: enemy.bulletColor
      });
      return;
    }

    if (enemy.fireMode === 'mixedCircular') {
      const doCircular = Math.random() < 0.45;

      if (doCircular) {
        const shots = 8;
        for (let i = 0; i < shots; i++) {
          const angle = enemy.fireAngle + (Math.PI * 2 * i) / shots;
          game.enemyBullets.push({
            x: centerX - size.w / 2,
            y: centerY - size.h / 2,
            w: size.w,
            h: size.h,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            damage: 14 + enemy.type * 2,
            color: enemy.bulletColor
          });
        }
        enemy.fireAngle += 0.45;
      } else {
        game.enemyBullets.push({
          x: centerX - size.w / 2,
          y: centerY - size.h / 2,
          w: size.w,
          h: size.h,
          vy: speed,
          damage: 14 + enemy.type * 2,
          color: enemy.bulletColor
        });
      }
      return;
    }

    if (enemy.fireMode === 'sideburst') {
      const spread = enemy.w * 0.24;

      game.enemyBullets.push({
        x: centerX - size.w / 2,
        y: centerY - size.h / 2,
        w: size.w,
        h: size.h,
        vy: speed + 8,
        damage: 16 + enemy.type * 2,
        color: enemy.bulletColor
      });

      const useSideShots = Math.random() < 0.38;
      if (useSideShots) {
        game.enemyBullets.push({
          x: centerX - spread - size.w / 2,
          y: centerY - size.h / 2,
          w: size.w,
          h: size.h,
          vx: -speed,
          vy: 24,
          damage: 16 + enemy.type * 2,
          color: enemy.bulletColor
        });

        game.enemyBullets.push({
          x: centerX + spread - size.w / 2,
          y: centerY - size.h / 2,
          w: size.w,
          h: size.h,
          vx: speed,
          vy: 24,
          damage: 16 + enemy.type * 2,
          color: enemy.bulletColor
        });
      }
      return;
    }
  }

  function drawEnemyImage(ctx, enemy) {
    if (enemy.image && enemy.image.complete && enemy.image.naturalWidth > 0) {
      ctx.drawImage(enemy.image, enemy.x, enemy.y, enemy.w, enemy.h);
    } else {
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(enemy.x + enemy.w / 2, enemy.y);
      ctx.lineTo(enemy.x + enemy.w, enemy.y + enemy.h);
      ctx.lineTo(enemy.x, enemy.y + enemy.h);
      ctx.closePath();
      ctx.fill();
    }
  }

  function drawEnemies(ctx, enemies) {
    for (const enemy of enemies) {
      drawEnemyImage(ctx, enemy);
    }
  }

  return {
    spawnEnemy,
    enemyShoot,
    getEnemyHitbox,
    drawEnemies
  };
})();