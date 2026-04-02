package com.example.demo;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.Map;

@Service
public class ResearchService {

    @Value("${gemini.api.url}")
    private String geminiURL;

    @Value("${gemini.api.key}")
    private String geminiKEY;

    private final WebClient webClient;
    private final ObjectMapper objectMapper;

    public ResearchService(WebClient.Builder webClientBuilder, ObjectMapper objectMapper) {
        this.webClient = webClientBuilder.build();
        this.objectMapper = objectMapper;
    }

    public String processContent(ResearchRequest researchRequest) throws IllegalAccessException {

        String prompt = buildPrompt(researchRequest);

        Map<String, Object> requestBody = Map.of(
                "contents", new Object[]{
                        Map.of("parts", new Object[]{
                                Map.of("text", prompt)
                        })
                }
        );

        String responce = webClient.post()
                .uri(geminiURL + geminiKEY)
                .bodyValue(requestBody)
                .retrieve()
                .bodyToMono(String.class)
                .block();

        return extractTextFromREsponce(responce);
    }

    private String extractTextFromREsponce(String responce) {
        try {
            GeminiResponce geminiResponce = objectMapper.readValue(responce, GeminiResponce.class);

            if (geminiResponce.getCandidates() != null && !geminiResponce.getCandidates().isEmpty()) {
                GeminiResponce.Candidate firstCandidate = geminiResponce.getCandidates().get(0);

                if (firstCandidate.getContent() != null &&
                        firstCandidate.getContent().getParts() != null &&
                        !firstCandidate.getContent().getParts().isEmpty()) {

                    return firstCandidate.getContent().getParts().get(0).getText();
                }
            }

            return "No content fond in responce";

        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    private String buildPrompt(ResearchRequest researchRequest) throws IllegalAccessException {
        StringBuilder prompt = new StringBuilder();

        switch (researchRequest.getOperation()) {
            case "summarize":
                prompt.append(
                        "Summarize the following content into a short, clear, and easy-to-understand note. " +
                                "Use simple  English. Keep sentences short and natural. " +
                                "Avoid complex words. Highlight only the main important points. " +
                                "Limit the summary  sentences.\n\n"
                );
                break;

            case "synonym":
                prompt.append("Give 5 simple and easy synonyms for the given word. Use simple English. Only return words separated by bullet points.\n\n");
                break;

            case "translate":

                String tLang = researchRequest.getLanguage();

                if (tLang == null || tLang.isEmpty()) {
                    tLang = "Hindi";
                }

                prompt.append("You are a strict translation engine.\n");

                if (tLang.equalsIgnoreCase("Hindi")) {
                    prompt.append(
                            "Example:\n" +
                                    "Input: Shivneri Fort is an old fort in Maharashtra.\n" +
                                    "Output: शिवनेरी किला महाराष्ट्र का एक प्राचीन किला है।\n\n"
                    );
                }

                if (tLang.equalsIgnoreCase("Marathi")) {
                    prompt.append(
                            "Example:\n" +
                                    "Input: Shivneri Fort is an old fort in Maharashtra.\n" +
                                    "Output: शिवनेरी किल्ला हा महाराष्ट्रातील एक प्राचीन किल्ला आहे.\n\n"
                    );
                }

                prompt.append(
                        "Now translate the following text into " + tLang + ".\n" +
                                "Rules:\n" +
                                "- Output must be 100% in " + tLang + "\n" +
                                "- No English words\n" +
                                "- No explanation\n\n" +
                                "Text:\n"
                );

                break;

            default:
                throw new IllegalAccessException("Operation Not Found" + researchRequest.getOperation());
        }

        prompt.append(researchRequest.getContent());
        return prompt.toString();
    }
}