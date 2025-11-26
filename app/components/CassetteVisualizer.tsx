'use client';

import { motion } from 'framer-motion';
import { TransportState } from '@/app/lib/types';

interface CassetteVisualizerProps {
  state: TransportState;
  isRewinding?: boolean;
  isFastForwarding?: boolean;
  isJumping?: boolean;
  cassetteTitle?: string;
  onTitleClick?: () => void;
}

export default function CassetteVisualizer({ state, isRewinding = false, isFastForwarding = false, isJumping = false, cassetteTitle = '', onTitleClick }: CassetteVisualizerProps) {
  const isPlaying = state === 'playing' || state === 'recording';
  const shouldAnimate = isPlaying || isRewinding || isFastForwarding || isJumping;
  
  // Both reels rotate in the same direction (tape moves from one to the other)
  // Play/record/fast-forward: clockwise, Rewind/Jump: counter-clockwise
  const reelRotation = (isRewinding || isJumping) ? -360 : 360;
  
  // Animation speed: faster for rewinding/fast forwarding/jumping (0.5s) than normal playback (2s)
  // Jumping is extra fast (0.3s) for a quick snap animation
  const animationDuration = isJumping ? 0.3 : (isRewinding || isFastForwarding) ? 0.5 : 2;

  return (
    <motion.div 
      className="w-[300px] h-[200px] mx-auto bg-gradient-to-br from-[#4a3d35] to-[#3a2e25] border-[3px] border-[#2a1f18] rounded-[10px] relative"
      style={{
        backgroundImage: `
          repeating-linear-gradient(0deg, transparent, transparent 8px, rgba(255, 255, 255, 0.05) 8px, rgba(255, 255, 255, 0.05) 9px),
          repeating-linear-gradient(90deg, transparent, transparent 8px, rgba(255, 255, 255, 0.05) 8px, rgba(255, 255, 255, 0.05) 9px)
        `
      }}
      animate={{
        boxShadow: [
          '0 8px 32px rgba(0,0,0,0.8), inset 0 0 20px rgba(0,0,0,0.6), 0 0 25px rgba(255,165,0,0.4), 0 0 50px rgba(255,165,0,0.2)',
          '0 8px 32px rgba(0,0,0,0.8), inset 0 0 20px rgba(0,0,0,0.6), 0 0 30px rgba(255,165,0,0.5), 0 0 60px rgba(255,165,0,0.3)',
          '0 8px 32px rgba(0,0,0,0.8), inset 0 0 20px rgba(0,0,0,0.6), 0 0 25px rgba(255,165,0,0.4), 0 0 50px rgba(255,165,0,0.2)',
        ],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    >
        {/* Screws */}
        <div className="absolute top-2 left-2 w-2 h-2 rounded-full bg-gray-800 border border-gray-950 shadow-[inset_0_1px_2px_rgba(255,255,255,0.1)]" style={{ background: 'radial-gradient(circle, #2a2a2a 30%, #0a0a0a 70%)' }}></div>
        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-gray-800 border border-gray-950 shadow-[inset_0_1px_2px_rgba(255,255,255,0.1)]" style={{ background: 'radial-gradient(circle, #2a2a2a 30%, #0a0a0a 70%)' }}></div>
        <div className="absolute bottom-2 left-2 w-2 h-2 rounded-full bg-gray-800 border border-gray-950 shadow-[inset_0_1px_2px_rgba(255,255,255,0.1)]" style={{ background: 'radial-gradient(circle, #2a2a2a 30%, #0a0a0a 70%)' }}></div>
        <div className="absolute bottom-2 right-2 w-2 h-2 rounded-full bg-gray-800 border border-gray-950 shadow-[inset_0_1px_2px_rgba(255,255,255,0.1)]" style={{ background: 'radial-gradient(circle, #2a2a2a 30%, #0a0a0a 70%)' }}></div>
        
        <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-cassette-orange text-black px-5 py-1 font-bold text-xs rounded z-10">
          4-TRACK
        </div>
        
        {/* Tape Label */}
        <div className="absolute top-[35px] left-5 right-5 bottom-[50px] bg-gradient-to-b from-gray-50 to-gray-100 border border-black/10 rounded-sm p-2 text-[9px] text-gray-800 z-[1]">
          <div className="absolute left-1 top-1/2 -translate-y-1/2 rotate-[-90deg] origin-center text-[8px] text-gray-600 whitespace-nowrap">
            4-TRACK
          </div>
          <div className="absolute right-1 top-1/2 -translate-y-1/2 rotate-90deg origin-center text-[8px] text-gray-600 whitespace-nowrap">
            C-60
          </div>
          <div className="mt-1">
            <div className="h-[1px] bg-red-500/30 my-[3px]"></div>
            <div className="h-[1px] bg-red-500/30 my-[3px]"></div>
            <div className="h-[1px] bg-red-500/30 my-[3px]"></div>
          </div>
        </div>
        
        {/* Bottom Label */}
        <div className="absolute bottom-[15px] left-5 right-5 flex items-center justify-between text-[10px] text-gray-800 z-[1]">
          <span className="font-bold text-[11px]">4TR-60</span>
          <span className="bg-red-500/10 border border-red-500/30 px-1.5 py-0.5 rounded text-[8px]">Fe</span>
        </div>
        
        {/* Bottom pattern with tape head opening */}
        <div className="absolute bottom-0 left-0 right-0 h-[45px] bg-black border-t border-white/10 z-[2]">
          <div 
            className="absolute bottom-[15px] left-1/2 -translate-x-1/2 w-20 h-3 bg-black border border-white/10"
            style={{
              clipPath: 'polygon(10% 0%, 90% 0%, 100% 100%, 0% 100%)'
            }}
          ></div>
          <div className="absolute bottom-5 left-20 w-2 h-2 rounded-full bg-black border border-white/10"></div>
          <div className="absolute bottom-5 right-20 w-2 h-2 rounded-full bg-black border border-white/10"></div>
        </div>
        
        {/* Cassette Title - above reels */}
        <div 
          className="absolute left-1/2 -translate-x-1/2 z-20 cursor-text" 
          style={{ top: 'calc(50% - 60px)' }}
          onClick={onTitleClick}
        >
          {cassetteTitle ? (
            <div 
              className="text-gray-800 font-bold text-[16px] leading-tight text-center px-2 hover:text-gray-600 transition-colors"
              style={{ fontFamily: "'Caveat', cursive" }}
            >
              {cassetteTitle}
            </div>
          ) : (
            <div 
              className="text-gray-500 text-[14px] leading-tight text-center px-2 italic"
              style={{ fontFamily: "'Caveat', cursive" }}
            >
              Klikk for å legge til tittel
            </div>
          )}
        </div>

        {/* Left reel */}
        <motion.div
          className="absolute w-20 h-20 left-[50px] flex items-center justify-center z-10"
          style={{
            top: '50%',
          }}
          animate={shouldAnimate ? { rotate: reelRotation, y: '-50%' } : { y: '-50%' }}
          transition={shouldAnimate ? { duration: animationDuration, repeat: Infinity, ease: 'linear' } : {}}
        >
          <div className="w-20 h-20 rounded-full bg-gray-800 border-2 border-gray-900 relative flex items-center justify-center">
            <div className="w-[50px] h-[50px] rounded-full bg-gray-400/40 border border-gray-300/60 relative flex items-center justify-center">
              {/* 6 spokes */}
              {[0, 60, 120, 180, 240, 300].map((angle) => (
                <div
                  key={angle}
                  className="absolute w-[3px] h-2 bg-gray-400/70 rounded-sm"
                  style={{
                    transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-23px)`,
                    top: '50%',
                    left: '50%',
                    transformOrigin: 'center 4px',
                  }}
                />
              ))}
            </div>
          </div>
        </motion.div>

        {/* Right reel */}
        <motion.div
          className="absolute w-20 h-20 right-[50px] flex items-center justify-center z-10"
          style={{
            top: '50%',
          }}
          animate={shouldAnimate ? { rotate: reelRotation, y: '-50%' } : { y: '-50%' }}
          transition={shouldAnimate ? { duration: animationDuration, repeat: Infinity, ease: 'linear' } : {}}
        >
          <div className="w-20 h-20 rounded-full bg-gray-800 border-2 border-gray-900 relative flex items-center justify-center">
            <div className="w-[50px] h-[50px] rounded-full bg-gray-400/40 border border-gray-300/60 relative flex items-center justify-center">
              {/* 6 spokes */}
              {[0, 60, 120, 180, 240, 300].map((angle) => (
                <div
                  key={angle}
                  className="absolute w-[3px] h-2 bg-gray-400/70 rounded-sm"
                  style={{
                    transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-23px)`,
                    top: '50%',
                    left: '50%',
                    transformOrigin: 'center 4px',
                  }}
                />
              ))}
            </div>
          </div>
        </motion.div>

        {/* Tape window */}
        <motion.div 
          className="absolute w-[120px] h-[60px] bg-black border-2 border-gray-700 left-1/2 rounded"
          style={{
            top: '50%',
          }}
          animate={{ x: '-50%', y: '-50%' }}
        >
          <motion.div
            className="w-full h-full bg-repeating-linear-gradient-to-r from-transparent via-transparent to-orange-300/30"
            style={{
              backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 10px, rgba(255, 165, 0, 0.3) 10px, rgba(255, 165, 0, 0.3) 12px)',
            }}
            animate={shouldAnimate ? { x: (isRewinding || isJumping) ? [0, -20, 0] : [0, 20, 0] } : {}}
            transition={shouldAnimate ? { duration: animationDuration, repeat: Infinity, ease: 'linear' } : {}}
          />
        </motion.div>
      </motion.div>
  );
}
