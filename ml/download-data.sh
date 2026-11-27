#!/usr/bin/env bash
# Re-download the training datasets so the provenance is reproducible.
# All three sources are public, ungated, no auth, no key.
#
# 1. UCI SMS Spam Collection (deduplicated) — jngb-labs/sms-spam
#    https://huggingface.co/datasets/jngb-labs/sms-spam
# 2. Enron spam emails — SetFit/enron_spam (train.jsonl + test.jsonl)
#    https://huggingface.co/datasets/SetFit/enron_spam
# 3. Phishing emails — zefang-liu/phishing-email-dataset (LGPL-3.0)
#    https://huggingface.co/datasets/zefang-liu/phishing-email-dataset
#
# The raw downloads land in ml/data/raw/ (NOT committed — 150+ MB).
# ml/prepare-data.mjs samples them (seeded) into the committed CSVs:
# ml/data/sms-spam.csv (whole UCI set, already in repo),
# ml/data/enron-sample.csv (6,000), ml/data/phishing-sample.csv (5,000).
set -euo pipefail
cd "$(dirname "$0")/data"
mkdir -p raw
curl -L -o sms-spam.csv "https://huggingface.co/datasets/jngb-labs/sms-spam/resolve/main/data.csv?download=true"
curl -sL -o LICENSE.txt "https://huggingface.co/datasets/jngb-labs/sms-spam/resolve/main/LICENSE"
curl -L -o raw/enron-train.jsonl "https://huggingface.co/datasets/SetFit/enron_spam/resolve/main/train.jsonl"
curl -L -o raw/enron-test.jsonl "https://huggingface.co/datasets/SetFit/enron_spam/resolve/main/test.jsonl"
curl -L -o raw/Phishing_Email.csv "https://huggingface.co/datasets/zefang-liu/phishing-email-dataset/resolve/main/Phishing_Email.csv"
curl -sL -o LICENSE-lgpl-3.0.txt "https://www.gnu.org/licenses/lgpl-3.0.txt"
echo "--- SHA-256 (record these in ml/README.md) ---"
sha256sum sms-spam.csv raw/enron-train.jsonl raw/enron-test.jsonl raw/Phishing_Email.csv
echo "expected sms-spam.csv: 7d26034188ae533814ad3738dcb08223b41e232537d13606ad1c294815132eff"
