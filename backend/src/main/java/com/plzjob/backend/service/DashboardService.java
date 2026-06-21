package com.plzjob.backend.service;

import com.plzjob.backend.dto.response.*;
import com.plzjob.backend.entity.*;
import com.plzjob.backend.repository.ApplicationRepository;
import com.plzjob.backend.repository.RecruitmentScheduleRepository;
import com.plzjob.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.*;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DashboardService {

    private final ApplicationRepository applicationRepository;
    private final RecruitmentScheduleRepository scheduleRepository;
    private final UserRepository userRepository;
    private final MarketService marketService;

    public SummaryResponse summary(Long userId, LocalDate from, LocalDate to) {
        List<Application> apps = myApps(userId, from, to);
        YearMonth thisMonth = YearMonth.now();
        long thisMonthApplied = apps.stream()
                .filter(a -> a.getAppliedAt() != null && YearMonth.from(a.getAppliedAt()).equals(thisMonth))
                .count();
        long inProgress = apps.stream().filter(a -> a.getFinalResult() == FinalResult.IN_PROGRESS).count();
        long finalPass = apps.stream().filter(a -> a.getFinalResult() == FinalResult.FINAL_PASS).count();
        long upcoming = scheduleRepository.countByApplication_User_IdAndStartAtAfter(userId, LocalDateTime.now());
        long finalConfirmed = apps.stream().filter(a -> a.getFinalResult() != FinalResult.IN_PROGRESS).count();
        Double overall = rate(finalPass, finalConfirmed);
        return new SummaryResponse(thisMonthApplied, inProgress, upcoming, finalPass, overall,
                apps.size(), marketService.latestBaseDate());
    }

    public MonthlyResponse monthlyApplications(Long userId, LocalDate from, LocalDate to) {
        Map<String, Long> byMonth = myApps(userId, from, to).stream()
                .filter(a -> a.getAppliedAt() != null)
                .collect(Collectors.groupingBy(
                        a -> YearMonth.from(a.getAppliedAt()).toString(),
                        TreeMap::new, Collectors.counting()));
        return new MonthlyResponse(byMonth.entrySet().stream()
                .map(e -> new MonthlyResponse.Item(e.getKey(), e.getValue())).toList());
    }

    public StageConversionResponse stageConversions(Long userId, LocalDate from, LocalDate to) {
        List<Set<ApplicationStage>> reachedSets = myApps(userId, from, to).stream()
                .map(a -> a.getHistories().stream()
                        .map(ApplicationStageHistory::getToStage)
                        .collect(Collectors.toSet()))
                .toList();

        long applied = count(reachedSets, ApplicationStage.APPLIED,
                ApplicationStage.DOCUMENT_PASS, ApplicationStage.DOCUMENT_FAIL);

        List<StageConversionResponse.Stage> stages = new ArrayList<>();
        stages.add(new StageConversionResponse.Stage("APPLIED", applied, null, null));
        stages.add(stage("DOCUMENT", reachedSets,
                Set.of(ApplicationStage.DOCUMENT_PASS, ApplicationStage.DOCUMENT_FAIL),
                ApplicationStage.DOCUMENT_PASS));
        stages.add(stage("CODING_TEST", reachedSets,
                Set.of(ApplicationStage.CODING_PASS, ApplicationStage.CODING_FAIL),
                ApplicationStage.CODING_PASS));
        stages.add(stage("INTERVIEW", reachedSets,
                Set.of(ApplicationStage.INTERVIEW_PASS, ApplicationStage.INTERVIEW_FAIL),
                ApplicationStage.INTERVIEW_PASS));
        stages.add(stage("FINAL", reachedSets,
                Set.of(ApplicationStage.FINAL_PASS, ApplicationStage.DOCUMENT_FAIL,
                        ApplicationStage.CODING_FAIL, ApplicationStage.INTERVIEW_FAIL),
                ApplicationStage.FINAL_PASS));
        return new StageConversionResponse(stages);
    }

    private StageConversionResponse.Stage stage(String name, List<Set<ApplicationStage>> sets,
                                                 Set<ApplicationStage> confirmed, ApplicationStage pass) {
        long denom = sets.stream().filter(s -> s.stream().anyMatch(confirmed::contains)).count();
        long passed = sets.stream().filter(s -> s.contains(pass)).count();
        return new StageConversionResponse.Stage(name, denom, passed, rate(passed, denom));
    }

    private long count(List<Set<ApplicationStage>> sets, ApplicationStage... any) {
        Set<ApplicationStage> target = Set.of(any);
        return sets.stream().filter(s -> s.stream().anyMatch(target::contains)).count();
    }

    private Double rate(long part, long whole) {
        return whole == 0 ? null : Math.round(part * 1000.0 / whole) / 10.0;
    }

    private List<Application> myApps(Long userId, LocalDate from, LocalDate to) {
        User user = userRepository.getReferenceById(userId);
        List<Application> apps = applicationRepository.findByUser(user);
        if (from == null || to == null) return apps;
        return apps.stream()
                .filter(a -> a.getAppliedAt() != null
                        && !a.getAppliedAt().toLocalDate().isBefore(from)
                        && !a.getAppliedAt().toLocalDate().isAfter(to))
                .toList();
    }
}
