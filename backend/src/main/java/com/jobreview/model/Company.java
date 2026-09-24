package com.jobreview.model;

import jakarta.persistence.Column;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Организация-работодатель: юридические и фактические сведения плюс сводный рейтинг.
 */
@Entity
@Table(name = "companies")
@Getter
@Setter
@NoArgsConstructor
public class Company {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Человекочитаемый идентификатор для URL, например nova-studio */
    @Column(nullable = false, unique = true)
    private String slug;

    @Column(nullable = false)
    private String name;

    @Column(name = "legal_name", nullable = false)
    private String legalName;

    private String inn;

    @Column(nullable = false)
    private String country;

    @Column(nullable = false)
    private String city;

    @Column(name = "legal_address")
    private String legalAddress;

    @Column(name = "actual_address")
    private String actualAddress;

    private String phone;
    private String email;
    private String website;
    private String industry;

    @Column(name = "employees_count")
    private Integer employeesCount;

    @Column(name = "founded_year")
    private Integer foundedYear;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Embedded
    private CompanyRating rating = new CompanyRating();
}
