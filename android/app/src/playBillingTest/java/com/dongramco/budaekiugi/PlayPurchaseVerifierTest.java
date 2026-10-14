package com.dongramco.budaekiugi;

import org.junit.Test;
import static org.junit.Assert.*;
import java.security.*;
import java.nio.charset.StandardCharsets;

public class PlayPurchaseVerifierTest {
    @Test public void signedSyntheticReceiptPassesAndTamperingFails() throws Exception {
        KeyPairGenerator generator=KeyPairGenerator.getInstance("RSA");generator.initialize(2048);
        KeyPair pair=generator.generateKeyPair();
        String json="{\"productId\":\"synthetic-product\",\"purchaseState\":0}";
        Signature signer=Signature.getInstance("SHA1withRSA");signer.initSign(pair.getPrivate());
        signer.update(json.getBytes(StandardCharsets.UTF_8));byte[] signature=signer.sign();
        assertTrue(PlayPurchaseVerifier.verify(pair.getPublic().getEncoded(),json,signature));
        assertFalse(PlayPurchaseVerifier.verify(pair.getPublic().getEncoded(),json+" ",signature));
        assertFalse(PlayPurchaseVerifier.verify(generator.generateKeyPair().getPublic().getEncoded(),json,signature));
        assertFalse(PlayPurchaseVerifier.verify(new byte[0],json,signature));
        assertFalse(PlayPurchaseVerifier.verify(pair.getPublic().getEncoded(),json,new byte[]{1}));
    }
}
