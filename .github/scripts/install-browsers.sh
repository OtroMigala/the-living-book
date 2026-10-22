#!/usr/bin/env bash
# Installs Playwright's browsers and their system packages, with retries:
#   bash .github/scripts/install-browsers.sh chromium firefox webkit
# The system packages come from Ubuntu's mirror, which hung for ten minutes three times on
# 2026-10-22 during a GitHub incident (it normally takes 40–47 s): each try gets 150 s, and there
# are three. Shared by the CI and Deploy workflows.
set -u
for try in 1 2 3; do
  timeout 150 npx playwright install --with-deps "$@" && exit 0
  echo "::warning::installing the browsers failed or timed out (try $try of 3)"
  # A stopped install can leave apt running and dpkg half done, and then every later try fails
  # at once (exit code 100): stop apt, let dpkg finish, try again.
  sudo pkill -f 'apt-get|apt.systemd|dpkg' || true
  sleep 5
  sudo dpkg --configure -a || true
  # Mirror errors (exit code 100 from the first try) can pass in seconds: wait a little.
  sleep 20
done
exit 1
