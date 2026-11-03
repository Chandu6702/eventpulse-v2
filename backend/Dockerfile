# ---- Build stage ----
FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /app

# Cache dependencies separately from source for fast rebuilds.
COPY mvnw pom.xml ./
COPY .mvn .mvn
RUN ./mvnw -q dependency:go-offline

COPY src src
RUN ./mvnw -q -DskipTests package

# ---- Runtime stage ----
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

RUN addgroup -S app && adduser -S app -G app
USER app

COPY --from=build /app/target/*.jar app.jar

EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=3s --retries=5 \
  CMD wget -qO- http://localhost:8080/actuator/health | grep -q UP || exit 1

# Pin the outbound TLS version to 1.2. The managed Postgres endpoint (Supabase's
# connection pooler) drops the JDK's TLS 1.3 handshake at the client "Finished"
# step, so JDBC can't connect; forcing 1.2 makes the handshake complete.
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-Djdk.tls.client.protocols=TLSv1.2", "-jar", "app.jar"]
