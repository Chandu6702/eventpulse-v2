package com.eventpulse.analytics;

import java.util.Optional;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.anthropic.client.AnthropicClient;
import com.anthropic.client.okhttp.AnthropicOkHttpClient;
import com.anthropic.models.messages.MessageCreateParams;
import com.anthropic.models.messages.TextBlock;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * Optional AI layer over the analytics numbers. Enabled only when an
 * Anthropic API key is configured (ANTHROPIC_API_KEY); without one the
 * endpoints return no content and the dashboard shows numbers only —
 * the platform never depends on the AI being available.
 */
@Service
public class InsightService {

    private static final Logger log = LoggerFactory.getLogger(InsightService.class);

    private final String apiKey;
    private final String model;
    private final ObjectMapper objectMapper;
    private volatile AnthropicClient client;

    public InsightService(
            @Value("${app.ai.api-key:}") String apiKey,
            @Value("${app.ai.model:claude-opus-4-8}") String model,
            ObjectMapper objectMapper) {
        this.apiKey = apiKey;
        this.model = model;
        this.objectMapper = objectMapper;
    }

    public boolean enabled() {
        return apiKey != null && !apiKey.isBlank();
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
            String json = objectMapper.writeValueAsString(stats);
            MessageCreateParams params = MessageCreateParams.builder()
                    .model(model)
                    .maxTokens(1024L)
                    .system("You are the analytics assistant inside EventPulse, an event "
                            + "ticketing platform. You are shown aggregate statistics as JSON. "
                            + "Write 3-5 short bullet points of plain-language insight a "
                            + audience + " can act on: what is going well, what needs attention, "
                            + "and one concrete suggestion. No preamble, no headings — just the bullets.")
                    .addUserMessage("Current statistics:\n" + json)
                    .build();

            String text = client().messages().create(params).content().stream()
                    .flatMap(block -> block.text().stream())
                    .map(TextBlock::text)
                    .collect(Collectors.joining("\n"))
                    .trim();
            return text.isBlank() ? Optional.empty() : Optional.of(text);
        } catch (Exception e) {
            log.warn("AI insight generation failed", e);
            return Optional.empty();
        }
    }

    private AnthropicClient client() {
        if (client == null) {
            synchronized (this) {
                if (client == null) {
                    client = AnthropicOkHttpClient.builder().apiKey(apiKey).build();
                }
            }
        }
        return client;
    }
}
