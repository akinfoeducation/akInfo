package com.akt.institute.branch.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class BranchRequest {

    @NotBlank(message = "Branch name is required")
    @Size(max = 200)
    private String name;

    @NotBlank(message = "Branch code is required")
    @Size(max = 50)
    private String code;

    private String address;

    @Size(max = 100)
    private String city;

    @Size(max = 20)
    private String phone;

    @Size(max = 255)
    private String email;

    private boolean active = true;
}
