#!/usr/bin/env bash
# Uruchomienie k6 (IMP-461): lokalnie `tools/k6/run.sh local smoke`, na staging z zadania ECS w tym samym
# regionie `tools/k6/run.sh staging 1x`. Wartości zasobów AWS – zastępcze do czasu Terraform (IMP-012).
set -euo pipefail
ENVIRONMENT="${1:-local}"
PROFILE="${2:-smoke}"
DATE="$(date +%Y-%m-%d)"

case "$ENVIRONMENT" in
  local)
    k6 run -e API_URL="${API_URL:-http://localhost:3000}" -e PROFILE="$PROFILE" \
      --summary-export "reports/k6-$PROFILE-$DATE.json" "$(dirname "$0")/load.js"
    ;;
  staging)
    # Zadanie ECS z obrazem grafana/k6 i skryptami z repozytorium; metryki do CloudWatch (statsd → agent CW).
    aws ecs run-task \
      --cluster "${K6_CLUSTER:-polechamp-staging}" \
      --task-definition "${K6_TASK:-polechamp-k6}" \
      --launch-type FARGATE \
      --network-configuration "awsvpcConfiguration={subnets=[${K6_SUBNETS:-subnet-PLACEHOLDER}],securityGroups=[${K6_SG:-sg-PLACEHOLDER}]}" \
      --overrides "{\"containerOverrides\":[{\"name\":\"k6\",\"environment\":[{\"name\":\"PROFILE\",\"value\":\"$PROFILE\"},{\"name\":\"API_URL\",\"value\":\"${STAGING_API_URL:-https://api.staging.polechamp.app}\"},{\"name\":\"K6_STATSD_ENABLE_TAGS\",\"value\":\"true\"}]}]}"
    echo "Raport: docs-dev/perf/k6-$DATE.md (szablon: docs-dev/perf/k6-template.md)"
    ;;
  *)
    echo "Użycie: run.sh local|staging smoke|1x|2x" >&2
    exit 1
    ;;
esac
