package com.akt.institute.auth.service;

import com.akt.institute.auth.repository.UserDao;
import com.akt.institute.shared.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Loads user by ID (from JWT subject) for authenticated requests.
 */
@Service
@RequiredArgsConstructor
public class UserDetailsServiceImpl implements UserDetailsService {

    private final UserDao userDao;

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String userIdOrIdentifier) throws UsernameNotFoundException {
        if (userIdOrIdentifier.matches("\\d+")) {
            var user = userDao.findById(Long.parseLong(userIdOrIdentifier))
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + userIdOrIdentifier));
            return new UserPrincipal(user);
        }
        throw new UsernameNotFoundException("Invalid identifier: " + userIdOrIdentifier);
    }

    @Transactional(readOnly = true)
    public UserDetails loadByEmailOrUsername(String identifier, Long instituteId) {
        var user = userDao.findByEmailOrUsernameAndInstituteId(identifier, instituteId)
            .orElseThrow(() -> new UsernameNotFoundException("User not found: " + identifier));
        return new UserPrincipal(user);
    }
}
