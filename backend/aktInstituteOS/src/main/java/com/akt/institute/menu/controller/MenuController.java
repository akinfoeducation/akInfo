package com.akt.institute.menu.controller;

import com.akt.institute.shared.dto.ApiResponse;
import com.akt.institute.shared.security.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.Builder;
import lombok.Data;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

/**
 * Returns only the menu items the current user has permission to see.
 * Frontend uses this to render the sidebar dynamically — no hardcoded menus.
 */
@RestController
@RequestMapping("/api/v1/menu")
@Tag(name = "Menu", description = "Permission-driven navigation menu for the current user")
@SecurityRequirement(name = "bearerAuth")
public class MenuController {

    @GetMapping
    @Operation(summary = "Get allowed menu items for the currently logged-in user")
    public ResponseEntity<ApiResponse<List<MenuItem>>> menu(@AuthenticationPrincipal UserPrincipal principal) {
        Set<String> perms = principal.getPermissions();
        List<MenuItem> items = new ArrayList<>();

        // Dashboard — always visible to authenticated users
        items.add(MenuItem.of("Dashboard",     "/",              "LayoutDashboard", null));

        // CRM
        if (perms.contains("LEAD_VIEW"))
            items.add(MenuItem.of("Leads",         "/leads",         "UserCheck",       "CRM"));
        if (perms.contains("ADMISSION_VIEW"))
            items.add(MenuItem.of("Admissions",    "/admissions",    "ClipboardList",   "CRM"));

        // Academic
        if (perms.contains("STUDENT_VIEW"))
            items.add(MenuItem.of("Students",      "/students",      "Users",           "Academic"));
        if (perms.contains("COURSE_VIEW"))
            items.add(MenuItem.of("Courses",       "/courses",       "BookOpen",        "Academic"));
        if (perms.contains("BATCH_VIEW"))
            items.add(MenuItem.of("Batches",       "/batches",       "CalendarDays",    "Academic"));

        // Finance
        if (perms.contains("FEE_VIEW"))
            items.add(MenuItem.of("Fees",          "/fees",          "CreditCard",      "Finance"));

        // Administration
        if (perms.contains("USER_VIEW"))
            items.add(MenuItem.of("Users",         "/users",         "UserCog",         "Administration"));
        if (perms.contains("ROLE_VIEW"))
            items.add(MenuItem.of("Roles",         "/roles",         "Shield",          "Administration"));
        if (perms.contains("BRANCH_VIEW"))
            items.add(MenuItem.of("Branches",      "/branches",      "Building2",       "Administration"));
        if (perms.contains("DEPT_VIEW"))
            items.add(MenuItem.of("Departments",   "/departments",   "Briefcase",       "Administration"));

        // Notifications
        if (perms.contains("STUDENT_VIEW"))
            items.add(MenuItem.of("Notifications", "/notifications", "Bell",            "Communication"));

        // Reports
        if (perms.contains("REPORT_VIEW"))
            items.add(MenuItem.of("Reports",       "/reports",       "BarChart3",       null));

        // Audit
        if (perms.contains("AUDIT_VIEW"))
            items.add(MenuItem.of("Audit Logs",    "/audit",         "FileText",        "Administration"));

        // Settings — always visible
        items.add(MenuItem.of("Settings",      "/settings",      "Settings",        null));

        return ResponseEntity.ok(ApiResponse.ok(items));
    }

    @Data @Builder
    public static class MenuItem {
        private String label;
        private String href;
        private String icon;
        private String group; // groups items in sidebar sections

        static MenuItem of(String label, String href, String icon, String group) {
            return MenuItem.builder().label(label).href(href).icon(icon).group(group).build();
        }
    }
}
