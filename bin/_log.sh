# Shared helpers of the scripts in bin/. Source it, do not run it.
# Each event goes to the terminal and, as one JSON line, to the log file.
TDT_LOG="${XDG_STATE_HOME:-$HOME/.local/state}/discourse-tag-description-tooltip/scripts.jsonl"
mkdir -p "$(dirname "$TDT_LOG")"

# log <event> <status> <message>
log() {
  printf '%s: %s\n' "$1" "$3"
  printf '{"time":"%s","script":"%s","event":"%s","status":"%s"}\n' \
    "$(date -Is)" "$(basename "$0")" "$1" "$2" >>"$TDT_LOG"
}

# find_container: set TDT_CONTAINER and TDT_WORKSPACE (the host folder that the container mounts at /workspace).
# DISCOURSE_DEV_CONTAINER names the container. Else take the one running container that mounts
# a host folder at /workspace with a Discourse core checkout at /workspace/discourse
# (the layout of the Discourse dev container).
find_container() {
  local name candidates=()
  if [ -n "${DISCOURSE_DEV_CONTAINER:-}" ]; then
    candidates=("$DISCOURSE_DEV_CONTAINER")
  else
    for name in $(docker ps --format '{{.Names}}'); do
      if docker exec "$name" test -x /workspace/discourse/bin/qunit 2>/dev/null; then
        candidates+=("$name")
      fi
    done
  fi
  if [ "${#candidates[@]}" -ne 1 ]; then
    log container failed "found ${#candidates[@]} running Discourse dev containers. Start one, or set DISCOURSE_DEV_CONTAINER"
    exit 1
  fi
  TDT_CONTAINER="${candidates[0]}"
  TDT_WORKSPACE="$(docker inspect -f '{{range .Mounts}}{{if eq .Destination "/workspace"}}{{.Source}}{{end}}{{end}}' "$TDT_CONTAINER")"
  if [ -z "$TDT_WORKSPACE" ]; then
    log container failed "container $TDT_CONTAINER mounts no host folder at /workspace"
    exit 1
  fi
  log container ok "container $TDT_CONTAINER, /workspace is $TDT_WORKSPACE"
}

# in_container <command...>: run in core as the user discourse.
in_container() {
  docker exec -u discourse -w /workspace/discourse "$TDT_CONTAINER" "$@"
}

# find_checkout: set TDT_DIR, the path of this checkout inside the container. Call find_container first.
find_checkout() {
  local checkout rel
  # A git hook sets GIT_DIR, and git then reports the wrong top folder. So ask git without it.
  checkout="$(env -u GIT_DIR -u GIT_WORK_TREE git -C "$(dirname "$0")" rev-parse --show-toplevel)"
  rel="$(realpath -m --relative-to="$TDT_WORKSPACE" "$checkout")"
  case "$rel" in
    ../* | /*)
      log checkout failed "$checkout is outside $TDT_WORKSPACE, so the container cannot see it"
      exit 1
      ;;
  esac
  TDT_DIR="/workspace/$rel"
}

# in_checkout <command...>: run in this checkout inside the container, as the user discourse.
in_checkout() {
  docker exec -u discourse -w "$TDT_DIR" "$TDT_CONTAINER" "$@"
}
