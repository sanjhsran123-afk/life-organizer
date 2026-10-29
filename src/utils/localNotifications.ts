import { Capacitor } from '@capacitor/core';
import { LocalNotifications, PermissionStatus } from '@capacitor/local-notifications';
import { Task } from '../types';

export const ACTION_TYPE_DEADLINE = 'TASK_DEADLINE_ACTIONS';
export const REMINDER_CHANNEL_ID = 'task-reminders';

let isInitialized = false;

/**
 * Check if running inside Capacitor native application
 */
export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Generate deterministic 31-bit positive integer IDs from task ID
 */
export function getNotificationId(taskId: string, type: 'pre' | 'due'): number {
  const str = `${taskId}_${type}`;
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash = hash & 0x7fffffff;
  }
  return (hash % 2000000000) + 1;
}

/**
 * Initialize action types, channels, and listeners for local notifications
 */
export async function initLocalNotifications(
  onMarkComplete?: (taskId: string) => void,
  onNotYet?: (taskId: string) => void
): Promise<void> {
  if (!isNativeApp()) return;
  if (isInitialized) return;

  try {
    // Create dedicated notification channel with "final" ringtone on Android 8+
    await LocalNotifications.createChannel({
      id: REMINDER_CHANNEL_ID,
      name: 'Task Deadline Reminders',
      description: 'Alerts and ringtones for upcoming and reached task deadlines',
      sound: 'task_reminder.mp3',
      importance: 5,
      visibility: 1,
      vibration: true,
      lights: true,
      lightColor: '#4f46e5',
    });

    // Register interactive action types for deadline notifications
    await LocalNotifications.registerActionTypes({
      types: [
        {
          id: ACTION_TYPE_DEADLINE,
          actions: [
            {
              id: 'mark_complete',
              title: 'Mark complete',
              foreground: true,
            },
            {
              id: 'not_yet',
              title: 'Not yet',
              foreground: false,
            },
          ],
        },
      ],
    });

    // Listen for notification action clicks
    await LocalNotifications.addListener('localNotificationActionPerformed', (notificationAction) => {
      const actionId = notificationAction.actionId;
      const taskId = notificationAction.notification.extra?.taskId;

      if (!taskId) return;

      if (actionId === 'mark_complete') {
        if (onMarkComplete) onMarkComplete(taskId);
      } else if (actionId === 'not_yet') {
        if (onNotYet) onNotYet(taskId);
      }
    });

    isInitialized = true;
  } catch (error) {
    console.error('[LocalNotifications] Failed to initialize:', error);
  }
}

export interface PermissionDetails {
  granted: boolean;
  exactAlarmGranted: boolean;
  canRequestExactAlarm: boolean;
}

/**
 * Check and request notification permissions with exact alarm details
 */
export async function checkAndRequestPermissions(): Promise<PermissionDetails> {
  if (!isNativeApp()) {
    return { granted: false, exactAlarmGranted: false, canRequestExactAlarm: false };
  }

  try {
    let perm: PermissionStatus = await LocalNotifications.checkPermissions();
    if (perm.display !== 'granted') {
      perm = await LocalNotifications.requestPermissions();
    }

    const granted = perm.display === 'granted';
    let exactAlarmGranted = true;
    let canRequestExactAlarm = false;

    // Check Android exact notification setting (Android 12+ API 31+)
    try {
      const exactSetting = await LocalNotifications.checkExactNotificationSetting();
      if (exactSetting && exactSetting.exact_alarm !== 'granted') {
        exactAlarmGranted = false;
        canRequestExactAlarm = true;
      }
    } catch {
      // Not on Android 12+ or unsupported, defaults to true
    }

    return {
      granted,
      exactAlarmGranted,
      canRequestExactAlarm,
    };
  } catch (error) {
    console.error('[LocalNotifications] Permission check failed:', error);
    return { granted: false, exactAlarmGranted: false, canRequestExactAlarm: false };
  }
}

/**
 * Open Android system settings to grant exact alarm permission
 */
export async function openExactAlarmSettings(): Promise<void> {
  if (!isNativeApp()) return;
  try {
    await LocalNotifications.changeExactNotificationSetting();
  } catch (error) {
    console.error('[LocalNotifications] Failed to open exact alarm settings:', error);
  }
}

/**
 * Schedule a task reminder:
 * 1) 5 minutes before deadline
 * 2) Exactly at deadline with "Mark complete" and "Not yet" actions
 */
