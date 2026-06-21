package com.plzjob.backend.service;

import com.plzjob.backend.dto.request.RetrospectiveRequest;
import com.plzjob.backend.dto.response.RetrospectiveResponse;
import com.plzjob.backend.entity.Application;
import com.plzjob.backend.entity.Retrospective;
import com.plzjob.backend.exception.CustomException;
import com.plzjob.backend.exception.ErrorCode;
import com.plzjob.backend.repository.ApplicationRepository;
import com.plzjob.backend.repository.RetrospectiveRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RetrospectiveService {

    private final RetrospectiveRepository retrospectiveRepository;
    private final ApplicationRepository applicationRepository;

    @Transactional
    public RetrospectiveResponse create(Long userId, Long applicationId, RetrospectiveRequest req) {
        Application app = ownedApp(userId, applicationId);
        Retrospective r = retrospectiveRepository.save(Retrospective.builder()
                .application(app).type(req.getType()).difficulty(req.getDifficulty())
                .content(req.getContent()).improvement(req.getImprovement()).build());
        return RetrospectiveResponse.from(r);
    }

    public List<RetrospectiveResponse> list(Long userId, Long applicationId) {
        ownedApp(userId, applicationId);
        return retrospectiveRepository.findByApplicationId(applicationId).stream()
                .map(RetrospectiveResponse::from).toList();
    }

    @Transactional
    public RetrospectiveResponse update(Long userId, Long retrospectiveId, RetrospectiveRequest req) {
        Retrospective r = owned(userId, retrospectiveId);
        r.update(req.getDifficulty(), req.getContent(), req.getImprovement());
        return RetrospectiveResponse.from(r);
    }

    @Transactional
    public void delete(Long userId, Long retrospectiveId) {
        owned(userId, retrospectiveId).delete();
    }

    private Application ownedApp(Long userId, Long applicationId) {
        Application app = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new CustomException(ErrorCode.APPLICATION_NOT_FOUND));
        if (!app.getUser().getId().equals(userId)) throw new CustomException(ErrorCode.APPLICATION_NOT_FOUND);
        return app;
    }

    private Retrospective owned(Long userId, Long retrospectiveId) {
        Retrospective r = retrospectiveRepository.findById(retrospectiveId)
                .orElseThrow(() -> new CustomException(ErrorCode.RETROSPECTIVE_NOT_FOUND));
        if (!r.getApplication().getUser().getId().equals(userId))
            throw new CustomException(ErrorCode.RETROSPECTIVE_NOT_FOUND);
        return r;
    }
}
