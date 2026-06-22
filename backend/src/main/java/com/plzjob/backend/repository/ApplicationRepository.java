package com.plzjob.backend.repository;

import com.plzjob.backend.entity.Application;
import com.plzjob.backend.entity.ApplicationStage;
import com.plzjob.backend.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface ApplicationRepository extends JpaRepository<Application, Long> {
    Optional<Application> findByIdAndUser(Long id, User user);
    List<Application> findByUser(User user);
    Optional<Application> findByJobPostingId(Long jobPostingId);

    // 공고 목록 검색: 단계 필터(stage) + 회사명 부분일치(company), 둘 다 선택적 (JOB-05)
    @Query("SELECT a FROM Application a WHERE a.user = :user " +
           "AND (:stage IS NULL OR a.currentStage = :stage) " +
           "AND (:company IS NULL OR LOWER(a.jobPosting.companyName) LIKE LOWER(CONCAT('%', :company, '%')))")
    Page<Application> search(@Param("user") User user,
                             @Param("stage") ApplicationStage stage,
                             @Param("company") String company,
                             Pageable pageable);
}
