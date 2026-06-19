package com.plzjob.backend.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.plzjob.backend.exception.CustomException;
import com.plzjob.backend.exception.ErrorCode;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.springframework.stereotype.Component;

import java.net.InetAddress;
import java.net.URI;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 사람인·잡코리아 공고 URL을 받아 공개 메타데이터를 파싱해 JobPosting 자동 입력값을 만든다.
 * (요구사항 JOB-01~04, CRAWL-01~07)
 *
 * <p>추출 우선순위: ① schema.org JobPosting JSON-LD → ② OpenGraph 메타 → ③ 한글 라벨(마감/지역) 스캔
 * → ④ 제목·본문 키워드 휴리스틱(직무·기술스택). 단일 URL·서버측 1회 fetch이며 대규모 크롤링이 아니다.
 * 도메인 허용목록 + SSRF 가드를 적용한다.
 *
 * <p>※ 사이트 마크업은 바뀔 수 있어 ②③ 선택자는 best-effort다. 추출 실패 필드는 missingFields로 알리고
 * 사용자가 수동 입력으로 보정한다(CRAWL-04). 가장 안정적인 ① JSON-LD를 1순위로 둔다.
 */
@Component
public class JobPostingPreviewClient {

    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final int TIMEOUT_MS = 5000;
    private static final int DESC_MAX = 4000;
    private static final String UA =
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
            + "(KHTML, like Gecko) Chrome/124.0 Safari/537.36";

    /** 자동 수집 허용 도메인(공개 공고 페이지). 그 외는 수동 입력 안내(CRAWL-05). */
    private static final List<String> ALLOWED_DOMAINS = List.of("saramin.co.kr", "jobkorea.co.kr");

    private static final Pattern DATE = Pattern.compile("(20\\d{2})[.\\-/](\\d{1,2})[.\\-/](\\d{1,2})");
    private static final Pattern BRACKET = Pattern.compile("^\\s*\\[([^\\]]+)\\]");           // og:title의 "[회사명]"
    private static final Pattern D_DAY = Pattern.compile("\\s*\\(D-\\d+\\)");                  // "(D-23)"
    private static final Pattern SITE_SUFFIX =
            Pattern.compile("\\s*[-|]\\s*(사람인|잡코리아|saramin|jobkorea)\\s*$", Pattern.CASE_INSENSITIVE);
    private static final Pattern DESC_DEADLINE =
            Pattern.compile("마감일\\s*[:：]\\s*(\\d{4}[.\\-/]\\d{1,2}[.\\-/]\\d{1,2})");
    private static final Map<String, String> STACKS = stackDict();        // 키워드(lower) → 표준 스택명
    private static final Map<String, String> POSITIONS = positionDict();  // 키워드(lower) → 표준 직무

    public PreviewResult parse(String rawUrl) {
        URI uri = validate(rawUrl);
        String url = uri.toString();
        Document doc;
        try {
            doc = Jsoup.connect(url).userAgent(UA).timeout(TIMEOUT_MS).get();
        } catch (Exception e) {
            throw new CustomException(ErrorCode.CRAWL_FETCH_FAILED);
        }
        return extract(doc, url);
    }

    /** 파싱 본체(네트워크 분리) — HTML 픽스처로 단위 테스트 가능하도록 package-private. */
    PreviewResult extract(Document doc, String url) {
        JsonNode ld = findJobPostingLd(doc);                              // ① JSON-LD(있으면 가장 안정적)
        String ogTitle = meta(doc, "og:title");
        String ogDesc = meta(doc, "og:description");

        // 렌더된 DOM(헤드리스/AJAX HTML)이면 사람인 본문 선택자로 더 정확히 추출.
        // ※ 정적 fetch(Jsoup, JS 미실행)엔 이 요소들이 없어 null → 아래 OG 메타로 폴백한다.
        // 우선순위: DOM 선택자 → JSON-LD → OG 메타. 사람인은 JSON-LD 없이 og:title="[회사] 제목(D-NN) - 사람인",
        // og:description에 "마감일:YYYY-MM-DD". og:site_name은 포털명("사람인")이라 회사로 쓰지 않음.
        String title = cleanTitle(firstNonBlank(
                textOf(doc.selectFirst("h1.tit_job")), text(ld, "title"), ogTitle, doc.title()));
        String company = firstNonBlank(
                textOf(doc.selectFirst(".jv_header a.company")), ldCompany(ld),
                bracketPrefix(ogTitle), labelValue(doc, "회사", "기업"));
        String description = cleanDesc(firstNonBlank(
                freeformText(doc), text(ld, "description"), ogDesc));
        LocalDate startDate = parseDate(text(ld, "datePosted"));
        LocalDate deadline = firstNonNull(parseDate(text(ld, "validThrough")),
                parseDate(descDeadline(ogDesc)),
                parseDate(labelValue(doc, "마감", "접수마감")));
        String region = firstNonBlank(ldRegion(ld), labelValue(doc, "근무지역", "근무지", "지역"));

        String haystack = nullToEmpty(title) + " " + nullToEmpty(description);
        List<String> techStacks = extractStacks(haystack);               // ④ 키워드 휴리스틱
        String position = classifyPosition(haystack);

        List<String> missing = new ArrayList<>();
        if (isBlank(title)) missing.add("title");
        if (isBlank(company)) missing.add("companyName");
        if (isBlank(region)) missing.add("region");
        if (deadline == null) missing.add("deadline");
        if (isBlank(position)) missing.add("position");
        if (techStacks.isEmpty()) missing.add("techStacks");

        String status = (!isBlank(title) && !isBlank(company)) ? "SUCCESS" : "PARTIAL";
        return new PreviewResult(company, title, position, region, startDate, deadline,
                techStacks, description, url, status, missing);
    }

