package com.plzjob.backend.repository;

import com.plzjob.backend.entity.ApplicationDocument;
import com.plzjob.backend.entity.DocumentVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface ApplicationDocumentRepository extends JpaRepository<ApplicationDocument, Long> {
    @Query("SELECT ad FROM ApplicationDocument ad JOIN FETCH ad.version v JOIN FETCH v.document WHERE ad.application.id = :appId")
    List<ApplicationDocument> findByApplicationId(@Param("appId") Long applicationId);

    boolean existsByApplicationIdAndVersion(Long applicationId, DocumentVersion version);

    Optional<ApplicationDocument> findByApplicationIdAndVersionId(Long applicationId, Long versionId);

    // 문서/버전 삭제 시 해당 버전을 참조하는 제출 문서 링크(하드 삭제)를 모두 제거한다.
    void deleteByVersionId(Long versionId);
}
