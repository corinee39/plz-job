package com.plzjob.backend.repository;

import com.plzjob.backend.entity.Application;
import com.plzjob.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ApplicationRepository extends JpaRepository<Application, Long> {
    Optional<Application> findByIdAndUser(Long id, User user);
    List<Application> findByUser(User user);
}
