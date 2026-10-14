package com.dongramco.budaekiugi;

import android.os.Handler;
import android.os.Looper;
import com.android.billingclient.api.*;
import com.getcapacitor.*;
import com.getcapacitor.annotation.CapacitorPlugin;
import org.json.JSONObject;
import java.util.Collections;
import java.util.List;

/** Opt-in debug integration only. No Firebase, HTTP backend or credential logging. */
@CapacitorPlugin(name = "PlayBilling")
public class PlayBillingPlugin extends Plugin implements PurchasesUpdatedListener {
    private BillingClient client;
    private PluginCall pending;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private long generation;
    private boolean configured() {
        return BuildConfig.DEBUG && BuildConfig.PLAY_BILLING_ENABLED
            && !BuildConfig.PLAY_AUTO_TAP_PRODUCT.isEmpty() && !BuildConfig.PLAY_BILLING_KEY.isEmpty();
    }
    private void finish(String status) { JSObject out=new JSObject();out.put("status",status);out.put("configured",configured());finish(out); }
    private void finish(JSObject out) {
        PluginCall call=pending;pending=null;generation++;
        if(call!=null)call.resolve(out);
    }
    private void start(PluginCall call,Runnable action) {
        getActivity().runOnUiThread(()->{
            if(pending!=null){JSObject out=new JSObject();out.put("status","busy");call.resolve(out);return;}
            pending=call;
            if(!configured()){finish("unavailable");return;}
            long ticket=++generation;
            // Timeouts never grant or revoke. A later restore can finish an interrupted purchase.
            handler.postDelayed(()->{if(pending==call&&generation==ticket)finish("unavailable");},120000);
            if(client==null)client=BillingClient.newBuilder(getContext()).setListener(this)
                .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())
                .enableAutoServiceReconnection().build();
            if(client.isReady()){action.run();return;}
            client.startConnection(new BillingClientStateListener(){
                public void onBillingSetupFinished(BillingResult result){
                    if(pending!=call||generation!=ticket)return;
                    if(result.getResponseCode()==BillingClient.BillingResponseCode.OK)action.run();else finish("unavailable");
                }
                public void onBillingServiceDisconnected(){/* Next API request reconnects; no entitlement change. */}
            });
        });
    }
    private void product(java.util.function.Consumer<ProductDetails> next) {
        PluginCall call=pending;
        QueryProductDetailsParams.Product item=QueryProductDetailsParams.Product.newBuilder()
            .setProductId(BuildConfig.PLAY_AUTO_TAP_PRODUCT).setProductType(BillingClient.ProductType.INAPP).build();
        client.queryProductDetailsAsync(QueryProductDetailsParams.newBuilder().setProductList(Collections.singletonList(item)).build(),(result,details)->{
            if(pending!=call)return;
            if(result.getResponseCode()!=BillingClient.BillingResponseCode.OK){finish("unavailable");return;}
            for(ProductDetails detail:details.getProductDetailsList())if(detail.getProductId().equals(BuildConfig.PLAY_AUTO_TAP_PRODUCT)){
                List<ProductDetails.OneTimePurchaseOfferDetails> offers=detail.getOneTimePurchaseOfferDetailsList();
                // Multiple offers require explicit product design, never choose a price arbitrarily.
                if(offers==null||offers.size()!=1){finish("unavailable");return;}
                next.accept(detail);return;
            }
            finish("unavailable");
        });
    }
    @PluginMethod public void getProduct(PluginCall call){start(call,()->product(detail->{
        JSObject out=new JSObject();out.put("status","ready");out.put("configured",true);
        out.put("price",detail.getOneTimePurchaseOfferDetailsList().get(0).getFormattedPrice());finish(out);
    }));}
    @PluginMethod public void restore(PluginCall call){start(call,this::queryOwned);}
    @PluginMethod public void purchase(PluginCall call){start(call,()->product(detail->{
        if(getActivity().isFinishing()){finish("unavailable");return;}
        BillingFlowParams.ProductDetailsParams item=BillingFlowParams.ProductDetailsParams.newBuilder()
            .setProductDetails(detail).setOfferToken(detail.getOneTimePurchaseOfferDetailsList().get(0).getOfferToken()).build();
        getActivity().runOnUiThread(()->{
            if(pending!=call)return;
            BillingResult result=client.launchBillingFlow(getActivity(),BillingFlowParams.newBuilder().setProductDetailsParamsList(Collections.singletonList(item)).build());
            if(result.getResponseCode()==BillingClient.BillingResponseCode.ITEM_ALREADY_OWNED)queryOwned();
            else if(result.getResponseCode()!=BillingClient.BillingResponseCode.OK)finish(result.getResponseCode()==BillingClient.BillingResponseCode.USER_CANCELED?"cancelled":"unavailable");
        });
    }));}
    @Override public void onPurchasesUpdated(BillingResult result,List<Purchase> purchases){
        if(pending==null)return;
        if(result.getResponseCode()==BillingClient.BillingResponseCode.USER_CANCELED){finish("cancelled");return;}
        if(result.getResponseCode()!=BillingClient.BillingResponseCode.OK){finish("unavailable");return;}
        // Re-query the full owned inventory instead of trusting a partial callback.
        queryOwned();
    }
    private void queryOwned(){
        PluginCall call=pending;
        client.queryPurchasesAsync(QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.INAPP).build(),(result,purchases)->{
            if(pending!=call)return;
            if(result.getResponseCode()!=BillingClient.BillingResponseCode.OK){finish("unavailable");return;}
            Purchase match=null;
            for(Purchase purchase:purchases)if(purchase.getProducts().contains(BuildConfig.PLAY_AUTO_TAP_PRODUCT)){
                if(match!=null){finish("unavailable");return;}match=purchase;
            }
            if(match==null){synced(false);return;}
            if(match.getPurchaseState()==Purchase.PurchaseState.PENDING){finish("pending");return;}
            if(match.getPurchaseState()!=Purchase.PurchaseState.PURCHASED||!valid(match)){finish("unavailable");return;}
            if(match.isAcknowledged()){synced(true);return;}
            // Durable device entitlement before acknowledgement; a restore reconciles process death.
            if(!getContext().getSharedPreferences("play-billing-entitlement",0).edit().putBoolean("auto",true).commit()){finish("unavailable");return;}
            client.acknowledgePurchase(AcknowledgePurchaseParams.newBuilder().setPurchaseToken(match.getPurchaseToken()).build(),ack->{
                if(pending!=call)return;
                if(ack.getResponseCode()==BillingClient.BillingResponseCode.OK)synced(true);else finish("unavailable");
            });
        });
    }
    private boolean valid(Purchase purchase){
        try{
            JSONObject data=new JSONObject(purchase.getOriginalJson());
            return getContext().getPackageName().equals(data.optString("packageName"))
                && purchase.getProducts().size()==1 && purchase.getQuantity()==1
                && !purchase.getPurchaseToken().isEmpty()
                && PlayPurchaseVerifier.verify(android.util.Base64.decode(BuildConfig.PLAY_BILLING_KEY,android.util.Base64.DEFAULT),purchase.getOriginalJson(),android.util.Base64.decode(purchase.getSignature(),android.util.Base64.DEFAULT));
        }catch(Exception invalid){return false;}
    }
    private void synced(boolean owned){
        if(!getContext().getSharedPreferences("play-billing-entitlement",0).edit().putBoolean("auto",owned).commit()){finish("unavailable");return;}
        JSObject out=new JSObject();out.put("status","synced");out.put("verified",true);out.put("owned",owned);finish(out);
    }
    @Override protected void handleOnDestroy(){
        if(pending!=null)finish("unavailable");
        if(client!=null)client.endConnection();handler.removeCallbacksAndMessages(null);
    }
}
