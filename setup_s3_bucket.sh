#!/bin/bash

# ==============================================================================
# S3 BUCKET SETUP SCRIPT FOR FINANCE TRACKER
# ==============================================================================
# Script ini akan membuat bucket S3 dengan best-practices keamanan:
# 1. Block Public Access (Mencegah data bocor ke publik)
# 2. Versioning Enabled (Mencegah data hilang jika tertimpa/terhapus)
# 3. Default Encryption (SSE-S3)
# 4. CORS Policy (Mengizinkan upload dari pre-signed URL)
# ==============================================================================

# Nama bucket S3 bersifat globally unique, kita tambahkan random string/timestamp di belakangnya
TIMESTAMP=$(date +%s)
BUCKET_NAME="finance-tracker-prod-receipts-$TIMESTAMP"
REGION="ap-southeast-1" # Singapore

echo "🚀 Memulai Setup S3 Bucket: $BUCKET_NAME di region $REGION..."
echo "------------------------------------------------------------"

# 1. Create Bucket
echo "📦 1. Membuat bucket..."
aws s3api create-bucket \
    --bucket "$BUCKET_NAME" \
    --region "$REGION" \
    --create-bucket-configuration LocationConstraint="$REGION"

if [ $? -ne 0 ]; then
    echo "❌ Gagal membuat bucket. Pastikan AWS CLI sudah terkonfigurasi (aws configure)."
    exit 1
fi

# 2. Block Public Access (PREVENT DATA LEAK)
echo "🔒 2. Mengaktifkan Block Public Access..."
aws s3api put-public-access-block \
    --bucket "$BUCKET_NAME" \
    --public-access-block-configuration "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

# 3. Enable Versioning (PREVENT DATA LOSS)
echo "🛡️ 3. Mengaktifkan Versioning..."
aws s3api put-bucket-versioning \
    --bucket "$BUCKET_NAME" \
    --versioning-configuration Status=Enabled

# 4. Enable Default Encryption (COMPLIANCE)
echo "🔑 4. Mengaktifkan Default Encryption (SSE-S3)..."
aws s3api put-bucket-encryption \
    --bucket "$BUCKET_NAME" \
    --server-side-encryption-configuration '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'

# 5. Configure CORS (MENGIZINKAN PRE-SIGNED URL UPLOAD)
echo "🌐 5. Mengatur CORS Policy..."
cat <<EOF > temp-cors.json
{
  "CORSRules": [
    {
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["PUT", "GET"],
      "AllowedOrigins": ["*"], 
      "ExposeHeaders": [],
      "MaxAgeSeconds": 3600
    }
  ]
}
EOF
# Catatan: Di production sungguhan, AllowedOrigins ["*"] sebaiknya diganti dengan domain frontend Anda
aws s3api put-bucket-cors --bucket "$BUCKET_NAME" --cors-configuration file://temp-cors.json
rm temp-cors.json

echo "------------------------------------------------------------"
echo "✅ Setup Selesai dengan Sukses!"
echo "Bucket Anda siap digunakan secara aman."
echo ""
echo "📝 NEXT STEPS:"
echo "1. Copy nama bucket ini:"
echo "   $BUCKET_NAME"
echo "2. Masukkan ke file .env di Backend Node.js Anda:"
echo "   AWS_REGION=$REGION"
echo "   S3_BUCKET_NAME=$BUCKET_NAME"
echo "============================================================"
