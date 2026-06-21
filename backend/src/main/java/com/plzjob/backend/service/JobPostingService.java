package com.plzjob.backend.service;

import com.plzjob.backend.client.JobPostingPreviewClient;
import com.plzjob.backend.dto.request.JobPostingCreateRequest;
import com.plzjob.backend.dto.request.JobPostingUpdateRequest;
import com.plzjob.backend.dto.response.JobPostingCreateResponse;
import com.plzjob.backend.dto.response.JobPostingDetailResponse;
import com.plzjob.backend.dto.response.JobPostingListItem;
import com.plzjob.backend.entity.*;
import com.plzjob.backend.exception.CustomException;
import com.plzjob.backend.exception.ErrorCode;
import com.plzjob.backend.repository.ApplicationDocumentRepository;
import com.plzjob.backend.repository.ApplicationRepository;
import com.plzjob.backend.repository.JobPostingRepository;
import com.plzjob.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class JobPostingService {

    private final JobPostingPreviewClient previewClient;
    private final JobPostingRepository jobPostingRepository;
    private final ApplicationRepository applicationRepository;
    private final ApplicationDocumentRepository applicationDocumentRepository;
    private final UserRepository userRepository;

    public JobPostingPreviewClient.PreviewResult preview(String url) {
        return previewClient.parse(url);
    }

    @Transactional
    public JobPostingCreateResponse create(Long userId, JobPostingCreateRequest req) {
        User user = userRepository.getReferenceById(userId);

        if (req.getUrl() != null && !req.isConfirmDuplicate()
                && jobPostingRepository.existsByUserAndUrl(user, req.getUrl())) {
            throw new CustomException(ErrorCode.DUPLICATE_JOB_URL);
        }

        JobPosting posting = jobPostingRepository.save(JobPosting.builder()
                .user(user).companyName(req.getCompanyName()).title(req.getTitle()).url(req.getUrl())
                .position(req.getPosition()).region(req.getRegion())
                .startDate(req.getStartDate()).deadline(req.getDeadline())
                .techStacks(req.getTechStacks()).description(req.getDescription())
                .build());

        Application app = applicationRepository.save(Application.builder()
                .jobPosting(posting).user(user).initialStage(req.getInitialStage())
                .appliedAt(req.getAppliedAt() != null ? req.getAppliedAt().atStartOfDay() : null)
                .build());

        return JobPostingCreateResponse.builder()
                .jobPostingId(posting.getId()).applicationId(app.getId())
                .companyName(posting.getCompanyName()).title(posting.getTitle())
                .currentStage(app.getCurrentStage().name())
                .build();
    }

    public Page<JobPostingListItem> list(Long userId, ApplicationStage stage, Pageable pageable) {
        User user = userRepository.getReferenceById(userId);
        Page<Application> page = (stage != null)
                ? applicationRepository.findByUserAndCurrentStage(user, stage, pageable)
                : applicationRepository.findByUser(user, pageable);
        return page.map(JobPostingListItem::from);
    }

    public JobPostingDetailResponse getDetail(Long userId, Long jobPostingId) {
        Application app = findOwnedApplication(userId, jobPostingId);
        return JobPostingDetailResponse.from(app, applicationDocumentRepository.findByApplicationId(app.getId()));
    }

    @Transactional
    public JobPostingDetailResponse update(Long userId, Long jobPostingId, JobPostingUpdateRequest req) {
        Application app = findOwnedApplication(userId, jobPostingId);
        JobPosting p = app.getJobPosting();
        p.update(req.getCompanyName(), req.getTitle(), req.getPosition(), req.getRegion(),
                req.getDeadline(), req.getTechStacks(), req.getDescription());
        app.updateAppliedAt(req.getAppliedAt() != null ? req.getAppliedAt().atStartOfDay() : null);
        if (req.getFavorite() != null) p.toggleFavorite(req.getFavorite());
        return JobPostingDetailResponse.from(app, submittedDocuments(app.getId()));
    }

    @Transactional
    public void delete(Long userId, Long jobPostingId) {
        Application app = findOwnedApplication(userId, jobPostingId);
        app.delete();
        app.getJobPosting().delete();
    }

    private Application findOwnedApplication(Long userId, Long jobPostingId) {
        User user = userRepository.getReferenceById(userId);
        JobPosting posting = jobPostingRepository.findByIdAndUser(jobPostingId, user)
                .orElseThrow(() -> new CustomException(ErrorCode.JOB_POSTING_NOT_FOUND));
        return applicationRepository.findByJobPostingId(posting.getId())
                .orElseThrow(() -> new CustomException(ErrorCode.APPLICATION_NOT_FOUND));
    }
}
