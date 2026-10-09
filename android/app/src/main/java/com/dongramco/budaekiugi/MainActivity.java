package com.dongramco.budaekiugi;

import android.os.Bundle;
import android.os.Build;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(PotionAdsPlugin.class);
        super.onCreate(savedInstanceState);
        // No extra icon/fade before the in-app Dongramco opening.
        if (Build.VERSION.SDK_INT >= 31) {
            getSplashScreen().setOnExitAnimationListener(view -> view.remove());
        }
        // The local startup video has user-approved audio. The web startup controller
        // handles background pauses and the existing sound preference.
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().getSettings().setMediaPlaybackRequiresUserGesture(false);
        }
    }
}
