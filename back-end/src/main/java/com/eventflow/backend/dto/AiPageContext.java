package com.eventflow.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AiPageContext {
    private String path;
    private Long eventId;
    private Long taskId;
}
