package com.akt.institute.student.mapper;

import com.akt.institute.student.domain.Student;
import com.akt.institute.student.domain.StudentDocument;
import com.akt.institute.student.dto.*;
import org.mapstruct.*;

import java.util.List;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface StudentMapper {

    @Mapping(target = "uuid", ignore = true)
    @Mapping(target = "studentNumber", ignore = true)
    @Mapping(target = "instituteId", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "documents", ignore = true)
    Student toEntity(CreateStudentRequest request);

    @Mapping(target = "fullName", expression = "java(student.getFullName())")
    @Mapping(target = "status", expression = "java(student.getStatus() != null ? student.getStatus().name() : null)")
    @Mapping(target = "documents", source = "documents")
    StudentResponse toResponse(Student student);

    @Mapping(target = "fullName", expression = "java(student.getFullName())")
    @Mapping(target = "status", expression = "java(student.getStatus() != null ? student.getStatus().name() : null)")
    StudentSummaryResponse toSummary(Student student);

    List<StudentSummaryResponse> toSummaryList(List<Student> students);

    @Mapping(target = "isVerified", source = "verified")
    StudentResponse.DocumentInfo toDocumentInfo(StudentDocument doc);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "uuid", ignore = true)
    @Mapping(target = "studentNumber", ignore = true)
    @Mapping(target = "instituteId", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "documents", ignore = true)
    @Mapping(target = "leadId", ignore = true)
    void updateEntity(@MappingTarget Student student, UpdateStudentRequest request);
}
