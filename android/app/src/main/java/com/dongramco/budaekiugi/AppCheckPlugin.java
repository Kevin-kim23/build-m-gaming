package com.dongramco.budaekiugi;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.firebase.FirebaseApp;
import com.google.firebase.appcheck.FirebaseAppCheck;

/** Tokens are returned only to the local Firebase JS SDK, never logged or stored by this bridge. */
@CapacitorPlugin(name = "GameAppCheck")
public class AppCheckPlugin extends Plugin {
    private FirebaseApp app;
    private FirebaseAppCheck appCheck;

    private synchronized FirebaseAppCheck configuredCheck() {
        if (appCheck == null) {
            app = FirebaseApp.getInstance();
            FirebaseAppCheck candidate = FirebaseAppCheck.getInstance(app);
            GameAppCheckProvider.install(candidate);
            appCheck = candidate;
        }
        return appCheck;
    }

    private void unavailable(PluginCall call) {
        // Passing the SDK exception to reject() would log potentially sensitive SDK details.
        call.reject("app-check-unavailable", "app-check-unavailable");
    }

    @PluginMethod
    public void getToken(PluginCall call) {
        try {
            // JS App Check caches this result until refresh is needed. No debug/provider input.
            configuredCheck().getAppCheckToken(true)
                .addOnSuccessListener(token -> {
                    if (token.getExpireTimeMillis() <= System.currentTimeMillis()) {
                        unavailable(call);
                        return;
                    }
                    JSObject result = new JSObject();
                    result.put("token", token.getToken());
                    result.put("expireTimeMillis", token.getExpireTimeMillis());
                    result.put("appId", app.getOptions().getApplicationId());
                    result.put("projectId", app.getOptions().getProjectId());
                    result.put("provider", GameAppCheckProvider.NAME);
                    call.resolve(result);
                })
                .addOnFailureListener(error -> unavailable(call));
        } catch (RuntimeException error) {
            unavailable(call);
        }
    }
}
