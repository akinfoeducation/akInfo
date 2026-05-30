package com.akt.institute.institute.repository;

import com.akt.institute.institute.domain.Institute;

import java.util.Optional;

public interface InstituteDao {

    Optional<Institute> findBySubdomain(String subdomain);

    Optional<Institute> findById(Long id);
}
