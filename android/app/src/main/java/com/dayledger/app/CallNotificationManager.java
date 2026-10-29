package com.dayledger.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.Ringtone;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;
import androidx.core.app.NotificationCompat;
import androidx.core.app.Person;

public class CallNotificationManager {

    public static final String CHANNEL_ID = "incoming_calls";
    public static final String ACTION_DISMISS_INCOMING_UI = "com.dayledger.app.ACTION_DISMISS_INCOMING_UI";

    private static CallNotificationManager instance;
    private final Context appContext;
    private Ringtone activeRingtone;
    private Vibrator activeVibrator;
    private final Handler timeoutHandler = new Handler(Looper.getMainLooper());
    private Runnable timeoutRunnable;
    private String activeCallId;

    private CallNotificationManager(Context context) {
        this.appContext = context.getApplicationContext();
        createNotificationChannel();
    }

    public static synchronized CallNotificationManager getInstance(Context context) {
        if (instance == null) {
            instance = new CallNotificationManager(context);
        }
        return instance;
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager nm = (NotificationManager) appContext.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Incoming Audio Calls",
                    NotificationManager.IMPORTANCE_HIGH
                );
                channel.setDescription("High-priority ringing notifications and alerts for incoming calls");
                channel.setSound(null, null); // Managed directly via RingtoneManager to ensure reliable looping
                channel.enableVibration(true);
                channel.setVibrationPattern(new long[]{0, 1000, 1000, 1000});
                channel.setLockscreenVisibility(NotificationCompat.VISIBILITY_PUBLIC);
                channel.setShowBadge(true);
                channel.setBypassDnd(true);
                nm.createNotificationChannel(channel);
            }
        }
    }

    public synchronized void showIncomingCall(
        Context context,
        String callId,
        String callerId,
        String callerName,
        String callerAvatar,
        String declineToken
    ) {
        if (callId == null) return;
        this.activeCallId = callId;

        // Cancel previous timeout if any
        if (timeoutRunnable != null) {
            timeoutHandler.removeCallbacks(timeoutRunnable);
        }

        // Start ringing and vibration
        playRingtoneAndVibration();

        // 30-second ring timeout: dismiss notification if unanswered
        timeoutRunnable = () -> dismissCall(context, callId);
        timeoutHandler.postDelayed(timeoutRunnable, 30000);

        // 1. Answer Intent -> Opens MainActivity with ACTION_ANSWER_CALL
        Intent answerIntent = new Intent(context, MainActivity.class);
        answerIntent.setAction("com.dayledger.app.ACTION_ANSWER_CALL");
        answerIntent.putExtra("callAction", "answer");
        answerIntent.putExtra("callId", callId);
        answerIntent.putExtra("callerId", callerId);
        answerIntent.putExtra("callerName", callerName);
        answerIntent.putExtra("callerAvatar", callerAvatar);
        answerIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);

        PendingIntent answerPendingIntent = PendingIntent.getActivity(
            context,
            (callId + "_answer").hashCode(),
            answerIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        // 2. Decline Intent -> Broadcast to CallActionReceiver
        Intent declineIntent = new Intent(context, CallActionReceiver.class);
        declineIntent.setAction("com.dayledger.app.ACTION_DECLINE_CALL");
        declineIntent.putExtra("callAction", "decline");
        declineIntent.putExtra("callId", callId);
        declineIntent.putExtra("declineToken", declineToken);

        PendingIntent declinePendingIntent = PendingIntent.getBroadcast(
            context,
            (callId + "_decline").hashCode(),
            declineIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        // 3. FullScreen Intent -> IncomingCallActivity (for locked screen)
        Intent fullScreenIntent = new Intent(context, IncomingCallActivity.class);
        fullScreenIntent.putExtra("callId", callId);
        fullScreenIntent.putExtra("callerId", callerId);
        fullScreenIntent.putExtra("callerName", callerName);
        fullScreenIntent.putExtra("callerAvatar", callerAvatar);
        fullScreenIntent.putExtra("declineToken", declineToken);
        fullScreenIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_NO_USER_ACTION);

        PendingIntent fullScreenPendingIntent = PendingIntent.getActivity(
            context,
            (callId + "_fullscreen").hashCode(),
            fullScreenIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        String displayName = (callerName != null && !callerName.trim().isEmpty()) ? callerName : "A friend";

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle("Incoming Audio Call")
            .setContentText(displayName + " is calling you on DayLedger")
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setColor(0xFF4F46E5) // DayLedger indigo
            .setOngoing(true)
            .setAutoCancel(false)
            .setFullScreenIntent(fullScreenPendingIntent, true);

        // Use Android 12+ CallStyle where supported
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            Person callerPerson = new Person.Builder()
                .setName(displayName)
                .setImportant(true)
                .build();
            builder.setStyle(
                NotificationCompat.CallStyle.forIncomingCall(
                    callerPerson,
                    declinePendingIntent,
                    answerPendingIntent
                )
            );
        } else {
            builder.addAction(R.drawable.ic_call_decline, "Decline", declinePendingIntent)
                   .addAction(R.drawable.ic_call_answer, "Answer", answerPendingIntent);
        }

        NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) {
            nm.notify(getNotificationId(callId), builder.build());
        }
    }

    public synchronized void dismissCall(Context context, String callId) {
        stopRingtoneAndVibration();

        if (timeoutRunnable != null) {
            timeoutHandler.removeCallbacks(timeoutRunnable);
            timeoutRunnable = null;
        }

        NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) {
            if (callId != null) {
                nm.cancel(getNotificationId(callId));
            } else if (activeCallId != null) {
                nm.cancel(getNotificationId(activeCallId));
            }
        }

        // Notify IncomingCallActivity if open so it finishes
        Intent dismissUiIntent = new Intent(ACTION_DISMISS_INCOMING_UI);
        dismissUiIntent.setPackage(context.getPackageName());
        context.sendBroadcast(dismissUiIntent);

        this.activeCallId = null;
    }

    public synchronized void playRingtoneAndVibration() {
        stopRingtoneAndVibration();

        try {
            Uri ringtoneUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
            if (ringtoneUri == null) {
                ringtoneUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
            }

            activeRingtone = RingtoneManager.getRingtone(appContext, ringtoneUri);
            if (activeRingtone != null) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                    activeRingtone.setLooping(true);
                }
                AudioAttributes attributes = new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build();
                activeRingtone.setAudioAttributes(attributes);
                activeRingtone.play();
            }
        } catch (Exception e) {
            e.printStackTrace();
        }

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                VibratorManager vm = (VibratorManager) appContext.getSystemService(Context.VIBRATOR_MANAGER_SERVICE);
                if (vm != null) {
                    activeVibrator = vm.getDefaultVibrator();
                }
            } else {
                activeVibrator = (Vibrator) appContext.getSystemService(Context.VIBRATOR_SERVICE);
            }

            if (activeVibrator != null && activeVibrator.hasVibrator()) {
                long[] pattern = new long[]{0, 1000, 1000, 1000};
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    activeVibrator.vibrate(VibrationEffect.createWaveform(pattern, 0));
                } else {
                    activeVibrator.vibrate(pattern, 0);
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public synchronized void stopRingtoneAndVibration() {
        try {
            if (activeRingtone != null && activeRingtone.isPlaying()) {
                activeRingtone.stop();
            }
        } catch (Exception ignored) {}
        activeRingtone = null;

        try {
            if (activeVibrator != null) {
                activeVibrator.cancel();
            }
        } catch (Exception ignored) {}
        activeVibrator = null;
    }

    private int getNotificationId(String callId) {
        return ("call_" + (callId != null ? callId : "")).hashCode();
    }
}
