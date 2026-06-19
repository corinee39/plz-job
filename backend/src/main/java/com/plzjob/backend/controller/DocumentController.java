package com.plzjob.backend.controller;

import com.plzjob.backend.auth.LoginUserId;
import com.plzjob.backend.common.ApiResponse;
import com.plzjob.backend.dto.request.DocumentCreateRequest;
import com.plzjob.backend.dto.response.DocumentDetailResponse;
import com.plzjob.backend.dto.response.DocumentVersionResponse;
import com.plzjob.backend.service.DocumentService;
import com.plzjob.backend.service.DocumentService.DocumentResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class DocumentController {

    private final DocumentService documentService;

    @PostMapping("/documents")
    public ResponseEntity<ApiResponse<DocumentResponse>> create(
            @LoginUserId Long userId, @RequestBody @Valid DocumentCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(documentService.create(userId, request)));
    }

    @GetMapping("/documents")
    public ResponseEntity<ApiResponse<List<DocumentResponse>>> list(@LoginUserId Long userId) {
        return ResponseEntity.ok(ApiResponse.ok(documentService.list(userId)));
    }

    @GetMapping("/documents/{documentId}")
    public ResponseEntity<ApiResponse<DocumentDetailResponse>> detail(
            @LoginUserId Long userId, @PathVariable Long documentId) {
        return ResponseEntity.ok(ApiResponse.ok(documentService.detail(userId, documentId)));
    }

    @PostMapping(value = "/documents/{documentId}/versions", consumes = "multipart/form-data")
    public ResponseEntity<ApiResponse<DocumentVersionResponse>> upload(
            @LoginUserId Long userId, @PathVariable Long documentId,
            @RequestParam("file") MultipartFile file,
            @RequestParam("versionName") String versionName,
            @RequestParam(value = "description", required = false) String description) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(documentService.uploadVersion(userId, documentId, file, versionName, description)));
    }

    @PostMapping("/applications/{applicationId}/documents/{versionId}")
    public ResponseEntity<ApiResponse<Void>> link(
            @LoginUserId Long userId, @PathVariable Long applicationId, @PathVariable Long versionId) {
        documentService.linkToApplication(userId, applicationId, versionId);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok());
    }
}
