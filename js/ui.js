window.UIModule = (() => {
  function getUI() {
    return {
      loadingScreen: document.getElementById('loadingScreen'),
      homeScreen: document.getElementById('homeScreen'),
      settingsScreen: document.getElementById('settingsScreen'),
      aboutScreen: document.getElementById('aboutScreen'),
      pauseScreen: document.getElementById('pauseScreen'),
      gameOverScreen: document.getElementById('gameOverScreen'),
      mobileBlockScreen: document.getElementById('mobileBlockScreen'),

      continueBtn: document.getElementById('continueBtn'),
      playBtn: document.getElementById('playBtn'),
      settingsBtn: document.getElementById('settingsBtn'),
      aboutBtn: document.getElementById('aboutBtn'),
      settingsBackBtn: document.getElementById('settingsBackBtn'),
      aboutBackBtn: document.getElementById('aboutBackBtn'),
      resumeBtn: document.getElementById('resumeBtn'),
      exitBtn: document.getElementById('exitBtn'),
      retryBtn: document.getElementById('retryBtn'),
      changeDifficultyBtn: document.getElementById('changeDifficultyBtn'),
      gameOverHomeBtn: document.getElementById('gameOverHomeBtn'),

      pauseBtn: document.getElementById('pauseBtn'),
      hud: document.getElementById('hud'),
      scoreText: document.getElementById('scoreText'),
      livesText: document.getElementById('livesText'),
      levelText: document.getElementById('levelText'),
      comboText: document.getElementById('comboText'),
      healthFill: document.getElementById('healthFill'),
      bossAlert: document.getElementById('bossAlert'),
      comboPopup: document.getElementById('comboPopup'),

      musicVolume: document.getElementById('musicVolume'),
      sfxVolume: document.getElementById('sfxVolume'),
      difficulty: document.getElementById('difficulty'),
      musicValue: document.getElementById('musicValue'),
      sfxValue: document.getElementById('sfxValue'),
      pauseMusicVolume: document.getElementById('pauseMusicVolume'),
      pauseSfxVolume: document.getElementById('pauseSfxVolume'),
      pauseMusicValue: document.getElementById('pauseMusicValue'),
      pauseSfxValue: document.getElementById('pauseSfxValue'),

      bossHealthRow: document.getElementById('bossHealthRow'),
      bossHealthText: document.getElementById('bossHealthText'),
      powerText: document.getElementById('powerText'),
      ammoText: document.getElementById('ammoText'),
      buffRow: document.getElementById('buffRow'),
      buffText: document.getElementById('buffText'),
      shootSfxToggle: document.getElementById('shootSfxToggle'),
      pauseShootSfxToggle: document.getElementById('pauseShootSfxToggle')
    };
  }

  function showScreen(ui, name) {
    const screenKeys = [
      'loadingScreen',
      'homeScreen',
      'settingsScreen',
      'aboutScreen',
      'pauseScreen',
      'gameOverScreen',
      'mobileBlockScreen'
    ];
    for (const key of screenKeys) {
      if (ui[key]) ui[key].classList.remove('active');
    }
    if (name && ui[name]) {
      ui[name].classList.add('active');
    }
  }

  function syncVolumeUI(ui, settings) {
    ui.musicVolume.value = settings.musicVolume;
    ui.sfxVolume.value = settings.sfxVolume;
    ui.pauseMusicVolume.value = settings.musicVolume;
    ui.pauseSfxVolume.value = settings.sfxVolume;
    ui.musicValue.textContent = `${Math.round(settings.musicVolume * 100)}%`;
    ui.sfxValue.textContent = `${Math.round(settings.sfxVolume * 100)}%`;
    ui.pauseMusicValue.textContent = `${Math.round(settings.musicVolume * 100)}%`;
    ui.pauseSfxValue.textContent = `${Math.round(settings.sfxVolume * 100)}%`;
    ui.difficulty.value = settings.difficulty;
    if (ui.shootSfxToggle) ui.shootSfxToggle.checked = settings.shootSfx !== false;
    if (ui.pauseShootSfxToggle) ui.pauseShootSfxToggle.checked = settings.shootSfx !== false;
  }

  function updateHUD(ui, game, player) {
    ui.scoreText.textContent = game.score;
    ui.livesText.textContent = player.lives;
    ui.levelText.textContent = Math.max(0, game.bossWave - 1);
    ui.comboText.textContent = `x${game.combo}`;
    ui.healthFill.style.transform = `scaleX(${Math.max(0, player.health / player.maxHealth)})`;

    // Power level display
    if (ui.powerText) {
      const lvl = player.powerLevel || 1;
      const colors = ['#60a5fa','#a78bfa','#34d399','#fbbf24','#ef4444'];
      const dots = Array.from({length: 5}, (_, i) =>
        `<span style="color:${i < lvl ? colors[lvl-1] : '#334155'}">${i < lvl ? '●' : '○'}</span>`
      ).join('');
      ui.powerText.innerHTML = dots;
    }

    // Ammo level display
    if (ui.ammoText) {
      const ammo = player.ammoLevel || 1;
      const labels = ['I', 'II', 'III', 'IIII', 'IIIII'];
      ui.ammoText.textContent = labels[ammo - 1] || 'I';
    }

    // Active buffs display
    if (ui.buffRow && ui.buffText) {
      const buffs = [];
      if (player.shieldActive) buffs.push(`🛡 ${Math.ceil(player.shieldTimer)}s`);
      if (player.vShot) {
        const t = Math.ceil(player.vShotTimer);
        const mm = Math.floor(t / 60);
        const ss = String(t % 60).padStart(2, '0');
        buffs.push(`V-${player.vShotTier || 1} ${mm}:${ss}`);
      }
      if (buffs.length > 0) {
        ui.buffRow.style.display = 'block';
        ui.buffText.textContent = buffs.join('  ');
      } else {
        ui.buffRow.style.display = 'none';
      }
    }

    if (game.boss) {
      ui.bossHealthRow.style.display = 'block';
      ui.bossHealthText.textContent = `${Math.round((game.boss.health / game.boss.maxHealth) * 100)}%`;
    } else {
      ui.bossHealthRow.style.display = 'none';
    }
  }

  function showCombo(ui, combo) {
    if (combo < 2) return;
    ui.comboPopup.textContent = `COMBO x${combo}`;
    ui.comboPopup.classList.add('show');
    clearTimeout(ui.comboTimer);
    ui.comboTimer = setTimeout(() => {
      ui.comboPopup.classList.remove('show');
    }, 450);
  }

  return {
    getUI,
    showScreen,
    syncVolumeUI,
    updateHUD,
    showCombo
  };
})();