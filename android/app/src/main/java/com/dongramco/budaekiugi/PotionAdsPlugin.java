package com.dongramco.budaekiugi;

import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.ads.AdError;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.FullScreenContentCallback;
import com.google.android.gms.ads.LoadAdError;
import com.google.android.gms.ads.MobileAds;
import com.google.android.gms.ads.RequestConfiguration;
import com.google.android.gms.ads.rewarded.RewardedAd;
import com.google.android.gms.ads.rewarded.RewardedAdLoadCallback;
import com.google.android.ump.ConsentInformation;
import com.google.android.ump.ConsentRequestParameters;
import com.google.android.ump.UserMessagingPlatform;

/** User-initiated requests only. Production IDs cannot be supplied by JavaScript. */
@CapacitorPlugin(name = "PotionAds")
public class PotionAdsPlugin extends Plugin {
    private final Handler handler = new Handler(Looper.getMainLooper());
    private PluginCall pending;
    private boolean earned, initialized, privacyBusy;
    private Runnable timeout;

    private boolean current(PluginCall call) { return pending == call; }
    private void finish(PluginCall call, String status) {
        if (!current(call)) return;
        if (timeout != null) handler.removeCallbacks(timeout);
        pending = null;
        call.resolve(new JSObject().put("status", status));
    }
    private void fail(PluginCall call, String area, String message) {
        Log.w("PotionAds", area + ": " + message);
        finish(call, "unavailable");
    }
    @PluginMethod
    public void showRewarded(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            String item = call.getString("itemId", "");
            if (pending != null || privacyBusy || !(item.equals("red") || item.equals("blue"))) {
                call.resolve(new JSObject().put("status", "unavailable")); return;
            }
            pending = call;
            earned = false;
            timeout = () -> fail(call, "consent.update", "Timed out");
            handler.postDelayed(timeout, 60000);
            ConsentInformation consent = UserMessagingPlatform.getConsentInformation(getContext());
            consent.requestConsentInfoUpdate(getActivity(), new ConsentRequestParameters.Builder().build(),
                () -> {
                    if (!current(call)) return;
                    handler.removeCallbacks(timeout);
                    UserMessagingPlatform.loadAndShowConsentFormIfRequired(getActivity(), error -> {
                    if (!current(call)) return;
                    if (error != null || !consent.canRequestAds()) {
                        fail(call, "consent", error == null ? "Ads not permitted" : error.getMessage()); return;
                    }
                    initializeAndLoad(call);
                    });
                }, error -> fail(call, "consent.update", error.getMessage()));
        });
    }
    private void initializeAndLoad(PluginCall call) {
        if (!current(call)) return;
        timeout = () -> fail(call, "load", "Timed out");
        handler.postDelayed(timeout, 60000);
        if (initialized) { loadAd(call); return; }
        MobileAds.setRequestConfiguration(new RequestConfiguration.Builder()
            .setMaxAdContentRating(RequestConfiguration.MAX_AD_CONTENT_RATING_T).build());
        MobileAds.initialize(getContext(), status -> handler.post(() -> {
            initialized = true;
            if (current(call)) loadAd(call);
        }));
    }
    private void loadAd(PluginCall call) {
        RewardedAd.load(getContext(), getContext().getString(R.string.potion_rewarded_ad_unit),
            new AdRequest.Builder().build(), new RewardedAdLoadCallback() {
                @Override public void onAdFailedToLoad(LoadAdError error) {
                    fail(call, "load", error.getMessage());
                }
                @Override public void onAdLoaded(RewardedAd ad) {
                    if (!current(call)) return;
                    handler.removeCallbacks(timeout);
                    if (!getActivity().hasWindowFocus()) { finish(call, "cancelled"); return; }
                    ad.setFullScreenContentCallback(new FullScreenContentCallback() {
                        @Override public void onAdFailedToShowFullScreenContent(AdError error) {
                            fail(call, "show", error.getMessage());
                        }
                        @Override public void onAdDismissedFullScreenContent() {
                            finish(call, earned ? "rewarded" : "cancelled");
                        }
                    });
                    ad.show(getActivity(), reward -> { if (current(call)) earned = true; });
                }
            });
    }
    @PluginMethod
    public void showPrivacyOptions(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            if (pending != null || privacyBusy) { call.resolve(new JSObject().put("status", "busy")); return; }
            ConsentInformation consent = UserMessagingPlatform.getConsentInformation(getContext());
            if (consent.getPrivacyOptionsRequirementStatus() != ConsentInformation.PrivacyOptionsRequirementStatus.REQUIRED) {
                call.resolve(new JSObject().put("status", "not-required")); return;
            }
            privacyBusy = true;
            UserMessagingPlatform.showPrivacyOptionsForm(getActivity(), error -> {
                privacyBusy = false;
                if (error != null) Log.w("PotionAds", "privacy: " + error.getMessage());
                call.resolve(new JSObject().put("status", error == null ? "shown" : "unavailable"));
            });
        });
    }
    @Override protected void handleOnDestroy() {
        if (timeout != null) handler.removeCallbacks(timeout);
        if (pending != null) finish(pending, "cancelled");
        super.handleOnDestroy();
    }
}
