package com.plzjob.backend.service;

import com.plzjob.backend.dto.request.ScheduleRequest;
import com.plzjob.backend.dto.response.ScheduleResponse;
import com.plzjob.backend.entity.Application;
import com.plzjob.backend.entity.RecruitmentSchedule;
import com.plzjob.backend.exception.CustomException;
import com.plzjob.backend.exception.ErrorCode;
import com.plzjob.backend.repository.ApplicationRepository;
import com.plzjob.backend.repository.RecruitmentScheduleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ScheduleService {

    private final RecruitmentScheduleRepository scheduleRepository;
    private final ApplicationRepository applicationRepository;

    @Transactional
    public ScheduleResponse create(Long userId, Long applicationId, ScheduleRequest req) {
        Application app = ownedApp(userId, applicationId);
        RecruitmentSchedule s = scheduleRepository.save(RecruitmentSchedule.builder()
                .application(app).scheduleType(req.getScheduleType())
                .startAt(req.getStartAt()).memo(req.getMemo()).build());
        return ScheduleResponse.from(s);
    }

    public List<ScheduleResponse> list(Long userId, LocalDate from, LocalDate to) {
        return scheduleRepository
                .findByApplication_User_IdAndStartAtBetweenOrderByStartAt(
                        userId, from.atStartOfDay(), to.atTime(23, 59, 59))
                .stream().map(ScheduleResponse::from).toList();
    }

    @Transactional
    public ScheduleResponse update(Long userId, Long scheduleId, ScheduleRequest req) {
        RecruitmentSchedule s = ownedSchedule(userId, scheduleId);
        s.update(req.getScheduleType(), req.getStartAt(), req.getMemo());
        return ScheduleResponse.from(s);
    }

    @Transactional
    public void delete(Long userId, Long scheduleId) {
        ownedSchedule(userId, scheduleId).delete();
    }

    private Application ownedApp(Long userId, Long applicationId) {
        Application app = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new CustomException(ErrorCode.APPLICATION_NOT_FOUND));
        if (!app.getUser().getId().equals(userId)) throw new CustomException(ErrorCode.APPLICATION_NOT_FOUND);
        return app;
    }

    private RecruitmentSchedule ownedSchedule(Long userId, Long scheduleId) {
        RecruitmentSchedule s = scheduleRepository.findById(scheduleId)
                .orElseThrow(() -> new CustomException(ErrorCode.SCHEDULE_NOT_FOUND));
        if (!s.getApplication().getUser().getId().equals(userId))
            throw new CustomException(ErrorCode.SCHEDULE_NOT_FOUND);
        return s;
    }
}
