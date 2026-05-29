package com.akt.institute.auth.repository;

import com.akt.institute.auth.domain.User;

import java.util.Optional;

public interface UserDao {

    Optional<User> findById(Long id);

    Optional<User> findByEmailOrUsernameAndInstituteId(String identifier, Long instituteId);

    Optional<User> findByEmailAndInstituteId(String email, Long instituteId);

    Optional<User> findByUsernameAndInstituteId(String username, Long instituteId);

    boolean existsByEmailAndInstituteId(String email, Long instituteId);

    boolean existsByUsernameAndInstituteId(String username, Long instituteId);

    User save(User user);
}
