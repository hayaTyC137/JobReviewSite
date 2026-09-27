# Сборка в два этапа: сначала Maven собирает jar, потом он копируется в лёгкий JRE-образ
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
# Отдельный слой с зависимостями — пересобирается только при изменении pom.xml
RUN mvn -B -q dependency:go-offline
COPY src ./src
RUN mvn -B -q package -DskipTests

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
# Каталог загрузок принадлежит пользователю приложения: именованный том унаследует права при создании
RUN addgroup -S app && adduser -S app -G app && mkdir -p /data/uploads && chown -R app:app /data
COPY --from=build /app/target/*.jar app.jar
USER app
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
