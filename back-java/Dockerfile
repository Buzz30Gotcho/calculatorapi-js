# --- Étape 1 : build + tests avec Maven ---
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -B dependency:go-offline
COPY src ./src
RUN mvn -B package

# --- Étape 2 : image d'exécution légère (JRE seul) ---
FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /app/target/calculator-api.jar app.jar
EXPOSE 3001
CMD ["java", "-jar", "app.jar"]
