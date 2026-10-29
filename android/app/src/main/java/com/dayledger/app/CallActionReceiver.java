package com.dayledger.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

public class CallActionReceiver extends BroadcastReceiver {

    private static final String TAG = "CallActionReceiver";
    public static final String ACTION_DECLINE_CALL = "com.dayledger.app.ACTION_DECLINE_CALL";
    private static final String DEFAULT_SERVER_URL = "https://life-organizer-gmpc.onrender.com";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null) return;
        String action = intent.getAction();

        if (ACTION_DECLINE_CALL.equals(action)) {
            String callId = intent.getStringExtra("callId");
            String declineToken = intent.getStringExtra("declineToken");

            Log.d(TAG, "Decline call triggered for callId: " + callId);

            // 1. Immediately dismiss native ringtone and notification
            CallNotificationManager.getInstance(context).dismissCall(context, callId);

            // 2. Dispatch background HTTP POST to decline call on server
            if (callId != null && !callId.isEmpty() && declineToken != null && !declineToken.isEmpty()) {
                final PendingResult pendingResult = goAsync();
                new Thread(() -> {
                    HttpURLConnection conn = null;
                    try {
                        URL url = new URL(DEFAULT_SERVER_URL + "/api/calls/" + callId + "/decline");
                        conn = (HttpURLConnection) url.openConnection();
                        conn.setRequestMethod("POST");
                        conn.setRequestProperty("Content-Type", "application/json");
                        conn.setRequestProperty("Accept", "application/json");
                        conn.setConnectTimeout(6000);
                        conn.setReadTimeout(6000);
                        conn.setDoOutput(true);

                        String jsonBody = "{\"declineToken\":\"" + declineToken + "\",\"reason\":\"declined\"}";
                        try (OutputStream os = conn.getOutputStream()) {
                            byte[] input = jsonBody.getBytes(StandardCharsets.UTF_8);
                            os.write(input, 0, input.length);
                        }

                        int responseCode = conn.getResponseCode();
                        Log.d(TAG, "Server decline response: " + responseCode);
                    } catch (Exception e) {
                        Log.e(TAG, "Failed to send decline HTTP request: " + e.getMessage());
                    } finally {
                        if (conn != null) {
                            conn.disconnect();
                        }
                        pendingResult.finish();
                    }
                }).start();
            }
        }
    }
}
