package com.akt.institute.notification.service;

import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Renders a template body by substituting {{variable}} placeholders with values.
 */
@Component
public class TemplateRenderer {

    private static final Pattern PLACEHOLDER = Pattern.compile("\\{\\{(\\w+)\\}\\}");

    public String render(String template, Map<String, String> variables) {
        if (template == null || variables == null || variables.isEmpty()) return template;
        StringBuffer sb = new StringBuffer();
        Matcher m = PLACEHOLDER.matcher(template);
        while (m.find()) {
            String key = m.group(1);
            String value = variables.getOrDefault(key, "");
            m.appendReplacement(sb, Matcher.quoteReplacement(value != null ? value : ""));
        }
        m.appendTail(sb);
        return sb.toString();
    }

    public String preview(String body, int maxLength) {
        if (body == null) return null;
        String stripped = body.replaceAll("<[^>]+>", "").replaceAll("\\s+", " ").trim();
        return stripped.length() > maxLength ? stripped.substring(0, maxLength) + "…" : stripped;
    }
}
