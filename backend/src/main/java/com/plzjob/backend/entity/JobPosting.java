package com.plzjob.backend.entity;

import com.plzjob.backend.common.StringListConverter;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.SQLRestriction;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "JOB_POSTINGS")
@SQLRestriction("deleted_at IS NULL")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class JobPosting extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "job_posting_seq")
    @SequenceGenerator(name = "job_posting_seq", sequenceName = "SEQ_JOB_POSTINGS", allocationSize = 50)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "company_name", nullable = false, length = 100)
    private String companyName;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(length = 1000)
    private String url;

    @Column(length = 100)
    private String position;

    @Column(length = 100)
    private String region;

    @Column(name = "start_date")
    private LocalDate startDate;

    private LocalDate deadline;

    @Convert(converter = StringListConverter.class)
    @Column(name = "tech_stacks", length = 1000)
    private List<String> techStacks = new ArrayList<>();

    @Lob
    private String description;

    @Column(nullable = false)
    private boolean favorite = false;

    @Builder
    public JobPosting(User user, String companyName, String title, String url, String position,
                      String region, LocalDate startDate, LocalDate deadline,
                      List<String> techStacks, String description) {
        this.user = user;
        this.companyName = companyName;
        this.title = title;
        this.url = url;
        this.position = position;
        this.region = region;
        this.startDate = startDate;
        this.deadline = deadline;
        if (techStacks != null) this.techStacks = techStacks;
        this.description = description;
    }

    public void update(String companyName, String title, String position, String region,
                       LocalDate startDate, LocalDate deadline, List<String> techStacks, String description) {
        if (companyName != null) this.companyName = companyName;
        if (title != null) this.title = title;
        if (position != null) this.position = position;
        if (region != null) this.region = region;
        if (startDate != null) this.startDate = startDate;
        if (deadline != null) this.deadline = deadline;
        if (techStacks != null) this.techStacks = techStacks;
        if (description != null) this.description = description;
    }

    public void toggleFavorite(boolean favorite) { this.favorite = favorite; }
}