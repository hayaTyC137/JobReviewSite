package com.jobreview.location;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

@Schema(description = "Справочник стран и городов для фильтров и форм")
public record LocationsDto(List<String> countries, List<City> cities) {

    public record City(@Schema(example = "Молдова") String country,
                       @Schema(example = "Кишинёв") String city,
                       @Schema(description = "Сколько опубликованных компаний в городе", example = "4") long companiesCount) {
    }
}
