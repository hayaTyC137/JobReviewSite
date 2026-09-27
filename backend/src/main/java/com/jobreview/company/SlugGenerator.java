package com.jobreview.company;

import java.text.Normalizer;
import java.util.Locale;
import java.util.Map;
import org.springframework.stereotype.Component;

/**
 * Человекочитаемый slug для URL из названия компании: «Кодру Диджитал» → kodru-didzhital.
 * Кириллица транслитерируется, румынские диакритики снимаются, при совпадении добавляется номер.
 */
@Component
public class SlugGenerator {

    private static final Map<Character, String> CYRILLIC = Map.ofEntries(
            Map.entry('а', "a"), Map.entry('б', "b"), Map.entry('в', "v"), Map.entry('г', "g"), Map.entry('д', "d"),
            Map.entry('е', "e"), Map.entry('ё', "e"), Map.entry('ж', "zh"), Map.entry('з', "z"), Map.entry('и', "i"),
            Map.entry('й', "y"), Map.entry('к', "k"), Map.entry('л', "l"), Map.entry('м', "m"), Map.entry('н', "n"),
            Map.entry('о', "o"), Map.entry('п', "p"), Map.entry('р', "r"), Map.entry('с', "s"), Map.entry('т', "t"),
            Map.entry('у', "u"), Map.entry('ф', "f"), Map.entry('х', "h"), Map.entry('ц', "ts"), Map.entry('ч', "ch"),
            Map.entry('ш', "sh"), Map.entry('щ', "sch"), Map.entry('ъ', ""), Map.entry('ы', "y"), Map.entry('ь', ""),
            Map.entry('э', "e"), Map.entry('ю', "yu"), Map.entry('я', "ya"), Map.entry('і', "i"), Map.entry('ў', "u"),
            Map.entry('ә', "a"), Map.entry('ғ', "g"), Map.entry('қ', "k"), Map.entry('ң', "n"), Map.entry('ө', "o"),
            Map.entry('ұ', "u"), Map.entry('ү', "u"), Map.entry('һ', "h"));

    private final CompanyRepository companyRepository;

    public SlugGenerator(CompanyRepository companyRepository) {
        this.companyRepository = companyRepository;
    }

    public String uniqueSlug(String name) {
        String base = slugify(name);
        String slug = base;
        int suffix = 2;
        while (companyRepository.existsBySlug(slug)) {
            slug = base + "-" + suffix++;
        }
        return slug;
    }

    static String slugify(String name) {
        StringBuilder out = new StringBuilder();
        for (char ch : name.toLowerCase(Locale.ROOT).toCharArray()) {
            out.append(CYRILLIC.getOrDefault(ch, String.valueOf(ch)));
        }
        String ascii = Normalizer.normalize(out, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        String slug = ascii.replaceAll("[^a-z0-9]+", "-").replaceAll("(^-+|-+$)", "");
        if (slug.length() > 60) {
            slug = slug.substring(0, 60).replaceAll("-+$", "");
        }
        return slug.isEmpty() ? "company" : slug;
    }
}
