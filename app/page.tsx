"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Moon, Sun, Heart } from 'lucide-react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import confetti from 'canvas-confetti';

type HeartBehavior = 'float' | 'gravity' | 'burst';

interface Heart {
  id: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  isGold: boolean;
  behavior: HeartBehavior;
}

interface FloatingScore {
  id: string;
  value: number;
}

export default function PetDashboard() {
  const [hasChosen, setHasChosen] = useState(false);
  const [petType, setPetType] = useState<'cat' | 'dog' | null>(null);
  const [hearts, setHearts] = useState<Heart[]>([]);
  const [darkMode, setDarkMode] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isPetting, setIsPetting] = useState(false);

  // Love Gauge states
  const [startedPettingOnce, setStartedPettingOnce] = useState(false);
  const [progress, setProgress] = useState(0);

  const continuousRef = useRef(true);
  const currentProgressRef = useRef(0);

  // Stats and Animations states
  const [loveScore, setLoveScore] = useState(0);
  const [popups, setPopups] = useState<FloatingScore[]>([]);

  // Audio Refs
  const purrAudio = useRef<HTMLAudioElement | null>(null);
  const bopAudio = useRef<HTMLAudioElement | null>(null);
  const blingAudio = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Initializing with relative paths for the public folder
    purrAudio.current = new Audio('/purr.mp3');
    purrAudio.current.loop = true;
   
    bopAudio.current = new Audio('/bop.mp3');
   
    blingAudio.current = new Audio('/bling.mp3');
    // Preload helps reduce the lag on the first play
    blingAudio.current.load();
  }, []);

  const playBop = () => {
    if (bopAudio.current) {
      bopAudio.current.currentTime = 0;
      bopAudio.current.play().catch((err) => console.log("Audio play blocked:", err));
    }
  };

  const playBling = useCallback(() => {
    if (blingAudio.current) {
      blingAudio.current.currentTime = 0;
      blingAudio.current.play().catch((err) => console.log("Bling blocked:", err));
    }
  }, []);

  // Sync state progress
  useEffect(() => {
    currentProgressRef.current = progress;
  }, [progress]);

  // Manage petting status
  useEffect(() => {
    if (isPetting) {
      if (hasChosen) {
        setStartedPettingOnce(true);
      }
    } else {
      if (currentProgressRef.current > 0 && currentProgressRef.current < 100) {
        continuousRef.current = false;
      }
    }
  }, [isPetting, hasChosen]);

  // Award Points Logic
  const awardPoints = useCallback(() => {
    // 1. Play the Bling Sound immediately
    playBling();

    // 2. Fire Confetti
    try {
      confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (e) {}

    // 3. Logic for score
    const exactRewardValue = continuousRef.current ? 10 : 5;
    const uniqueId = `score-${Date.now()}-${Math.random()}`;
   
    setPopups([{ id: uniqueId, value: exactRewardValue }]);
    setLoveScore((currentScore) => currentScore + exactRewardValue);
  }, [playBling]);

  // Progress Bar Engine
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isPetting && startedPettingOnce && progress < 100) {
      interval = setInterval(() => {
        const currentTarget = currentProgressRef.current + (100 / 70);

        if (currentTarget >= 100) {
          clearInterval(interval);
          setProgress(100);
          awardPoints();
        } else {
          setProgress(currentTarget);
        }
      }, 100);
    }

    return () => clearInterval(interval);
  }, [isPetting, startedPettingOnce, awardPoints]);

  // Reset logic
  useEffect(() => {
    if (progress >= 100) {
      const resetTimeout = setTimeout(() => {
        setProgress(0);
        continuousRef.current = true;
      }, 600);
      return () => clearTimeout(resetTimeout);
    }
  }, [progress]);

  // Clear popups
  useEffect(() => {
    if (popups.length > 0) {
      const cleanup = setTimeout(() => {
        setPopups([]);
      }, 1200);
      return () => clearTimeout(cleanup);
    }
  }, [popups]);

  // Purr logic
  useEffect(() => {
    if (isPetting && petType === 'cat') {
      purrAudio.current?.play().catch(() => {});
    } else {
      purrAudio.current?.pause();
      if (purrAudio.current) purrAudio.current.currentTime = 0;
    }
  }, [isPetting, petType]);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const mouseXSpring = useSpring(x, { stiffness: 100, damping: 20 });
  const mouseYSpring = useSpring(y, { stiffness: 100, damping: 20 });
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["8deg", "-8deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-8deg", "8deg"]);

  const movementTimer = useRef<NodeJS.Timeout | null>(null);

  const stars = useMemo(() =>
    Array.from({ length: 40 }).map((_, i) => ({
      id: i, top: `${Math.random() * 100}%`, left: `${Math.random() * 100}%`, delay: Math.random() * 3,
    })), []
  );

  const spawnHeart = useCallback((count = 1) => {
    setHearts((prev) => [
      ...prev,
      ...Array.from({ length: count }).map(() => {
        const angle = Math.random() * Math.PI * 2;
        const radius = 120 + Math.random() * 80;
        return {
          id: `heart-${Date.now()}-${Math.random()}`,
          x: mousePos.x,
          y: mousePos.y,
          targetX: Math.cos(angle) * radius,
          targetY: Math.sin(angle) * radius,
          isGold: Math.random() > 0.9,
          behavior: (Math.random() > 0.85 ? 'gravity' : 'burst') as HeartBehavior
        };
      })
    ]);
  }, [mousePos]);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - (rect.left + rect.width / 2)) / rect.width);
    y.set((e.clientY - (rect.top + rect.height / 2)) / rect.height);

    setMousePos({
      x: e.clientX - rect.left - rect.width / 2,
      y: e.clientY - rect.top - rect.height / 2,
    });

    if (isPetting && !movementTimer.current) {
      spawnHeart(1);
      movementTimer.current = setTimeout(() => { movementTimer.current = null; }, 350);
    }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setHearts((prev) => prev.filter(h => {
        const timestamp = parseFloat(h.id.split('-')[1]);
        return Date.now() - timestamp < 3000;
      }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleBackAction = () => {
    playBop();
    setHasChosen(false);
    setIsPetting(false);
    setStartedPettingOnce(false);
    setProgress(0);
    setLoveScore(0);
    continuousRef.current = true;
  };

  return (
    <div className={`relative flex min-h-screen flex-col items-center justify-center p-4 transition-all duration-1000 overflow-hidden ${darkMode ? 'bg-[#0a0b0e]' : 'bg-[#F2EFE7]'}`}>
   
      {darkMode && stars.map((star) => (
        <motion.div key={`star-${star.id}`} animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 4, repeat: Infinity, delay: star.delay }} className="absolute w-1 h-1 bg-white rounded-full shadow-[0_0_8px_white]" style={{ top: star.top, left: star.left, zIndex: 0 }} />
      ))}

      <motion.div layout className="relative flex flex-col items-center gap-4 z-20 w-full max-w-md perspective-1000" onMouseMove={handleMouseMove} onMouseLeave={() => { x.set(0); y.set(0); }}>
      
        <AnimatePresence>
          {startedPettingOnce && hasChosen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 10 }}
              className="flex items-center z-40 px-3 py-1.5 rounded-full backdrop-blur-xl border border-white/20 shadow-md bg-white/10"
            >
              <div className="w-36 h-3 rounded-full border border-pink-300/30 p-[2px] overflow-hidden bg-pink-950/10">
                <motion.div
                  className="h-full rounded-full transition-all duration-100 bg-gradient-to-r from-pink-400 to-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.5)]"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {!hasChosen ? (
            <motion.div key="choice" style={{ rotateX, rotateY, transformStyle: "preserve-3d" }} className="flex flex-col items-center gap-12 mt-8 w-full max-w-[280px]">
              <h1 className="text-8xl font-black italic drop-shadow-2xl text-pink-400/80">hi</h1>
              <div className="flex flex-col w-full gap-5">
                <motion.button
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => { playBop(); setPetType('cat'); setHasChosen(true); }}
                  className="w-full py-5 rounded-[2rem] border border-white/30 font-black text-2xl transition-all uppercase cursor-pointer backdrop-blur-xl shadow-xl bg-pink-400/20 hover:bg-pink-400/30 text-pink-400/70 border-t-2 border-l-2"
                >
                  meow
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => { playBop(); setPetType('dog'); setHasChosen(true); }}
                  className="w-full py-5 rounded-[2rem] border border-white/30 font-black text-2xl transition-all uppercase cursor-pointer backdrop-blur-xl shadow-xl bg-pink-400/20 hover:bg-pink-400/30 text-pink-400/70 border-t-2 border-l-2"
                >
                  woof
                </motion.button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
              className={`aspect-square w-full max-w-[400px] rounded-[5rem] border-t-4 border-l-4 flex flex-col items-center justify-center shadow-2xl transition-all relative backdrop-blur-3xl ${darkMode ? 'border-white/10 bg-slate-900/40' : 'border-white/60 bg-[#F2EFE7]/80'}`}
            >
              <div className="flex flex-col items-center" style={{ transform: "translateZ(100px)" }}>
                <div
                  className="relative touch-none select-none cursor-pointer"
                  onMouseDown={() => setIsPetting(true)}
                  onMouseUp={() => setIsPetting(false)}
                  onMouseLeave={() => setIsPetting(false)}
                  onTouchStart={() => setIsPetting(true)}
                  onTouchEnd={() => setIsPetting(false)}
                >
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
                    <AnimatePresence>
                      {popups.map((popup) => (
                        <motion.div
                          key={popup.id}
                          initial={{ opacity: 0, scale: 0.2 }}
                          animate={{
                            opacity: [0, 1, 1, 0],
                            scale: [0.2, 1.5, 1.3, 1.1]
                          }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 1.1, ease: "easeOut" }}
                          className="font-black text-6xl text-amber-400 select-none pointer-events-none filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.15)]"
                          style={{ textShadow: '1px 1px 0px #d97706, -1px -1px 0px #d97706, 1px -1px 0px #d97706, -1px 1px 0px #d97706' }}
                        >
                          +{popup.value}
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>

                  <AnimatePresence>
                    {isPetting && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 0.6, scale: 1.2 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="absolute inset-0 blur-[80px] rounded-full transition-colors duration-500 bg-pink-400/40"
                      />
                    )}
                  </AnimatePresence>

                  <AnimatePresence>
                    {hearts.map((heart) => (
                      <motion.div
                        key={heart.id}
                        initial={{ scale: 0, x: heart.x, y: heart.y, opacity: 1 }}
                        animate={{
                          x: [heart.x, heart.x + heart.targetX],
                          y: [heart.y, heart.y + heart.targetY],
                          opacity: [1, 1, 0],
                          scale: [0, 1.2, 0.8]
                        }}
                        transition={{ duration: 3.2, ease: "easeOut" }}
                        className="absolute left-1/2 top-1/2 pointer-events-none"
                        style={{ zIndex: 100 }}
                      >
                        <img src="/pixel-heart.png" alt="heart" className={`w-8 h-8 object-contain ${heart.isGold ? 'brightness-150 saturate-150' : ''}`} style={{ imageRendering: 'pixelated' }} />
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  <motion.div animate={isPetting ? { scale: 0.94, y: 6 } : { scale: 1, y: 0 }} className="relative z-10">
                    <img src={petType === 'cat' ? "/cat.png" : "/dog.png"} alt="Pet" className={`${petType === 'dog' ? 'w-72 h-72' : 'w-64 h-64'} object-contain pointer-events-none`} />
                  </motion.div>
                </div>
                <button onClick={handleBackAction} className={`mt-8 text-[11px] font-bold uppercase tracking-[0.5em] ${darkMode ? 'text-slate-500 hover:text-white' : 'text-[#7A8A71] hover:text-slate-900'}`}>back</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <div className="fixed bottom-10 right-10 flex flex-col gap-4 z-30">
        <AnimatePresence>
          {hasChosen && (
            <motion.button
              initial={{ opacity: 0, scale: 0.7, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.7, y: 20 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={playBop}
              className={`flex h-16 px-6 items-center justify-center gap-3 rounded-[2rem] shadow-2xl transition-all border backdrop-blur-xl ${
                darkMode ? 'bg-slate-900/60 border-white/10 text-pink-400' : 'bg-white/70 border-white/40 text-pink-500'
              }`}
            >
              <Heart size={22} className="fill-current drop-shadow-[0_0_4px_rgba(244,63,94,0.4)] animate-pulse" />
              <span className="font-black text-xl tracking-wider">
                {loveScore}
              </span>
            </motion.button>
          )}
        </AnimatePresence>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => { playBop(); setDarkMode(!darkMode); }}
          className={`flex h-16 px-6 items-center justify-center rounded-[2rem] shadow-2xl transition-all border backdrop-blur-xl ${
            darkMode
              ? 'bg-[#4c3a6b]/50 text-purple-300 border-[#7c5fb0]/30 shadow-[0_0_15px_rgba(124,95,176,0.3)]'
              : 'bg-[#E8DFF5]/70 text-[#7c5fb0] border-[#c0a9df]/40 shadow-[0_0_15px_rgba(192,169,223,0.2)]'
          }`}
        >
          {darkMode ? <Sun size={24} /> : <Moon size={24} />}
        </motion.button>
      </div>
    </div>
  );
}