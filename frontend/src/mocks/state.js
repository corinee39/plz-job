// 도메인 간 공유되는 목 저장소
// jobPostings ↔ schedules(공고명 조회), jobPostings ↔ documents(제출 문서 연결)에서 모두 참조

export const mockJobPostings = [
  {
    jobPostingId: 1,
    companyName: "테크노바",
    title: "백엔드 개발자",
    region: "서울",
    position: "백엔드",
    deadline: "2026-07-01",
    url: "https://example.com/job/1",
    currentStage: "APPLIED",
  },
  {
    jobPostingId: 2,
    companyName: "데이터웍스",
    title: "프론트엔드 개발자",
    region: "경기",
    position: "프론트엔드",
    deadline: "2026-06-30",
    url: "https://example.com/job/2",
    currentStage: "DOCUMENT_PASS",
  },
];

// applicationId → [{ versionId, documentTitle, versionName }]
export const mockSubmittedDocs = {};
