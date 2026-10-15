resource "aws_sqs_queue" "hotel" {
  name = "${var.project_name}-queue"

  visibility_timeout_seconds = 30
  message_retention_seconds  = 345600

  sqs_managed_sse_enabled = true

  tags = {
    Name        = "${var.project_name}-queue"
    Environment = var.environment
  }
}
