output "backend_url" {
  value       = google_cloud_run_v2_service.backend.uri
  description = "Backend service URL."
}

output "frontend_url" {
  value       = google_cloud_run_v2_service.frontend.uri
  description = "Frontend service URL."
}

output "leaderboard_url" {
  value       = google_cloud_run_v2_service.leaderboard.uri
  description = "Leaderboard service URL."
}

output "database_connection_name" {
  value       = google_sql_database_instance.leaderboard.connection_name
  description = "Cloud SQL connection name used by Cloud Run."
}
