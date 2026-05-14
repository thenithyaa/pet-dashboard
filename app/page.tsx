"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Moon, Sun } from 'lucide-react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';

type HeartBehavior = 'float' | 'gravity' | 'burst';

interface Heart {
  id: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  isGold: boolean;
  behavior: HeartBehavior;
}

export default function PetDashboard() {
  const [hasChosen, setHasChosen] = useState(false);
  const [petType, setPetType] = useState<'cat' | 'dog' | null>(null);
  const [hearts, setHearts] = useState<Heart[]>([]);
  const [darkMode, setDarkMode] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isPetting, setIsPetting] = useState(false);
  
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
          id: Math.random() + Date.now(),
          x: mousePos.x,
          y: mousePos.y,
          targetX: Math.cos(angle) * radius,
          targetY: Math.sin(angle) * radius,
          isGold: Math.random() > 0.9,
          behavior: 'burst' as HeartBehavior
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

    if (isPetting) {
      if (!movementTimer.current) {
        spawnHeart(2);
        movementTimer.current = setTimeout(() => { movementTimer.current = null; }, 180);
      }
    }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setHearts((prev) => prev.filter(h => Date.now() - h.id < 3000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className={`relative flex min-h-screen flex-col items-center justify-center p-4 transition-all duration-1000 overflow-hidden ${darkMode ? 'bg-[#0a0b0e]' : 'bg-[#d1d5db]'}`}>
      
      {darkMode && stars.map((star) => (
        <motion.div key={`star-${star.id}`} animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 4, repeat: Infinity, delay: star.delay }} className="absolute w-1 h-1 bg-white rounded-full shadow-[0_0_8px_white]" style={{ top: star.top, left: star.left, zIndex: 0 }} />
      ))}

      <motion.div layout className="relative z-20 w-full max-w-md perspective-1000" onMouseMove={handleMouseMove} onMouseLeave={() => { x.set(0); y.set(0); }}>
        <AnimatePresence mode="wait">
          {!hasChosen ? (
            <motion.div key="choice" style={{ rotateX, rotateY, transformStyle: "preserve-3d" }} className="flex flex-col items-center gap-12">
              <h1 className={`text-8xl font-black italic drop-shadow-2xl ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>hi</h1>
              <div className="flex flex-col w-full gap-6">
                {/* Button Pop Animation */}
                <motion.button 
                  whileHover={{ scale: 1.05, y: -5 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => { setPetType('cat'); setHasChosen(true); }} 
                  className={`w-full py-8 rounded-[3rem] border-t-2 border-l-2 font-black text-3xl transition-all uppercase cursor-pointer backdrop-blur-2xl shadow-2xl ${darkMode ? 'bg-white/10 border-white/20 text-white' : 'bg-white/50 border-white/80 text-slate-900'}`}
                >
                  meow
                </motion.button>
                <motion.button 
                  whileHover={{ scale: 1.05, y: -5 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => { setPetType('dog'); setHasChosen(true); }} 
                  className={`w-full py-8 rounded-[3rem] border-t-2 border-l-2 font-black text-3xl transition-all uppercase cursor-pointer backdrop-blur-2xl shadow-2xl ${darkMode ? 'bg-white/10 border-white/20 text-white' : 'bg-white/50 border-white/80 text-slate-900'}`}
                >
                  woof
                </motion.button>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
              // Forced Square Aspect Ratio
              className={`aspect-square w-full max-w-[400px] rounded-[5rem] border-t-4 border-l-4 flex flex-col items-center justify-center shadow-2xl transition-all relative backdrop-blur-3xl ${darkMode ? 'border-white/10 bg-slate-900/40' : 'border-white/60 bg-white/30'}`}
            >
              <div className="flex flex-col items-center" style={{ transform: "translateZ(100px)" }}>
                <div 
                  className="relative touch-none select-none cursor-pointer"
                  onMouseDown={() => setIsPetting(true)}
                  onMouseUp={() => setIsPetting(false)}
                >
                  <AnimatePresence>
                    {isPetting && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.6 }} exit={{ opacity: 0 }} className={`absolute inset-0 blur-[100px] rounded-full ${darkMode ? 'bg-yellow-400/30' : 'bg-pink-400/40'}`} />
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
                        {/* Reduced heart size */}
                        <img src="/pixel-heart.png" alt="heart" className={`w-8 h-8 object-contain ${heart.isGold ? 'brightness-150 saturate-150' : ''}`} style={{ imageRendering: 'pixelated' }} />
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  <motion.div animate={isPetting ? { scale: 0.94, y: 6 } : { scale: 1, y: 0 }} className="relative z-10">
                    <img src={petType === 'cat' ? "/cat.png" : "/dog.png"} alt="Pet" className={`${petType === 'dog' ? 'w-72 h-72' : 'w-64 h-64'} object-contain pointer-events-none`} />
                  </motion.div>
                </div>
                <button onClick={() => { setHasChosen(false); setIsPetting(false); }} className={`mt-8 text-[11px] font-bold uppercase tracking-[0.5em] ${darkMode ? 'text-slate-500 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}>back</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <button onClick={() => setDarkMode(!darkMode)} className={`fixed bottom-10 right-10 flex h-16 w-16 items-center justify-center rounded-[2rem] shadow-2xl z-30 transition-all ${darkMode ? 'bg-yellow-400 text-slate-900' : 'bg-slate-900 text-white'}`}>
        {darkMode ? <Sun size={28} /> : <Moon size={28} />}
      </button>
    </div>
  );
}
