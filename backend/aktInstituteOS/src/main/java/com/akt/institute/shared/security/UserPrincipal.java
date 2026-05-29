package com.akt.institute.shared.security;

import com.akt.institute.auth.domain.User;
import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.Set;
import java.util.stream.Collectors;

@Getter
public class UserPrincipal implements UserDetails {

    private final Long id;
    private final Long instituteId;
    private final String email;
    private final String usernameValue;
    private final String password;
    private final boolean active;
    private final boolean locked;
    private final Set<String> roleNames;
    private final Collection<? extends GrantedAuthority> authorities;

    public UserPrincipal(User user) {
        this.id = user.getId();
        this.instituteId = user.getInstituteId();
        this.email = user.getEmail();
        this.usernameValue = user.getUsername();
        this.password = user.getPasswordHash();
        this.active = user.isActive();
        this.locked = user.isLocked();
        this.roleNames = user.getRoles().stream()
            .map(r -> r.getCode())
            .collect(Collectors.toSet());
        this.authorities = user.getRoles().stream()
            .flatMap(role -> role.getPermissions().stream())
            .map(perm -> new SimpleGrantedAuthority(perm.getCode()))
            .collect(Collectors.toSet());
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return authorities;
    }

    @Override
    public String getPassword() {
        return password;
    }

    @Override
    public String getUsername() {
        return usernameValue;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return !locked;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return active;
    }

    public Set<String> getPermissions() {
        return authorities.stream()
            .map(GrantedAuthority::getAuthority)
            .collect(Collectors.toSet());
    }
}
