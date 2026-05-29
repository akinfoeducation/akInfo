package com.akt.institute.dashboard.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.util.List;

public class DashboardRecentResponse {

    @Data @AllArgsConstructor @NoArgsConstructor
    public static class RecentAdmission {
        private Long   id;
        private String admissionNumber;
        private String studentName;
        private String phone;
        private String courseName;
        private String status;
        private String createdAt;
    }

    @Data @AllArgsConstructor @NoArgsConstructor
    public static class RecentPayment {
        private Long       id;
        private String     receiptNumber;
        private String     studentName;
        private BigDecimal amount;
        private String     paymentMode;
        private String     courseName;
        private String     paymentDate;
    }

    @Data @AllArgsConstructor @NoArgsConstructor
    public static class RecentEnquiry {
        private Long   id;
        private String leadName;
        private String phone;
        private String source;
        private String courseInterested;
        private String status;
        private String createdAt;
    }

    @Data @AllArgsConstructor @NoArgsConstructor
    public static class Response {
        private List<RecentAdmission> admissions;
        private List<RecentPayment>   payments;
        private List<RecentEnquiry>   enquiries;
    }
}
