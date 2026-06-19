package com.plzjob.backend.client;

import com.plzjob.backend.exception.CustomException;
import com.plzjob.backend.exception.ErrorCode;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.springframework.stereotype.Component;
import java.net.InetAddress;
import java.net.URI;
import java.util.ArrayList;
import java.util.List;

@Component
public class JobPostingPreviewClient {

    public PreviewResult parse(String rawUrl) {
        URI uri = validate(rawUrl);
        Document doc;
        try {
            doc = Jsoup.connect(uri.toString()).userAgent("Mozilla/5.0").timeout(5000).get();
        } catch (Exception e) {
            throw new CustomException(ErrorCode.CRAWL_FETCH_FAILED);
        }
        List<String> missing = new ArrayList<>();
        String title = firstNonBlank(meta(doc, "og:title"), doc.title());
        String company = meta(doc, "og:site_name");
        if (title == null) missing.add("title");
        if (company == null) missing.add("companyName");
        String status = (title != null && company != null) ? "SUCCESS" : "PARTIAL";
        return new PreviewResult(company, title, meta(doc, "og:description"), uri.toString(), status, missing);
    }

    private URI validate(String rawUrl) {
        URI uri;
        try { uri = URI.create(rawUrl); } catch (Exception e) { throw new CustomException(ErrorCode.INVALID_URL); }
        String scheme = uri.getScheme();
        if (scheme == null || !(scheme.equals("http") || scheme.equals("https")))
            throw new CustomException(ErrorCode.URL_NOT_ALLOWED);
        String host = uri.getHost();
        if (host == null) throw new CustomException(ErrorCode.INVALID_URL);
        try {
            InetAddress addr = InetAddress.getByName(host);
            if (addr.isLoopbackAddress() || addr.isAnyLocalAddress() || addr.isSiteLocalAddress()
                    || addr.isLinkLocalAddress())
                throw new CustomException(ErrorCode.URL_NOT_ALLOWED);
        } catch (java.net.UnknownHostException e) {
            throw new CustomException(ErrorCode.INVALID_URL);
        }
        return uri;
    }

    private String meta(Document doc, String prop) {
        var el = doc.selectFirst("meta[property=" + prop + "]");
        if (el == null) el = doc.selectFirst("meta[name=" + prop + "]");
        return el != null ? el.attr("content") : null;
    }

    private String firstNonBlank(String a, String b) {
        if (a != null && !a.isBlank()) return a;
        return (b != null && !b.isBlank()) ? b : null;
    }

    public record PreviewResult(String companyName, String title, String description,
                                String sourceUrl, String extractStatus, List<String> missingFields) {}
}
