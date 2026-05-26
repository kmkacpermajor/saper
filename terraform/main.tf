terraform {
  backend "gcs" {}
}

provider "google" {
  project = var.project_id
  region  = var.region
}

locals {
  backend_service_name        = "saper-backend"
  frontend_service_name       = "saper-frontend"
  leaderboard_service_name    = "saper-leaderboard"
  backend_port                = 8085
  frontend_port               = 3000
  leaderboard_port            = 8090
  pubsub_topic_name           = "game-results"
  pubsub_subscription_name    = "leaderboard-game-results"
  psc_network_name            = "saper-psc-network"
  psc_subnet_name             = "saper-psc-subnet"
  psc_subnet_cidr             = "10.20.0.0/24"
  psc_connector_name          = "saper-psc-connector"
  psc_connector_cidr          = "10.20.1.0/28"
  psc_endpoint_name           = "saper-leaderboard-psc"
  database_instance_name      = "saper-leaderboard-postgres"
  database_name               = "minesweeper"
  database_user               = "minesweeper"
  database_connection_string  = "${var.project_id}:${var.region}:${local.database_instance_name}"
  database_url                = "postgresql://${local.database_user}:${urlencode(var.database_password)}@${google_compute_address.leaderboard_psc.address}:5432/${local.database_name}"
}

resource "google_compute_network" "psc" {
  name                    = local.psc_network_name
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "psc" {
  name          = local.psc_subnet_name
  region        = var.region
  network       = google_compute_network.psc.id
  ip_cidr_range = local.psc_subnet_cidr
}

resource "google_vpc_access_connector" "psc" {
  name          = local.psc_connector_name
  region        = var.region
  network       = google_compute_network.psc.name
  ip_cidr_range = local.psc_connector_cidr
}

resource "google_compute_address" "leaderboard_psc" {
  name         = local.psc_endpoint_name
  region       = var.region
  subnetwork   = google_compute_subnetwork.psc.id
  address_type = "INTERNAL"
}

resource "google_compute_forwarding_rule" "leaderboard_psc" {
  name                  = local.psc_endpoint_name
  region                = var.region
  network               = google_compute_network.psc.id
  subnetwork            = google_compute_subnetwork.psc.id
  load_balancing_scheme = "INTERNAL"
  ip_address            = google_compute_address.leaderboard_psc.address
  target                = google_sql_database_instance.leaderboard.psc_service_attachment_link
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

      psc_config {
        psc_enabled               = true
        allowed_consumer_projects = [var.project_id]
      }
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
    scaling {
      max_instance_count = 1
    }

    vpc_access {
      connector = google_vpc_access_connector.psc.id
      egress    = "ALL_TRAFFIC"
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
  member  = "serviceAccount:${var.service_account}"
}

resource "google_project_iam_member" "leaderboard_pubsub_subscriber" {
  project = var.project_id
  role    = "roles/pubsub.subscriber"
  member  = "serviceAccount:${var.service_account}"
}

resource "google_project_iam_member" "leaderboard_cloudsql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${var.service_account}"
}

resource "google_project_iam_member" "default_compute_artifact_registry_writer" {
  project = var.project_id
  role    = "roles/artifactregistry.writer"
  member  = "serviceAccount:${var.service_account}"
}

resource "google_project_iam_member" "default_compute_cloudbuild_service_account" {
  project = var.project_id
  role    = "roles/cloudbuild.builds.builder"
  member  = "serviceAccount:${var.service_account}"
}

resource "google_project_iam_member" "default_compute_cloud_run_admin" {
  project = var.project_id
  role    = "roles/run.admin"
  member  = "serviceAccount:${var.service_account}"
}

resource "google_project_iam_member" "default_compute_cloudsql_admin" {
  project = var.project_id
  role    = "roles/cloudsql.admin"
  member  = "serviceAccount:${var.service_account}"
}

resource "google_project_iam_member" "default_compute_project_iam_admin" {
  project = var.project_id
  role    = "roles/resourcemanager.projectIamAdmin"
  member  = "serviceAccount:${var.service_account}"
}

resource "google_project_iam_member" "default_compute_pubsub_admin" {
  project = var.project_id
  role    = "roles/pubsub.admin"
  member  = "serviceAccount:${var.service_account}"
}

resource "google_project_iam_member" "default_compute_service_account_user" {
  project = var.project_id
  role    = "roles/iam.serviceAccountUser"
  member  = "serviceAccount:${var.service_account}"
}

resource "google_project_iam_member" "default_compute_storage_object_viewer" {
  project = var.project_id
  role    = "roles/storage.objectViewer"
  member  = "serviceAccount:${var.service_account}"
}

resource "google_project_iam_member" "default_compute_vpc_access_user" {
  project = var.project_id
  role    = "roles/vpcaccess.user"
  member  = "serviceAccount:${var.service_account}"
}

resource "google_project_iam_member" "default_compute_network_admin" {
  project = var.project_id
  role    = "roles/compute.networkAdmin"
  member  = "serviceAccount:${var.service_account}"
}
