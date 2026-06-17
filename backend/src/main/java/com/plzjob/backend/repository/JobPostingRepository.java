package com.plzjob.backend.repository;

import com.plzjob.backend.entity.JobPosting;
import com.plzjob.backend.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface JobPostingRepository extends JpaRepository<JobPosting, Long> {
    Page<JobPosting> findByUser(User user, Pageable pageable);
    Optional<JobPosting> findByIdAndUser(Long id, User user);
    boolean existsByUserAndUrl(User user, String url);
}
