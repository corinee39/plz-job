package com.plzjob.backend.repository;

import com.plzjob.backend.entity.RecruitmentSchedule;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDateTime;
import java.util.List;

public interface RecruitmentScheduleRepository extends JpaRepository<RecruitmentSchedule, Long> {
    List<RecruitmentSchedule> findByApplication_User_IdAndStartAtBetweenOrderByStartAt(
            Long userId, LocalDateTime from, LocalDateTime to);
    long countByApplication_User_IdAndStartAtAfter(Long userId, LocalDateTime now);
}
