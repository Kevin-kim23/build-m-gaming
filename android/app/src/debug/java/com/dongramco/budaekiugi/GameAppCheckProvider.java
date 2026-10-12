package com.dongramco.budaekiugi;

import com.google.firebase.appcheck.FirebaseAppCheck;
import com.google.firebase.appcheck.debug.DebugAppCheckProviderFactory;

final class GameAppCheckProvider {
    static final String NAME = "debug";
    static void install(FirebaseAppCheck appCheck) {
        appCheck.installAppCheckProviderFactory(DebugAppCheckProviderFactory.getInstance(), false);
    }
}