    // ── URL 검증(스킴 + 도메인 허용목록 + SSRF) ──────────────────────────────────
    private URI validate(String rawUrl) {
        URI uri;
        try { uri = URI.create(rawUrl.trim()); } catch (Exception e) { throw new CustomException(ErrorCode.INVALID_URL); }
        String scheme = uri.getScheme();
        if (scheme == null || !(scheme.equals("http") || scheme.equals("https")))
            throw new CustomException(ErrorCode.URL_NOT_ALLOWED);
        String host = uri.getHost();
        if (host == null) throw new CustomException(ErrorCode.INVALID_URL);
        host = host.toLowerCase();
        if (!isAllowedHost(host))                                         // 허용 도메인 외 → 수동 입력 안내(CRAWL-05)
            throw new CustomException(ErrorCode.CRAWL_BLOCKED);
        try {
            InetAddress addr = InetAddress.getByName(host);               // SSRF: 사설/내부망 차단(CRAWL-06)
            if (addr.isLoopbackAddress() || addr.isAnyLocalAddress()
                    || addr.isSiteLocalAddress() || addr.isLinkLocalAddress())
                throw new CustomException(ErrorCode.URL_NOT_ALLOWED);
        } catch (java.net.UnknownHostException e) {
            throw new CustomException(ErrorCode.INVALID_URL);
        }
        return uri;
    }

    /** host가 허용 도메인이거나 그 하위 도메인일 때만 true. "evilsaramin.co.kr" 같은 접미사 위장 차단. */
    private boolean isAllowedHost(String host) {
        for (String d : ALLOWED_DOMAINS)
            if (host.equals(d) || host.endsWith("." + d)) return true;
        return false;
    }

    // ── ① JSON-LD(schema.org/JobPosting) ───────────────────────────────────────
    private JsonNode findJobPostingLd(Document doc) {
        for (Element s : doc.select("script[type=\"application/ld+json\"]")) {
            try {
                JsonNode found = searchJobPosting(MAPPER.readTree(s.data()));
                if (found != null) return found;
            } catch (Exception ignored) { }
        }
        return null;
    }

    private JsonNode searchJobPosting(JsonNode node) {
        if (node == null) return null;
        if (node.isArray()) {
            for (JsonNode e : node) { JsonNode f = searchJobPosting(e); if (f != null) return f; }
            return null;
        }
        if (node.has("@graph")) { JsonNode f = searchJobPosting(node.get("@graph")); if (f != null) return f; }
        JsonNode type = node.get("@type");
        if (type != null) {
            if (type.isArray()) { for (JsonNode t : type) if ("JobPosting".equals(t.asText())) return node; }
            else if ("JobPosting".equals(type.asText())) return node;
        }
        return null;
    }

    private String ldCompany(JsonNode ld) {
        if (ld == null) return null;
        JsonNode org = ld.get("hiringOrganization");
        if (org == null) return null;
        if (org.isTextual()) return blankToNull(org.asText());
        return optText(org, "name");
    }

    private String ldRegion(JsonNode ld) {
        if (ld == null) return null;
        JsonNode loc = ld.get("jobLocation");
        if (loc != null && loc.isArray() && loc.size() > 0) loc = loc.get(0);
        if (loc == null) return null;
        JsonNode addr = loc.get("address");
        if (addr == null) return null;
        String joined = (nullToEmpty(optText(addr, "addressRegion")) + " "
                + nullToEmpty(optText(addr, "addressLocality"))).trim();
        return blankToNull(joined);
    }

