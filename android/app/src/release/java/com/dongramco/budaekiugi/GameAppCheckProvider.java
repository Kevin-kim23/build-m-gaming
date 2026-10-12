package com.dongramco.budaekiugi;

import com.google.firebase.appcheck.FirebaseAppCheck;
import com.google.firebase.appcheck.playintegrity.PlayIntegrityAppCheckProviderFactory;

final class GameAppCheckProvider {
    static final String NAME = "play-integrity";
    static void install(FirebaseAppCheck appCheck) {
        appCheck.installAppCheckProviderFactory(PlayIntegrityAppCheckProviderFactory.getInstance(), false);
    }
}
