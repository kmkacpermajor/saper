output "backend_url" {
  value       = google_cloud_run_v2_service.backend.uri
  description = "Backend service URL."
}

output "frontend_url" {
  value       = google_cloud_run_v2_service.frontend.uri
  description = "Frontend service URL."
}
