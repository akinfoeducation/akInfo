package com.akt.institute.institute.domain;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Institute {

    private Long id;
    private String uuid;
    private String name;
    private String code;
    private String subdomain;
    private boolean isActive;
}
