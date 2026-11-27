#!/usr/bin/env bash
# Re-download the training dataset so the provenance is reproducible.
# Source: https://huggingface.co/datasets/jngb-labs/sms-spam (UCI SMS Spam
# Collection, deduplicated). No auth needed — public, ungated.
# Expected SHA-256 (verified 2026-11-27):
#   7d26034188ae533814ad3738dcb08223b41e232537d13606ad1c294815132eff
set -euo pipefail
cd "$(dirname "$0")/data"
curl -L -o sms-spam.csv "https://huggingface.co/datasets/jngb-labs/sms-spam/resolve/main/data.csv?download=true"
curl -sL -o LICENSE.txt "https://huggingface.co/datasets/jngb-labs/sms-spam/resolve/main/LICENSE"
sha256sum sms-spam.csv
echo "expected: 7d26034188ae533814ad3738dcb08223b41e232537d13606ad1c294815132eff"
