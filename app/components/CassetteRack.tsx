'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ProjectData } from '@/app/lib/types';

interface CassetteRackProps {
  cassettes: Array<{ id: string; data: ProjectData }>;
  currentCassetteId: string | null;
  onLoadCassette: (id: string) => void;
  onDeleteCassette: (id: string) => void;
  onRenameCassette: (id: string, newName: string) => void;
  onNewCassette: () => void;
}

export default function CassetteRack({
  cassettes,
  currentCassetteId,
  onLoadCassette,
  onDeleteCassette,
  onRenameCassette,
  onNewCassette,
}: CassetteRackProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleStartEdit = (id: string, currentName: string) => {
    setEditingId(id);
    setEditingName(currentName || 'Untitled');
  };

  const handleSaveEdit = (id: string) => {
    onRenameCassette(id, editingName);
    setEditingId(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const handleDeleteClick = (id: string) => {
    setDeleteConfirmId(id);
  };

  const handleConfirmDelete = (id: string) => {
    onDeleteCassette(id);
    setDeleteConfirmId(null);
  };

  return (
    <div className="fixed left-0 top-0 bottom-0 w-80 flex flex-col z-50">
      {/* Rack Frame */}
      <div className="flex-1 bg-gradient-to-b from-[#1a1a1a] via-[#0a0a0a] to-[#1a1a1a] border-r-4 border-[#2a2a2a] relative">
        {/* Left edge shadow */}
        <div className="absolute inset-y-0 left-0 w-4 bg-gradient-to-r from-black/40 to-transparent" />
        <div className="absolute inset-y-0 right-0 w-4 bg-gradient-to-l from-black/40 to-transparent" />
        
        {/* Header */}
        <div className="p-4 bg-gradient-to-b from-[#2a2a2a] to-transparent">
          <button
            onClick={onNewCassette}
            className="w-full py-2 px-4 bg-gradient-to-b from-[#ff6b35] to-[#ff5520] hover:from-[#ff8555] hover:to-[#ff6b35] text-white font-bold rounded shadow-lg transition-all hover:shadow-[0_0_15px_rgba(255,107,53,0.6)] border border-[#ff8555] text-sm"
          >
            + NY KASSETT
          </button>
        </div>

        {/* Cassette Slots */}
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1">
          <AnimatePresence>
            {cassettes.map((cassette, index) => {
              const isActive = cassette.id === currentCassetteId;
              const isHovered = hoveredId === cassette.id;
              const isEditing = editingId === cassette.id;
              const isDeleting = deleteConfirmId === cassette.id;
              const title = cassette.data.cassetteTitle || 'Untitled';
              const hasAudio = cassette.data.tracks.some(t => t.audioBuffer !== null);
              const cassetteColor = cassette.data.cassetteColor || '#ff6b35';

              return (
                <motion.div
                  key={cassette.id}
                  layoutId={`cassette-${cassette.id}`}
                  initial={{ opacity: 0, x: -50, rotateY: -20 }}
                  animate={{ opacity: 1, x: 0, rotateY: -12 }}
                  exit={{ opacity: 0, x: -50, rotateY: -20 }}
                  onHoverStart={() => setHoveredId(cassette.id)}
                  onHoverEnd={() => setHoveredId(null)}
                  className="relative group"
                  style={{ 
                    transformStyle: 'preserve-3d',
                    perspective: '1000px',
                  }}
                >
                  {/* Cassette Spine (horizontal cassette showing spine) */}
                  <div
                    className={`relative h-16 rounded cursor-pointer transition-all duration-300 overflow-hidden ${
                      isActive ? 'scale-105' : 'scale-100'
                    }`}
                    onClick={() => !isActive && !isEditing && !isDeleting && onLoadCassette(cassette.id)}
                    style={{
                      background: `linear-gradient(to right, 
                        #0a0a0a 0%, 
                        ${cassetteColor}22 1%,
                        ${cassetteColor}dd 3%, 
                        ${cassetteColor} 8%,
                        ${cassetteColor}ee 50%,
                        ${cassetteColor} 92%,
                        ${cassetteColor}dd 97%,
                        ${cassetteColor}22 99%,
                        #0a0a0a 100%
                      )`,
                      boxShadow: isActive
                        ? `
                          0 6px 16px ${cassetteColor}99,
                          inset 0 2px 4px rgba(255,255,255,0.2),
                          inset 0 -2px 4px rgba(0,0,0,0.6),
                          inset 4px 0 8px rgba(0,0,0,0.3),
                          inset -2px 0 6px rgba(255,255,255,0.1)
                        `
                        : `
                          0 3px 8px rgba(0,0,0,0.7),
                          inset 0 1px 3px rgba(255,255,255,0.15),
                          inset 0 -1px 3px rgba(0,0,0,0.5),
                          inset 4px 0 6px rgba(0,0,0,0.3),
                          inset -2px 0 4px rgba(255,255,255,0.08)
                        `,
                      transform: isHovered 
                        ? 'translateX(12px) rotateY(-8deg) scale(1.03)' 
                        : 'translateX(0) rotateY(0) scale(1)',
                      transformStyle: 'preserve-3d',
                    }}
                  >
                    {/* Right side panel (visible due to perspective) */}
                    <div 
                      className="absolute top-0 right-0 bottom-0 w-3 pointer-events-none"
                      style={{
                        background: `linear-gradient(to left, 
                          ${cassetteColor}aa 0%,
                          ${cassetteColor}66 50%,
                          transparent 100%
                        )`,
                        transform: 'translateX(100%) rotateY(90deg)',
                        transformOrigin: 'left center',
                        boxShadow: 'inset 2px 0 4px rgba(0,0,0,0.4)',
                      }}
                    />
                    {/* Top edge highlight */}
                    <div 
                      className="absolute top-0 left-0 right-0 h-1 pointer-events-none"
                      style={{
                        background: 'linear-gradient(to right, transparent 2%, rgba(255,255,255,0.3) 5%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0.3) 95%, transparent 98%)',
                      }}
                    />
                    
                    {/* Bottom edge shadow */}
                    <div 
                      className="absolute bottom-0 left-0 right-0 h-1 pointer-events-none"
                      style={{
                        background: 'linear-gradient(to right, transparent 2%, rgba(0,0,0,0.5) 5%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.5) 95%, transparent 98%)',
                      }}
                    />
                    
                    {/* Left edge (depth) */}
                    <div 
                      className="absolute top-0 bottom-0 left-0 w-2 pointer-events-none"
                      style={{
                        background: 'linear-gradient(to right, rgba(0,0,0,0.8), transparent)',
                      }}
                    />
                    
                    {/* Right edge highlight (where light hits) */}
                    <div 
                      className="absolute top-0 bottom-0 right-0 w-1 pointer-events-none"
                      style={{
                        background: 'linear-gradient(to left, rgba(255,255,255,0.15), transparent)',
                      }}
                    />
                    
                    {/* Spine label area */}
                    <div className="absolute inset-0 flex items-center px-3">
                      <div className="flex-1 min-w-0">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit(cassette.id);
                              if (e.key === 'Escape') handleCancelEdit();
                            }}
                            onBlur={() => handleSaveEdit(cassette.id)}
                            className="w-full px-2 py-1 text-sm bg-white/90 text-gray-800 border border-gray-400 rounded outline-none font-['Caveat']"
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                            {/* Status dot */}
                            {hasAudio && (
                              <div className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_4px_rgba(74,222,128,0.8)] flex-shrink-0" />
                            )}
                            
                            {/* Cassette title on spine */}
                            <div
                              className={`text-sm font-bold truncate ${
                                isActive ? 'text-white' : 'text-gray-300'
                              }`}
                              style={{
                                fontFamily: "'Caveat', cursive",
                                fontSize: '16px',
                                textShadow: isActive ? '0 0 8px rgba(255,107,53,0.8)' : 'none',
                              }}
                            >
                              {title}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Action buttons - show on hover */}
                      {(isHovered || isDeleting) && !isEditing && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="flex gap-1 ml-2 flex-shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {isDeleting ? (
                            <>
                              <button
                                onClick={() => handleConfirmDelete(cassette.id)}
                                className="px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white text-xs rounded font-bold"
                              >
                                ✓
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(null)}
                                className="px-2 py-0.5 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded font-bold"
                              >
                                ✗
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleStartEdit(cassette.id, title)}
                                className="px-1.5 py-0.5 bg-blue-600/80 hover:bg-blue-700 text-white text-xs rounded"
                                title="Endre navn"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => handleDeleteClick(cassette.id)}
                                className="px-1.5 py-0.5 bg-red-600/80 hover:bg-red-700 text-white text-xs rounded"
                                title="Slett"
                              >
                                🗑️
                              </button>
                            </>
                          )}
                        </motion.div>
                      )}
                    </div>

                    {/* Bottom edge shadow */}
                    <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-black/40 to-transparent" />
                    
                    {/* Side grooves for realism */}
                    <div className="absolute top-2 bottom-2 left-1 w-px bg-white/10" />
                    <div className="absolute top-2 bottom-2 right-1 w-px bg-black/40" />
                  </div>

                  {/* Cassette depth/shadow */}
                  <div
                    className="absolute inset-0 -z-10 rounded"
                    style={{
                      transform: 'translateZ(-2px) translateY(2px)',
                      background: 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.3))',
                      filter: 'blur(2px)',
                    }}
                  />
                </motion.div>
              );
            })}
          </AnimatePresence>

          {cassettes.length === 0 && (
            <div className="text-center text-[#666] text-sm py-12 px-4">
              <div className="text-4xl mb-4">📼</div>
              <div>Tomt stativ</div>
              <div className="mt-2 text-xs">Klikk &quot;NY KASSETT&quot;</div>
            </div>
          )}
        </div>

        {/* Bottom rack edge */}
        <div className="h-8 bg-gradient-to-t from-[#2a2a2a] to-transparent" />
      </div>
    </div>
  );
}

