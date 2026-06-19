package com.plzjob.backend.service;

import com.plzjob.backend.dto.request.StageChangeRequest;
import com.plzjob.backend.dto.response.StageHistoryItem;
import com.plzjob.backend.entity.Application;
import com.plzjob.backend.entity.ApplicationStageHistory;
import com.plzjob.backend.exception.CustomException;
import com.plzjob.backend.exception.ErrorCode;
import com.plzjob.backend.repository.ApplicationRepository;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ApplicationService {

    private final ApplicationRepository applicationRepository;
    private final EntityManager entityManager;

    @Transactional
    public StageHistoryItem changeStage(Long userId, Long applicationId, StageChangeRequest req) {
        Application app = findOwned(userId, applicationId);
        ApplicationStageHistory history = app.changeStage(req.getToStage(), req.getMemo());
        entityManager.flush();
        return StageHistoryItem.from(history);
    }

    public List<StageHistoryItem> getStageHistories(Long userId, Long applicationId) {
        Application app = findOwned(userId, applicationId);
        return app.getHistories().stream().map(StageHistoryItem::from).toList();
    }

    private Application findOwned(Long userId, Long applicationId) {
        Application app = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new CustomException(ErrorCode.APPLICATION_NOT_FOUND));
        if (!app.getUser().getId().equals(userId)) throw new CustomException(ErrorCode.APPLICATION_NOT_FOUND);
        return app;
    }
}
