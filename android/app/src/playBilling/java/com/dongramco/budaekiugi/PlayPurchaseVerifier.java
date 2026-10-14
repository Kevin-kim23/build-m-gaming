package com.dongramco.budaekiugi;

import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.Signature;
import java.security.spec.X509EncodedKeySpec;


/** Play's RSA signature check. Client checks deter errors, not a modified app. */
public final class PlayPurchaseVerifier {
    private PlayPurchaseVerifier() {}
    public static boolean verify(byte[] key, String json, byte[] signature) {
        try {
            if (key == null || key.length == 0 || json == null || signature == null) return false;
            Signature verifier = Signature.getInstance("SHA1withRSA");
            verifier.initVerify(KeyFactory.getInstance("RSA").generatePublic(
                new X509EncodedKeySpec(key)));
            verifier.update(json.getBytes(StandardCharsets.UTF_8));
            return verifier.verify(signature);
        } catch (Exception invalid) { return false; }
    }
}