    // ── ③ 한글 라벨 스캔(클래스명 변동에 강함) ────────────────────────────────────
    /** dt/th/strong 등 라벨 텍스트에 keyword가 포함되면 인접 형제(dd/td 등)의 값을 반환.
     *  값 노드에 버튼(지도보기 등) 자식이 섞이면 ownText로 직속 텍스트만 취한다. */
    private String labelValue(Document doc, String... keywords) {
        for (Element label : doc.select("dt, th, strong, .tit, .label")) {
            String t = label.text();
            for (String kw : keywords) {
                if (t.contains(kw)) {
                    Element val = label.nextElementSibling();
                    if (val == null) continue;
                    String own = val.ownText();
                    String v = (own != null && !own.isBlank()) ? own : val.text();
                    if (v != null && !v.isBlank()) return v.trim();
                }
            }
        }
        return null;
    }

    private String textOf(Element el) {
        return el != null ? blankToNull(el.text()) : null;
    }

    /** 사람인 .jv_summary의 자격요건·우대사항 freeform 본문을 합쳐 description으로. */
    private String freeformText(Document doc) {
        StringBuilder sb = new StringBuilder();
        for (Element el : doc.select(".jv_summary .freeform")) {
            String t = el.text();
            if (t != null && !t.isBlank()) {
                if (sb.length() > 0) sb.append("\n\n");
                sb.append(t.trim());
            }
        }
        return sb.length() > 0 ? sb.toString() : null;
    }

    // ── 값 추출 유틸 ───────────────────────────────────────────────────────────
    private String meta(Document doc, String prop) {
        Element el = doc.selectFirst("meta[property=\"" + prop + "\"]");
        if (el == null) el = doc.selectFirst("meta[name=\"" + prop + "\"]");
        return el != null ? blankToNull(el.attr("content")) : null;
    }

    /** og:title 앞부분 "[회사명] ..." → 회사명(사람인·잡코리아 공통). 없으면 null. */
    private String bracketPrefix(String s) {
        if (s == null) return null;
        Matcher m = BRACKET.matcher(s);
        return m.find() ? blankToNull(m.group(1)) : null;
    }

    /** "[회사] 제목(D-23) - 사람인" → "제목". 회사 프리픽스·D-day·포털 꼬리 제거. */
    private String cleanTitle(String t) {
        if (t == null) return null;
        String s = BRACKET.matcher(t).replaceFirst("");
        s = D_DAY.matcher(s).replaceFirst("");
        s = SITE_SUFFIX.matcher(s).replaceFirst("");
        return blankToNull(s);
    }

    /** og:description의 "마감일:YYYY-MM-DD" → 날짜 문자열(사람인). 없으면 null. */
    private String descDeadline(String desc) {
        if (desc == null) return null;
        Matcher m = DESC_DEADLINE.matcher(desc);
        return m.find() ? m.group(1) : null;
    }

    private LocalDate parseDate(String s) {
        if (s == null) return null;
        String t = s.trim();
        if (t.length() >= 10) {                                          // ISO: 2026-06-15[T...]
            try { return LocalDate.parse(t.substring(0, 10)); } catch (Exception ignored) { }
        }
        Matcher m = DATE.matcher(t);                                     // 2026.07.15 / 2026-7-5
        if (m.find()) {
            try {
                return LocalDate.of(Integer.parseInt(m.group(1)),
                        Integer.parseInt(m.group(2)), Integer.parseInt(m.group(3)));
            } catch (Exception ignored) { }
        }
        return null;                                                     // 상시채용/채용시 등은 null
    }

    private List<String> extractStacks(String text) {
        if (isBlank(text)) return List.of();
        String lower = text.toLowerCase();
        LinkedHashSet<String> found = new LinkedHashSet<>();
        for (Map.Entry<String, String> e : STACKS.entrySet())
            if (containsWord(lower, e.getKey())) found.add(e.getValue());
        return new ArrayList<>(found);
    }

    /** 경계(영숫자가 아닌 좌우) 매칭 — "digital" 안의 "git" 같은 부분문자열 오탐 방지. */
    private boolean containsWord(String haystackLower, String kw) {
        int from = 0, i;
        while ((i = haystackLower.indexOf(kw, from)) >= 0) {
            char before = i == 0 ? ' ' : haystackLower.charAt(i - 1);
            int end = i + kw.length();
            char after = end >= haystackLower.length() ? ' ' : haystackLower.charAt(end);
            if (!Character.isLetterOrDigit(before) && !Character.isLetterOrDigit(after)) return true;
            from = i + 1;
        }
        return false;
    }

    private String classifyPosition(String text) {
        if (text == null) return null;
        String lower = text.toLowerCase();
        for (Map.Entry<String, String> e : POSITIONS.entrySet())        // 구체적인 키(풀스택)부터 검사
            if (lower.contains(e.getKey())) return e.getValue();
        return null;
    }

