package com.plzjob.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.SQLRestriction;

@Entity
@Table(name = "RETROSPECTIVES")
@SQLRestriction("deleted_at IS NULL")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Retrospective extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "retrospective_seq")
    @SequenceGenerator(name = "retrospective_seq", sequenceName = "SEQ_RETROSPECTIVES", allocationSize = 50)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "application_id", nullable = false)
    private Application application;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private RetrospectiveType type;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private Difficulty difficulty;

    @Lob
    @Column(nullable = false)
    private String content;

    @Lob
    private String improvement;

    @Builder
    public Retrospective(Application application, RetrospectiveType type, Difficulty difficulty,
                         String content, String improvement) {
        this.application = application;
        this.type = type;
        this.difficulty = difficulty;
        this.content = content;
        this.improvement = improvement;
    }

    public void update(Difficulty difficulty, String content, String improvement) {
        if (difficulty != null) this.difficulty = difficulty;
        if (content != null) this.content = content;
        if (improvement != null) this.improvement = improvement;
    }
}
