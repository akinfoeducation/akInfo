package com.akt.institute.lead.domain;

public enum LeadSource {
    WALK_IN,     // genuine walk-in — student physically came to the institute
    REFERRAL,
    SOCIAL_MEDIA,
    WEBSITE,
    GOOGLE_ADS,
    PHONE,       // inbound phone enquiry
    ONLINE,      // generic online / web form
    IMPORTED,    // bulk Excel import (ads/lists) — system-set, not user-pickable
    OTHER,
    UNKNOWN      // source not captured — default when none provided (system-set)
}
