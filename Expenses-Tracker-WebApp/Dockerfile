# stage 1
FROM maven:3.9-eclipse-temurin-17 AS builder


WORKDIR /app


COPY . .


RUN mvn clean install -DskipTests=true


#  Stage 2


FROM eclipse-temurin:17-jre-alpine


WORKDIR /app


COPY --from=builder /app/target/*.jar /app/expenceapp.jar


CMD [ "java", "-jar","expenceapp.jar"]