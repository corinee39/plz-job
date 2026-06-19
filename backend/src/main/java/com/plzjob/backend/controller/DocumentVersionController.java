package com.plzjob.backend.controller;

import com.plzjob.backend.auth.LoginUserId;
import com.plzjob.backend.common.ApiResponse;
import com.plzjob.backend.service.DocumentService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

@RestController
@RequestMapping("/api/document-versions")
@RequiredArgsConstructor
public class DocumentVersionController {

    private final DocumentService documentService;

    @GetMapping("/{versionId}/download")
    public ResponseEntity<Resource> download(@LoginUserId Long userId, @PathVariable Long versionId) {
        var f = documentService.download(userId, versionId);
        String encoded = URLEncoder.encode(f.fileName(), StandardCharsets.UTF_8).replace("+", "%20");
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(f.mimeType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename*=UTF-8''" + encoded)
                .body(new ByteArrayResource(f.data()));
    }

    @DeleteMapping("/{versionId}")
    public ResponseEntity<ApiResponse<Void>> delete(@LoginUserId Long userId, @PathVariable Long versionId) {
        documentService.deleteVersion(userId, versionId);
        return ResponseEntity.noContent().build();
    }
}
