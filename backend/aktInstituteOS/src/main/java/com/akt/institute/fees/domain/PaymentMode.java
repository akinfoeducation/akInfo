package com.akt.institute.fees.domain;

public enum PaymentMode {
    CASH, UPI, CHEQUE, BANK_TRANSFER,
    ONLINE,      // internet banking / payment gateway
    NEFT,        // NEFT / RTGS wire transfer
    DD,          // demand draft
    OTHER;

    /** Safe parse — falls back to OTHER instead of throwing. */
    public static PaymentMode fromString(String value) {
        if (value == null || value.isBlank()) return OTHER;
        try { return PaymentMode.valueOf(value.toUpperCase()); }
        catch (IllegalArgumentException e) { return OTHER; }
    }
}
