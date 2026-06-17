package com.plzjob.backend.repository;

import com.plzjob.backend.entity.Retrospective;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface RetrospectiveRepository extends JpaRepository<Retrospective, Long> {
    List<Retrospective> findByApplicationId(Long applicationId);
}
