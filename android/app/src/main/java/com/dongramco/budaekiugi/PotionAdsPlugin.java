package com.dongramco.budaekiugi;

import android.os.Handler;
import android.os.Looper;
import android.os.Bundle;
import com.google.ads.mediation.admob.AdMobAdapter;
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
    private boolean accessAllowed = false, teen = true;
    private int accessGeneration = 0;
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
    public void configureAccess(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            String band = call.getString("ageBand", "unknown");
            boolean allowed = call.getBoolean("allowed", false) && call.getInt("revision", 0) == 1
                && (band.equals("teen") || band.equals("adult"));
            boolean nextTeen = !band.equals("adult");
            if (accessAllowed != allowed || teen != nextTeen) accessGeneration++;
            accessAllowed = allowed; teen = nextTeen;
            if (!allowed && pending != null) finish(pending, "cancelled");
            call.resolve(new JSObject().put("status", allowed ? "ready" : "disabled"));
        });
    }
    private ConsentRequestParameters consentParameters() {
        return new ConsentRequestParameters.Builder().setTagForUnderAgeOfConsent(teen).build();
    }
    private void applyAdRestrictions() {
        MobileAds.setRequestConfiguration(new RequestConfiguration.Builder()
            .setTagForUnderAgeOfConsent(teen ? RequestConfiguration.TAG_FOR_UNDER_AGE_OF_CONSENT_TRUE
                : RequestConfiguration.TAG_FOR_UNDER_AGE_OF_CONSENT_FALSE)
            .setPublisherPrivacyPersonalizationState(RequestConfiguration.PublisherPrivacyPersonalizationState.DISABLED)
            .setMaxAdContentRating(teen ? RequestConfiguration.MAX_AD_CONTENT_RATING_G : RequestConfiguration.MAX_AD_CONTENT_RATING_T).build());
    }
    @PluginMethod
    public void preparePrivacy(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            if (!accessAllowed) { call.resolve(new JSObject().put("status", "not-enabled")); return; }
            if (privacyBusy || pending != null) { call.resolve(new JSObject().put("status", "busy")); return; }
            privacyBusy = true;
            final int generation = accessGeneration;
            final boolean[] finished = { false };
            Runnable expire = () -> {
                if (finished[0]) return;
                finished[0] = true; privacyBusy = false;
                call.resolve(new JSObject().put("status", "unavailable"));
            };
            handler.postDelayed(expire, 60000);
            ConsentInformation consent = UserMessagingPlatform.getConsentInformation(getContext());
            consent.requestConsentInfoUpdate(getActivity(), consentParameters(), () -> {
                if (finished[0]) return;
                if (!accessAllowed || generation != accessGeneration) { handler.removeCallbacks(expire); expire.run(); return; }
                UserMessagingPlatform.loadAndShowConsentFormIfRequired(getActivity(), error -> {
                    if (finished[0]) return;
                    finished[0] = true; privacyBusy = false; handler.removeCallbacks(expire);
                    call.resolve(new JSObject().put("status", error == null && accessAllowed
                        && generation == accessGeneration && consent.canRequestAds() ? "ready" : "unavailable"));
                });
            }, error -> { handler.removeCallbacks(expire); expire.run(); });
        });
    }
    @PluginMethod
    public void showRewarded(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            String item = call.getString("itemId", "");
            if (!accessAllowed || pending != null || privacyBusy || !(item.equals("red") || item.equals("blue") || item.equals("offline-income"))) {
                call.resolve(new JSObject().put("status", "unavailable")); return;
            }
            pending = call;
            earned = false;
            timeout = () -> fail(call, "consent.update", "Timed out");
            handler.postDelayed(timeout, 60000);
            ConsentInformation consent = UserMessagingPlatform.getConsentInformation(getContext());
            consent.requestConsentInfoUpdate(getActivity(), consentParameters(),
                () -> {
                    if (!current(call)) return;
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
        if (!accessAllowed) { finish(call, "cancelled"); return; }
        handler.removeCallbacks(timeout);
        timeout = () -> fail(call, "load", "Timed out");
        handler.postDelayed(timeout, 60000);
        applyAdRestrictions();
        if (initialized) { loadAd(call); return; }
        MobileAds.initialize(getContext(), status -> handler.post(() -> {
            initialized = true;
            if (current(call)) loadAd(call);
        }));
    }
    private void loadAd(PluginCall call) {
        if (!accessAllowed || !current(call)) { finish(call, "cancelled"); return; }
        Bundle extras = new Bundle(); extras.putString("npa", "1");
        RewardedAd.load(getContext(), getContext().getString(R.string.potion_rewarded_ad_unit),
            new AdRequest.Builder().addNetworkExtrasBundle(AdMobAdapter.class, extras).build(), new RewardedAdLoadCallback() {
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
            if (!accessAllowed) { call.resolve(new JSObject().put("status", "not-enabled")); return; }
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
        accessAllowed = false;
        accessGeneration++;
        if (timeout != null) handler.removeCallbacks(timeout);
        if (pending != null) finish(pending, "cancelled");
        super.handleOnDestroy();
    }
}
