output "alb_dns_name" {
  description = "Public entry point for the application"
  value       = aws_lb.main.dns_name
}

output "ecr_api_repository_url" {
  description = "Push target for the API image"
  value       = aws_ecr_repository.api.repository_url
}

output "rds_endpoint" {
  description = "Database endpoint (private subnet only)"
  value       = aws_db_instance.postgres.address
}
