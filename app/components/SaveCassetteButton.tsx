'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

interface SaveCassetteButtonProps {
  onSave: () => void;
  disabled?: boolean;
}

export default function SaveCassetteButton({ onSave, disabled = false }: SaveCassetteButtonProps) {
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    await onSave();
    // Keep the animation visible for a moment
    setTimeout(() => setIsSaving(false), 1000);
  };

  return (
    <div className="relative">
      <button
        onClick={handleSave}
        disabled={disabled || isSaving}
        className={`px-4 py-2 rounded font-semibold transition-all ${
          disabled || isSaving
            ? 'bg-[#555] text-[#888] cursor-not-allowed'
            : 'bg-[#ff6b35] hover:bg-[#ff8555] text-white hover:shadow-lg'
        }`}
      >
        {isSaving ? 'Lagrer...' : 'Lagre kassett'}
      </button>

      {/* 3D fly-to-rack animation when saving */}
      {isSaving && (
        <motion.div
          className="fixed inset-0 pointer-events-none z-[100]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Flying cassette mini */}
          <motion.div
            className="absolute w-20 h-12 bg-gradient-to-br from-[#ff6b35] to-[#ff8555] rounded shadow-2xl"
            style={{
              left: '50%',
              top: '50%',
              transformStyle: 'preserve-3d',
            }}
            initial={{ 
              x: '-50%', 
              y: '-50%',
              scale: 1,
              rotateY: 0,
              rotateX: 0,
            }}
            animate={{ 
              x: '-800px',
              y: '-300px',
              scale: 0.4,
              rotateY: 720,
              rotateX: 360,
            }}
            transition={{
              duration: 0.8,
              ease: [0.34, 1.56, 0.64, 1]
            }}
          >
            {/* Cassette details for realism */}
            <div className="absolute inset-2 bg-[#2a2a2a] rounded-sm opacity-80" />
            <div className="absolute top-1/2 left-1/4 w-4 h-4 bg-[#1a1a1a] rounded-full transform -translate-y-1/2" />
            <div className="absolute top-1/2 right-1/4 w-4 h-4 bg-[#1a1a1a] rounded-full transform -translate-y-1/2" />
          </motion.div>

          {/* Trail effect */}
          <motion.div
            className="absolute w-2 h-2 bg-[#ff6b35] rounded-full blur-sm"
            style={{
              left: '50%',
              top: '50%',
            }}
            initial={{ 
              x: '-50%', 
              y: '-50%',
              opacity: 0.8,
            }}
            animate={{ 
              x: '-800px',
              y: '-300px',
              opacity: 0,
            }}
            transition={{
              duration: 0.8,
              ease: 'easeOut',
            }}
          />
        </motion.div>
      )}
    </div>
  );
}

