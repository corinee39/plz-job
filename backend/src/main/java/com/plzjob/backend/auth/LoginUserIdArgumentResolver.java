package com.plzjob.backend.auth;

import com.plzjob.backend.exception.CustomException;
import com.plzjob.backend.exception.ErrorCode;
import org.springframework.core.MethodParameter;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.*;

@Component
public class LoginUserIdArgumentResolver implements HandlerMethodArgumentResolver {

    @Override
    public boolean supportsParameter(MethodParameter p) {
        return p.hasParameterAnnotation(LoginUserId.class) && p.getParameterType().equals(Long.class);
    }

    @Override
    public Object resolveArgument(MethodParameter p, ModelAndViewContainer m,
                                  NativeWebRequest req, WebDataBinderFactory b) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof Long userId))
            throw new CustomException(ErrorCode.UNAUTHORIZED);
        return userId;
    }
}
