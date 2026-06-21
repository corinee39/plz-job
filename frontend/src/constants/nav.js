// 사이드바 메뉴 ↔ UI-01~10 매핑 (프론트엔드_뼈대_플랜.md §3 기준)
// children 이 있으면 드롭다운(하위 메뉴)으로 렌더된다.
export const navItems = [
  {
    label: "대시보드",
    to: "/dashboard",
    children: [
      { label: "지원 현황", to: "/dashboard" },
      { label: "시장 데이터", to: "/dashboard/market" },
    ],
  },
  { label: "공고 목록", to: "/job-postings" },
  { label: "지원 보드", to: "/board" },
  { label: "서류 관리", to: "/documents" },
  { label: "일정", to: "/schedules" },
  { label: "프로필", to: "/profile" },
];
