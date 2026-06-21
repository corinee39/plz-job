package com.plzjob.backend.client;

import com.plzjob.backend.exception.CustomException;
import com.plzjob.backend.exception.ErrorCode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import java.util.Map;

@Component
public class LlmClient {

    private final RestClient rest = RestClient.create();

    @Value("${llm.base-url}") private String baseUrl;
    @Value("${llm.model}")    private String model;

    @SuppressWarnings("unchecked")
    public String generateJson(String prompt) {
        try {
            Map<String, Object> res = rest.post().uri(baseUrl + "/api/generate")
                    .body(Map.of("model", model, "prompt", prompt, "stream", false, "format", "json"))
                    .retrieve().body(Map.class);
            return res != null ? String.valueOf(res.get("response")) : "";
        } catch (Exception e) {
            throw new CustomException(ErrorCode.LLM_UNAVAILABLE);
        }
    }

    public boolean isUp() {
        try {
            rest.get().uri(baseUrl + "/api/tags").retrieve().toBodilessEntity();
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    public String model() { return model; }
}
