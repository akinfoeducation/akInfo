package com.akt.institute.fees.mapper;

import com.akt.institute.fees.domain.FeePayment;
import com.akt.institute.fees.dto.FeePaymentResponse;
import org.mapstruct.*;

import java.util.List;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface FeePaymentMapper {

    @Mapping(target = "paymentMode", expression = "java(p.getPaymentMode() != null ? p.getPaymentMode().name() : null)")
    FeePaymentResponse toResponse(FeePayment p);

    List<FeePaymentResponse> toResponseList(List<FeePayment> payments);
}
