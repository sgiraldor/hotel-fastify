resource "aws_elasticache_subnet_group" "hotel" {
  name = "${var.project_name}-redis-subnet-group"

  subnet_ids = [
    aws_subnet.private_a.id,
    aws_subnet.private_b.id
  ]

  tags = {
    Name        = "${var.project_name}-redis-subnet-group"
    Environment = var.environment
  }
}

resource "aws_elasticache_replication_group" "hotel" {
  replication_group_id = "${var.project_name}-redis"
  description          = "Redis para la API Hotel"

  engine    = "redis"
  node_type = "cache.t3.micro"
  port      = 6379

  num_cache_clusters = 1

  subnet_group_name  = aws_elasticache_subnet_group.hotel.name
  security_group_ids = [aws_security_group.redis.id]

  automatic_failover_enabled = false
  multi_az_enabled           = false

  tags = {
    Name        = "${var.project_name}-redis"
    Environment = var.environment
  }
}
