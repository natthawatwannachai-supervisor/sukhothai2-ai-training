import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Sparkles, Brain, GraduationCap } from 'lucide-react';

const ROBOT_VIDEO_SRC = '/assets/aistudio/download-Picsart-BackgroundRemover_d1d4bdfe.webm';
const ROBOT_POSTER_SRC = '/assets/aistudio/Untitled_design__21__04afc276.png';

export const PixarCanvas3D: React.FC = () => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0, glareX: 50, glareY: 50 });
  const [isHovered, setIsHovered] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.play().catch(() => {
      // Autoplay fallback if needed
    });
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const normX = (e.clientX - rect.left) / rect.width;
    const normY = (e.clientY - rect.top) / rect.height;
    const rotateY = (normX - 0.5) * 26;
    const rotateX = (normY - 0.5) * -26;
    setMousePos({
      x: rotateY,
      y: rotateX,
      glareX: normX * 100,
      glareY: normY * 100,
    });
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setMousePos({ x: 0, y: 0, glareX: 50, glareY: 50 });
  };

  return (
    <div
      className="relative w-full max-w-lg aspect-square mx-auto flex items-center justify-center p-2 sm:p-4 cursor-pointer select-none"
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ perspective: '1200px' }}
    >
      {/* Ambient Warm Golden-Orange 3D Glow Aura */}
      <motion.div
        animate={{
          scale: [0.95, 1.08, 0.95],
          opacity: [0.55, 0.85, 0.55],
        }}
        transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute inset-6 bg-gradient-to-tr from-orange-400/45 via-amber-300/45 to-yellow-300/45 rounded-full blur-3xl pointer-events-none"
      />

      {/* Interactive + Autonomous 3D Motion Stage */}
      <motion.div
        animate={{
          rotateY: isHovered ? mousePos.x : [-8, 8, -8],
          rotateX: isHovered ? mousePos.y : [5, -5, 5],
          rotateZ: isHovered ? 0 : [-1.8, 1.8, -1.8],
          y: [-14, 14, -14],
        }}
        transition={{
          rotateY: isHovered
            ? { type: 'spring', damping: 16, stiffness: 150 }
            : { duration: 5.5, repeat: Infinity, ease: 'easeInOut' },
          rotateX: isHovered
            ? { type: 'spring', damping: 16, stiffness: 150 }
            : { duration: 4.8, repeat: Infinity, ease: 'easeInOut' },
          rotateZ: { duration: 6.5, repeat: Infinity, ease: 'easeInOut' },
          y: { duration: 3.8, repeat: Infinity, ease: 'easeInOut' },
        }}
        className="relative w-full max-w-[420px] sm:max-w-[460px] aspect-square flex items-center justify-center"
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Dynamic Ground Shadow (Synchronized with 3D Levitation) */}
        <motion.div
          animate={{
            scale: [0.95, 0.78, 0.95],
            opacity: [0.38, 0.16, 0.38],
          }}
          transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -bottom-5 w-3/4 h-9 bg-orange-950/35 rounded-[100%] blur-xl pointer-events-none"
          style={{ transform: 'translateZ(-60px)' }}
        />

        {/* 3D Orbiting Tech Rings in Back Plane */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-2 rounded-full border-2 border-dashed border-amber-400/55 pointer-events-none"
          style={{ transform: 'translateZ(-40px) rotateX(68deg) scale(1.06)' }}
        />
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 24, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-4 rounded-full border border-orange-400/45 pointer-events-none"
          style={{ transform: 'translateZ(-25px) rotateY(65deg) scale(1.04)' }}
        />

        {/* Back Soft Radial Glow Behind Transparent 3D Character */}
        <div
          className="absolute inset-8 rounded-full bg-radial from-white/80 via-amber-100/50 to-transparent blur-xl pointer-events-none"
          style={{ transform: 'translateZ(-15px)' }}
        />

        {/* Main Floating Animated 3D Robot Video (Transparent WebM Pop-Out Layer +35px) */}
        <motion.div
          whileHover={{ scale: 1.06 }}
          animate={{
            scale: isHovered ? 1.06 : [1, 1.035, 1],
          }}
          transition={{
            scale: isHovered
              ? { type: 'spring', stiffness: 220, damping: 16 }
              : { duration: 4.5, repeat: Infinity, ease: 'easeInOut' },
          }}
          className="relative w-full h-full flex items-center justify-center z-10 pointer-events-none"
          style={{ transform: 'translateZ(35px)', transformStyle: 'preserve-3d' }}
        >
          <video
            ref={videoRef}
            src={ROBOT_VIDEO_SRC}
            poster={ROBOT_POSTER_SRC}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            className="w-full h-full object-contain drop-shadow-[0_24px_38px_rgba(234,88,12,0.38)] select-none pointer-events-none"
          />

          {/* Interactive Specular Light Highlight on 3D Character */}
          <div
            className="absolute inset-0 rounded-full pointer-events-none transition-opacity duration-300 mix-blend-overlay"
            style={{
              opacity: isHovered ? 0.55 : 0.2,
              background: `radial-gradient(circle at ${mousePos.glareX}% ${mousePos.glareY}%, rgba(255,255,255,0.85) 0%, rgba(251,191,36,0.25) 40%, transparent 70%)`,
            }}
          />
        </motion.div>

        {/* Floating Foreground 3D Badge 1 (Top-Left, Depth +75px) */}
        <motion.div
          animate={{ y: [-7, 7, -7], rotateZ: [-2, 2, -2] }}
          transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -left-2 sm:-left-4 top-6 p-2.5 bg-white/95 backdrop-blur-md rounded-2xl shadow-[0_14px_30px_rgba(234,88,12,0.25)] border-2 border-orange-200 z-20 flex items-center gap-2"
          style={{ transform: 'translateZ(75px)' }}
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white shadow-xs">
            <GraduationCap className="w-4 h-4" />
          </div>
          <div className="text-left pr-1">
            <span className="block text-[10px] font-black text-orange-950 leading-tight">AI & DIGITAL</span>
            <span className="block text-[9px] text-orange-600 font-bold leading-tight">สพป.สุโขทัย เขต 2</span>
          </div>
        </motion.div>

        {/* Floating Foreground 3D Badge 2 (Bottom-Right, Depth +85px) */}
        <motion.div
          animate={{ y: [7, -7, 7], rotateZ: [2, -2, 2] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
          className="absolute -right-2 sm:-right-4 bottom-6 p-2.5 bg-white/95 backdrop-blur-md rounded-2xl shadow-[0_14px_30px_rgba(245,158,11,0.28)] border-2 border-amber-200 z-20 flex items-center gap-2"
          style={{ transform: 'translateZ(85px)' }}
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center text-amber-950 shadow-xs">
            <Brain className="w-4 h-4" />
          </div>
          <div className="text-left pr-1">
            <span className="block text-[10px] font-black text-amber-950 leading-tight">Active Learning</span>
            <span className="block text-[9px] text-slate-600 font-semibold leading-tight">ห้องเรียนยุค AI</span>
          </div>
        </motion.div>

        {/* Floating 3D Sparkles (Depth +95px) */}
        <motion.div
          animate={{ scale: [1, 1.35, 1], rotate: [0, 15, -15, 0] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-2 right-6 text-amber-400 drop-shadow-[0_4px_8px_rgba(245,158,11,0.5)] z-30 pointer-events-none"
          style={{ transform: 'translateZ(95px)' }}
        >
          <Sparkles className="w-7 h-7 fill-amber-300" />
        </motion.div>

        <motion.div
          animate={{ scale: [1, 1.3, 1], rotate: [0, -15, 15, 0] }}
          transition={{ duration: 3.0, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
          className="absolute bottom-4 left-6 text-orange-400 drop-shadow-[0_4px_8px_rgba(249,115,22,0.5)] z-30 pointer-events-none"
          style={{ transform: 'translateZ(90px)' }}
        >
          <Sparkles className="w-6 h-6 fill-orange-300" />
        </motion.div>
      </motion.div>
    </div>
  );
};

