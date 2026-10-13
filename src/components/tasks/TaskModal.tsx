import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { Textarea } from '../common/Textarea';
import { Button } from '../common/Button';
import { TaskCategory, TaskPriority, TaskStatus } from '../../types';
import { getTodayDateString } from '../../utils/formatters';

export const TaskModal: React.FC = () => {
  const { taskModal, closeTaskModal, addTask, updateTask, deleteTask } = useApp();

  const isEditing = Boolean(taskModal.task?.id);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [category, setCategory] = useState<TaskCategory>('College');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [dueDate, setDueDate] = useState(getTodayDateString());
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (taskModal.isOpen) {
      if (taskModal.task) {
        setTitle(taskModal.task.title || '');
        setDescription(taskModal.task.description || '');
        setPriority(taskModal.task.priority || 'medium');
        setCategory(taskModal.task.category || 'College');
        setStatus(taskModal.task.status || 'todo');
        setDueDate(taskModal.task.dueDate || getTodayDateString());
        setNotes(taskModal.task.notes || '');
      } else {
        setTitle('');
        setDescription('');
        setPriority('medium');
        setCategory('College');
        setStatus('todo');
        setDueDate(getTodayDateString());
        setNotes('');
      }
      setError('');
    }
  }, [taskModal.isOpen, taskModal.task]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Task title is required');
      return;
    }

    if (isEditing && taskModal.task) {
      updateTask(taskModal.task.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        category,
        status,
        dueDate,
        notes: notes.trim() || undefined,
      });
    } else {
      addTask({
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        category,
        status,
        dueDate,
        notes: notes.trim() || undefined,
      });
    }
    closeTaskModal();
  };

  return (
    <Modal
      isOpen={taskModal.isOpen}
      onClose={closeTaskModal}
      title={isEditing ? 'Edit Task' : 'Create New Task'}
      subtitle={
        isEditing
          ? 'Update details, due date, or priority for this item'
          : 'Add a new action item to your daily agenda'
      }
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Task Title"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (error) setError('');
          }}
          placeholder="e.g. Complete DBMS assignment"
          error={error}
          required
          autoFocus
        />

        <Textarea
          label="Description / Context (Optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Brief details about what needs to be done..."
          rows={2}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select
            label="Priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as TaskPriority)}
            options={[
              { value: 'low', label: '🟢 Low Priority' },
              { value: 'medium', label: '🟡 Medium Priority' },
              { value: 'high', label: '🔴 High Priority' },
            ]}
          />

          <Select
            label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value as TaskCategory)}
            options={[
              { value: 'Personal', label: 'Personal' },
              { value: 'College', label: 'College' },
              { value: 'Work', label: 'Work' },
              { value: 'Finance', label: 'Finance' },
              { value: 'Health', label: 'Health' },
              { value: 'Other', label: 'Other' },
            ]}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Due Date"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            required
          />

          {isEditing && (
            <Select
              label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value as TaskStatus)}
              options={[
                { value: 'todo', label: 'To Do' },
                { value: 'in_progress', label: 'In Progress' },
                { value: 'completed', label: 'Completed' },
              ]}
            />
          )}
        </div>

        <Textarea
          label="Extra Notes / Reference (Optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Helpful links, chapter numbers, or reminders..."
          rows={2}
        />

        <div className="flex items-center justify-between pt-3 border-t border-zinc-100 gap-3">
          {isEditing && taskModal.task ? (
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={() => {
                deleteTask(taskModal.task!.id);
                closeTaskModal();
              }}
            >
              Delete
            </Button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={closeTaskModal}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              {isEditing ? 'Save Changes' : 'Create Task'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
