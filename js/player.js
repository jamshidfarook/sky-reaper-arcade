window.PlayerModule = (() => {
  function createPlayer(canvas) {
    return {
      x: canvas.width / 2,
      y: canvas.height - 120,
      w: 78,
      h: 102,
      speed: 420,
      health: 100,
      maxHealth: 100,
      lives: 3,
      invulnerable: 0,
      hitbox: {
        x: 0.24,
        y: 0.16,
        w: 0.52,
        h: 0.64
      }
    };
  }

  function resetPlayer(player, canvas) {
    player.x = canvas.width / 2;
    player.y = canvas.height - 120;
    player.health = 100;
    player.maxHealth = 100;
    player.lives = 3;
    player.invulnerable = 0;
  }

  function updatePlayer(player, keys, dt, canvas) {
    const moveX = (keys['ArrowRight'] || keys['d'] ? 1 : 0) - (keys['ArrowLeft'] || keys['a'] ? 1 : 0);
    const moveY = (keys['ArrowDown'] || keys['s'] ? 1 : 0) - (keys['ArrowUp'] || keys['w'] ? 1 : 0);
    const len = Math.hypot(moveX, moveY) || 1;

    player.x += (moveX / len) * player.speed * dt;
    player.y += (moveY / len) * player.speed * dt;

    player.x = Math.max(20, Math.min(canvas.width - player.w - 20, player.x));
    player.y = Math.max(20, Math.min(canvas.height - player.h - 20, player.y));

    if (player.invulnerable > 0) {
      player.invulnerable -= dt;
    }
  }

  function getPlayerHitbox(player) {
    return {
      x: player.x + player.w * player.hitbox.x,
      y: player.y + player.h * player.hitbox.y,
      w: player.w * player.hitbox.w,
      h: player.h * player.hitbox.h
    };
  }

  function drawPlayer(ctx, player, heroImage) {
    if (player.invulnerable > 0 && Math.floor(player.invulnerable * 12) % 2 === 0) return;

    if (heroImage && heroImage.complete && heroImage.naturalWidth > 0) {
      ctx.drawImage(heroImage, player.x, player.y, player.w, player.h);
    } else {
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.moveTo(player.x + player.w / 2, player.y);
      ctx.lineTo(player.x + player.w, player.y + player.h);
      ctx.lineTo(player.x, player.y + player.h);
      ctx.closePath();
      ctx.fill();
    }
  }

  return {
    createPlayer,
    resetPlayer,
    updatePlayer,
    getPlayerHitbox,
    drawPlayer
  };
})();