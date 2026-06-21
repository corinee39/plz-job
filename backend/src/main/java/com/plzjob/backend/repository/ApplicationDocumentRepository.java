package com.plzjob.backend.repository;

import com.plzjob.backend.entity.ApplicationDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ApplicationDocumentRepository extends JpaRepository<ApplicationDocument, Long> {
    List<ApplicationDocument> findByApplicationId(Long applicationId);
    boolean existsByApplication_IdAndVersion_Id(Long applicationId, Long versionId);
}
