window.Music = (() => {
  const HOME_TRACKS = [
    'assets/sounds/home/track1.mp3',
  ];

  const GAME_TRACKS = [
    'assets/sounds/game/track1.mp3',
    'assets/sounds/game/track2.mp3',
    'assets/sounds/game/track3.mp3',
    'assets/sounds/game/track4.mp3',
  ];

  let audio = null;
  let currentMode = null;   // 'home' | 'game'
  let playlist = [];
  let trackIndex = 0;
  let _volume = 0.5;
  let _unlocked = false;

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function cleanupAudio() {
    if (!audio) return;
    audio.pause();
    audio.removeEventListener('ended', onTrackEnded);
    audio.src = '';
    audio = null;
  }

  function playTrack(src) {
    cleanupAudio();

    audio = new Audio(src);
    audio.volume = _volume;
    audio.loop = false;

    audio.addEventListener('ended', onTrackEnded);

    const p = audio.play();
    if (p && typeof p.catch === 'function') {
      p.catch(() => {
        // blocked before first user interaction
      });
    }
  }

  function onTrackEnded() {
    if (!playlist.length) return;

    if (currentMode === 'home') {
      trackIndex = (trackIndex + 1) % playlist.length;
      playTrack(playlist[trackIndex]);
      return;
    }

    if (currentMode === 'game') {
      trackIndex++;
      if (trackIndex >= playlist.length) {
        playlist = shuffle(GAME_TRACKS);
        trackIndex = 0;
      }
      playTrack(playlist[trackIndex]);
    }
  }

  function unlockAudio() {
    if (_unlocked) return;
    _unlocked = true;

    if (currentMode === 'home' && playlist.length) {
      playTrack(playlist[trackIndex]);
    }
  }

  function bindUnlock() {
    const unlockOnce = () => {
      unlockAudio();
      document.removeEventListener('pointerdown', unlockOnce);
      document.removeEventListener('keydown', unlockOnce);
      document.removeEventListener('touchstart', unlockOnce);
    };

    document.addEventListener('pointerdown', unlockOnce, { once: true });
    document.addEventListener('keydown', unlockOnce, { once: true });
    document.addEventListener('touchstart', unlockOnce, { once: true });
  }

  function playHome() {
    currentMode = 'home';
    playlist = [...HOME_TRACKS];
    trackIndex = 0;

    if (_unlocked) {
      playTrack(playlist[trackIndex]);
    }
  }

  function playGame() {
    currentMode = 'game';
    playlist = shuffle(GAME_TRACKS);
    trackIndex = 0;

    if (_unlocked) {
      playTrack(playlist[trackIndex]);
    }
  }

  function pause() {
    if (audio && !audio.paused) audio.pause();
  }

  function resume() {
    if (audio && audio.paused) {
      const p = audio.play();
      if (p && typeof p.catch === 'function') {
        p.catch(() => {});
      }
    }
  }

  function stop() {
    cleanupAudio();
    currentMode = null;
  }

  function setVolume(v) {
    _volume = Math.max(0, Math.min(1, v));
    if (audio) audio.volume = _volume;
  }

  bindUnlock();

  return {
    playHome,
    playGame,
    pause,
    resume,
    stop,
    setVolume,
    unlockAudio
  };
})();