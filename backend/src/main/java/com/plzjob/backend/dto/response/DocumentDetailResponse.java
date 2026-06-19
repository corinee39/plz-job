package com.plzjob.backend.dto.response;

import com.plzjob.backend.entity.Document;
import com.plzjob.backend.entity.DocumentVersion;
import lombok.Builder;
import lombok.Getter;
import java.util.List;

@Getter
@Builder
public class DocumentDetailResponse {
    private Long documentId;
    private String documentType;
    private String title;
    private List<DocumentVersionResponse> versions;

    public static DocumentDetailResponse from(Document d, List<DocumentVersion> versions) {
        return DocumentDetailResponse.builder()
                .documentId(d.getId()).documentType(d.getDocumentType().name()).title(d.getTitle())
                .versions(versions.stream().map(DocumentVersionResponse::from).toList())
                .build();
    }
}
