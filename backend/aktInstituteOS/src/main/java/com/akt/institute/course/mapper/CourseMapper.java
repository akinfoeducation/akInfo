package com.akt.institute.course.mapper;

import com.akt.institute.course.domain.Batch;
import com.akt.institute.course.domain.Course;
import com.akt.institute.course.dto.*;
import org.mapstruct.*;

import java.util.List;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface CourseMapper {

    @Mapping(target = "uuid",        ignore = true)
    @Mapping(target = "instituteId", ignore = true)
    @Mapping(target = "status",      ignore = true)
    @Mapping(target = "batches",     ignore = true)
    Course toEntity(CreateCourseRequest request);

    @Mapping(target = "status",  expression = "java(course.getStatus() != null ? course.getStatus().name() : null)")
    @Mapping(target = "batches", source = "batches")
    CourseResponse toResponse(Course course);

    @Mapping(target = "status",     expression = "java(course.getStatus() != null ? course.getStatus().name() : null)")
    @Mapping(target = "batchCount", expression = "java(course.getBatches() != null ? course.getBatches().size() : 0)")
    CourseSummaryResponse toSummary(Course course);

    List<CourseSummaryResponse> toSummaryList(List<Course> courses);

    @Mapping(target = "status",         expression = "java(batch.getStatus() != null ? batch.getStatus().name() : null)")
    @Mapping(target = "availableSeats", expression = "java(batch.getMaxCapacity() != null ? Math.max(0, batch.getMaxCapacity() - batch.getEnrolledCount()) : 0)")
    BatchResponse toBatchResponse(Batch batch);

    List<BatchResponse> toBatchResponseList(List<Batch> batches);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "uuid",        ignore = true)
    @Mapping(target = "code",        ignore = true)
    @Mapping(target = "instituteId", ignore = true)
    @Mapping(target = "status",      ignore = true)
    @Mapping(target = "batches",     ignore = true)
    void updateCourseEntity(@MappingTarget Course course, UpdateCourseRequest request);

    @Mapping(target = "uuid",        ignore = true)
    @Mapping(target = "instituteId", ignore = true)
    @Mapping(target = "courseId",    ignore = true)
    @Mapping(target = "status",      ignore = true)
    Batch toBatchEntity(CreateBatchRequest request);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "uuid",        ignore = true)
    @Mapping(target = "instituteId", ignore = true)
    @Mapping(target = "courseId",    ignore = true)
    @Mapping(target = "status",      ignore = true)
    void updateBatchEntity(@MappingTarget Batch batch, UpdateBatchRequest request);
}
