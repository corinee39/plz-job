import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { getCurrentUser, logout } from "./api";
import { useAuthStore } from "../../store/authStore";

export function useCurrentUser() {
  return useQuery({
    queryKey: ["currentUser"],
    queryFn: getCurrentUser,
    retry: false,
    staleTime: 5 * 60 * 1000,
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
