package com.plzjob.backend.dto.request;

import com.plzjob.backend.entity.DocumentType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class DocumentCreateRequest {
    @NotNull private DocumentType documentType;
    @NotBlank private String title;
}
