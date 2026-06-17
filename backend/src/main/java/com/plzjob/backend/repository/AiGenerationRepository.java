package com.plzjob.backend.repository;

import com.plzjob.backend.entity.AiGeneration;
import com.plzjob.backend.entity.AiGenerationType;
import com.plzjob.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AiGenerationRepository extends JpaRepository<AiGeneration, Long> {
    List<AiGeneration> findByUserAndApplicationIdAndGenerationType(
            User user, Long applicationId, AiGenerationType type);
}
