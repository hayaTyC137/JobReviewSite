package com.jobreview.location;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CityRepository extends JpaRepository<City, Long> {

    List<City> findAllByOrderByCountryAscSortOrderAsc();

    boolean existsByCountryAndName(String country, String name);
}
