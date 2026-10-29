package com.dayledger.app;

import android.app.NotificationManager;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "NativeCall")
public class NativeCallPlugin extends Plugin {

    private static JSObject pendingCallAction = null;
    private static NativeCallPlugin instance = null;

    @Override
    public void load() {
        super.load();
        instance = this;
        if (pendingCallAction != null) {
            notifyListeners("callAnswered", pendingCallAction, true);
        }
    }

    public static void setPendingCallAction(
        String action,
        String callId,
        String callerId,
        String callerName,
        String callerAvatar
    ) {
        JSObject obj = new JSObject();
        obj.put("action", action);
        obj.put("callId", callId);
        obj.put("callerId", callerId);
        obj.put("callerName", callerName);
        obj.put("callerAvatar", callerAvatar);
        pendingCallAction = obj;

        if (instance != null) {
            instance.notifyListeners("callAnswered", obj, true);
        }
    }

    @PluginMethod
    public void getPendingCallAction(PluginCall call) {
        JSObject ret = new JSObject();
        if (pendingCallAction != null) {
            ret.put("hasPendingAction", true);
            ret.put("action", pendingCallAction.getString("action"));
            ret.put("callId", pendingCallAction.getString("callId"));
            ret.put("callerId", pendingCallAction.getString("callerId"));
            ret.put("callerName", pendingCallAction.getString("callerName"));
            ret.put("callerAvatar", pendingCallAction.getString("callerAvatar"));
            pendingCallAction = null;
        } else {
            ret.put("hasPendingAction", false);
        }
        call.resolve(ret);
    }

    @PluginMethod
    public void clearPendingCallAction(PluginCall call) {
        pendingCallAction = null;
        call.resolve();
    }

    @PluginMethod
    public void dismissActiveCall(PluginCall call) {
        String callId = call.getString("callId");
        CallNotificationManager.getInstance(getContext()).dismissCall(getContext(), callId);
        call.resolve();
    }

    @PluginMethod
    public void checkFullScreenIntentPermission(PluginCall call) {
        JSObject ret = new JSObject();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) { // Android 14+ (API 34)
            NotificationManager nm = getContext().getSystemService(NotificationManager.class);
            boolean canUse = nm != null && nm.canUseFullScreenIntent();
            ret.put("isSupported", true);
            ret.put("granted", canUse);
        } else {
            ret.put("isSupported", false);
            ret.put("granted", true);
        }
        call.resolve(ret);
    }

    @PluginMethod
    public void openFullScreenIntentSettings(PluginCall call) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                Intent intent = new Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT);
                intent.setData(Uri.parse("package:" + getContext().getPackageName()));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(intent);
            } else {
                Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                intent.setData(Uri.parse("package:" + getContext().getPackageName()));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(intent);
            }
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to open full screen intent settings: " + e.getMessage());
        }
    }
}
