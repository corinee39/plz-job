import {
  LayoutDashboard,
  ClipboardList,
  TrendingUp,
  Briefcase,
  Columns3,
  FileText,
  CalendarDays,
  User,
} from "lucide-react";

// 사이드바 메뉴 ↔ UI-01~10 매핑 (프론트엔드_뼈대_플랜.md §3 기준)
// children 이 있으면 드롭다운(하위 메뉴)으로 렌더된다. icon 은 lucide-react 컴포넌트.
export const navItems = [
  {
    label: "대시보드",
    to: "/dashboard",
    icon: LayoutDashboard,
    children: [
      { label: "지원 현황", to: "/dashboard", icon: ClipboardList },
      { label: "시장 데이터", to: "/dashboard/market", icon: TrendingUp },
    ],
  },
  { label: "공고 목록", to: "/job-postings", icon: Briefcase },
  { label: "지원 보드", to: "/board", icon: Columns3 },
  { label: "서류 관리", to: "/documents", icon: FileText },
  { label: "일정", to: "/schedules", icon: CalendarDays },
  { label: "프로필", to: "/profile", icon: User },
];
