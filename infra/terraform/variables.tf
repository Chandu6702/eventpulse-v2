variable "project" {
  description = "Name prefix for all resources"
  type        = string
  default     = "eventpulse"
}

variable "region" {
  description = "AWS region"
  type        = string
  default     = "ap-south-1"
}

variable "api_image" {
  description = "ECR image URI for the Spring Boot API"
  type        = string
}

variable "db_password" {
  description = "Master password for the RDS instance"
  type        = string
  sensitive   = true
}

variable "jwt_secret" {
  description = "HS256 signing secret for access tokens"
  type        = string
  sensitive   = true
}

variable "api_desired_count" {
  description = "Number of API tasks behind the load balancer"
  type        = number
  default     = 2
}
