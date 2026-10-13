import React from 'react';
import { useApp } from '../../context/AppContext';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { Check, CheckSquare, Plus, ArrowRight } from 'lucide-react';
import { getTodayDateString, formatDate } from '../../utils/formatters';

export const TodayTasksWidget: React.FC = () => {
  const { tasks, toggleTaskStatus, openTaskModal, setActiveTab } = useApp();
  const today = getTodayDateString();

  // Tasks due today or incomplete upcoming tasks
  const todayTasks = tasks.filter((t) => t.dueDate === today);
  const displayTasks = todayTasks.length > 0 ? todayTasks : tasks.slice(0, 4);

  return (
    <Card className="flex flex-col h-full">
      <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
        <div className="flex items-center gap-2">
          <CheckSquare className="w-4 h-4 text-indigo-600" />
          <h3 className="text-sm font-bold text-zinc-900 tracking-tight">Today's Tasks</h3>
          <span className="text-xs bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full font-medium">
            {todayTasks.filter((t) => t.status !== 'completed').length} left
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            size="xs"
            variant="ghost"
            icon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => openTaskModal()}
          >
            Add Task
          </Button>
          <Button
            size="xs"
            variant="ghost"
            onClick={() => setActiveTab('tasks')}
            className="text-zinc-400 hover:text-zinc-700"
          >
            View all →
          </Button>
        </div>
      </div>

      <div className="flex-1 py-3 space-y-2">
        {displayTasks.length === 0 ? (
          <div className="py-8 text-center">
            <span className="text-2xl block mb-1">🎉</span>
            <p className="text-xs font-semibold text-zinc-800">No tasks for today</p>
            <p className="text-[11px] text-zinc-500 mt-0.5">Enjoy your free time or plan ahead.</p>
          </div>
        ) : (
          displayTasks.map((task) => {
            const isDone = task.status === 'completed';
            const priorityVariant =
              task.priority === 'high'
                ? 'danger'
                : task.priority === 'medium'
                ? 'warning'
                : 'neutral';

            return (
              <div
                key={task.id}
                className={`flex items-start gap-3 p-2.5 rounded-xl border transition-all duration-150 ${
                  isDone
                    ? 'bg-zinc-50/60 border-zinc-200/50 opacity-60'
                    : 'bg-white border-zinc-200/70 hover:border-zinc-300 shadow-2xs'
                }`}
              >
                {/* Custom animated checkbox */}
                <button
                  type="button"
                  onClick={() => toggleTaskStatus(task.id)}
                  className={`mt-0.5 w-4.5 h-4.5 rounded-md border flex items-center justify-center transition-all cursor-pointer ${
                    isDone
                      ? 'bg-emerald-600 border-emerald-600 text-white'
                      : 'border-zinc-300 hover:border-indigo-500 bg-white'
                  }`}
                  aria-label={isDone ? 'Mark incomplete' : 'Mark complete'}
                >
                  {isDone && <Check className="w-3 h-3 stroke-[2.5]" />}
                </button>

                <div
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => openTaskModal(task)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className={`text-xs font-semibold truncate ${
                        isDone ? 'line-through text-zinc-400' : 'text-zinc-900'
                      }`}
                    >
                      {task.title}
                    </p>
                    <Badge size="xs" variant={priorityVariant}>
                      {task.priority}
                    </Badge>
                  </div>
                  {task.description && (
                    <p className="text-[11px] text-zinc-500 line-clamp-1 mt-0.5">
                      {task.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-zinc-400">
                    <span className="text-zinc-500 font-medium">{task.category}</span>
                    <span>•</span>
                    <span>{formatDate(task.dueDate)}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-500">
        <span>Click checkbox to mark done</span>
        <button
          onClick={() => setActiveTab('tasks')}
          className="text-indigo-600 hover:underline font-medium flex items-center gap-1 cursor-pointer"
        >
          Open full task board <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </Card>
  );
};
