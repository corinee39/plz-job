package com.plzjob.backend.service;

import com.plzjob.backend.client.DocumentTextExtractor;
import com.plzjob.backend.dto.request.DocumentCreateRequest;
import com.plzjob.backend.dto.response.DocumentDetailResponse;
import com.plzjob.backend.dto.response.DocumentVersionResponse;
import com.plzjob.backend.entity.*;
import com.plzjob.backend.exception.CustomException;
import com.plzjob.backend.exception.ErrorCode;
import com.plzjob.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.nio.file.*;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DocumentService {

    private static final Set<String> ALLOWED_MIME = Set.of("application/pdf", "text/plain");

    private final DocumentRepository documentRepository;
    private final DocumentVersionRepository versionRepository;
    private final ApplicationDocumentRepository applicationDocumentRepository;
    private final ApplicationRepository applicationRepository;
    private final UserRepository userRepository;
    private final DocumentTextExtractor extractor;

    @Value("${document.upload-dir}")
    private String uploadDir;

    @Transactional
    public DocumentResponse create(Long userId, DocumentCreateRequest req) {
        User user = userRepository.getReferenceById(userId);
        Document doc = documentRepository.save(Document.builder()
                .user(user).documentType(req.getDocumentType()).title(req.getTitle()).build());
        return new DocumentResponse(doc.getId(), doc.getDocumentType().name(), doc.getTitle());
    }

    public List<DocumentResponse> list(Long userId) {
        User user = userRepository.getReferenceById(userId);
        return documentRepository.findByUser(user).stream()
                .map(d -> new DocumentResponse(d.getId(), d.getDocumentType().name(), d.getTitle())).toList();
    }

    public DocumentDetailResponse detail(Long userId, Long documentId) {
        Document doc = findOwnedDocument(userId, documentId);
        return DocumentDetailResponse.from(doc, versionRepository.findByDocumentId(doc.getId()));
    }

    @Transactional
    public DocumentVersionResponse uploadVersion(Long userId, Long documentId, MultipartFile file,
                                                 String versionName, String description) {
        Document doc = findOwnedDocument(userId, documentId);
        String original = file.getOriginalFilename();
        String mime = file.getContentType();
        boolean okExt = original != null && (original.toLowerCase().endsWith(".pdf") || original.toLowerCase().endsWith(".txt"));
        if (!okExt || mime == null || !ALLOWED_MIME.contains(mime))
            throw new CustomException(ErrorCode.UNSUPPORTED_FILE_TYPE);

        byte[] bytes;
        String storedName, path, hash;
        try {
            bytes = file.getBytes();
            Path dir = Paths.get(uploadDir);
            Files.createDirectories(dir);
            storedName = UUID.randomUUID() + (original.toLowerCase().endsWith(".pdf") ? ".pdf" : ".txt");
            Path target = dir.resolve(storedName);
            Files.write(target, bytes);
            path = target.toString();
            hash = sha256(bytes);
        } catch (IOException | RuntimeException e) {
            throw new CustomException(ErrorCode.FILE_PROCESS_FAILED);
        }

        String text = extractor.extract(original, bytes);
        DocumentVersion v = versionRepository.save(DocumentVersion.builder()
                .document(doc).versionName(versionName).description(description)
                .originalName(original).storedName(storedName).filePath(path)
                .mimeType(mime).sizeBytes((long) bytes.length).hash(hash).extractedText(text)
                .build());
        return DocumentVersionResponse.from(v);
    }

    public DownloadFile download(Long userId, Long versionId) {
        DocumentVersion v = findOwnedVersion(userId, versionId);
        try {
            byte[] data = Files.readAllBytes(Paths.get(v.getFilePath()));
            return new DownloadFile(v.getOriginalName(), v.getMimeType(), data);
        } catch (IOException e) { throw new CustomException(ErrorCode.FILE_PROCESS_FAILED); }
    }

    @Transactional
    public void deleteVersion(Long userId, Long versionId) { findOwnedVersion(userId, versionId).delete(); }

    @Transactional
    public void linkToApplication(Long userId, Long applicationId, Long versionId) {
        Application app = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new CustomException(ErrorCode.APPLICATION_NOT_FOUND));
        if (!app.getUser().getId().equals(userId)) throw new CustomException(ErrorCode.APPLICATION_NOT_FOUND);
        DocumentVersion v = findOwnedVersion(userId, versionId);
        if (applicationDocumentRepository.existsByApplicationIdAndVersion(app.getId(), v)) return;
        applicationDocumentRepository.save(ApplicationDocument.builder().application(app).version(v).build());
    }

    @Transactional
    public void unlinkFromApplication(Long userId, Long applicationId, Long versionId) {
        Application app = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new CustomException(ErrorCode.APPLICATION_NOT_FOUND));
        if (!app.getUser().getId().equals(userId)) throw new CustomException(ErrorCode.APPLICATION_NOT_FOUND);
        ApplicationDocument link = applicationDocumentRepository
                .findByApplicationIdAndVersionId(app.getId(), versionId)
                .orElseThrow(() -> new CustomException(ErrorCode.DOCUMENT_NOT_FOUND));
        applicationDocumentRepository.delete(link);
    }

    private Document findOwnedDocument(Long userId, Long documentId) {
        User user = userRepository.getReferenceById(userId);
        return documentRepository.findByIdAndUser(documentId, user)
                .orElseThrow(() -> new CustomException(ErrorCode.DOCUMENT_NOT_FOUND));
    }

    private DocumentVersion findOwnedVersion(Long userId, Long versionId) {
        DocumentVersion v = versionRepository.findById(versionId)
                .orElseThrow(() -> new CustomException(ErrorCode.DOCUMENT_NOT_FOUND));
        if (!v.getDocument().getUser().getId().equals(userId))
            throw new CustomException(ErrorCode.DOCUMENT_NOT_FOUND);
        return v;
    }

    private String sha256(byte[] bytes) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes)); }
        catch (Exception e) { return null; }
    }

    public record DocumentResponse(Long documentId, String documentType, String title) {}
    public record DownloadFile(String fileName, String mimeType, byte[] data) {}
}
