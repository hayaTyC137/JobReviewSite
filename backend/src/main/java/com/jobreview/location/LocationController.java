package com.jobreview.location;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Tag(name = "Локации", description = "Справочник стран и городов")
public class LocationController {

    private final LocationService locationService;

    public LocationController(LocationService locationService) {
        this.locationService = locationService;
    }

    @GetMapping({"/api/locations", "/api/companies/locations"})
    @Operation(summary = "Страны и города",
            description = "Справочник (Россия, Беларусь, Казахстан, Молдова) плюс города опубликованных компаний. "
                    + "У каждого города — число компаний, чтобы фильтр показывал, где есть данные.")
    public LocationsDto locations() {
        return locationService.getLocations();
    }
}
