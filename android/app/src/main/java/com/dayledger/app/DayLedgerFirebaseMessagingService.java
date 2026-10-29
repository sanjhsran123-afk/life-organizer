package com.dayledger.app;

import androidx.annotation.NonNull;
import com.capacitorjs.plugins.pushnotifications.PushNotificationsPlugin;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;
import java.util.Map;

public class DayLedgerFirebaseMessagingService extends FirebaseMessagingService {

    @Override
    public void onMessageReceived(@NonNull RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);

        Map<String, String> data = remoteMessage.getData();
        if (data != null && !data.isEmpty()) {
            String type = data.get("type");

            if ("call_incoming".equals(type)) {
                String callId = data.get("callId");
                String callerId = data.get("callerId");
                String callerName = data.get("callerName");
                String callerAvatar = data.get("callerAvatar");
                String declineToken = data.get("declineToken");

                CallNotificationManager.getInstance(this).showIncomingCall(
                    this,
                    callId,
                    callerId,
                    callerName,
                    callerAvatar,
                    declineToken
                );
                return;
            } else if ("call_dismiss".equals(type) || "call_ended".equals(type)) {
                String callId = data.get("callId");
                CallNotificationManager.getInstance(this).dismissCall(this, callId);
                return;
            }
        }

        // Delegate ordinary push notifications to Capacitor PushNotificationsPlugin
        PushNotificationsPlugin.sendRemoteMessage(remoteMessage);
    }

    @Override
    public void onNewToken(@NonNull String token) {
        super.onNewToken(token);
        PushNotificationsPlugin.onNewToken(token);
    }
}
