# EventPulse — AWS infrastructure

Terraform stack for running the EventPulse API on AWS:

```
SPA → static hosting (Amplify / S3 + CloudFront) — outside this stack
API: Internet → ALB (public subnets) → ECS Fargate: eventpulse-api (Spring Boot, ×2)
                                          └→ RDS PostgreSQL 17 (private subnets)
```

The frontend compiles to static files, so it belongs on a static host rather
than in a container — this stack deliberately covers only the API tier.

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
  -var db_password=<strong-password> \
  -var jwt_secret=<32+ char secret>
```

Build and push the API image to the ECR repository this stack creates, then
re-apply so the service picks it up. Deploy the frontend separately to
Amplify (or S3 + CloudFront) pointing its `/api` rewrite at the ALB.
