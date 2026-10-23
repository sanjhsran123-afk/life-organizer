import React from 'react';
import { useApp } from '../../context/AppContext';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { FileText, Plus, Pin } from 'lucide-react';
import { formatRelativeDate } from '../../utils/formatters';

export const RecentNotesWidget: React.FC = () => {
  const { notes, openNoteModal, setActiveTab } = useApp();

  // Prioritize pinned notes, then newest
  const sortedNotes = [...notes].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  return (
    <Card className="flex flex-col h-full">
      <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">Recent Notes</h3>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            size="xs"
            variant="ghost"
            icon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => openNoteModal()}
          >
            Add Note
          </Button>
          <Button
            size="xs"
            variant="ghost"
            onClick={() => setActiveTab('notes')}
            className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
          >
            View all →
          </Button>
        </div>
      </div>

      <div className="flex-1 py-3 space-y-2.5">
        {sortedNotes.length === 0 ? (
          <div className="py-8 text-center text-xs text-zinc-400 dark:text-zinc-500">
            No notes created yet. Capture your thoughts or transaction context!
          </div>
        ) : (
          sortedNotes.slice(0, 3).map((note) => (
            <div
              key={note.id}
              onClick={() => openNoteModal({ note })}
              className="p-3 rounded-xl border border-zinc-200/70 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer group shadow-2xs"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  {note.isPinned && (
                    <Pin className="w-3 h-3 fill-amber-500 text-amber-500 shrink-0" />
                  )}
                  <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                    {note.title}
                  </h4>
                </div>
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 shrink-0">
                  {formatRelativeDate(note.updatedAt.split('T')[0])}
                </span>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                {note.content}
              </p>
              {note.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {note.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-1.5 py-0.5 rounded font-medium"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
        <span>Click note to view or edit</span>
        <button
          onClick={() => setActiveTab('notes')}
          className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium cursor-pointer"
        >
          All notes ({notes.length}) →
        </button>
      </div>
    </Card>
  );
};
