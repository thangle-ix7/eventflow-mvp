# Stage 1: Build the application using Maven + JDK 17
FROM maven:3.9.6-eclipse-temurin-17 AS builder

WORKDIR /build

# Copy pom.xml first for dependency caching
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy source code
COPY src ./src

# Build JAR (skip tests for faster build)
RUN mvn package -DskipTests -B

# Stage 2: Run on lightweight OpenJDK 17 Alpine
FROM eclipse-temurin:17-jre-alpine

# Add non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copy JAR from builder stage
COPY --from=builder /build/target/*.jar app.jar

# Switch to non-root user
USER appuser

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