    private String cleanDesc(String s) {
        if (s == null) return null;
        String plain = Jsoup.parse(s).text().trim();                    // JSON-LD description의 HTML 제거
        if (plain.isEmpty()) return null;
        return plain.length() > DESC_MAX ? plain.substring(0, DESC_MAX) : plain;
    }

    private String optText(JsonNode node, String field) {
        JsonNode n = node.get(field);
        return n != null ? blankToNull(n.asText()) : null;
    }

    private String text(JsonNode ld, String field) {
        return ld != null ? optText(ld, field) : null;
    }

    private String firstNonBlank(String... vals) {
        for (String v : vals) if (v != null && !v.isBlank()) return v.trim();
        return null;
    }

    @SafeVarargs
    private final <T> T firstNonNull(T... vals) {
        for (T v : vals) if (v != null) return v;
        return null;
    }

    private boolean isBlank(String s) { return s == null || s.isBlank(); }
    private String blankToNull(String s) { return (s == null || s.isBlank()) ? null : s.trim(); }
    private String nullToEmpty(String s) { return s == null ? "" : s; }

    // ── 사전(키워드 → 표준값) ──────────────────────────────────────────────────
    private static Map<String, String> stackDict() {
        Map<String, String> m = new LinkedHashMap<>();
        put(m, "Spring Boot", "spring boot", "springboot");             // 'Spring'보다 먼저(구체적)
        put(m, "Spring", "spring framework", "spring mvc");             // 'spring boot' 흡수 방지: 바닐라 'spring' 미사용
        put(m, "Java", "java");
        put(m, "Kotlin", "kotlin");
        put(m, "Python", "python");
        put(m, "Django", "django");
        put(m, "FastAPI", "fastapi");
        put(m, "Flask", "flask");
        put(m, "JavaScript", "javascript");
        put(m, "TypeScript", "typescript");
        put(m, "React", "react", "react.js", "reactjs");
        put(m, "Next.js", "next.js", "nextjs");
        put(m, "Vue", "vue", "vue.js");
        put(m, "Angular", "angular");
        put(m, "Node.js", "node.js", "nodejs");
        put(m, "Nest.js", "nest.js", "nestjs");
        put(m, "Go", "golang");                                         // 영단어 'go' 오탐 방지로 golang만
        put(m, "C#", "c#", "csharp");
        put(m, ".NET", ".net", "asp.net", "dotnet");
        put(m, "C++", "c++");
        put(m, "PHP", "php");
        put(m, "Swift", "swift");
        put(m, "Flutter", "flutter");
        put(m, "SQL", "sql");
        put(m, "MySQL", "mysql");
        put(m, "PostgreSQL", "postgresql");
        put(m, "Oracle", "oracle");
        put(m, "MongoDB", "mongodb");
        put(m, "Redis", "redis");
        put(m, "Kafka", "kafka");
        put(m, "Elasticsearch", "elasticsearch");
        put(m, "GraphQL", "graphql");
        put(m, "AWS", "aws");
        put(m, "GCP", "gcp");
        put(m, "Azure", "azure");
        put(m, "Docker", "docker");
        put(m, "Kubernetes", "kubernetes", "k8s");
        put(m, "Git", "git");
        put(m, "Spark", "spark");
        put(m, "Hadoop", "hadoop");
        put(m, "TensorFlow", "tensorflow");
        put(m, "PyTorch", "pytorch");
        return m;
    }

    private static Map<String, String> positionDict() {
        Map<String, String> m = new LinkedHashMap<>();                  // 순서 중요: 구체적인 것부터
        put(m, "풀스택", "풀스택", "fullstack", "full stack");
        put(m, "백엔드", "백엔드", "backend", "서버개발", "server developer");
        put(m, "프런트엔드", "프론트엔드", "프런트엔드", "frontend", "front-end", "퍼블리셔");
        put(m, "데이터", "데이터엔지니어", "데이터 엔지니어", "데이터분석", "data engineer");
        put(m, "AI", "머신러닝", "딥러닝", "인공지능", "machine learning");
        put(m, "모바일", "안드로이드", "android", "ios", "모바일 개발");
        put(m, "DevOps", "devops", "데브옵스", "인프라 엔지니어");
        return m;
    }

    private static void put(Map<String, String> m, String canonical, String... keywords) {
        for (String k : keywords) m.put(k, canonical);
    }

    public record PreviewResult(String companyName, String title, String position, String region,
                                LocalDate startDate, LocalDate deadline, List<String> techStacks,
                                String description, String sourceUrl, String extractStatus,
                                List<String> missingFields) {}
}
