terraform {
  backend "s3" {
    bucket = "hotel-storage-837465732903"
    key    = "terraform/hotel.tfstate"
    region = "us-east-2"
  }
}