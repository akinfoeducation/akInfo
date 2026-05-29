package com.akt.institute.auth.domain;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Permission {

    private Long id;
    private String name;
    private String code;
    private String resource;
    private String action;
    private String description;
}
