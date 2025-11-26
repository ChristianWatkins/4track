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

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('nb-NO', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="fixed left-0 top-0 bottom-0 w-72 bg-gradient-to-b from-[#2a2a2a] to-[#1a1a1a] border-r-2 border-[#444] flex flex-col z-50 shadow-2xl">
      {/* Header */}
      <div className="p-4 border-b-2 border-[#555] bg-gradient-to-b from-[#333] to-[#2a2a2a]">
        <h2 className="text-xl font-bold text-[#ff6b35] mb-3 flex items-center gap-2 drop-shadow-[0_0_8px_rgba(255,107,53,0.6)]">
          <span className="text-2xl">📼</span>
          <span>KASSETT-STATIV</span>
        </h2>
        <button
          onClick={onNewCassette}
          className="w-full py-2 px-4 bg-gradient-to-b from-[#ff6b35] to-[#ff5520] hover:from-[#ff8555] hover:to-[#ff6b35] text-white font-bold rounded shadow-lg transition-all hover:shadow-[0_0_15px_rgba(255,107,53,0.6)] border-2 border-[#ff8555]"
        >
          + NY KASSETT
        </button>
      </div>

      {/* Cassette List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        <AnimatePresence>
          {cassettes.map((cassette) => {
            const isActive = cassette.id === currentCassetteId;
            const isHovered = hoveredId === cassette.id;
            const isEditing = editingId === cassette.id;
            const isDeleting = deleteConfirmId === cassette.id;
            const title = cassette.data.cassetteTitle || 'Untitled';
            const hasAudio = cassette.data.tracks.some(t => t.audioBuffer !== null);

            return (
              <motion.div
                key={cassette.id}
                layoutId={`cassette-${cassette.id}`}
                initial={{ opacity: 0, x: -30, rotateY: -15 }}
                animate={{ opacity: 1, x: 0, rotateY: 0 }}
                exit={{ opacity: 0, x: -30, rotateY: -15 }}
                onHoverStart={() => setHoveredId(cassette.id)}
                onHoverEnd={() => setHoveredId(null)}
                className="relative"
                style={{ transformStyle: 'preserve-3d' }}
              >
                {/* Cassette Shell */}
                <div
                  className={`relative w-full h-32 rounded-lg transition-all duration-300 cursor-pointer ${
                    isActive
                      ? 'shadow-[0_0_20px_rgba(255,107,53,0.8)]'
                      : 'shadow-[0_4px_8px_rgba(0,0,0,0.5)]'
                  } ${isHovered ? 'scale-105' : 'scale-100'}`}
                  onClick={() => !isActive && !isEditing && !isDeleting && onLoadCassette(cassette.id)}
                  style={{
                    background: isActive
                      ? 'linear-gradient(135deg, #ff6b35 0%, #ff8555 50%, #ff6b35 100%)'
                      : 'linear-gradient(135deg, #4a4a4a 0%, #5a5a5a 50%, #4a4a4a 100%)',
                    transform: isHovered ? 'translateZ(10px)' : 'translateZ(0px)',
                  }}
                >
                  {/* Cassette Top Label Area */}
                  <div className="absolute top-2 left-3 right-3 h-14 bg-white/90 rounded border border-gray-300 flex flex-col items-center justify-center p-1">
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
                        className="w-full px-1 py-0.5 text-sm text-center bg-transparent border-none outline-none text-gray-800 font-['Caveat']"
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <>
                        <div
                          className="text-sm font-bold text-gray-800 truncate w-full text-center px-1"
                          style={{ fontFamily: "'Caveat', cursive" }}
                        >
                          {title}
                        </div>
                        <div className="text-[10px] text-gray-600">
                          {formatDate(cassette.data.updatedAt)}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Cassette Reels */}
                  <div className="absolute bottom-6 left-0 right-0 flex justify-around px-8">
                    <div className="w-8 h-8 rounded-full bg-[#1a1a1a] border-2 border-[#333] flex items-center justify-center">
                      <div className="w-3 h-3 rounded-full bg-[#2a2a2a]" />
                    </div>
                    <div className="w-8 h-8 rounded-full bg-[#1a1a1a] border-2 border-[#333] flex items-center justify-center">
                      <div className="w-3 h-3 rounded-full bg-[#2a2a2a]" />
                    </div>
                  </div>

                  {/* Status Indicators */}
                  <div className="absolute bottom-1 left-2 flex gap-1 text-xs">
                    {hasAudio && (
                      <span className="px-1.5 py-0.5 bg-green-500 text-white rounded text-[10px] font-bold">
                        ●
                      </span>
                    )}
                    {isActive && (
                      <span className="px-1.5 py-0.5 bg-white text-[#ff6b35] rounded text-[10px] font-bold">
                        AKTIV
                      </span>
                    )}
                  </div>

                  {/* Action Buttons - Show on hover */}
                  {(isHovered || isDeleting) && !isEditing && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="absolute bottom-1 right-1 flex gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {isDeleting ? (
                        <>
                          <button
                            onClick={() => handleConfirmDelete(cassette.id)}
                            className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-[10px] rounded font-bold"
                          >
                            OK
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="px-2 py-1 bg-gray-600 hover:bg-gray-700 text-white text-[10px] rounded font-bold"
                          >
                            NEI
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleStartEdit(cassette.id, title)}
                            className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[10px] rounded font-bold"
                            title="Gi nytt navn"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDeleteClick(cassette.id)}
                            className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-[10px] rounded font-bold"
                            title="Slett"
                          >
                            🗑️
                          </button>
                        </>
                      )}
                    </motion.div>
                  )}
                </div>

                {/* Cassette Shadow */}
                <div
                  className="absolute inset-0 bg-black/20 rounded-lg blur-sm -z-10"
                  style={{
                    transform: 'translateY(4px) translateZ(-5px)',
                  }}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>

        {cassettes.length === 0 && (
          <div className="text-center text-[#888] text-sm py-12 px-4">
            <div className="text-4xl mb-4">📼</div>
            <div>Ingen kassetter i stativet.</div>
            <div className="mt-2 text-xs">Klikk &quot;NY KASSETT&quot; for å starte.</div>
          </div>
        )}
      </div>

      {/* Rack Bottom */}
      <div className="h-4 bg-gradient-to-t from-[#1a1a1a] to-transparent border-t border-[#333]" />
    </div>
  );
}

