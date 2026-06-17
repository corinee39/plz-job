package com.plzjob.backend.repository;

import com.plzjob.backend.entity.AuthProvider;
import com.plzjob.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByProviderAndProviderUserId(AuthProvider provider, String providerUserId);
}
