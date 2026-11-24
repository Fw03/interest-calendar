FROM maven:3.9.11-eclipse-temurin-17 AS build
WORKDIR /build
COPY pom.xml .
COPY src ./src
RUN mvn -B -ntp package

FROM eclipse-temurin:17-jre-jammy
WORKDIR /app
COPY --from=build /build/target/interest-calendar-1.0.0-SNAPSHOT.jar /app/calendar.jar
USER 10001:10001
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/calendar.jar"]
