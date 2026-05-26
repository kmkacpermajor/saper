variable "project_id" {
  type        = string
  description = "GCP project ID."
}

variable "project_number" {
  type        = string
  description = "GCP project number."
}

variable "service_account" {
  type        = string
  description = "Service account."
}

variable "region" {
  type        = string
  description = "GCP region for Cloud Run and Artifact Registry."
}

variable "backend_image" {
  type        = string
  description = "Backend image reference with digest."
}

variable "frontend_image" {
  type        = string
  description = "Frontend image reference with digest."
}

variable "leaderboard_image" {
  type        = string
  description = "Leaderboard backend image reference with digest."
}

variable "database_password" {
  type        = string
  description = "Password for the leaderboard PostgreSQL user."
  sensitive   = true
}
