#!/usr/bin/env bash
# Eksperymenty chaosu na staging (IMP-462). Każdy eksperyment biegnie przy obciążeniu k6 `tablets`
# (tools/k6/run.sh staging smoke) i kończy się porównaniem liczby arkuszy przed i po (count-sheets.sh).
# Nazwy zasobów AWS – wartości zastępcze do czasu Terraform (IMP-012) i konta AWS staging.
set -euo pipefail
CLUSTER="${CHAOS_CLUSTER:-polechamp-staging}"
SERVICE="${CHAOS_API_SERVICE:-polechamp-api}"
VALKEY_GROUP="${CHAOS_VALKEY_GROUP:-polechamp-staging-valkey}"
RDS_INSTANCE="${CHAOS_RDS_INSTANCE:-polechamp-staging}"

case "${1:-}" in
  valkey) # TC-SYNC-019: węzeł Valkey niedostępny 2 min (FIS: aws:elasticache:interrupt-cluster-az-power).
    aws fis start-experiment --experiment-template-id "${FIS_VALKEY_TEMPLATE:-EXT-PLACEHOLDER-valkey}"
    ;;
  ecs-task) # TC-REL-003: zabicie jednego zadania API w trakcie paczek push.
    TASK="$(aws ecs list-tasks --cluster "$CLUSTER" --service-name "$SERVICE" --query 'taskArns[0]' --output text)"
    aws ecs stop-task --cluster "$CLUSTER" --task "$TASK" --reason "chaos IMP-462 TC-REL-003"
    ;;
  rds-failover) # TC-REL-004: przełączenie Multi-AZ; mierzyć czas niedostępności (≤ 2 min).
    date -u +%FT%TZ
    aws rds reboot-db-instance --db-instance-identifier "$RDS_INSTANCE" --force-failover
    aws rds wait db-instance-available --db-instance-identifier "$RDS_INSTANCE"
    date -u +%FT%TZ
    ;;
  deploy-ws) # TC-REL-005: wdrożenie (rolling) przy ≥ 300 połączeniach WS (k6 ws.js z PROFILE=smoke, WS 300).
    aws ecs update-service --cluster "$CLUSTER" --service "$SERVICE" --force-new-deployment
    aws ecs wait services-stable --cluster "$CLUSTER" --services "$SERVICE"
    ;;
  *)
    echo "Użycie: run.sh valkey|ecs-task|rds-failover|deploy-ws" >&2
    echo "Wyniki: docs-dev/reliability/chaos-<data>.md (szablon chaos-template.md)" >&2
    exit 1
    ;;
esac
