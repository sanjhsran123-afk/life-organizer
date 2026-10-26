import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { Textarea } from '../common/Textarea';
import { Button } from '../common/Button';
import { TaskCategory, TaskPriority, TaskStatus } from '../../types';
import { getTodayDateString } from '../../utils/formatters';
import { openExactAlarmSettings, isNativeApp } from '../../utils/localNotifications';
import { Bell, BellRing, AlertCircle, ExternalLink } from 'lucide-react';

export const TaskModal: React.FC = () => {
  const { taskModal, closeTaskModal, addTask, updateTask, deleteTask, requestReminderPermission } = useApp();

  const isEditing = Boolean(taskModal.task?.id);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [category, setCategory] = useState<TaskCategory>('College');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [dueDate, setDueDate] = useState(getTodayDateString());
  const [dueTime, setDueTime] = useState('');
  const [remindMe, setRemindMe] = useState(false);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [alarmNotice, setAlarmNotice] = useState<string | null>(null);
  const [canOpenExactSettings, setCanOpenExactSettings] = useState(false);

  useEffect(() => {
    if (taskModal.isOpen) {
      if (taskModal.task) {
        setTitle(taskModal.task.title || '');
        setDescription(taskModal.task.description || '');
        setPriority(taskModal.task.priority || 'medium');
        setCategory(taskModal.task.category || 'College');
        setStatus(taskModal.task.status || 'todo');
        setDueDate(taskModal.task.dueDate || getTodayDateString());
        setDueTime(taskModal.task.dueTime || '');
        setRemindMe(Boolean(taskModal.task.remindMe));
        setNotes(taskModal.task.notes || '');
      } else {
        setTitle('');
        setDescription('');
        setPriority('medium');
        setCategory('College');
        setStatus('todo');
        setDueDate(getTodayDateString());
        setDueTime('');
        setRemindMe(false);
        setNotes('');
      }
      setError('');
      setAlarmNotice(null);
      setCanOpenExactSettings(false);
    }
  }, [taskModal.isOpen, taskModal.task]);

  // Handle toggling the reminder option
  const handleToggleReminder = async (checked: boolean) => {
    if (!checked) {
      setRemindMe(false);
      setAlarmNotice(null);
      return;
    }

    // If user enables reminder without a time, suggest a reasonable upcoming time
    if (!dueTime) {
      const now = new Date();
      now.setHours(now.getHours() + 1, 0, 0, 0);
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      setDueTime(`${hours}:${minutes}`);
    }

    setRemindMe(true);

    // Request notification permission and inspect exact alarm status
    const permResult = await requestReminderPermission();
    if (!permResult.granted) {
      setAlarmNotice(permResult.message || 'Notification permissions are needed to receive deadline reminders.');
      setRemindMe(false);
      return;
    }

    if (permResult.exactAlarmGranted === false) {
      setAlarmNotice('Exact alarms are disabled on this device. Reminders may be delayed slightly by Android battery saving.');
      setCanOpenExactSettings(isNativeApp());
    } else {
      setAlarmNotice(null);
      setCanOpenExactSettings(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Task title is required');
      return;
    }

    // Timezone-safe deadline ISO computation
    let deadline: string | undefined = undefined;
    const cleanTime = dueTime.trim();

    if (cleanTime && dueDate) {
      const localDateTime = new Date(`${dueDate}T${cleanTime}:00`);
      if (!isNaN(localDateTime.getTime())) {
        deadline = localDateTime.toISOString();
      }
    }

    const taskPayload = {
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      category,
      status,
      dueDate,
      dueTime: cleanTime || undefined,
      deadline,
      remindMe: Boolean(remindMe && cleanTime),
      notes: notes.trim() || undefined,
    };

    if (isEditing && taskModal.task) {
      updateTask(taskModal.task.id, taskPayload);
    } else {
      addTask(taskPayload);
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
          ? 'Update details, due date, deadline time, or reminder options'
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

          <Input
            label="Deadline Time (Optional)"
            type="time"
            value={dueTime}
            onChange={(e) => {
              setDueTime(e.target.value);
              if (error) setError('');
            }}
          />
        </div>

        {/* Remind Me Option */}
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/50 p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className={`p-2 rounded-lg transition-colors ${
                  remindMe
                    ? 'bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400'
                    : 'bg-zinc-200/80 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
                }`}
              >
                {remindMe ? <BellRing className="w-4 h-4 animate-pulse" /> : <Bell className="w-4 h-4" />}
              </div>
              <div>
                <label
                  htmlFor="remind-me-toggle"
                  className="text-sm font-medium text-zinc-900 dark:text-zinc-100 cursor-pointer"
                >
                  Remind me
                </label>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Alert 5 mins before & at deadline with quick actions
                </p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                id="remind-me-toggle"
                type="checkbox"
                checked={remindMe}
                onChange={(e) => handleToggleReminder(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-zinc-300 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-zinc-600 peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          {remindMe && !dueTime && (
            <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5 pt-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              Specify a deadline time above so reminders know when to trigger.
            </p>
          )}

          {alarmNotice && (
            <div className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-lg border border-amber-200/60 dark:border-amber-900/50 flex flex-col gap-1.5 mt-2">
              <div className="flex items-start gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{alarmNotice}</span>
              </div>
              {canOpenExactSettings && (
                <button
                  type="button"
                  onClick={() => openExactAlarmSettings()}
                  className="self-start inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline pt-0.5"
                >
                  <span>Open Android Alarm Settings</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
        </div>

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

        <Textarea
          label="Extra Notes / Reference (Optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Helpful links, chapter numbers, or reminders..."
          rows={2}
        />

        <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800 gap-3">
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
