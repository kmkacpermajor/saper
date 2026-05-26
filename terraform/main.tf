terraform {
  backend "gcs" {}
}

locals {
  backend_service_name        = "saper-backend"
  frontend_service_name       = "saper-frontend"
  leaderboard_service_name    = "saper-leaderboard"
  backend_port                = 8085
  frontend_port               = 3000
  leaderboard_port            = 8090
  default_compute_sa          = "${var.project_number}-compute@developer.gserviceaccount.com"
  pubsub_topic_name           = "game-results"
  pubsub_subscription_name    = "leaderboard-game-results"
  database_instance_name      = "saper-leaderboard-postgres"
  database_name               = "minesweeper"
  database_user               = "minesweeper"
  database_connection_string  = "${var.project_id}:${var.region}:${local.database_instance_name}"
  database_url                = "postgresql://${local.database_user}:${urlencode(var.database_password)}@/${local.database_name}?host=/cloudsql/${local.database_connection_string}"
}

provider "google" {
  project = var.project_id
  region  = var.region
  impersonate_service_account = var.default_compute_sa
}

resource "google_pubsub_topic" "game_results" {
  name = local.pubsub_topic_name
}

resource "google_pubsub_subscription" "leaderboard_game_results" {
  name  = local.pubsub_subscription_name
  topic = google_pubsub_topic.game_results.name
}

resource "google_sql_database_instance" "leaderboard" {
  name             = local.database_instance_name
  region           = var.region
  database_version = "POSTGRES_16"

  settings {
    tier              = "db-f1-micro"
    availability_type = "ZONAL"
    disk_type         = "PD_SSD"
    disk_size         = 10

    backup_configuration {
      enabled = true
    }

    ip_configuration {
      ipv4_enabled = false
    }
  }

  deletion_protection = false
}

resource "google_sql_database" "leaderboard" {
  name     = local.database_name
  instance = google_sql_database_instance.leaderboard.name
}

resource "google_sql_user" "leaderboard" {
  name     = local.database_user
  instance = google_sql_database_instance.leaderboard.name
  password = var.database_password
}

resource "google_cloud_run_v2_service" "backend" {
  name     = local.backend_service_name
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = local.default_compute_sa

    scaling {
      max_instance_count = 1
    }

    containers {
      image = var.backend_image

      ports {
        container_port = local.backend_port
      }

      env {
        name  = "NODE_ENV"
        value = "production"
      }

      env {
        name  = "HOST"
        value = "0.0.0.0"
      }

      env {
        name  = "GOOGLE_CLOUD_PROJECT"
        value = var.project_id
      }

      env {
        name  = "PUBSUB_TOPIC"
        value = google_pubsub_topic.game_results.name
      }

    }
  }

  traffic {
    percent = 100
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
  }

}

resource "google_cloud_run_v2_service" "leaderboard" {
  name     = local.leaderboard_service_name
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = local.default_compute_sa

    scaling {
      max_instance_count = 1
    }

    volumes {
      name = "cloudsql"

      cloud_sql_instance {
        instances = [local.database_connection_string]
      }
    }

    containers {
      image = var.leaderboard_image

      ports {
        container_port = local.leaderboard_port
      }

      env {
        name  = "NODE_ENV"
        value = "production"
      }

      env {
        name  = "HOST"
        value = "0.0.0.0"
      }

      env {
        name  = "GOOGLE_CLOUD_PROJECT"
        value = var.project_id
      }

      env {
        name  = "PUBSUB_TOPIC"
        value = google_pubsub_topic.game_results.name
      }

      env {
        name  = "PUBSUB_SUBSCRIPTION"
        value = google_pubsub_subscription.leaderboard_game_results.name
      }

      env {
        name  = "DATABASE_URL"
        value = local.database_url
      }

      volume_mounts {
        name       = "cloudsql"
        mount_path = "/cloudsql"
      }
    }
  }

  traffic {
    percent = 100
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
  }

  depends_on = [
    google_sql_database.leaderboard,
    google_sql_user.leaderboard,
    google_pubsub_subscription.leaderboard_game_results
  ]
}

resource "google_cloud_run_v2_service" "frontend" {
  name     = local.frontend_service_name
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = local.default_compute_sa

    scaling {
      max_instance_count = 1
    }

    containers {
      image = var.frontend_image

      ports {
        container_port = local.frontend_port
      }

      env {
        name  = "NUXT_PUBLIC_WS_URL"
        value = replace(google_cloud_run_v2_service.backend.uri, "https://", "wss://")
      }

      env {
        name  = "NUXT_PUBLIC_LEADERBOARD_URL"
        value = google_cloud_run_v2_service.leaderboard.uri
      }
    }
  }

  traffic {
    percent = 100
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
  }

}

resource "google_cloud_run_v2_service_iam_member" "backend_invoker" {
  project  = var.project_id
  location = google_cloud_run_v2_service.backend.location
  name     = google_cloud_run_v2_service.backend.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

resource "google_cloud_run_v2_service_iam_member" "frontend_invoker" {
  project  = var.project_id
  location = google_cloud_run_v2_service.frontend.location
  name     = google_cloud_run_v2_service.frontend.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

resource "google_cloud_run_v2_service_iam_member" "leaderboard_invoker" {
  project  = var.project_id
  location = google_cloud_run_v2_service.leaderboard.location
  name     = google_cloud_run_v2_service.leaderboard.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

resource "google_project_iam_member" "backend_pubsub_publisher" {
  project = var.project_id
  role    = "roles/pubsub.publisher"
  member  = "serviceAccount:${local.default_compute_sa}"
}

resource "google_project_iam_member" "leaderboard_pubsub_subscriber" {
  project = var.project_id
  role    = "roles/pubsub.subscriber"
  member  = "serviceAccount:${local.default_compute_sa}"
}

resource "google_project_iam_member" "leaderboard_cloudsql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${local.default_compute_sa}"
}
