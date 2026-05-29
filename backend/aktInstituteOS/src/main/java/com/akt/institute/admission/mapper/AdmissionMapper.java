package com.akt.institute.admission.mapper;

import com.akt.institute.admission.domain.Admission;
import com.akt.institute.admission.dto.*;
import org.mapstruct.*;

import java.util.List;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface AdmissionMapper {

    @Mapping(target = "uuid",            ignore = true)
    @Mapping(target = "admissionNumber", ignore = true)
    @Mapping(target = "instituteId",     ignore = true)
    @Mapping(target = "status",          ignore = true)
    @Mapping(target = "feesPaid",        ignore = true)
    Admission toEntity(CreateAdmissionRequest request);

    @Mapping(target = "fullName",  expression = "java(admission.getFullName())")
    @Mapping(target = "feesDue",   expression = "java(admission.getFeesDue())")
    @Mapping(target = "status",    expression = "java(admission.getStatus() != null ? admission.getStatus().name() : null)")
    AdmissionResponse toResponse(Admission admission);

    @Mapping(target = "fullName",  expression = "java(admission.getFullName())")
    @Mapping(target = "feesDue",   expression = "java(admission.getFeesDue())")
    @Mapping(target = "status",    expression = "java(admission.getStatus() != null ? admission.getStatus().name() : null)")
    AdmissionSummaryResponse toSummary(Admission admission);

    List<AdmissionSummaryResponse> toSummaryList(List<Admission> admissions);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "uuid",            ignore = true)
    @Mapping(target = "admissionNumber", ignore = true)
    @Mapping(target = "instituteId",     ignore = true)
    @Mapping(target = "leadId",          ignore = true)
    @Mapping(target = "status",          ignore = true)
    void updateEntity(@MappingTarget Admission admission, UpdateAdmissionRequest request);
}
