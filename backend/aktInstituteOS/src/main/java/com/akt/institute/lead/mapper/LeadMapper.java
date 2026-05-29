package com.akt.institute.lead.mapper;

import com.akt.institute.lead.domain.Lead;
import com.akt.institute.lead.dto.*;
import org.mapstruct.*;

import java.util.List;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface LeadMapper {

    @Mapping(target = "uuid",             ignore = true)
    @Mapping(target = "instituteId",      ignore = true)
    @Mapping(target = "status",           ignore = true)
    @Mapping(target = "convertedAt",      ignore = true)
    @Mapping(target = "lastContactedAt",  ignore = true)
    @Mapping(target = "nextFollowUpAt",   ignore = true)  // parsed manually in service
    Lead toEntity(CreateLeadRequest request);

    @Mapping(target = "fullName", expression = "java(lead.getFullName())")
    @Mapping(target = "status",   expression = "java(lead.getStatus() != null ? lead.getStatus().name() : null)")
    @Mapping(target = "source",   expression = "java(lead.getSource() != null ? lead.getSource().name() : null)")
    LeadResponse toResponse(Lead lead);

    @Mapping(target = "fullName", expression = "java(lead.getFullName())")
    @Mapping(target = "status",   expression = "java(lead.getStatus() != null ? lead.getStatus().name() : null)")
    @Mapping(target = "source",   expression = "java(lead.getSource() != null ? lead.getSource().name() : null)")
    LeadSummaryResponse toSummary(Lead lead);

    List<LeadSummaryResponse> toSummaryList(List<Lead> leads);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "uuid",            ignore = true)
    @Mapping(target = "instituteId",     ignore = true)
    @Mapping(target = "status",          ignore = true)
    @Mapping(target = "convertedAt",     ignore = true)
    @Mapping(target = "lastContactedAt", ignore = true)
    @Mapping(target = "nextFollowUpAt",  ignore = true)  // parsed manually in service
    void updateEntity(@MappingTarget Lead lead, UpdateLeadRequest request);
}
