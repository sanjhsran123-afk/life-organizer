import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { EmptyState } from '../common/EmptyState';
import { ConfirmModal } from '../common/ConfirmModal';
import {
  CheckSquare,
  Plus,
  Search,
  Filter,
  Check,
  Calendar,
  Clock,
  LayoutList,
  Columns,
  Grid,
  Edit2,
  Trash2,
  AlertCircle,
  Tag,
  Bell,
} from 'lucide-react';
import { Task, TaskCategory, TaskPriority, TaskStatus } from '../../types';
import {
  getTodayDateString,
  formatDate,
  formatRelativeDate,
  isOverdue,
} from '../../utils/formatters';

type FilterType = 'all' | 'today' | 'upcoming' | 'overdue' | 'completed';
type ViewMode = 'list' | 'cards' | 'kanban';

export const TasksView: React.FC = () => {
  const { tasks, toggleTaskStatus, openTaskModal, deleteTask } = useApp();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [sortBy, setSortBy] = useState<'dueDate' | 'priority' | 'title'>('dueDate');

  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

  const today = getTodayDateString();

  // Filtered and sorted tasks
  const filteredTasks = useMemo(() => {
    let result = [...tasks];

    // Search query
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.description && t.description.toLowerCase().includes(q)) ||
          t.category.toLowerCase().includes(q)
      );
    }

    // Status / date filters
    if (filter === 'today') {
      result = result.filter((t) => t.dueDate === today);
    } else if (filter === 'upcoming') {
      result = result.filter((t) => t.status !== 'completed' && t.dueDate > today);
    } else if (filter === 'overdue') {
      result = result.filter((t) => t.status !== 'completed' && isOverdue(t.dueDate));
    } else if (filter === 'completed') {
      result = result.filter((t) => t.status === 'completed');
    }

    // Category filter
    if (categoryFilter !== 'all') {
      result = result.filter((t) => t.category === categoryFilter);
    }

    // Priority filter
    if (priorityFilter !== 'all') {
      result = result.filter((t) => t.priority === priorityFilter);
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'dueDate') {
        return a.dueDate.localeCompare(b.dueDate);
      }
      if (sortBy === 'priority') {
        const priorityWeight = { high: 3, medium: 2, low: 1 };
        return priorityWeight[b.priority] - priorityWeight[a.priority];
      }
      return a.title.localeCompare(b.title);
    });

    return result;
  }, [tasks, search, filter, categoryFilter, priorityFilter, sortBy, today]);

  // Counts for tabs
  const counts = useMemo(() => {
    return {
      all: tasks.length,
      today: tasks.filter((t) => t.dueDate === today).length,
      upcoming: tasks.filter((t) => t.status !== 'completed' && t.dueDate > today).length,
      overdue: tasks.filter((t) => t.status !== 'completed' && isOverdue(t.dueDate)).length,
      completed: tasks.filter((t) => t.status === 'completed').length,
    };
  }, [tasks, today]);

  const kanbanColumns: Array<{ id: TaskStatus; label: string; count: number; color: string }> = [
    {
      id: 'todo',
      label: 'To Do',
      count: filteredTasks.filter((t) => t.status === 'todo').length,
      color: 'bg-zinc-100 text-zinc-700',
    },
    {
      id: 'in_progress',
      label: 'In Progress',
      count: filteredTasks.filter((t) => t.status === 'in_progress').length,
      color: 'bg-amber-100 text-amber-800',
    },
    {
      id: 'completed',
      label: 'Completed',
      count: filteredTasks.filter((t) => t.status === 'completed').length,
      color: 'bg-emerald-100 text-emerald-800',
    },
  ];

  return (
    <div className="space-y-5">
      {/* Top Header & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Task Management</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Organize coursework, personal milestones, and daily to-dos.
          </p>
        </div>
        <Button
          variant="primary"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => openTaskModal()}
          className="w-full sm:w-auto"
        >
          Add New Task
        </Button>
      </div>

      {/* Filter Tabs & View switchers */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-zinc-200/80 dark:border-zinc-800">
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {(
            [
              { id: 'all' as const, label: 'All Tasks', count: counts.all, danger: false },
              { id: 'today' as const, label: 'Today', count: counts.today, danger: false },
              { id: 'upcoming' as const, label: 'Upcoming', count: counts.upcoming, danger: false },
              { id: 'overdue' as const, label: 'Overdue', count: counts.overdue, danger: counts.overdue > 0 },
              { id: 'completed' as const, label: 'Completed', count: counts.completed, danger: false },
            ]
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 cursor-pointer ${
                filter === tab.id
                  ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold shadow-2xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                  filter === tab.id
                    ? 'bg-zinc-800 dark:bg-zinc-200 text-zinc-200 dark:text-zinc-800'
                    : tab.danger
                    ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-bold'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl shrink-0 self-start sm:self-auto">
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              viewMode === 'list'
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-2xs'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
            title="List view"
          >
            <LayoutList className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setViewMode('cards')}
            className={`p-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              viewMode === 'cards'
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-2xs'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
            title="Cards view"
          >
            <Grid className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setViewMode('kanban')}
            className={`p-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              viewMode === 'kanban'
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-2xs'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
            title="Kanban Board view"
          >
            <Columns className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
        <div className="sm:col-span-2 relative">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-3 sm:top-2.5" />
          <input
            type="text"
            placeholder="Search tasks by name or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white dark:bg-zinc-850 border border-zinc-200/90 dark:border-zinc-700 rounded-xl text-base sm:text-xs pl-9 pr-3 py-2.5 sm:py-2 min-h-[42px] sm:min-h-0 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="bg-white dark:bg-zinc-850 border border-zinc-200/90 dark:border-zinc-700 rounded-xl text-base sm:text-xs px-3 py-2.5 sm:py-2 min-h-[42px] sm:min-h-0 text-zinc-700 dark:text-zinc-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
        >
          <option value="all" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">All Categories</option>
          <option value="College" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">College</option>
          <option value="Personal" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">Personal</option>
          <option value="Work" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">Work</option>
          <option value="Finance" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">Finance</option>
          <option value="Health" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">Health</option>
          <option value="Other" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">Other</option>
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="bg-white dark:bg-zinc-850 border border-zinc-200/90 dark:border-zinc-700 rounded-xl text-base sm:text-xs px-3 py-2.5 sm:py-2 min-h-[42px] sm:min-h-0 text-zinc-700 dark:text-zinc-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
        >
          <option value="dueDate" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">Sort by: Due Date</option>
          <option value="priority" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">Sort by: Priority</option>
          <option value="title" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">Sort by: Title (A-Z)</option>
        </select>
      </div>

      {/* Main Content Area */}
      {filteredTasks.length === 0 ? (
        <EmptyState
          icon={<CheckSquare className="w-6 h-6" />}
          title={
            filter === 'today'
              ? 'No tasks for today 🎉'
              : filter === 'overdue'
              ? 'No overdue tasks 🎉'
              : 'No matching tasks found'
          }
          description={
            filter === 'today'
              ? 'Enjoy your free time, or create a new task to stay productive.'
              : filter === 'overdue'
              ? 'You are completely caught up with all deadlines!'
              : 'Try clearing your search query or filters to view other tasks.'
          }
          actionLabel="Add New Task"
          onAction={() => openTaskModal()}
        />
      ) : viewMode === 'kanban' ? (
        /* KANBAN BOARD VIEW */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {kanbanColumns.map((col) => {
            const colTasks = filteredTasks.filter((t) => t.status === col.id);
            return (
              <div
                key={col.id}
                className="bg-zinc-50/80 dark:bg-zinc-900/60 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 p-3 flex flex-col min-h-[400px]"
              >
                <div className="flex items-center justify-between pb-3 px-1 border-b border-zinc-200/60 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">{col.label}</span>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${col.color}`}>
                      {col.count}
                    </span>
                  </div>
                  <button
                    onClick={() => openTaskModal({ status: col.id } as any)}
                    className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 p-1 rounded hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex-1 py-3 space-y-2.5 overflow-y-auto">
                  {colTasks.length === 0 ? (
                    <div className="h-32 flex items-center justify-center text-xs text-zinc-400 dark:text-zinc-500 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
                      No tasks in this column
                    </div>
                  ) : (
                    colTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onToggle={() => toggleTaskStatus(task.id)}
                        onEdit={() => openTaskModal(task)}
                        onDelete={() => setTaskToDelete(task)}
                        compact={true}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : viewMode === 'cards' ? (
        /* COMPACT CARDS VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onToggle={() => toggleTaskStatus(task.id)}
              onEdit={() => openTaskModal(task)}
              onDelete={() => setTaskToDelete(task)}
              compact={false}
            />
          ))}
        </div>
      ) : (
        /* LIST VIEW */
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-xs divide-y divide-zinc-100 dark:divide-zinc-800 overflow-hidden">
          {filteredTasks.map((task) => {
            const isDone = task.status === 'completed';
            const overdue = !isDone && isOverdue(task.dueDate);

            return (
              <div
                key={task.id}
                className={`flex items-center gap-3.5 p-3.5 sm:px-4 hover:bg-zinc-50/70 dark:hover:bg-zinc-800/50 transition-colors group ${
                  isDone ? 'bg-zinc-50/40 dark:bg-zinc-900/40 opacity-70' : ''
                }`}
              >
                {/* Interactive Checkbox */}
                <button
                  type="button"
                  onClick={() => toggleTaskStatus(task.id)}
                  className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                    isDone
                      ? 'bg-emerald-600 border-emerald-600 text-white'
                      : 'border-zinc-300 dark:border-zinc-600 hover:border-indigo-500 bg-white dark:bg-zinc-800'
                  }`}
                >
                  {isDone && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                </button>

                {/* Details */}
                <div
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => openTaskModal(task)}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs sm:text-sm font-semibold truncate ${
                        isDone ? 'line-through text-zinc-400 dark:text-zinc-500' : 'text-zinc-900 dark:text-zinc-100'
                      }`}
                    >
                      {task.title}
                    </span>
                    <Badge
                      size="xs"
                      variant={
                        task.priority === 'high'
                          ? 'danger'
                          : task.priority === 'medium'
                          ? 'warning'
                          : 'neutral'
                      }
                    >
                      {task.priority}
                    </Badge>
                  </div>
                  {task.description && (
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">{task.description}</p>
                  )}

                  {/* Category & Due Date shown on phone screens */}
                  <div className="flex sm:hidden items-center gap-2 mt-1 text-[11px] flex-wrap">
                    <Badge size="xs" variant="neutral">
                      {task.category}
                    </Badge>
                    <span
                      className={`font-medium flex items-center gap-1 ${
                        overdue ? 'text-rose-600 dark:text-rose-400 font-semibold' : 'text-zinc-500 dark:text-zinc-400'
                      }`}
                    >
                      <Calendar className="w-3 h-3 text-zinc-400" />
                      {formatRelativeDate(task.dueDate)}
                      {task.dueTime && <span className="text-zinc-400 dark:text-zinc-500">• {task.dueTime}</span>}
                    </span>
                    {task.remindMe && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded-full font-medium" title="Reminder set">
                        <Bell className="w-2.5 h-2.5" />
                        <span>Alert</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Category & Due Date shown on tablet / desktop */}
                <div className="hidden sm:flex items-center gap-3 shrink-0 text-xs">
                  <Badge size="xs" variant="neutral">
                    {task.category}
                  </Badge>

                  <span
                    className={`text-[11px] font-medium flex items-center gap-1 ${
                      overdue ? 'text-rose-600 dark:text-rose-400 font-semibold' : 'text-zinc-500 dark:text-zinc-400'
                    }`}
                  >
                    <Calendar className="w-3 h-3 text-zinc-400" />
                    {formatRelativeDate(task.dueDate)}
                    {task.dueTime && <span className="text-zinc-400 dark:text-zinc-500">at {task.dueTime}</span>}
                  </span>

                  {task.remindMe && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full font-medium" title="Reminder set">
                      <Bell className="w-3 h-3" />
                      <span>Reminder</span>
                    </span>
                  )}
                </div>

                {/* Row actions */}
                <div className="flex items-center gap-1 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openTaskModal(task)}
                    className="p-2 sm:p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg cursor-pointer"
                    title="Edit task"
                    aria-label="Edit task"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setTaskToDelete(task)}
                    className="p-2 sm:p-1.5 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg cursor-pointer"
                    title="Delete task"
                    aria-label="Delete task"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(taskToDelete)}
        onClose={() => setTaskToDelete(null)}
        onConfirm={() => {
          if (taskToDelete) deleteTask(taskToDelete.id);
        }}
        title="Delete Task"
        message={`Are you sure you want to delete "${taskToDelete?.title}"? This action cannot be undone.`}
        confirmLabel="Delete Task"
      />
    </div>
  );
};

// Reusable individual task card
interface TaskCardProps {
  task: Task;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  compact?: boolean;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onToggle, onEdit, onDelete, compact }) => {
  const isDone = task.status === 'completed';
  const overdue = !isDone && isOverdue(task.dueDate);

  return (
    <div
      className={`p-3.5 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/80 dark:border-zinc-800 shadow-2xs hover:border-zinc-300 dark:hover:border-zinc-700 transition-all ${
        isDone ? 'bg-zinc-50/50 dark:bg-zinc-900/50 opacity-70' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5 min-w-0">
          <button
            type="button"
            onClick={onToggle}
            className={`mt-0.5 w-4.5 h-4.5 rounded-md border flex items-center justify-center transition-all cursor-pointer shrink-0 ${
              isDone
                ? 'bg-emerald-600 border-emerald-600 text-white'
                : 'border-zinc-300 dark:border-zinc-600 hover:border-indigo-500 bg-white dark:bg-zinc-800'
            }`}
          >
            {isDone && <Check className="w-3 h-3 stroke-[2.5]" />}
          </button>
          <div className="min-w-0 cursor-pointer" onClick={onEdit}>
            <h4
              className={`text-xs font-semibold ${
                isDone ? 'line-through text-zinc-400 dark:text-zinc-500' : 'text-zinc-900 dark:text-zinc-100'
              }`}
            >
              {task.title}
            </h4>
            {task.description && !compact && (
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2 mt-1">{task.description}</p>
            )}
          </div>
        </div>

        <Badge
          size="xs"
          variant={
            task.priority === 'high'
              ? 'danger'
              : task.priority === 'medium'
              ? 'warning'
              : 'neutral'
          }
        >
          {task.priority}
        </Badge>
      </div>

      <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-zinc-100 dark:border-zinc-800 text-[11px]">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge size="xs" variant="neutral">
            {task.category}
          </Badge>
          <span className={`font-medium ${overdue ? 'text-rose-600 dark:text-rose-400' : 'text-zinc-500 dark:text-zinc-400'}`}>
            {formatRelativeDate(task.dueDate)}
            {task.dueTime && ` • ${task.dueTime}`}
          </span>
          {task.remindMe && (
            <span className="text-amber-500 dark:text-amber-400" title="Reminder active">
              <Bell className="w-3 h-3 inline" />
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onEdit}
            className="p-1 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded"
          >
            <Edit2 className="w-3 h-3" />
          </button>
          <button
            onClick={onDelete}
            className="p-1 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
