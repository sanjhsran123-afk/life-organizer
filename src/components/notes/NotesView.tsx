import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Button } from '../common/Button';
import { EmptyState } from '../common/EmptyState';
import { ConfirmModal } from '../common/ConfirmModal';
import {
  FileText,
  Plus,
  Search,
  Pin,
  Tag,
  Edit2,
  Trash2,
  User,
  CheckSquare,
} from 'lucide-react';
import { Note } from '../../types';
import { formatRelativeDate } from '../../utils/formatters';

export const NotesView: React.FC = () => {
  const { notes, openNoteModal, deleteNote, togglePinNote, people, tasks } = useApp();

  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [filterPinned, setFilterPinned] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null);

  // Extract all unique tags
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    notes.forEach((n) => n.tags.forEach((t) => tagSet.add(t)));
    return Array.from(tagSet);
  }, [notes]);

  const filteredNotes = useMemo(() => {
    let result = [...notes];

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.content.toLowerCase().includes(q) ||
          n.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    if (selectedTag !== 'all') {
      result = result.filter((n) => n.tags.includes(selectedTag));
    }

    if (filterPinned) {
      result = result.filter((n) => n.isPinned);
    }

    // Sort: pinned first, then newest updated
    result.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    return result;
  }, [notes, search, selectedTag, filterPinned]);

  return (
    <div className="space-y-6">
      {/* Top Header & New Note */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-900">Notes & Ideas</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Capture thoughts, transaction details, and coursework reminders.
          </p>
        </div>

        <Button
          variant="primary"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => openNoteModal()}
        >
          New Note
        </Button>
      </div>

      {/* Search & Tag Filter Bar */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search notes by title, tag, or content..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white border border-zinc-200/90 rounded-xl text-xs pl-9 pr-3 py-2 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
            />
          </div>

          <button
            type="button"
            onClick={() => setFilterPinned((prev) => !prev)}
            className={`px-3 py-2 rounded-xl text-xs font-medium border flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
              filterPinned
                ? 'bg-amber-50 text-amber-800 border-amber-200'
                : 'bg-white text-zinc-600 border-zinc-200/80 hover:bg-zinc-50'
            }`}
          >
            <Pin className={`w-3.5 h-3.5 ${filterPinned ? 'fill-amber-500 text-amber-500' : ''}`} />
            <span>Pinned only</span>
          </button>
        </div>

        {/* Tag pills */}
        {allTags.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setSelectedTag('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer shrink-0 ${
                selectedTag === 'all'
                  ? 'bg-zinc-900 text-white font-semibold'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200/80'
              }`}
            >
              All Tags
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer shrink-0 flex items-center gap-1 ${
                  selectedTag === tag
                    ? 'bg-indigo-600 text-white font-semibold'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200/80'
                }`}
              >
                <Tag className="w-3 h-3" />
                #{tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Notes Grid */}
      {filteredNotes.length === 0 ? (
        <EmptyState
          icon={<FileText className="w-6 h-6" />}
          title="No notes found"
          description="Create your first note to remember details about payments, projects, or ideas."
          actionLabel="Create Note"
          onAction={() => openNoteModal()}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredNotes.map((note) => {
            const linkedPerson = note.personId
              ? people.find((p) => p.id === note.personId)
              : null;
            const linkedTask = note.taskId
              ? tasks.find((t) => t.id === note.taskId)
              : null;

            return (
              <div
                key={note.id}
                className="bg-white rounded-2xl border border-zinc-200/80 p-4 shadow-xs hover:border-zinc-300 hover:shadow-card transition-all duration-150 flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3
                      onClick={() => openNoteModal({ note })}
                      className="text-sm font-bold text-zinc-900 group-hover:text-indigo-600 transition-colors cursor-pointer truncate flex-1"
                    >
                      {note.title}
                    </h3>
                    <button
                      onClick={() => togglePinNote(note.id)}
                      className={`p-1 rounded transition-colors cursor-pointer ${
                        note.isPinned
                          ? 'text-amber-500 hover:text-amber-600'
                          : 'text-zinc-300 hover:text-zinc-600'
                      }`}
                      title={note.isPinned ? 'Unpin note' : 'Pin note'}
                    >
                      <Pin
                        className={`w-3.5 h-3.5 ${
                          note.isPinned ? 'fill-amber-500 text-amber-500' : ''
                        }`}
                      />
                    </button>
                  </div>

                  <p
                    onClick={() => openNoteModal({ note })}
                    className="text-xs text-zinc-600 mt-2 line-clamp-4 leading-relaxed cursor-pointer whitespace-pre-wrap"
                  >
                    {note.content}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-zinc-100 space-y-2">
                  {/* Tags */}
                  {note.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {note.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200/50 px-1.5 py-0.5 rounded font-medium"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Linked Associations */}
                  {(linkedPerson || linkedTask) && (
                    <div className="flex flex-wrap gap-2 text-[11px] text-zinc-500">
                      {linkedPerson && (
                        <span className="flex items-center gap-1 bg-zinc-50 px-1.5 py-0.5 rounded border border-zinc-200/50">
                          <User className="w-3 h-3 text-zinc-400" />
                          {linkedPerson.name}
                        </span>
                      )}
                      {linkedTask && (
                        <span className="flex items-center gap-1 bg-zinc-50 px-1.5 py-0.5 rounded border border-zinc-200/50 truncate max-w-[160px]">
                          <CheckSquare className="w-3 h-3 text-zinc-400 shrink-0" />
                          <span className="truncate">{linkedTask.title}</span>
                        </span>
                      )}
                    </div>
                  )}

                  {/* Card Footer: Date & Actions */}
                  <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1">
                    <span>{formatRelativeDate(note.updatedAt.split('T')[0])}</span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openNoteModal({ note })}
                        className="p-1 text-zinc-400 hover:text-zinc-700 rounded hover:bg-zinc-100"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => setNoteToDelete(note)}
                        className="p-1 text-zinc-400 hover:text-rose-600 rounded hover:bg-rose-50"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={Boolean(noteToDelete)}
        onClose={() => setNoteToDelete(null)}
        onConfirm={() => {
          if (noteToDelete) deleteNote(noteToDelete.id);
        }}
        title="Delete Note"
        message={`Are you sure you want to delete note "${noteToDelete?.title}"?`}
        confirmLabel="Delete"
      />
    </div>
  );
};
