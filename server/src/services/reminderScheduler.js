import mongoose from 'mongoose';
import { TaskModel } from '../models/Task.js';
import { sendPushToUser, isPushConfigured } from './pushService.js';

let intervalId = null;
let isProcessing = false;

/**
 * Process due and approaching task reminders from MongoDB.
 * Durable across server restarts because status and sent flags are stored in the database.
 */
export async function checkAndSendTaskReminders() {
  if (isProcessing) return;
  if (mongoose.connection.readyState !== 1) return;
  if (!isPushConfigured()) return;

  isProcessing = true;

  try {
    const now = new Date();
    const nowIso = now.toISOString();
    const fiveMinutesAhead = new Date(now.getTime() + 5 * 60 * 1000).toISOString();

    // 1. Check 5-minute pre-deadline reminders
    // Find incomplete tasks where remindMe is on, 5-min reminder hasn't been sent,
    // and deadline is between now and (now + 5 minutes).
    const approachingTasks = await TaskModel.find({
      remindMe: true,
      status: { $ne: 'completed' },
      reminder5MinSent: false,
      deadline: { $exists: true, $ne: null, $gt: nowIso, $lte: fiveMinutesAhead },
    }).limit(50);

    for (const task of approachingTasks) {
      if (!task.userId) continue;

      const timeLabel = task.dueTime ? ` (${task.dueTime})` : '';
      await sendPushToUser(task.userId, {
        title: `⏰ Due in 5 mins: ${task.title}`,
        body: `Your task deadline is coming up in 5 minutes${timeLabel}. Keep up the momentum!`,
        taskId: task.id,
        type: 'pre',
        tag: `dayledger-task-${task.id}-pre`,
        url: '/?tab=tasks',
      });

      // Mark 5-minute reminder as sent in DB
      await TaskModel.updateOne({ _id: task._id }, { $set: { reminder5MinSent: true } });
    }

    // 2. Check at-deadline reminders
    // Find incomplete tasks where remindMe is on, due reminder hasn't been sent,
    // and deadline has arrived (deadline <= now).
    const dueTasks = await TaskModel.find({
      remindMe: true,
      status: { $ne: 'completed' },
      reminderDueSent: false,
      deadline: { $exists: true, $ne: null, $lte: nowIso },
    }).limit(50);

    for (const task of dueTasks) {
      if (!task.userId) continue;

      await sendPushToUser(task.userId, {
        title: `🚨 Deadline Reached: ${task.title}`,
        body: `Time's up! Have you completed this task?`,
        taskId: task.id,
        type: 'due',
        tag: `dayledger-task-${task.id}-due`,
        actions: [
          { action: 'mark_complete', title: 'Mark complete' },
          { action: 'not_yet', title: 'Not yet' },
        ],
        url: '/?tab=tasks',
      });

      // Mark at-deadline reminder as sent in DB
      await TaskModel.updateOne({ _id: task._id }, { $set: { reminderDueSent: true } });
    }
  } catch (error) {
    console.error('[ReminderScheduler] Error scanning reminders:', error.message);
  } finally {
    isProcessing = false;
  }
}

/**
 * Start the durable background scheduler
 */
export function startReminderScheduler(pollIntervalMs = 30000) {
  if (intervalId) return;

  console.log(`⏱️ Starting durable Task Reminder Scheduler (polling MongoDB every ${pollIntervalMs / 1000}s)`);
  
  // Initial run after brief delay to allow db connection
  setTimeout(() => {
    checkAndSendTaskReminders();
  }, 3000);

  intervalId = setInterval(checkAndSendTaskReminders, pollIntervalMs);
}

/**
 * Stop scheduler (for graceful shutdown / tests)
 */
export function stopReminderScheduler() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}
