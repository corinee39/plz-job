package com.plzjob.backend.entity;

import com.plzjob.backend.common.StringListConverter;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.SQLRestriction;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "USERS",
       uniqueConstraints = @UniqueConstraint(name = "uq_user_social", columnNames = {"provider", "provider_user_id"}))
@SQLRestriction("deleted_at IS NULL")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class User extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "user_seq")
    @SequenceGenerator(name = "user_seq", sequenceName = "SEQ_USERS", allocationSize = 50)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AuthProvider provider;

    @Column(name = "provider_user_id", nullable = false, length = 100)
    private String providerUserId;

    @Column(length = 100)
    private String email;

    @Column(nullable = false, length = 50)
    private String nickname;

    @Column(name = "desired_position", length = 100)
    private String desiredPosition;

    @Column(name = "desired_region", length = 100)
    private String desiredRegion;

    @Convert(converter = StringListConverter.class)
    @Column(name = "tech_stacks", length = 1000)
    private List<String> techStacks = new ArrayList<>();

    @Builder
    public User(AuthProvider provider, String providerUserId, String email, String nickname) {
        this.provider = provider;
        this.providerUserId = providerUserId;
        this.email = email;
        this.nickname = nickname;
    }

    public void updateProfile(String nickname, String desiredPosition, String desiredRegion, List<String> techStacks) {
        if (nickname != null) this.nickname = nickname;
        if (desiredPosition != null) this.desiredPosition = desiredPosition;
        if (desiredRegion != null) this.desiredRegion = desiredRegion;
        if (techStacks != null) this.techStacks = techStacks;
    }
}