package com.akt.institute.workflow.cucumber;

import io.cucumber.spring.CucumberContextConfiguration;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.sql.Statement;

/**
 * The single Spring context bootstrap for the Cucumber suite.
 *
 * Boots the full app against a dedicated {@code akt_institute_test} database on
 * the local Postgres (docker-compose), dropped + recreated pristine each run and
 * migrated by the real Flyway scripts. The step definitions (CrmWorkflowSteps)
 * autowire MockMvc / JdbcTemplate from this context and drive the HTTP API.
 *
 * Connection details default to the docker-compose dev credentials; override via
 * IT_DB_* environment variables for CI.
 */
@CucumberContextConfiguration
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@AutoConfigureMockMvc
@ActiveProfiles("it")
public class CucumberSpringConfiguration {

    static final String DB_HOST = env("IT_DB_HOST", "localhost");
    static final String DB_PORT = env("IT_DB_PORT", "5432");
    static final String DB_USER = env("IT_DB_USER", "akt_user");
    static final String DB_PASS = env("IT_DB_PASSWORD", "devpassword123");
    static final String SRC_DB  = env("IT_DB_NAME", "akt_institute");
    static final String TEST_DB = "akt_institute_test";

    static {
        String adminUrl = "jdbc:postgresql://" + DB_HOST + ":" + DB_PORT + "/" + SRC_DB;
        try (Connection c = DriverManager.getConnection(adminUrl, DB_USER, DB_PASS);
             Statement st = c.createStatement()) {
            st.execute("SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '"
                + TEST_DB + "' AND pid <> pg_backend_pid()");
            st.execute("DROP DATABASE IF EXISTS " + TEST_DB);
            st.execute("CREATE DATABASE " + TEST_DB);
        } catch (SQLException e) {
            throw new IllegalStateException(
                "Could not (re)create test database '" + TEST_DB + "' on " + adminUrl
                    + " — is the local Postgres (docker-compose) running?", e);
        }
    }

    @DynamicPropertySource
    static void datasourceProps(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url",
            () -> "jdbc:postgresql://" + DB_HOST + ":" + DB_PORT + "/" + TEST_DB);
        registry.add("spring.datasource.username", () -> DB_USER);
        registry.add("spring.datasource.password", () -> DB_PASS);
        registry.add("spring.datasource.driver-class-name", () -> "org.postgresql.Driver");
    }

    private static String env(String key, String def) {
        String v = System.getenv(key);
        return (v == null || v.isBlank()) ? def : v;
    }
}
