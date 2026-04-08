window.PowerupModule = (() => {

  // Power level bullet colors (level 1 = weakest, 5 = red/strongest)
  const POWER_COLORS = [
    '#60a5fa', // 1 - blue
    '#a78bfa', // 2 - purple
    '#34d399', // 3 - green
    '#fbbf24', // 4 - yellow/gold
    '#ef4444'  // 5 - red (top)
  ];

  const POWERUP_TYPES = ['shield', 'life', 'power', 'vshooting1', 'vshooting2', 'vshooting3', 'vshooting4', 'vshooting5', 'ammo'];

  const VSHOT_TIERS = {
    vshooting1: { color: '#60a5fa', glow: '#3b82f6', label: 'V-1',  bulletColor: '#60a5fa', spread: 180, vy: -580, damage: 0.6, count: 2 },
    vshooting2: { color: '#a78bfa', glow: '#7c3aed', label: 'V-2',  bulletColor: '#a78bfa', spread: 210, vy: -600, damage: 0.75, count: 2 },
    vshooting3: { color: '#34d399', glow: '#059669', label: 'V-3',  bulletColor: '#34d399', spread: 230, vy: -620, damage: 0.9,  count: 4 },
    vshooting4: { color: '#fbbf24', glow: '#d97706', label: 'V-4',  bulletColor: '#fbbf24', spread: 250, vy: -640, damage: 1.05, count: 4 },
    vshooting5: { color: '#ef4444', glow: '#b91c1c', label: 'V-5',  bulletColor: '#ef4444', spread: 270, vy: -660, damage: 1.2,  count: 6 }
  };

  const POWERUP_STYLE = {
    shield:     { color: '#38bdf8', glow: '#0ea5e9', label: 'SHIELD' },
    life:       { color: '#f472b6', glow: '#ec4899', label: 'LIFE'   },
    power:      { color: '#fb923c', glow: '#f97316', label: 'POWER'  },
    vshooting1: { color: '#60a5fa', glow: '#3b82f6', label: 'V-1'   },
    vshooting2: { color: '#a78bfa', glow: '#7c3aed', label: 'V-2'   },
    vshooting3: { color: '#34d399', glow: '#059669', label: 'V-3'   },
    vshooting4: { color: '#fbbf24', glow: '#d97706', label: 'V-4'   },
    vshooting5: { color: '#ef4444', glow: '#b91c1c', label: 'V-5'   },
    ammo:       { color: '#4ade80', glow: '#16a34a', label: 'AMMO+' }
  };

  function spawnPowerup(game, x, y) {
    // Life is very rare — 4% chance; others share the rest equally
    const rand = Math.random();
    let type;
    if (rand < 0.04) {
      type = 'life';
    } else {
      const common = ['shield', 'power', 'vshooting1', 'vshooting2', 'vshooting3', 'vshooting4', 'vshooting5', 'ammo'];
      type = common[Math.floor(Math.random() * common.length)];
    }
    game.powerups.push({
      type,
      x: x - 20,
      y: y - 20,
      w: 40,
      h: 40,
      vy: 90,
      age: 0,
      lifetime: 8.0
    });
  }

  function maybeSpawnPowerup(game, x, y) {
    // 20% chance on enemy kill, 100% on boss kill
    if (Math.random() < 0.20) {
      spawnPowerup(game, x, y);
    }
  }

  function spawnBossPowerup(game, x, y) {
    const pool = ['shield', 'power', 'vshooting1', 'vshooting2', 'vshooting3', 'vshooting4', 'vshooting5', 'ammo'];
    for (let i = 0; i < 2; i++) {
      game.powerups.push({
        type: pool[Math.floor(Math.random() * pool.length)],
        x: x - 20 + (i === 0 ? -40 : 40),
        y: y,
        w: 40,
        h: 40,
        vy: 80,
        age: 0,
        lifetime: 10.0
      });
    }
  }

  function applyPowerup(type, player, game) {
    switch (type) {
      case 'shield':
        player.shieldActive = true;
        player.shieldHealth = 3;
        player.shieldTimer = 10.0;
        SFX.shieldUp();
        break;

      case 'life':
        if (player.lives < 5) {
          player.lives += 1;
        }
        SFX.lifeUp();
        break;

      case 'power':
        if (!player.powerLevel) player.powerLevel = 1;
        if (player.powerLevel < 5) {
          player.powerLevel += 1;
        }
        SFX.powerup();
        break;

      case 'vshooting1':
      case 'vshooting2':
      case 'vshooting3':
      case 'vshooting4':
      case 'vshooting5': {
        const newTier = parseInt(type.slice(-1), 10);
        player.vShot = true;
        player.vShotTier = newTier;
        player.vShotTimer = 20.0;
        SFX.powerup();
        break;
      }

      case 'vshooting':
        player.vShot = true;
        player.vShotTier = Math.max(1, player.vShotTier || 0);
        player.vShotTimer = 20.0;
        SFX.powerup();
        break;

      case 'ammo':
        if (!player.ammoLevel) player.ammoLevel = 1;
        if (player.ammoLevel < 5) {
          player.ammoLevel += 1;
        }
        SFX.powerup();
        break;
    }
  }

  function updatePowerups(game, player, dt, playerHitbox, rectsIntersect) {
    for (let i = game.powerups.length - 1; i >= 0; i--) {
      const pu = game.powerups[i];
      pu.y += pu.vy * dt;
      pu.age += dt;

      // Remove if off screen or expired
      if (pu.y > 800 || pu.age >= pu.lifetime) {
        game.powerups.splice(i, 1);
        continue;
      }

      // Collision with player
      if (rectsIntersect(pu, playerHitbox)) {
        applyPowerup(pu.type, player, game);
        game.powerups.splice(i, 1);
        continue;
      }
    }

    // Update shield timer
    if (player.shieldActive) {
      player.shieldTimer -= dt;
      if (player.shieldTimer <= 0 || player.shieldHealth <= 0) {
        player.shieldActive = false;
        player.shieldTimer = 0;
        player.shieldHealth = 0;
      }
    }

    // Update v-shot timer
    if (player.vShot) {
      player.vShotTimer -= dt;
      if (player.vShotTimer <= 0) {
        player.vShot = false;
        player.vShotTimer = 0;
        player.vShotTier = 0;
      }
    }
  }

  function drawPowerups(ctx, powerups) {
    for (const pu of powerups) {
      const style = POWERUP_STYLE[pu.type];
      const cx = pu.x + pu.w / 2;
      const cy = pu.y + pu.h / 2;
      const pulse = 0.85 + 0.15 * Math.sin(pu.age * 5);

      // Fade out last 2 seconds
      const fadeAlpha = pu.age > pu.lifetime - 2 ? (pu.lifetime - pu.age) / 2 : 1;
      ctx.globalAlpha = fadeAlpha;

      // Glow
      ctx.shadowColor = style.glow;
      ctx.shadowBlur = 18 * pulse;

      // Background circle
      ctx.beginPath();
      ctx.arc(cx, cy, 20 * pulse, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fill();

      // Outer ring
      ctx.beginPath();
      ctx.arc(cx, cy, 20 * pulse, 0, Math.PI * 2);
      ctx.strokeStyle = style.color;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Symbol/label
      ctx.shadowBlur = 0;
      ctx.fillStyle = style.color;
      ctx.font = `bold 16px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(style.label, cx, cy);

      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
    }
  }

  function drawShield(ctx, player) {
    if (!player.shieldActive) return;
    const cx = player.x + player.w / 2;
    const cy = player.y + player.h / 2;
    const radius = Math.max(player.w, player.h) * 0.62;
    const pulse = 0.9 + 0.1 * Math.sin(Date.now() * 0.006);

    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 22;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * pulse, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(56,189,248,0.75)`;
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, radius * pulse, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(56,189,248,0.08)`;
    ctx.fill();

    ctx.shadowBlur = 0;
  }

  function getBulletColor(powerLevel) {
    const idx = Math.max(0, Math.min(4, (powerLevel || 1) - 1));
    return POWER_COLORS[idx];
  }

  function getPlayerMuzzles(player, ammoLevel) {
    const level = ammoLevel || 1;
    if (level === 1) {
      return [
        { x: player.x + player.w * 0.5,  y: player.y + player.h * 0.10 }
      ];
    }
    if (level === 2) {
      return [
        { x: player.x + player.w * 0.33, y: player.y + player.h * 0.12 },
        { x: player.x + player.w * 0.67, y: player.y + player.h * 0.12 }
      ];
    }
    if (level === 3) {
      return [
        { x: player.x + player.w * 0.18, y: player.y + player.h * 0.16 },
        { x: player.x + player.w * 0.5,  y: player.y + player.h * 0.08 },
        { x: player.x + player.w * 0.82, y: player.y + player.h * 0.16 }
      ];
    }
    if (level === 4) {
      return [
        { x: player.x + player.w * 0.10, y: player.y + player.h * 0.20 },
        { x: player.x + player.w * 0.33, y: player.y + player.h * 0.12 },
        { x: player.x + player.w * 0.67, y: player.y + player.h * 0.12 },
        { x: player.x + player.w * 0.90, y: player.y + player.h * 0.20 }
      ];
    }
    // Level 5 — five guns
    return [
      { x: player.x + player.w * 0.08, y: player.y + player.h * 0.22 },
      { x: player.x + player.w * 0.28, y: player.y + player.h * 0.13 },
      { x: player.x + player.w * 0.50, y: player.y + player.h * 0.07 },
      { x: player.x + player.w * 0.72, y: player.y + player.h * 0.13 },
      { x: player.x + player.w * 0.92, y: player.y + player.h * 0.22 }
    ];
  }

  function firePlayerBullets(game, player) {
    const color = getBulletColor(player.powerLevel);
    const damage = 12 + ((player.powerLevel || 1) - 1) * 5;
    const muzzles = getPlayerMuzzles(player, player.ammoLevel);

    for (const m of muzzles) {
      game.bullets.push({ x: m.x - 4, y: m.y, w: 8, h: 20, vy: -660, damage, color });
    }
    if (window._gameSettings && window._gameSettings.shootSfx !== false) SFX.shoot();

    // V-shot: tiered diagonal bullets
    if (player.vShot && player.vShotTier) {
      const tier = VSHOT_TIERS[`vshooting${player.vShotTier}`];
      if (tier) {
        const cx = player.x + player.w / 2;
        const cy = player.y + player.h * 0.12;
        const vDamage = Math.round(damage * tier.damage);
        const halfCount = tier.count / 2;

        for (let i = 0; i < halfCount; i++) {
          // Spread the shots evenly; more count = wider/denser spread
          const spreadStep = tier.spread / Math.max(halfCount, 1);
          const vx = tier.spread * 0.5 - i * spreadStep * 0.6;
          game.bullets.push({ x: cx - 4, y: cy, w: 8, h: 18, vx: -vx, vy: tier.vy, damage: vDamage, color: tier.bulletColor });
          game.bullets.push({ x: cx - 4, y: cy, w: 8, h: 18, vx:  vx, vy: tier.vy, damage: vDamage, color: tier.bulletColor });
        }
      }
    }
  }

  return {
    spawnPowerup,
    maybeSpawnPowerup,
    spawnBossPowerup,
    applyPowerup,
    updatePowerups,
    drawPowerups,
    drawShield,
    getBulletColor,
    getPlayerMuzzles,
    firePlayerBullets,
    POWER_COLORS
  };
})();