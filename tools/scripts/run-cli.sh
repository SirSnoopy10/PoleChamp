#!/usr/bin/env bash
# Polecenie operatora jako jednorazowe zadanie ECS (IMP-178, TL-38).
# Użycie: tools/scripts/run-cli.sh <dev|staging|production> <polecenie> [opcje…]
#   np. tools/scripts/run-cli.sh staging account:unlock ola@studio.pl --operator adam.s
# Wymaga roli AWS z zatwierdzeniem środowiska (GitHub Environments) – patrz ops/runbooks/operator-cli.md.
# Nazwy klastra, definicji zadania i podsieci pochodzą z wyjść Terraform (IMP-01x) – do uzupełnienia po
# utworzeniu infrastruktury.
set -euo pipefail

env="${1:?Podaj środowisko: dev|staging|production}"
shift
[[ $# -ge 1 ]] || { echo "Podaj polecenie CLI" >&2; exit 2; }
case "$env" in dev|staging|production) ;; *) echo "Nieznane środowisko: $env" >&2; exit 2 ;; esac
[[ " $* " == *" --operator "* ]] || { echo "Wymagany --operator <identyfikator>" >&2; exit 2; }

cluster="polechamp-${env}"
task_def="polechamp-${env}-cli"
subnets="${POLECHAMP_PRIVATE_SUBNETS:?Ustaw POLECHAMP_PRIVATE_SUBNETS (wyjście Terraform)}"
security_group="${POLECHAMP_CLI_SG:?Ustaw POLECHAMP_CLI_SG (wyjście Terraform)}"

command_json=$(printf '%s\n' "node" "dist/cli.js" "$@" | jq -R . | jq -s -c .)
overrides=$(jq -n -c --argjson cmd "$command_json" '{containerOverrides: [{name: "api", command: $cmd}]}')

task_arn=$(aws ecs run-task \
  --cluster "$cluster" \
  --task-definition "$task_def" \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[${subnets}],securityGroups=[${security_group}],assignPublicIp=DISABLED}" \
  --overrides "$overrides" \
  --query 'tasks[0].taskArn' --output text)

echo "Zadanie: $task_arn"
aws ecs wait tasks-stopped --cluster "$cluster" --tasks "$task_arn"
aws ecs describe-tasks --cluster "$cluster" --tasks "$task_arn" \
  --query 'tasks[0].containers[0].{exitCode: exitCode, reason: reason}'
echo "Wynik w CloudWatch Logs: /ecs/${task_def}"
