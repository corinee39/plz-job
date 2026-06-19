package com.plzjob.backend.dto.response;

import com.plzjob.backend.entity.DocumentVersion;
import lombok.Builder;
import lombok.Getter;
import java.time.LocalDateTime;

@Getter
@Builder
public class DocumentVersionResponse {
    private Long versionId;
    private String versionName;
    private String description;
    private String fileName;
    private String mimeType;
    private Long sizeBytes;
    private String extractStatus;
    private int extractedTextLength;
    private LocalDateTime createdAt;

    public static DocumentVersionResponse from(DocumentVersion v) {
        int len = v.getExtractedText() != null ? v.getExtractedText().length() : 0;
        return DocumentVersionResponse.builder()
                .versionId(v.getId()).versionName(v.getVersionName()).description(v.getDescription())
                .fileName(v.getOriginalName()).mimeType(v.getMimeType()).sizeBytes(v.getSizeBytes())
                .extractStatus(len > 0 ? "SUCCESS" : "FAILED").extractedTextLength(len)
                .createdAt(v.getCreatedAt())
                .build();
    }
}