export async function scheduleTaskReminder(task: Task): Promise<void> {
  if (!isNativeApp()) return;

  // Cancel any existing notifications for this task first to prevent duplicates
  await cancelTaskReminder(task.id);

  // If task is completed or reminders are disabled or no deadline, do not schedule
  if (task.status === 'completed' || !task.remindMe || !task.deadline) {
    return;
  }

  const deadlineTime = new Date(task.deadline).getTime();
  if (isNaN(deadlineTime)) return;

  const now = Date.now();
  // If the deadline has already passed, skip scheduling
  if (deadlineTime <= now) return;

  const notificationsToSchedule = [];
  const fiveMinBefore = deadlineTime - 5 * 60 * 1000;

  // 1. Pre-deadline notification (5 minutes before)
  if (fiveMinBefore > now) {
    notificationsToSchedule.push({
      id: getNotificationId(task.id, 'pre'),
      title: `⏰ Due in 5 mins: ${task.title}`,
      body: `Your task deadline is coming up in 5 minutes${task.dueTime ? ` (${task.dueTime})` : ''}.`,
      schedule: { at: new Date(fiveMinBefore), allowWhileIdle: true },
      channelId: REMINDER_CHANNEL_ID,
      extra: { taskId: task.id, type: 'pre' },
      sound: 'task_reminder.mp3',
    });
  }

  // 2. At-deadline notification with actions
  notificationsToSchedule.push({
    id: getNotificationId(task.id, 'due'),
    title: `🚨 Deadline Reached: ${task.title}`,
    body: `Time's up! Have you completed "${task.title}"?`,
    schedule: { at: new Date(deadlineTime), allowWhileIdle: true },
    channelId: REMINDER_CHANNEL_ID,
    actionTypeId: ACTION_TYPE_DEADLINE,
    extra: { taskId: task.id, type: 'due' },
    sound: 'task_reminder.mp3',
  });

  try {
    await LocalNotifications.schedule({ notifications: notificationsToSchedule });
  } catch (error) {
    console.error('[LocalNotifications] Failed to schedule reminder for task:', task.id, error);
  }
}

/**
 * Cancel both pre-deadline and deadline notifications for a task
 */
export async function cancelTaskReminder(taskId: string): Promise<void> {
  if (!isNativeApp()) return;

  const preId = getNotificationId(taskId, 'pre');
  const dueId = getNotificationId(taskId, 'due');

  try {
    await LocalNotifications.cancel({
      notifications: [{ id: preId }, { id: dueId }],
    });
  } catch (error) {
    console.error('[LocalNotifications] Failed to cancel reminder:', taskId, error);
  }
}

/**
 * Cancel all scheduled reminders (e.g. upon user logout)
 */
export async function cancelAllReminders(): Promise<void> {
  if (!isNativeApp()) return;

  try {
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel({
        notifications: pending.notifications.map((n) => ({ id: n.id })),
      });
    }
  } catch (error) {
    console.error('[LocalNotifications] Failed to cancel all reminders:', error);
  }
}

/**
 * Reconcile notifications on app startup / sign-in:
 * - Cancels orphan or completed task reminders
 * - Ensures active future reminders are properly scheduled
 */
export async function reconcileReminders(tasks: Task[]): Promise<void> {
  if (!isNativeApp()) return;

  try {
    const now = Date.now();
    const pending = await LocalNotifications.getPending();
    const pendingIds = new Set(pending.notifications.map((n) => n.id));

    // Active tasks requiring reminders
    const activeTasks = tasks.filter(
      (t) => t.remindMe && t.status !== 'completed' && t.deadline && new Date(t.deadline).getTime() > now
    );

    // Build set of valid expected notification IDs
    const validIds = new Set<number>();
    activeTasks.forEach((t) => {
      const deadlineTime = new Date(t.deadline!).getTime();
      const fiveMinBefore = deadlineTime - 5 * 60 * 1000;
      if (fiveMinBefore > now) {
        validIds.add(getNotificationId(t.id, 'pre'));
      }
      validIds.add(getNotificationId(t.id, 'due'));
    });

    // Cancel any pending notifications that are no longer valid
    const toCancel: { id: number }[] = [];
    pendingIds.forEach((id) => {
      if (!validIds.has(id)) {
        toCancel.push({ id });
      }
    });

    if (toCancel.length > 0) {
      await LocalNotifications.cancel({ notifications: toCancel });
    }

    // Schedule or reschedule all active reminders
    for (const task of activeTasks) {
      await scheduleTaskReminder(task);
    }
  } catch (error) {
    console.error('[LocalNotifications] Failed to reconcile reminders:', error);
  }
}
