package com.jobreview.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

@Schema(description = "Доступные страны и города для фильтра")
public record LocationsDto(List<String> countries, List<City> cities) {

    public record City(@Schema(example = "Россия") String country, @Schema(example = "Казань") String city) {
    }
}
