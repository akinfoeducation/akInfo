package com.akt.institute.student.search;

import com.akt.institute.student.event.StudentIndexEvent;
import com.akt.institute.student.repository.StudentDao;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.meilisearch.sdk.Client;
import com.meilisearch.sdk.Index;
import com.meilisearch.sdk.SearchRequest;
import com.meilisearch.sdk.model.SearchResult;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class StudentSearchSyncService {

    static final String INDEX_NAME = "students";

    private final Client meilisearchClient;
    private final StudentDao studentDao;
    private final ObjectMapper objectMapper;

    @PostConstruct
    public void configureIndex() {
        try {
            Index index = meilisearchClient.index(INDEX_NAME);
            index.updateSearchableAttributesSettings(new String[]{
                "firstName", "lastName", "fullName", "phone", "whatsappNumber", "email", "studentNumber"
            });
            index.updateFilterableAttributesSettings(new String[]{
                "status", "instituteId", "city", "state"
            });
            index.updateSortableAttributesSettings(new String[]{
                "firstName", "lastName"
            });
            log.info("Meilisearch '{}' index configured", INDEX_NAME);
        } catch (Exception e) {
            log.warn("Could not configure Meilisearch index '{}': {}. Search will degrade to DB.", INDEX_NAME, e.getMessage());
        }
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Async("searchSyncExecutor")
    public void handleStudentIndexEvent(StudentIndexEvent event) {
        if (event.operation() == StudentIndexEvent.Operation.DELETE) {
            deleteFromIndex(event.studentId());
        } else {
            upsertToIndex(event.studentId());
        }
    }

    private void upsertToIndex(Long studentId) {
        studentDao.findAllByIds(List.of(studentId)).stream().findFirst().ifPresentOrElse(
            student -> {
                try {
                    var doc = StudentSearchDocument.from(student);
                    String json = "[" + objectMapper.writeValueAsString(doc) + "]";
                    meilisearchClient.index(INDEX_NAME).addDocuments(json, "id");
                } catch (JsonProcessingException e) {
                    log.error("Serialization error for student {}: {}", studentId, e.getMessage());
                } catch (Exception e) {
                    log.error("Meilisearch upsert failed for student {}: {}", studentId, e.getMessage());
                }
            },
            () -> log.warn("Student {} not found for Meilisearch upsert", studentId)
        );
    }

    private void deleteFromIndex(Long studentId) {
        try {
            meilisearchClient.index(INDEX_NAME).deleteDocument(String.valueOf(studentId));
        } catch (Exception e) {
            log.error("Meilisearch delete failed for student {}: {}", studentId, e.getMessage());
        }
    }

    public void reindexAll(Long instituteId) {
        log.info("Starting full student re-index for institute {}", instituteId);
        var students = studentDao.findAllByInstituteIdForReindex(instituteId);
        if (students.isEmpty()) return;
        try {
            List<StudentSearchDocument> docs = students.stream().map(StudentSearchDocument::from).toList();
            String json = objectMapper.writeValueAsString(docs);
            meilisearchClient.index(INDEX_NAME).addDocuments(json, "id");
            log.info("Re-indexed {} students for institute {}", docs.size(), instituteId);
        } catch (Exception e) {
            log.error("Full re-index failed for institute {}: {}", instituteId, e.getMessage());
        }
    }

    public SearchResult search(String query, Long instituteId, String status, int page, int size) {
        try {
            String[] filters = buildFilters(instituteId, status);
            SearchRequest request = SearchRequest.builder()
                .q(query)
                .offset(page * size)
                .limit(size)
                .filter(filters)
                .build();
            return (SearchResult) meilisearchClient.index(INDEX_NAME).search(request);
        } catch (Exception e) {
            log.error("Meilisearch search error: {}", e.getMessage());
            return null;
        }
    }

    private String[] buildFilters(Long instituteId, String status) {
        String base = "instituteId = " + instituteId;
        if (status != null && !status.isBlank()) {
            return new String[]{base, "status = " + status};
        }
        return new String[]{base};
    }
}
