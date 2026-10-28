package com.dayledger.app;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.provider.Settings;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
    name = "MicrophonePermission",
    permissions = {
        @Permission(
            alias = "microphone",
            strings = { Manifest.permission.RECORD_AUDIO }
        ),
        @Permission(
            alias = "notifications",
            strings = { Manifest.permission.POST_NOTIFICATIONS }
        )
    }
)
public class MicrophonePermissionPlugin extends Plugin {

    @PluginMethod
    public void checkMicPermission(PluginCall call) {
        boolean granted = ContextCompat.checkSelfPermission(getContext(), Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED;
        PermissionState state = getPermissionState("microphone");
        boolean permanentlyDenied = false;

        if (!granted) {
            boolean canShowRationale = ActivityCompat.shouldShowRequestPermissionRationale(getActivity(), Manifest.permission.RECORD_AUDIO);
            permanentlyDenied = (state == PermissionState.DENIED) || (!canShowRationale && state == PermissionState.PROMPT_WITH_RATIONALE);
        }

        JSObject ret = new JSObject();
        ret.put("granted", granted);
        ret.put("state", state != null ? state.toString() : (granted ? "granted" : "prompt"));
        ret.put("isPermanentlyDenied", permanentlyDenied);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestMicPermission(PluginCall call) {
        boolean granted = ContextCompat.checkSelfPermission(getContext(), Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED;
        if (granted) {
            JSObject ret = new JSObject();
            ret.put("granted", true);
            ret.put("state", "granted");
            ret.put("isPermanentlyDenied", false);
            call.resolve(ret);
            return;
        }

        requestPermissionForAlias("microphone", call, "microphonePermissionCallback");
    }

    @PermissionCallback
    private void microphonePermissionCallback(PluginCall call) {
        boolean granted = ContextCompat.checkSelfPermission(getContext(), Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED;
        PermissionState state = getPermissionState("microphone");
        boolean permanentlyDenied = false;

        if (!granted) {
            boolean canShowRationale = ActivityCompat.shouldShowRequestPermissionRationale(getActivity(), Manifest.permission.RECORD_AUDIO);
            permanentlyDenied = (state == PermissionState.DENIED) || !canShowRationale;
        }

        JSObject ret = new JSObject();
        ret.put("granted", granted);
        ret.put("state", state != null ? state.toString() : (granted ? "granted" : "prompt"));
        ret.put("isPermanentlyDenied", permanentlyDenied);
        call.resolve(ret);
    }

    @PluginMethod
    public void checkNotificationPermission(PluginCall call) {
        JSObject ret = new JSObject();
        if (android.os.Build.VERSION.SDK_INT < 33) {
            ret.put("granted", true);
            ret.put("state", "granted");
            ret.put("isPermanentlyDenied", false);
            call.resolve(ret);
            return;
        }

        boolean granted = ContextCompat.checkSelfPermission(getContext(), Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED;
        PermissionState state = getPermissionState("notifications");
        boolean permanentlyDenied = false;

        if (!granted) {
            boolean canShowRationale = ActivityCompat.shouldShowRequestPermissionRationale(getActivity(), Manifest.permission.POST_NOTIFICATIONS);
            permanentlyDenied = (state == PermissionState.DENIED) || (!canShowRationale && state == PermissionState.PROMPT_WITH_RATIONALE);
        }

        ret.put("granted", granted);
        ret.put("state", state != null ? state.toString() : (granted ? "granted" : "prompt"));
        ret.put("isPermanentlyDenied", permanentlyDenied);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestNotificationPermission(PluginCall call) {
        if (android.os.Build.VERSION.SDK_INT < 33) {
            JSObject ret = new JSObject();
            ret.put("granted", true);
            ret.put("state", "granted");
            ret.put("isPermanentlyDenied", false);
            call.resolve(ret);
            return;
        }

        boolean granted = ContextCompat.checkSelfPermission(getContext(), Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED;
        if (granted) {
            JSObject ret = new JSObject();
            ret.put("granted", true);
            ret.put("state", "granted");
            ret.put("isPermanentlyDenied", false);
            call.resolve(ret);
            return;
        }

        requestPermissionForAlias("notifications", call, "notificationsPermissionCallback");
    }

    @PermissionCallback
    private void notificationsPermissionCallback(PluginCall call) {
        if (android.os.Build.VERSION.SDK_INT < 33) {
            JSObject ret = new JSObject();
            ret.put("granted", true);
            ret.put("state", "granted");
            ret.put("isPermanentlyDenied", false);
            call.resolve(ret);
            return;
        }

        boolean granted = ContextCompat.checkSelfPermission(getContext(), Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED;
        PermissionState state = getPermissionState("notifications");
        boolean permanentlyDenied = false;

        if (!granted) {
            boolean canShowRationale = ActivityCompat.shouldShowRequestPermissionRationale(getActivity(), Manifest.permission.POST_NOTIFICATIONS);
            permanentlyDenied = (state == PermissionState.DENIED) || !canShowRationale;
        }

        JSObject ret = new JSObject();
        ret.put("granted", granted);
        ret.put("state", state != null ? state.toString() : (granted ? "granted" : "prompt"));
        ret.put("isPermanentlyDenied", permanentlyDenied);
        call.resolve(ret);
    }

    @PluginMethod
    public void openAppSettings(PluginCall call) {
        try {
            Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            Uri uri = Uri.fromParts("package", getContext().getPackageName(), null);
            intent.setData(uri);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception ex) {
            call.reject("Unable to open app settings: " + ex.getMessage());
        }
    }
}
