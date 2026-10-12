package com.dongramco.budaekiugi;
import com.getcapacitor.BridgeActivity;
import io.capawesome.capacitorjs.plugins.firebase.authentication.FirebaseAuthenticationPlugin;
final class DevelopmentAccountPlugins {
    static void register(BridgeActivity activity) { activity.registerPlugin(FirebaseAuthenticationPlugin.class); }
}
