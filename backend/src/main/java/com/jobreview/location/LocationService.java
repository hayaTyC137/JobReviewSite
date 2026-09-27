package com.jobreview.location;

import com.jobreview.company.CompanyRepository;
import com.jobreview.company.CompanyStatus;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Справочник локаций: города из таблицы cities плюс города, где уже есть опубликованные компании
 * (если представитель указал город, которого нет в справочнике, он всё равно попадёт в фильтр).
 * Сначала идут страны и города, где есть компании, затем — остальные по порядку справочника.
 */
@Service
public class LocationService {

    private final CityRepository cityRepository;
    private final CompanyRepository companyRepository;

    public LocationService(CityRepository cityRepository, CompanyRepository companyRepository) {
        this.cityRepository = cityRepository;
        this.companyRepository = companyRepository;
    }

    @Transactional(readOnly = true)
    public LocationsDto getLocations() {
        List<CompanyRepository.LocationCount> rows = companyRepository.countByLocation(CompanyStatus.APPROVED);
        Map<String, Long> counts = new LinkedHashMap<>();
        rows.forEach(row -> counts.put(key(row.getCountry(), row.getCity()), row.getCompanies()));

        Map<String, LocationsDto.City> cities = new LinkedHashMap<>();
        for (City city : cityRepository.findAllByOrderByCountryAscSortOrderAsc()) {
            String key = key(city.getCountry(), city.getName());
            cities.put(key, new LocationsDto.City(city.getCountry(), city.getName(), counts.getOrDefault(key, 0L)));
        }
        rows.forEach(row -> cities.putIfAbsent(
                key(row.getCountry(), row.getCity()),
                new LocationsDto.City(row.getCountry(), row.getCity(), row.getCompanies())));

        Map<String, Long> perCountry = new LinkedHashMap<>();
        cities.values().forEach(c -> perCountry.merge(c.country(), c.companiesCount(), Long::sum));

        List<LocationsDto.City> sortedCities = new ArrayList<>(cities.values());
        // Стабильная сортировка: внутри страны сохраняется порядок справочника (столица первой)
        sortedCities.sort(Comparator.comparing((LocationsDto.City c) -> -perCountry.get(c.country()))
                .thenComparing(LocationsDto.City::country));

        Set<String> countries = new LinkedHashSet<>();
        sortedCities.forEach(c -> countries.add(c.country()));
        return new LocationsDto(List.copyOf(countries), sortedCities);
    }

    private static String key(String country, String city) {
        return country + "|" + city;
    }
}
