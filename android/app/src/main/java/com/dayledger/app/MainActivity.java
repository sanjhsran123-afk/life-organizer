package com.dayledger.app;

import android.Manifest;
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
        super.onCreate(savedInstanceState);

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
}
