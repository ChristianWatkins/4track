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
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="fixed left-0 top-0 bottom-0 w-64 bg-[#1a1a1a] border-r border-[#333] flex flex-col z-50 shadow-2xl">
      {/* Header */}
      <div className="p-4 border-b border-[#333] bg-gradient-to-b from-[#222] to-[#1a1a1a]">
        <h2 className="text-lg font-bold text-[#ccc] mb-3 flex items-center gap-2">
          <span className="text-2xl">📼</span>
          <span>Kassett-stativ</span>
        </h2>
        <button
          onClick={onNewCassette}
          className="w-full py-2 px-4 bg-[#ff6b35] hover:bg-[#ff8555] text-white rounded transition-colors flex items-center justify-center gap-2"
        >
          <span className="text-xl">+</span>
          <span>Ny kassett</span>
        </button>
      </div>

      {/* Cassette List */}
      <div className="flex-1 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-[#444] scrollbar-track-[#1a1a1a]">
        <AnimatePresence>
          {cassettes.map((cassette) => {
            const isActive = cassette.id === currentCassetteId;
            const isEditing = editingId === cassette.id;
            const isDeleting = deleteConfirmId === cassette.id;
            const title = cassette.data.cassetteTitle || 'Untitled';
            const hasAudio = cassette.data.tracks.some(t => t.audioBuffer !== null);

            return (
              <motion.div
                key={cassette.id}
                layoutId={`cassette-${cassette.id}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className={`mb-2 p-3 rounded border transition-all ${
                  isActive
                    ? 'bg-[#2a2a2a] border-[#ff6b35] shadow-lg'
                    : 'bg-[#222] border-[#444] hover:border-[#666]'
                }`}
              >
                {/* Title */}
                <div className="mb-2">
                  {isEditing ? (
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit(cassette.id);
                        if (e.key === 'Escape') handleCancelEdit();
                      }}
                      className="w-full px-2 py-1 bg-[#333] text-[#ccc] border border-[#555] rounded text-sm"
                      autoFocus
                    />
                  ) : (
                    <div
                      className={`font-semibold truncate ${
                        isActive ? 'text-[#ff6b35]' : 'text-[#ccc]'
                      }`}
                    >
                      {title}
                    </div>
                  )}
                </div>

                {/* Metadata */}
                <div className="text-xs text-[#888] mb-2">
                  <div>{formatDate(cassette.data.updatedAt)}</div>
                  {hasAudio && <div className="text-[#4ade80]">● Har opptak</div>}
                </div>

                {/* Actions */}
                {isDeleting ? (
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleConfirmDelete(cassette.id)}
                      className="flex-1 py-1 px-2 bg-[#dc2626] hover:bg-[#ef4444] text-white text-xs rounded transition-colors"
                    >
                      Bekreft
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(null)}
                      className="flex-1 py-1 px-2 bg-[#555] hover:bg-[#666] text-[#ccc] text-xs rounded transition-colors"
                    >
                      Avbryt
                    </button>
                  </div>
                ) : isEditing ? (
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleSaveEdit(cassette.id)}
                      className="flex-1 py-1 px-2 bg-[#4ade80] hover:bg-[#22c55e] text-black text-xs rounded transition-colors"
                    >
                      Lagre
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="flex-1 py-1 px-2 bg-[#555] hover:bg-[#666] text-[#ccc] text-xs rounded transition-colors"
                    >
                      Avbryt
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-1">
                    {!isActive && (
                      <button
                        onClick={() => onLoadCassette(cassette.id)}
                        className="flex-1 py-1 px-2 bg-[#4ade80] hover:bg-[#22c55e] text-black text-xs rounded transition-colors"
                      >
                        Last inn
                      </button>
                    )}
                    <button
                      onClick={() => handleStartEdit(cassette.id, title)}
                      className="flex-1 py-1 px-2 bg-[#555] hover:bg-[#666] text-[#ccc] text-xs rounded transition-colors"
                      title="Gi nytt navn"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDeleteClick(cassette.id)}
                      className="flex-1 py-1 px-2 bg-[#555] hover:bg-[#dc2626] text-[#ccc] hover:text-white text-xs rounded transition-colors"
                      title="Slett"
                    >
                      🗑️
                    </button>
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>

        {cassettes.length === 0 && (
          <div className="text-center text-[#666] text-sm py-8">
            Ingen kassetter ennå.
            <br />
            Klikk &quot;Ny kassett&quot; for å starte.
          </div>
        )}
      </div>
    </div>
  );
}

