package com.jobreview.company;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class SlugGeneratorTest {

    @Test
    void transliteratesCyrillicAndStripsRomanianDiacritics() {
        assertThat(SlugGenerator.slugify("Кодру Диджитал")).isEqualTo("kodru-didzhital");
        assertThat(SlugGenerator.slugify("Bălți Soft")).isEqualTo("balti-soft");
        assertThat(SlugGenerator.slugify("ООО «Щука & Ёж»")).isEqualTo("ooo-schuka-ezh");
        assertThat(SlugGenerator.slugify("«»!!")).isEqualTo("company");
    }
}
