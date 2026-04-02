package com.example.demo;

import lombok.Data;

@Data
public class ResearchRequest {
    private String content;
    private String operation;
    private String language; // 🔥 IMPORTANT

}
