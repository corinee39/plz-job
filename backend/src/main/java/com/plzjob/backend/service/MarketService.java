package com.plzjob.backend.service;

import com.plzjob.backend.dto.response.*;
import com.plzjob.backend.entity.AnalyticsStackTrend;
import com.plzjob.backend.entity.Application;
import com.plzjob.backend.entity.User;
import com.plzjob.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.*;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MarketService {

    private final AnalyticsStackTrendRepository stackRepo;
    private final AnalyticsRegionJobRepository regionRepo;
    private final ApplicationRepository applicationRepository;
    private final UserRepository userRepository;

    public String latestBaseDate() {
        return stackRepo.findFirstByOrderByBaseMonthDesc()
                .map(AnalyticsStackTrend::getBaseMonth)
                .orElse(YearMonth.now().toString());
    }

    public StackTrendResponse stackTrends(LocalDate from, LocalDate to, String position, String region) {
        String base = latestBaseDate();
        String posFilter = (position == null) ? "ALL" : position;
        var items = stackRepo.findByBaseMonth(base).stream()
                .filter(s -> posFilter.equals(s.getPosition()))
                .map(s -> new StackTrendResponse.Item(s.getStackName(), s.getPostingCount(), s.getRatio()))
                .sorted(Comparator.comparingLong(StackTrendResponse.Item::postingCount).reversed())
                .toList();
        return new StackTrendResponse(base, items);
    }

    public RegionDistributionResponse regionDistribution(LocalDate from, LocalDate to, String position) {
        String base = latestBaseDate();
        var items = regionRepo.findByBaseMonthAndSigungu(base, "ALL").stream()
                .map(r -> new RegionDistributionResponse.Item(r.getRegion(), r.getPostingCount()))
                .sorted(Comparator.comparingLong(RegionDistributionResponse.Item::postingCount).reversed())
                .toList();
        return new RegionDistributionResponse(base, items);
    }

    public UserComparisonResponse userComparison(Long userId, LocalDate from, LocalDate to) {
        String base = latestBaseDate();
        Map<String, Double> market = new HashMap<>();
        for (AnalyticsStackTrend s : stackRepo.findByBaseMonth(base)) {
            market.put(s.getStackName(), s.getRatio());
        }

        User user = userRepository.getReferenceById(userId);
        Map<String, Long> mine = new HashMap<>();
        long total = 0;
        for (Application a : applicationRepository.findByUser(user)) {
            for (String stack : a.getJobPosting().getTechStacks()) {
                mine.merge(stack, 1L, Long::sum);
                total++;
            }
        }
        long mineTotal = total;

        Set<String> keys = new LinkedHashSet<>(market.keySet());
        keys.addAll(mine.keySet());
        List<UserComparisonResponse.Item> items = keys.stream().map(k -> {
            double userRatio = mineTotal == 0 ? 0.0
                    : Math.round(mine.getOrDefault(k, 0L) * 1000.0 / mineTotal) / 10.0;
            double marketRatio = market.getOrDefault(k, 0.0);
            return new UserComparisonResponse.Item(k, userRatio, marketRatio,
                    Math.round((userRatio - marketRatio) * 10) / 10.0);
        }).toList();
        return new UserComparisonResponse(base, items);
    }
}
