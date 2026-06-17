package com.plzjob.backend.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "APPLICATION_DOCUMENTS",
       uniqueConstraints = @UniqueConstraint(name = "uq_app_doc", columnNames = {"application_id", "version_id"}))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ApplicationDocument {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "app_doc_seq")
    @SequenceGenerator(name = "app_doc_seq", sequenceName = "SEQ_APP_DOCS", allocationSize = 50)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "application_id", nullable = false)
    private Application application;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "version_id", nullable = false)
    private DocumentVersion version;

    @Builder
    public ApplicationDocument(Application application, DocumentVersion version) {
        this.application = application;
        this.version = version;
    }
}
