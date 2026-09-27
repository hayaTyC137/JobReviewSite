package com.jobreview.files;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.jobreview.common.error.InvalidInputException;
import com.jobreview.common.error.NotFoundException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;

class FileStorageServiceTest {

    private static final byte[] PNG = {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0};

    @TempDir
    Path dir;

    @Test
    void storesImageUnderGeneratedNameAndServesItBack() {
        FileStorageService storage = new FileStorageService(dir.toString());
        String url = storage.store(new MockMultipartFile("file", "../../evil.svg", "image/svg+xml", PNG));

        assertThat(url).matches("^/api/files/[0-9a-f-]{36}\\.png$");
        String name = url.substring("/api/files/".length());
        assertThat(storage.load(name).mediaType().toString()).isEqualTo("image/png");
    }

    @Test
    void rejectsNonImagesByContentNotByDeclaredType() {
        FileStorageService storage = new FileStorageService(dir.toString());
        byte[] svg = "<svg onload=alert(1)>".getBytes(StandardCharsets.UTF_8);
        assertThatThrownBy(() -> storage.store(new MockMultipartFile("file", "a.png", "image/png", svg)))
                .isInstanceOf(InvalidInputException.class);
    }

    @Test
    void pathTraversalIsImpossible() {
        FileStorageService storage = new FileStorageService(dir.toString());
        assertThatThrownBy(() -> storage.load("../application.yml")).isInstanceOf(NotFoundException.class);
        assertThatThrownBy(() -> storage.load("00000000-0000-0000-0000-000000000000.png")).isInstanceOf(NotFoundException.class);
    }
}
