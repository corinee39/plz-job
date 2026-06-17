package com.plzjob.backend.service;

import com.plzjob.backend.dto.request.ProfileUpdateRequest;
import com.plzjob.backend.dto.response.UserProfileResponse;
import com.plzjob.backend.entity.User;
import com.plzjob.backend.exception.CustomException;
import com.plzjob.backend.exception.ErrorCode;
import com.plzjob.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserService {

    private final UserRepository userRepository;

    public UserProfileResponse getMyProfile(Long userId) {
        return UserProfileResponse.from(find(userId));
    }

    @Transactional
    public UserProfileResponse updateProfile(Long userId, ProfileUpdateRequest req) {
        User user = find(userId);
        user.updateProfile(req.getNickname(), req.getDesiredPosition(), req.getDesiredRegion(), req.getTechStacks());
        return UserProfileResponse.from(user);
    }

    private User find(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.UNAUTHORIZED));
    }
}
