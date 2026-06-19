package com.plzjob.backend.client;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.stereotype.Component;
import java.nio.charset.StandardCharsets;

@Component
public class DocumentTextExtractor {
    public String extract(String fileName, byte[] bytes) {
        try {
            String lower = fileName.toLowerCase();
            if (lower.endsWith(".pdf")) {
                try (PDDocument doc = Loader.loadPDF(bytes)) { return new PDFTextStripper().getText(doc).strip(); }
            }
            if (lower.endsWith(".txt")) return new String(bytes, StandardCharsets.UTF_8).strip();
            return "";
        } catch (Exception e) { return ""; }
    }
}
