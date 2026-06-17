import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { getCurrentUser, logout, updateProfile } from "./api";
import { useAuthStore } from "../../store/authStore";

export function useCurrentUser() {
  return useQuery({
    queryKey: ["currentUser"],
    queryFn: getCurrentUser,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);

  return useMutation({
    mutationFn: updateProfile,
    onSuccess: (updatedUser) => {
      // 서버가 돌려준 최신 프로필로 캐시·전역 상태를 즉시 갱신한다.
      queryClient.setQueryData(["currentUser"], updatedUser);
      setUser(updatedUser);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const clearUser = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  return useMutation({
    mutationFn: logout,
    onSettled: () => {
      clearUser();
      queryClient.clear();
      navigate("/login", { replace: true });
    },
  });
}
