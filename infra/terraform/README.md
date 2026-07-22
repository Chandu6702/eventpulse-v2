# EventPulse — AWS infrastructure

Terraform stack for running EventPulse on AWS:

```
Internet → ALB (public subnets)
             ├── /api/*  → ECS Fargate: eventpulse-api (Spring Boot, ×2)
             └── /*      → ECS Fargate: eventpulse-web (nginx + React build)
                               api → RDS PostgreSQL 17 (private subnets)
```

## Why this stack is written but not applied

This repository is a portfolio project. The stack validates (`terraform init
-backend=false && terraform validate`) and mirrors the local
`docker-compose.prod.yml` topology one-to-one, but it is intentionally **not
deployed**: running it 24/7 costs roughly **$70–90/month** (ALB ~$22, 3 Fargate
tasks ~$30, RDS db.t4g.micro ~$13, storage/traffic on top) — not worth it for a
demo that can be reproduced locally with one Docker command.

Deliberate cost trade-offs are commented inline where they diverge from what
production would want:

- No NAT gateway — tasks run in public subnets behind security groups
- Single-AZ RDS, no read replicas
- Secrets passed as environment variables instead of SSM/Secrets Manager
- Local Terraform state instead of S3 + DynamoDB locking

## Applying it anyway

```bash
terraform init
terraform apply \
  -var api_image=<ecr-uri>/eventpulse-api:v1 \
  -var web_image=<ecr-uri>/eventpulse-web:v1 \
  -var db_password=<strong-password> \
  -var jwt_secret=<32+ char secret>
```

Build and push the images to the ECR repositories this stack creates, then
re-apply so the services pick them up.
