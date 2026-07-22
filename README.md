# EventPulse v2

Event ticketing platform — a ground-up re-architecture of [EventPulse v1](https://github.com/Chandu6702/EventPulse) (MERN) in Java 21 / Spring Boot, focused on the hard problems of ticketing: concurrency-safe booking, oversell prevention, idempotent orders, QR check-in, and waitlists.

> 🚧 Work in progress — full README with architecture docs coming as the build progresses.

## Stack

- **Backend:** Java 21, Spring Boot 4, Spring Security (JWT), Spring Data JPA, PostgreSQL, Flyway
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS
- **Testing:** JUnit 5, Testcontainers
- **Infra:** Docker, GitHub Actions, Terraform (AWS ECS/RDS — written, intentionally not deployed)
