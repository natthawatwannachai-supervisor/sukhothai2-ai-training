import React, { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, Play, Pause, Music, Sparkles } from 'lucide-react';
import { playFantasyClickSound, isFantasySfxEnabled, setFantasySfxEnabled } from '../../lib/soundEffects';

const BGM_SRC = '/assets/aistudio/Glade_at_First_Light_0ddc5256.mp3';
const BGM_VOLUME = 0.052; // Reduced by another 60% from 0.13

export const BackgroundMusicPlayer: React.FC = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [sfxActive, setSfxActive] = useState(() => isFantasySfxEnabled());
  const userPausedRef = useRef(false);

  // Global listener for short Fantasy Click Sound on all buttons and interactive elements
  useEffect(() => {
    const handleGlobalInteractiveClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const interactiveEl = target.closest(
        'button, a, [role="button"], input[type="submit"], input[type="button"], select, .cursor-pointer'
      );

      if (interactiveEl && !(interactiveEl as HTMLButtonElement).disabled) {
        playFantasyClickSound();
      }
    };

    window.addEventListener('click', handleGlobalInteractiveClick, { capture: true });
    return () => {
      window.removeEventListener('click', handleGlobalInteractiveClick, { capture: true });
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.loop = true;
    audio.volume = BGM_VOLUME;

    const attemptAutoPlay = async () => {
      const el = audioRef.current;
      if (!el || userPausedRef.current) return;

      el.volume = BGM_VOLUME;
      try {
        el.muted = false;
        await el.play();
        setIsPlaying(true);
        setIsMuted(false);
      } catch {
        // If browser policy blocks unmuted autoplay on initial load,
        // start muted immediately so playback begins right away and unmute on first gesture
        try {
          el.muted = true;
          await el.play();
          setIsPlaying(true);
          setIsMuted(true);
        } catch {
          setIsPlaying(false);
        }
      }
    };

    attemptAutoPlay();
    const retryTimer = window.setTimeout(attemptAutoPlay, 350);

    const unlockAndPlayAudio = () => {
      const el = audioRef.current;
      if (!el || userPausedRef.current) return;

      el.volume = BGM_VOLUME;
      if (el.muted) {
        el.muted = false;
        setIsMuted(false);
      }

      if (el.paused) {
        el.play()
          .then(() => {
            setIsPlaying(true);
          })
          .catch(() => {});
      }
    };

    const events = [
      'click',
      'pointerdown',
      'pointermove',
      'mousemove',
      'touchstart',
      'touchend',
      'keydown',
      'wheel',
      'scroll',
      'focus',
    ];

    events.forEach((evt) => {
      window.addEventListener(evt, unlockAndPlayAudio, { passive: true, capture: true });
    });

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        unlockAndPlayAudio();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearTimeout(retryTimer);
      events.forEach((evt) => {
        window.removeEventListener(evt, unlockAndPlayAudio, { capture: true });
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const togglePlay = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = BGM_VOLUME;
    if (audio.paused || audio.muted) {
      userPausedRef.current = false;
      audio.muted = false;
      setIsMuted(false);
      try {
        await audio.play();
        setIsPlaying(true);
      } catch (err) {
        console.error('Audio play failed:', err);
      }
    } else {
      userPausedRef.current = true;
      audio.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = BGM_VOLUME;
    const nextMuted = !isMuted;
    audio.muted = nextMuted;
    setIsMuted(nextMuted);

    if (!nextMuted && audio.paused) {
      userPausedRef.current = false;
      audio.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const toggleSfx = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !sfxActive;
    setFantasySfxEnabled(next);
    setSfxActive(next);
    if (next) {
      playFantasyClickSound();
    }
  };

  const handleEnded = () => {
    const audio = audioRef.current;
    if (!audio || userPausedRef.current) return;
    audio.volume = BGM_VOLUME;
    audio.currentTime = 0;
    audio.play().catch(() => {});
  };

  const handleCanPlay = () => {
    const audio = audioRef.current;
    if (!audio || userPausedRef.current) return;
    audio.volume = BGM_VOLUME;
    if (audio.paused) {
      audio
        .play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch(() => {});
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 no-print select-none">
      <audio
        ref={audioRef}
        src={BGM_SRC}
        autoPlay
        loop
        playsInline
        preload="auto"
        onLoadedMetadata={(e) => {
          e.currentTarget.volume = BGM_VOLUME;
        }}
        onCanPlay={handleCanPlay}
        onPlay={(e) => {
          e.currentTarget.volume = BGM_VOLUME;
          setIsPlaying(true);
        }}
        onPause={() => setIsPlaying(false)}
        onEnded={handleEnded}
      />

      <div className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-white/95 backdrop-blur-md border-2 border-orange-200/90 shadow-[0_10px_28px_rgba(234,88,12,0.22)] transition-all hover:shadow-[0_12px_32px_rgba(234,88,12,0.32)]">
        {/* Play / Pause Button */}
        <button
          onClick={togglePlay}
          className={`w-8 h-8 rounded-xl flex items-center justify-center transition cursor-pointer ${
            isPlaying && !isMuted
              ? 'bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-xs'
              : 'bg-orange-100 text-orange-700 hover:bg-orange-200 animate-pulse'
          }`}
          title={isPlaying && !isMuted ? 'หยุดเพลงพื้นหลังชั่วคราว' : 'เล่นเพลงพื้นหลัง (วนลูป)'}
          aria-label={isPlaying && !isMuted ? 'Pause background music' : 'Play background music'}
        >
          {isPlaying && !isMuted ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
        </button>

        {/* Track Status & Animated Equalizer */}
        <div
          onClick={togglePlay}
          className="flex items-center gap-2 px-1 cursor-pointer"
          title="คลิกเพื่อเปิด/ปิดเพลงบรรเลงพื้นหลัง"
        >
          <div className="hidden sm:flex flex-col text-left">
            <span className="text-[10px] font-black text-orange-950 leading-tight flex items-center gap-1">
              <Music className="w-3 h-3 text-orange-500" />
              <span>เพลงบรรเลงพื้นหลัง</span>
            </span>
            <span className="text-[9px] font-semibold text-slate-500 leading-tight">
              {isPlaying && !isMuted
                ? 'กำลังเล่นอัตโนมัติ • Loop'
                : 'แตะเพื่อเปิดเสียงเพลง'}
            </span>
          </div>

          {/* Equalizer Bars */}
          <div className="flex items-end gap-0.5 h-3.5 px-1">
            <span
              className={`w-1 rounded-full bg-orange-500 transition-all duration-300 ${
                isPlaying && !isMuted ? 'h-3.5 animate-pulse' : 'h-1.5 opacity-40'
              }`}
            />
            <span
              className={`w-1 rounded-full bg-amber-500 transition-all duration-300 ${
                isPlaying && !isMuted ? 'h-2.5 animate-bounce' : 'h-1.5 opacity-40'
              }`}
            />
            <span
              className={`w-1 rounded-full bg-orange-400 transition-all duration-300 ${
                isPlaying && !isMuted ? 'h-3 animate-pulse' : 'h-1.5 opacity-40'
              }`}
            />
          </div>
        </div>

        {/* Mute / Unmute BGM Button */}
        <button
          onClick={toggleMute}
          className="p-1.5 rounded-xl text-slate-500 hover:text-orange-600 hover:bg-orange-50 transition cursor-pointer"
          title={isMuted ? 'เปิดเสียงเพลง' : 'ปิดเสียงเพลง'}
          aria-label={isMuted ? 'Unmute background music' : 'Mute background music'}
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4 text-orange-600" />}
        </button>

        {/* Fantasy Click Sound Toggle Button */}
        <button
          onClick={toggleSfx}
          className={`p-1.5 rounded-xl transition cursor-pointer border ${
            sfxActive
              ? 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100'
              : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'
          }`}
          title={sfxActive ? 'เปิดเสียงคลิกแฟนตาซีอยู่ (คลิกเพื่อปิด)' : 'ปิดเสียงคลิกแฟนตาซีอยู่ (คลิกเพื่อเปิด)'}
          aria-label="Toggle fantasy click sound"
        >
          <Sparkles className={`w-4 h-4 ${sfxActive ? 'fill-amber-400 text-amber-500' : 'text-slate-400'}`} />
        </button>
      </div>
    </div>
  );
};
