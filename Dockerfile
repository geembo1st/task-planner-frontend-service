FROM openjdk:17-jdk-slim

WORKDIR /app

COPY target/task-tracker-frontend.jar app.jar

EXPOSE 3000

ENTRYPOINT ["java", "-jar", "app.jar"]
