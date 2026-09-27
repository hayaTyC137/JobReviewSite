package com.jobreview.files;

import com.jobreview.common.error.InvalidInputException;
import com.jobreview.common.error.NotFoundException;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Arrays;
import java.util.UUID;
import java.util.regex.Pattern;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.PathResource;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

/**
 * Хранение загруженных картинок (аватары, логотипы, баннеры) на диске.
 *
 * Безопасность:
 * - тип определяется по сигнатуре файла (magic bytes), а не по расширению или Content-Type от клиента;
 * - имя генерируется сервером (UUID), пользовательское имя файла не используется вовсе;
 * - при чтении имя проверяется регулярным выражением — выйти за пределы каталога (../) невозможно;
 * - разрешены только PNG, JPEG и WebP, SVG запрещён (в нём может быть JavaScript).
 */
@Service
public class FileStorageService {

    public static final long MAX_SIZE = 2 * 1024 * 1024;
    private static final Pattern NAME = Pattern.compile("^[0-9a-f\\-]{36}\\.(png|jpg|webp)$");

    private final Path root;

    public FileStorageService(@Value("${app.uploads.dir}") String dir) {
        this.root = Path.of(dir).toAbsolutePath().normalize();
    }

    public String store(MultipartFile file) {
        if (file.isEmpty()) {
            throw new InvalidInputException("Файл пустой");
        }
        if (file.getSize() > MAX_SIZE) {
            throw new InvalidInputException("Файл слишком большой: не больше 2 МБ");
        }
        try {
            byte[] head = readHead(file);
            String extension = detectExtension(head);
            if (extension == null) {
                throw new InvalidInputException("Поддерживаются только изображения PNG, JPEG и WebP");
            }
            Files.createDirectories(root);
            String name = UUID.randomUUID() + "." + extension;
            try (InputStream in = file.getInputStream()) {
                Files.copy(in, root.resolve(name), StandardCopyOption.REPLACE_EXISTING);
            }
            return "/api/files/" + name;
        } catch (IOException ex) {
            throw new UncheckedIOException("Не удалось сохранить файл", ex);
        }
    }

    public StoredFile load(String name) {
        if (!NAME.matcher(name).matches()) {
            throw new NotFoundException("Файл не найден");
        }
        Path path = root.resolve(name).normalize();
        if (!path.startsWith(root) || !Files.isRegularFile(path)) {
            throw new NotFoundException("Файл не найден");
        }
        return new StoredFile(new PathResource(path), mediaType(name));
    }

    public record StoredFile(Resource resource, MediaType mediaType) {
    }

    private static byte[] readHead(MultipartFile file) throws IOException {
        try (InputStream in = file.getInputStream()) {
            return in.readNBytes(12);
        }
    }

    /** Сигнатуры форматов: PNG 89 50 4E 47, JPEG FF D8 FF, WebP «RIFF….WEBP» */
    static String detectExtension(byte[] head) {
        if (head.length >= 4 && (head[0] & 0xFF) == 0x89 && head[1] == 'P' && head[2] == 'N' && head[3] == 'G') {
            return "png";
        }
        if (head.length >= 3 && (head[0] & 0xFF) == 0xFF && (head[1] & 0xFF) == 0xD8 && (head[2] & 0xFF) == 0xFF) {
            return "jpg";
        }
        if (head.length >= 12 && Arrays.equals(Arrays.copyOfRange(head, 0, 4), "RIFF".getBytes())
                && Arrays.equals(Arrays.copyOfRange(head, 8, 12), "WEBP".getBytes())) {
            return "webp";
        }
        return null;
    }

    private static MediaType mediaType(String name) {
        if (name.endsWith(".png")) {
            return MediaType.IMAGE_PNG;
        }
        if (name.endsWith(".webp")) {
            return MediaType.parseMediaType("image/webp");
        }
        return MediaType.IMAGE_JPEG;
    }
}
