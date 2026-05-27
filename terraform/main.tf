terraform {
  backend "gcs" {}
}

provider "google" {
  project = var.project_id
  region  = var.region
}

import {
  to = google_compute_network.main
  id = "projects/project-2f244773-46f8-4097-afe/global/networks/saper-vpc"
}

import {
  to = google_pubsub_topic.game_results
  id = "projects/project-2f244773-46f8-4097-afe/topics/game-results"
}

import {
  to = google_compute_subnetwork.main
  id = "projects/project-2f244773-46f8-4097-afe/regions/europe-central2/subnetworks/saper-subnet"
}

import {
  to = google_pubsub_subscription.leaderboard_game_results
  id = "projects/project-2f244773-46f8-4097-afe/subscriptions/leaderboard-game-results"
}

import {
  to = google_compute_global_address.private_services
  id = "projects/project-2f244773-46f8-4097-afe/global/addresses/saper-sql-peering"
}

import {
  to = google_cloud_run_v2_service.backend
  id = "projects/project-2f244773-46f8-4097-afe/locations/europe-central2/services/saper-backend"
}

# Prawdopodobnie te też będą potrzebne za chwilę:
import {
  to = google_cloud_run_v2_service.frontend
  id = "projects/project-2f244773-46f8-4097-afe/locations/europe-central2/services/saper-frontend"
}

import {
  to = google_service_networking_connection.private_services
  id = "projects/project-2f244773-46f8-4097-afe/global/networks/saper-vpc:servicenetworking.googleapis.com"
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
  database_instance_name      = "saper-leaderboard-postgres"
  database_name               = "minesweeper"
  database_user               = "minesweeper"
  database_connection_string  = "${var.project_id}:${var.region}:${local.database_instance_name}"
  database_url                = "postgresql://${local.database_user}:${urlencode(var.database_password)}@/${local.database_name}?host=/cloudsql/${local.database_connection_string}"
  vpc_name                    = "saper-vpc"
  vpc_subnet_name             = "saper-subnet"
  vpc_subnet_cidr             = "10.10.0.0/24"
  vpc_connector_name          = "saper-run-connector"
  vpc_connector_cidr          = "10.8.0.0/28"
  vpc_peering_range_name      = "saper-sql-peering"
  vpc_peering_range_address   = "10.20.0.0"
  vpc_peering_range_prefix    = 16
}

resource "google_project_service" "compute" {
  project            = var.project_id
  service            = "compute.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "sqladmin" {
  project            = var.project_id
  service            = "sqladmin.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "run" {
  project            = var.project_id
  service            = "run.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "pubsub" {
  project            = var.project_id
  service            = "pubsub.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "servicenetworking" {
  project            = var.project_id
  service            = "servicenetworking.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "vpcaccess" {
  project            = var.project_id
  service            = "vpcaccess.googleapis.com"
  disable_on_destroy = false
}

resource "google_compute_network" "main" {
  name                    = local.vpc_name
  auto_create_subnetworks = false
  depends_on              = [google_project_service.compute]
}

resource "google_compute_subnetwork" "main" {
  name          = local.vpc_subnet_name
  ip_cidr_range = local.vpc_subnet_cidr
  region        = var.region
  network       = google_compute_network.main.id
}

resource "google_compute_global_address" "private_services" {
  name          = local.vpc_peering_range_name
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  address       = local.vpc_peering_range_address
  prefix_length = local.vpc_peering_range_prefix
  network       = google_compute_network.main.id
}

resource "google_service_networking_connection" "private_services" {
  network                 = google_compute_network.main.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_services.name]
  depends_on              = [google_project_service.servicenetworking]
}

resource "google_vpc_access_connector" "serverless" {
  name          = local.vpc_connector_name
  region        = var.region
  network       = google_compute_network.main.id
  ip_cidr_range = local.vpc_connector_cidr
  depends_on    = [google_project_service.vpcaccess]
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
      ipv4_enabled    = false
      private_network = google_compute_network.main.id 
    }
  }

  deletion_protection = false

  depends_on = [google_service_networking_connection.private_services]
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

    vpc_access {
      connector = google_vpc_access_connector.serverless.id
      egress    = "PRIVATE_RANGES_ONLY"
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
      connector = google_vpc_access_connector.serverless.id
      egress    = "PRIVATE_RANGES_ONLY"
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

resource "google_project_iam_member" "default_compute_vpcaccess_admin" {
  project = var.project_id
  role    = "roles/vpcaccess.admin"
  member  = "serviceAccount:${var.service_account}"
}

resource "google_project_iam_member" "default_compute_servicenetworking_admin" {
  project = var.project_id
  role    = "roles/servicenetworking.networksAdmin"
  member  = "serviceAccount:${var.service_account}"
}

resource "google_project_iam_member" "default_compute_compute_network_admin" {
  project = var.project_id
  role    = "roles/compute.networkAdmin"
  member  = "serviceAccount:${var.service_account}"
}

resource "google_project_iam_member" "default_compute_serviceusage_admin" {
  project = var.project_id
  role    = "roles/serviceusage.serviceUsageAdmin"
  member  = "serviceAccount:${var.service_account}"
}

resource "google_project_iam_member" "terraform_runner_compute_network_admin" {
  project = var.project_id
  role    = "roles/compute.networkAdmin"
  member  = "serviceAccount:${var.service_account}"
}

resource "google_project_iam_member" "terraform_runner_vpcaccess_admin" {
  project = var.project_id
  role    = "roles/vpcaccess.admin"
  member  = "serviceAccount:${var.service_account}"
}

resource "google_project_iam_member" "terraform_runner_servicenetworking_admin" {
  project = var.project_id
  role    = "roles/servicenetworking.networksAdmin"
  member  = "serviceAccount:${var.service_account}"
}

resource "google_project_iam_member" "terraform_runner_serviceusage_admin" {
  project = var.project_id
  role    = "roles/serviceusage.serviceUsageAdmin"
  member  = "serviceAccount:${var.service_account}"
}
