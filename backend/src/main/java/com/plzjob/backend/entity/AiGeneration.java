package com.plzjob.backend.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "AI_GENERATIONS")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AiGeneration extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "ai_generation_seq")
    @SequenceGenerator(name = "ai_generation_seq", sequenceName = "SEQ_AI_GENERATIONS", allocationSize = 50)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "application_id")
    private Application application;

    @Enumerated(EnumType.STRING)
    @Column(name = "generation_type", nullable = false, length = 30)
    private AiGenerationType generationType;

    @Column(name = "input_hash", length = 64)
    private String inputHash;

    @Lob
    @Column(name = "response_json", nullable = false)
    private String responseJson;

    @Builder
    public AiGeneration(User user, Application application, AiGenerationType generationType,
                        String inputHash, String responseJson) {
        this.user = user;
        this.application = application;
        this.generationType = generationType;
        this.inputHash = inputHash;
        this.responseJson = responseJson;
    }
}
