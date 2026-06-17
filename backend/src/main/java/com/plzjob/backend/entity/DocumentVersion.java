package com.plzjob.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.SQLRestriction;

@Entity
@Table(name = "DOCUMENT_VERSIONS")
@SQLRestriction("deleted_at IS NULL")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class DocumentVersion extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "doc_version_seq")
    @SequenceGenerator(name = "doc_version_seq", sequenceName = "SEQ_DOC_VERSIONS", allocationSize = 50)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "document_id", nullable = false)
    private Document document;

    @Column(name = "version_name", nullable = false, length = 50)
    private String versionName;

    @Column(length = 500)
    private String description;

    @Column(name = "original_name", length = 255) private String originalName;
    @Column(name = "stored_name", length = 255)   private String storedName;
    @Column(name = "file_path", length = 500)     private String filePath;
    @Column(name = "mime_type", length = 100)     private String mimeType;
    @Column(name = "size_bytes")                  private Long sizeBytes;
    @Column(length = 64)                          private String hash;

    @Lob
    @Column(name = "extracted_text")
    private String extractedText;

    @Builder
    public DocumentVersion(Document document, String versionName, String description,
                           String originalName, String storedName, String filePath,
                           String mimeType, Long sizeBytes, String hash, String extractedText) {
        this.document = document;
        this.versionName = versionName;
        this.description = description;
        this.originalName = originalName;
        this.storedName = storedName;
        this.filePath = filePath;
        this.mimeType = mimeType;
        this.sizeBytes = sizeBytes;
        this.hash = hash;
        this.extractedText = extractedText;
    }
}
