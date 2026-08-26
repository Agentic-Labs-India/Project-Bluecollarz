package com.blucollarz.app;

import android.Manifest;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.util.ArrayList;

@CapacitorPlugin(
    name = "NativeMediaPermissions",
    permissions = {
        @Permission(alias = "camera", strings = { Manifest.permission.CAMERA }),
        @Permission(
            alias = "microphone",
            strings = { Manifest.permission.RECORD_AUDIO, Manifest.permission.MODIFY_AUDIO_SETTINGS }
        )
    }
)
public class NativeMediaPermissionsPlugin extends Plugin {

    @PluginMethod
    public void check(PluginCall call) {
        resolveStatus(call);
    }

    @PluginMethod
    public void request(PluginCall call) {
        boolean camera = Boolean.TRUE.equals(call.getBoolean("camera", true));
        boolean microphone = Boolean.TRUE.equals(call.getBoolean("microphone", true));
        ArrayList<String> aliases = new ArrayList<>();
        if (camera) {
            aliases.add("camera");
        }
        if (microphone) {
            aliases.add("microphone");
        }
        if (aliases.isEmpty()) {
            resolveStatus(call);
            return;
        }
        requestPermissionForAliases(
            aliases.toArray(new String[0]),
            call,
            "onRequestComplete"
        );
    }

    @PermissionCallback
    private void onRequestComplete(PluginCall call) {
        resolveStatus(call);
    }

    private void resolveStatus(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("camera", getPermissionState("camera").toString());
        ret.put("microphone", getPermissionState("microphone").toString());
        call.resolve(ret);
    }
}
