import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Textarea } from '../common/Textarea';
import { Select } from '../common/Select';
import { Button } from '../common/Button';
import { Pin, Tag } from 'lucide-react';

export const NoteModal: React.FC = () => {
  const { noteModal, closeNoteModal, addNote, updateNote, deleteNote, people, tasks } = useApp();
  const isEditing = Boolean(noteModal.note?.id);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [personId, setPersonId] = useState('');
  const [taskId, setTaskId] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (noteModal.isOpen) {
      if (noteModal.note) {
        setTitle(noteModal.note.title || '');
        setContent(noteModal.note.content || '');
        setTagsInput(noteModal.note.tags ? noteModal.note.tags.join(', ') : '');
        setPersonId(noteModal.note.personId || '');
        setTaskId(noteModal.note.taskId || '');
        setIsPinned(Boolean(noteModal.note.isPinned));
      } else {
        setTitle('');
        setContent('');
        setTagsInput('');
        setPersonId(noteModal.initialPersonId || '');
        setTaskId(noteModal.initialTaskId || '');
        setIsPinned(false);
      }
      setError('');
    }
  }, [noteModal.isOpen, noteModal.note, noteModal.initialPersonId, noteModal.initialTaskId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Note title is required');
      return;
    }

    const cleanTags = tagsInput
      .split(',')
      .map((t) => t.trim().replace(/^#/, ''))
      .filter(Boolean);

    if (isEditing && noteModal.note) {
      updateNote(noteModal.note.id, {
        title: title.trim(),
        content: content.trim(),
        tags: cleanTags,
        personId: personId || undefined,
        taskId: taskId || undefined,
        isPinned,
      });
    } else {
      addNote({
        title: title.trim(),
        content: content.trim(),
        tags: cleanTags,
        personId: personId || undefined,
        taskId: taskId || undefined,
        isPinned,
      });
    }

    closeNoteModal();
  };

  return (
    <Modal
      isOpen={noteModal.isOpen}
      onClose={closeNoteModal}
      title={isEditing ? 'Edit Note' : 'Create New Note'}
      subtitle={
        isEditing
          ? 'Update note content, tags, or associations'
          : 'Jot down an idea, reminder, or context'
      }
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <Input
              label="Note Title"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (error) setError('');
              }}
              placeholder="e.g. Rahul payment timeline"
              error={error}
              required
              autoFocus
            />
          </div>
          <button
            type="button"
            onClick={() => setIsPinned((prev) => !prev)}
            className={`mt-6 p-2 rounded-xl border transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-medium ${
              isPinned
                ? 'bg-amber-50 text-amber-800 border-amber-200'
                : 'bg-zinc-50 text-zinc-500 border-zinc-200 hover:text-zinc-800'
            }`}
            title="Pin note to top"
          >
            <Pin className={`w-3.5 h-3.5 ${isPinned ? 'fill-amber-500 text-amber-500' : ''}`} />
            <span>{isPinned ? 'Pinned' : 'Pin'}</span>
          </button>
        </div>

        <Textarea
          label="Note Content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write your note here..."
          rows={4}
          required
        />

        <Input
          label="Tags (Comma separated)"
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          placeholder="Finance, Trip, College, Ideas..."
          leftIcon={<Tag className="w-3.5 h-3.5 text-zinc-400" />}
          hint="Example: Rahul, College, Budget"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <Select
            label="Associate with Person (Optional)"
            value={personId}
            onChange={(e) => setPersonId(e.target.value)}
            options={[
              { value: '', label: 'None (General note)' },
              ...people.map((p) => ({ value: p.id, label: p.name })),
            ]}
          />

          <Select
            label="Associate with Task (Optional)"
            value={taskId}
            onChange={(e) => setTaskId(e.target.value)}
            options={[
              { value: '', label: 'None (Unlinked)' },
              ...tasks.map((t) => ({ value: t.id, label: t.title })),
            ]}
          />
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-zinc-100 gap-3">
          {isEditing && noteModal.note ? (
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={() => {
                deleteNote(noteModal.note!.id);
                closeNoteModal();
              }}
            >
              Delete Note
            </Button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={closeNoteModal}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              {isEditing ? 'Save Changes' : 'Create Note'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
