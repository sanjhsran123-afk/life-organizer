package com.dayledger.app;

import android.app.Activity;
import android.app.KeyguardManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Build;
import android.os.Bundle;
import android.view.WindowManager;
import android.widget.ImageButton;
import android.widget.TextView;

public class IncomingCallActivity extends Activity {

    private String callId;
    private String callerId;
    private String callerName;
    private String callerAvatar;
    private String declineToken;

    private final BroadcastReceiver dismissReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            if (CallNotificationManager.ACTION_DISMISS_INCOMING_UI.equals(intent.getAction())) {
                finish();
            }
        }
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Allow Activity to display over lock screen and turn the screen on
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
            KeyguardManager km = (KeyguardManager) getSystemService(Context.KEYGUARD_SERVICE);
            if (km != null) {
                km.requestDismissKeyguard(this, null);
            }
        } else {
            getWindow().addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON |
                WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD |
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
            );
        }

        setContentView(R.layout.activity_incoming_call);

        parseIntent(getIntent());
        setupViews();

        // Register dismiss receiver
        IntentFilter filter = new IntentFilter(CallNotificationManager.ACTION_DISMISS_INCOMING_UI);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(dismissReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
        } else {
            registerReceiver(dismissReceiver, filter);
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        parseIntent(intent);
        setupViews();
    }

    private void parseIntent(Intent intent) {
        if (intent == null) return;
        callId = intent.getStringExtra("callId");
        callerId = intent.getStringExtra("callerId");
        callerName = intent.getStringExtra("callerName");
        callerAvatar = intent.getStringExtra("callerAvatar");
        declineToken = intent.getStringExtra("declineToken");
    }

    private void setupViews() {
        TextView tvCallerName = findViewById(R.id.tv_caller_name);
        TextView tvCallerInitials = findViewById(R.id.tv_caller_initials);
        ImageButton btnAnswer = findViewById(R.id.btn_answer);
        ImageButton btnDecline = findViewById(R.id.btn_decline);

        String displayName = (callerName != null && !callerName.trim().isEmpty()) ? callerName : "A friend";
        tvCallerName.setText(displayName);

        // Derive initials
        String initials = "DL";
        String[] parts = displayName.trim().split("\\s+");
        if (parts.length >= 2 && !parts[0].isEmpty() && !parts[1].isEmpty()) {
            initials = ("" + parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
        } else if (parts.length == 1 && !parts[0].isEmpty()) {
            initials = ("" + parts[0].charAt(0)).toUpperCase();
        }
        tvCallerInitials.setText(initials);

        // Handle Answer tap
        btnAnswer.setOnClickListener(v -> {
            // 1. Stop native ringing and dismiss notification
            CallNotificationManager.getInstance(this).stopRingtoneAndVibration();
            CallNotificationManager.getInstance(this).dismissCall(this, callId);

            // 2. Open / Resume MainActivity and signal answer
            Intent answerIntent = new Intent(this, MainActivity.class);
            answerIntent.setAction("com.dayledger.app.ACTION_ANSWER_CALL");
            answerIntent.putExtra("callAction", "answer");
            answerIntent.putExtra("callId", callId);
            answerIntent.putExtra("callerId", callerId);
            answerIntent.putExtra("callerName", callerName);
            answerIntent.putExtra("callerAvatar", callerAvatar);
            answerIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            startActivity(answerIntent);

            finish();
        });

        // Handle Decline tap
        btnDecline.setOnClickListener(v -> {
            // 1. Stop native ringing and dismiss notification
            CallNotificationManager.getInstance(this).stopRingtoneAndVibration();
            CallNotificationManager.getInstance(this).dismissCall(this, callId);

            // 2. Trigger Decline broadcast receiver
            Intent declineIntent = new Intent(this, CallActionReceiver.class);
            declineIntent.setAction(CallActionReceiver.ACTION_DECLINE_CALL);
            declineIntent.putExtra("callId", callId);
            declineIntent.putExtra("declineToken", declineToken);
            sendBroadcast(declineIntent);

            finish();
        });
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        try {
            unregisterReceiver(dismissReceiver);
        } catch (Exception ignored) {}
    }

    @Override
    public void onBackPressed() {
        // Prevent back press from accidentally answering; minimize to notification
        moveTaskToBack(true);
    }
}
