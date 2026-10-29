package com.dayledger.app;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.webkit.PermissionRequest;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(MicrophonePermissionPlugin.class);
        registerPlugin(NativeCallPlugin.class);
        super.onCreate(savedInstanceState);

        handleCallIntent(getIntent());

        // Ensure Capacitor's WebView permission flow allows the call's microphone request only after Android grants it.
        bridge.getWebView().setWebChromeClient(new BridgeWebChromeClient(bridge) {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                boolean requestsAudio = false;
                for (String resource : request.getResources()) {
                    if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resource) ||
                        "android.webkit.resource.AUDIO_CAPTURE".equals(resource)) {
                        requestsAudio = true;
                        break;
                    }
                }

                if (requestsAudio) {
                    if (ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
                        runOnUiThread(() -> request.grant(request.getResources()));
                    } else {
                        runOnUiThread(() -> request.deny());
                    }
                    return;
                }

                super.onPermissionRequest(request);
            }
        });
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleCallIntent(intent);
    }

    private void handleCallIntent(Intent intent) {
        if (intent == null) return;
        String action = intent.getAction();
        String callAction = intent.getStringExtra("callAction");

        if ("com.dayledger.app.ACTION_ANSWER_CALL".equals(action) || "answer".equals(callAction)) {
            String callId = intent.getStringExtra("callId");
            String callerId = intent.getStringExtra("callerId");
            String callerName = intent.getStringExtra("callerName");
            String callerAvatar = intent.getStringExtra("callerAvatar");

            // Dismiss native ringtone and notification
            CallNotificationManager.getInstance(this).dismissCall(this, callId);

            // Forward to NativeCallPlugin so JavaScript can join call
            NativeCallPlugin.setPendingCallAction("answer", callId, callerId, callerName, callerAvatar);
        }
    }
}
