package com.eventpulse.analytics;

import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import com.anthropic.client.AnthropicClient;
import com.anthropic.client.okhttp.AnthropicOkHttpClient;
import com.anthropic.models.messages.MessageCreateParams;
import com.anthropic.models.messages.TextBlock;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * Optional AI layer over the analytics numbers, behind a provider switch:
 * Anthropic (Claude, paid) or Google Gemini (has a free API tier). Enabled
 * only when an API key is configured; without one the endpoints return no
 * content and the dashboard shows numbers only — the platform never
 * depends on the AI being available.
 */
@Service
public class InsightService {

    private static final Logger log = LoggerFactory.getLogger(InsightService.class);

    private final String provider;
    private final String apiKey;
    private final String model;
    private final String baseUrl;
    // Spring Boot 4 auto-configures Jackson 3; the Anthropic SDK ships
    // Jackson 2, so this service keeps its own mapper for the stats payload.
    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();
    private volatile AnthropicClient anthropicClient;

    public InsightService(
            @Value("${app.ai.provider:anthropic}") String provider,
            @Value("${app.ai.api-key:}") String apiKey,
            @Value("${app.ai.model:}") String model,
            @Value("${app.ai.base-url:http://localhost:11434}") String baseUrl) {
        this.provider = provider;
        this.apiKey = apiKey;
        this.model = model;
        this.baseUrl = baseUrl;
    }

    public boolean enabled() {
        // Ollama runs locally with no key; the hosted providers need one.
        return "ollama".equalsIgnoreCase(effectiveProvider())
                || (apiKey != null && !apiKey.isBlank());
    }

    /**
     * A recognizable key prefix wins over the configured provider, so a Gemini
     * key works even when AI_PROVIDER was left at its default. Google keys
     * start with "AIza", Anthropic keys with "sk-ant".
     */
    private String effectiveProvider() {
        if (apiKey != null) {
            if (apiKey.startsWith("AIza")) {
                return "gemini";
            }
            if (apiKey.startsWith("sk-ant")) {
                return "anthropic";
            }
        }
        return provider;
    }

    /**
     * Turns a stats payload into 3-5 short, actionable observations.
     * Failures degrade to "no insight" — never to a broken dashboard.
     */
    public Optional<String> generate(String audience, Object stats) {
        if (!enabled()) {
            return Optional.empty();
        }
        try {
            String system = "You are the analytics assistant inside EventPulse, an event "
                    + "ticketing platform. You are shown aggregate statistics as JSON. "
                    + "Write 3-5 short bullet points of plain-language insight a "
                    + audience + " can act on: what is going well, what needs attention, "
                    + "and one concrete suggestion. No preamble, no headings — just the bullets.";
            String user = "Current statistics:\n" + objectMapper.writeValueAsString(stats);

            String text = route(system, user);
            return text.isBlank() ? Optional.empty() : Optional.of(text);
        } catch (Exception e) {
            log.warn("AI insight generation failed (provider={}): {}", effectiveProvider(), describe(e));
            return Optional.empty();
        }
    }

    /** Dispatch to the configured provider. */
    private String route(String system, String user) throws Exception {
        return switch (effectiveProvider().toLowerCase()) {
            case "gemini" -> askGemini(system, user);
            case "ollama" -> askOllama(system, user);
            default -> askClaude(system, user);
        };
    }

    /**
     * A live one-line check the /ai-status endpoint uses so a misconfigured
     * key or model can be diagnosed from the browser instead of the logs.
     */
    public String diagnose() {
        if (!enabled()) {
            return "disabled — no app.ai.api-key set";
        }
        try {
            String reply = route("Reply with the single word: ok", "ping");
            return reply.isBlank() ? "reachable but returned no text" : "ok";
        } catch (Exception e) {
            return describe(e);
        }
    }

    /** RestClient errors carry the provider's real error body — surface it. */
    private static String describe(Exception e) {
        if (e instanceof RestClientResponseException http) {
            return http.getStatusCode() + " " + http.getResponseBodyAsString();
        }
        return e.toString();
    }

    private String askClaude(String system, String user) {
        MessageCreateParams params = MessageCreateParams.builder()
                .model(model.isBlank() ? "claude-opus-4-8" : model)
                .maxTokens(1024L)
                .system(system)
                .addUserMessage(user)
                .build();
        return anthropic().messages().create(params).content().stream()
                .flatMap(block -> block.text().stream())
                .map(TextBlock::text)
                .collect(Collectors.joining("\n"))
                .trim();
    }

    /** Plain REST call — Google's free-tier generateContent endpoint. */
    private String askGemini(String system, String user) throws Exception {
        String geminiModel = model.isBlank() ? "gemini-2.0-flash" : model;
        Map<String, Object> body = Map.of(
                "systemInstruction", Map.of("parts", new Object[] { Map.of("text", system) }),
                "contents", new Object[] {
                        Map.of("role", "user", "parts", new Object[] { Map.of("text", user) })
                });
        String raw = RestClient.create()
                .post()
                .uri("https://generativelanguage.googleapis.com/v1beta/models/"
                        + geminiModel + ":generateContent")
                .header("x-goog-api-key", apiKey)
                .header("Content-Type", "application/json")
                .body(objectMapper.writeValueAsString(body))
                .retrieve()
                .body(String.class);
        if (raw == null) {
            return "";
        }
        JsonNode response = objectMapper.readTree(raw);
        StringBuilder text = new StringBuilder();
        for (JsonNode part : response.path("candidates").path(0).path("content").path("parts")) {
            text.append(part.path("text").asText());
        }
        return text.toString().trim();
    }

    /** Local Ollama — free, no key, no quota. Needs `ollama serve` running. */
    private String askOllama(String system, String user) throws Exception {
        Map<String, Object> body = Map.of(
                "model", model.isBlank() ? "llama3.2" : model,
                "stream", false,
                "messages", new Object[] {
                        Map.of("role", "system", "content", system),
                        Map.of("role", "user", "content", user),
                });
        String raw = RestClient.create()
                .post()
                .uri(baseUrl + "/api/chat")
                .header("Content-Type", "application/json")
                .body(objectMapper.writeValueAsString(body))
                .retrieve()
                .body(String.class);
        if (raw == null) {
            return "";
        }
        return objectMapper.readTree(raw).path("message").path("content").asText().trim();
    }

    private AnthropicClient anthropic() {
        if (anthropicClient == null) {
            synchronized (this) {
                if (anthropicClient == null) {
                    anthropicClient = AnthropicOkHttpClient.builder().apiKey(apiKey).build();
                }
            }
        }
        return anthropicClient;
    }
}
