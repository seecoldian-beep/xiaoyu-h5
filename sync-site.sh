#!/usr/bin/env bash
set -euo pipefail

SITE_BASE="https://xiaoyu-old-feel-h5.jianlangyuan2.chatgpt.site"

download_file() {
  local path="$1"
  mkdir -p -- "$(dirname -- "$path")"
  curl --fail --location --silent --show-error \
    --retry 5 --retry-delay 2 --retry-all-errors \
    "$SITE_BASE/$path" --output "$path"
}

export SITE_BASE
export -f download_file

while IFS= read -r path; do
  printf '%s\n' "$path"
done <<'FILES' | xargs -n 1 -P 6 bash -c 'download_file "$1"' _
app-interactions.js
app.js
assets/bedroom.png
assets/bedroom/backdrop.png
assets/bedroom/layer-10.png
assets/bedroom/layer-12.png
assets/bedroom/layer-13.png
assets/bedroom/layer-14.png
assets/bedroom/layer-15.png
assets/bedroom/layer-34.png
assets/bedroom/layer-35.png
assets/bedroom/layer-5.png
assets/bedroom/layer-8.png
assets/classroom.png
assets/extension/charts-data.js
assets/extension/charts/age.svg
assets/extension/charts/health.svg
assets/extension/charts/phone-use.svg
assets/extension/charts/screen-time.svg
assets/extension/charts/word-cloud.svg
assets/extension/layers/layer-187.png
assets/extension/layers/layer-236.png
assets/extension/layers/layer-237.png
assets/extension/layers/layer-240.png
assets/extension/layers/layer-242.png
assets/extension/layers/layer-246.png
assets/extension/layers/layer-248.png
assets/extension/layers/layer-249.png
assets/extension/layers/layer-256.png
assets/extension/layers/layer-257.png
assets/extension/layers/layer-258.png
assets/extension/layers/layer-259.png
assets/extension/layers/layer-260.png
assets/extension/layers/layer-261.png
assets/extension/layers/layer-263.png
assets/extension/layers/layer-264.png
assets/extension/layers/layer-265.png
assets/extension/layers/layer-266.png
assets/extension/layers/layer-270.png
assets/extension/layers/layer-271.png
assets/extension/layers/layer-273.png
assets/extension/layers/layer-274.png
assets/extension/layers/layer-276.png
assets/extension/layers/layer-283.png
assets/extension/layers/layer-284.png
assets/extension/layers/layer-285.png
assets/extension/layers/layer-450.png
assets/extension/layers/layer-529.png
assets/extension/layers/layer-531.png
assets/extension/layers/layer-532.png
assets/extension/layers/layer-680.png
assets/extension/manifest.js
assets/extension/manifest.json
assets/extension/map-data.js
assets/extension/map/policies.json
assets/extension/map/world-map.svg
assets/extension/scenes/backdrop-age-chart.jpg
assets/extension/scenes/backdrop-data-transition.jpg
assets/extension/scenes/backdrop-ending.jpg
assets/extension/scenes/backdrop-health-chart.jpg
assets/extension/scenes/backdrop-interview-intro.jpg
assets/extension/scenes/backdrop-interview-one.jpg
assets/extension/scenes/backdrop-interview-three.jpg
assets/extension/scenes/backdrop-interview-two.jpg
assets/extension/scenes/backdrop-policy-map.jpg
assets/extension/scenes/backdrop-usage-charts.jpg
assets/extension/scenes/backdrop-word-cloud.jpg
assets/extension/scenes/final-age-chart.jpg
assets/extension/scenes/final-data-transition.jpg
assets/extension/scenes/final-ending.jpg
assets/extension/scenes/final-health-chart.jpg
assets/extension/scenes/final-interview-intro.jpg
assets/extension/scenes/final-interview-one.jpg
assets/extension/scenes/final-interview-three.jpg
assets/extension/scenes/final-interview-two.jpg
assets/extension/scenes/final-policy-map.jpg
assets/extension/scenes/final-usage-charts.jpg
assets/extension/scenes/final-word-cloud.jpg
assets/interaction/environment-8.png
assets/interaction/layer-100.png
assets/interaction/layer-101.png
assets/interaction/layer-102.png
assets/interaction/layer-103.png
assets/interaction/layer-104.png
assets/interaction/layer-16.png
assets/interaction/layer-17.png
assets/interaction/layer-18.png
assets/interaction/layer-19.png
assets/interaction/layer-22-blend-if.png
assets/interaction/layer-22.png
assets/interaction/layer-23.png
assets/interaction/layer-24.png
assets/interaction/layer-25.png
assets/interaction/layer-26.png
assets/interaction/layer-27-blend-if.png
assets/interaction/layer-27.png
assets/interaction/layer-28-blend-if.png
assets/interaction/layer-28.png
assets/interaction/layer-29.png
assets/interaction/layer-30-blend-if.png
assets/interaction/layer-30.png
assets/interaction/layer-33.png
assets/interaction/layer-36.png
assets/interaction/layer-37.png
assets/interaction/layer-38.png
assets/interaction/layer-60.png
assets/interaction/layer-61.png
assets/interaction/layer-62.png
assets/interaction/layer-63-blend-if.png
assets/interaction/layer-63.png
assets/interaction/layer-64.png
assets/interaction/layer-65.png
assets/interaction/layer-71.png
assets/interaction/layer-74.png
assets/interaction/layer-75.png
assets/interaction/layer-76.png
assets/interaction/layer-77.png
assets/interaction/layer-78.png
assets/interaction/layer-84.png
assets/interaction/layer-85-blend-if.png
assets/interaction/layer-85.png
assets/interaction/layer-86.png
assets/interaction/layer-87.png
assets/interaction/layer-88.png
assets/interaction/layer-89.png
assets/interaction/layer-90.png
assets/interaction/layer-91.png
assets/interaction/layer-92.png
assets/interaction/layer-93.png
assets/interaction/layer-95.png
assets/interaction/layer-96.png
assets/interaction/layer-97.png
assets/interaction/layer-98.png
assets/interaction/layer-99.png
assets/interaction/opening-backdrop.png
assets/interaction/opening-clean-backdrop.png
assets/interaction/title-74-transparent.png
assets/interaction/title-74-with-effect.png
assets/interaction/title-75-transparent.png
assets/interaction/title-75-with-effect.png
assets/interaction/title-77-transparent.png
assets/interaction/title-77-with-effect.png
assets/interactions.js
assets/interactions.json
assets/introduction.png
assets/manifest.js
assets/manifest.json
assets/online-world.png
assets/opening.png
assets/school-road.png
assets/transition.png
extension-charts.js
extension-core.js
extension-map.js
extension.css
extension.js
index.html
interaction-core.js
mobile-pager.css
mobile-pager.js
site-shell.css
site-shell.js
styles-interactions.css
styles.css
FILES

touch .nojekyll
echo "Synced 164 H5 source and asset files."
