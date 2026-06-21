#!/bin/bash

# Font Subsetting Script
# Mengurangi ukuran font file dengan menghapus glyphs yang tidak digunakan
#
# Requirements:
#   npm install -g glyphhanger
#
# Usage:
#   ./subset-font.sh input.woff2 output.woff2 [charset]
#
# Examples:
#   ./subset-font.sh inter.woff2 inter-latin.woff2 latin
#   ./subset-font.sh inter.woff2 inter-custom.woff2 custom

set -e

INPUT_FONT="$1"
OUTPUT_FONT="$2"
CHARSET="${3:-latin}"

if [ -z "$INPUT_FONT" ] || [ -z "$OUTPUT_FONT" ]; then
  echo "Usage: $0 <input-font> <output-font> [charset]"
  echo ""
  echo "Charset options:"
  echo "  latin       - Basic Latin characters (default)"
  echo "  extended    - Latin + Extended Latin"
  echo "  custom      - Custom whitelist (edit script)"
  echo "  us-ascii    - US ASCII only"
  echo ""
  echo "Examples:"
  echo "  $0 inter.woff2 inter-latin.woff2 latin"
  echo "  $0 roboto.woff2 roboto-ascii.woff2 us-ascii"
  exit 1
fi

if [ ! -f "$INPUT_FONT" ]; then
  echo "Error: Input font '$INPUT_FONT' not found"
  exit 1
fi

# Check if glyphhanger is installed
if ! command -v glyphhanger &> /dev/null; then
  echo "Error: glyphhanger not found"
  echo "Install with: npm install -g glyphhanger"
  exit 1
fi

echo "Subsetting font: $INPUT_FONT"
echo "Output: $OUTPUT_FONT"
echo "Charset: $CHARSET"
echo ""

case $CHARSET in
  latin)
    echo "Using Latin character set..."
    glyphhanger --subset="$INPUT_FONT" \
      --formats=woff2 \
      --whitelist="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,!?;:'\"()[]{}@#$%&*+-=/\\|<> "
    ;;
  
  extended)
    echo "Using Extended Latin character set..."
    glyphhanger --subset="$INPUT_FONT" \
      --formats=woff2 \
      --LATIN
    ;;
  
  us-ascii)
    echo "Using US ASCII character set..."
    glyphhanger --subset="$INPUT_FONT" \
      --formats=woff2 \
      --US_ASCII
    ;;
  
  custom)
    echo "Using custom character set..."
    # Edit whitelist di bawah sesuai kebutuhan
    CUSTOM_CHARS="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
    glyphhanger --subset="$INPUT_FONT" \
      --formats=woff2 \
      --whitelist="$CUSTOM_CHARS"
    ;;
  
  *)
    echo "Error: Unknown charset '$CHARSET'"
    echo "Valid options: latin, extended, us-ascii, custom"
    exit 1
    ;;
esac

# Rename output file
SUBSET_FILE="${INPUT_FONT%.*}-subset.woff2"
if [ -f "$SUBSET_FILE" ]; then
  mv "$SUBSET_FILE" "$OUTPUT_FONT"
  
  # Get file sizes
  ORIGINAL_SIZE=$(stat -f%z "$INPUT_FONT" 2>/dev/null || stat -c%s "$INPUT_FONT")
  SUBSET_SIZE=$(stat -f%z "$OUTPUT_FONT" 2>/dev/null || stat -c%s "$OUTPUT_FONT")
  
  ORIGINAL_KB=$((ORIGINAL_SIZE / 1024))
  SUBSET_KB=$((SUBSET_SIZE / 1024))
  REDUCTION=$((100 - (SUBSET_SIZE * 100 / ORIGINAL_SIZE)))
  
  echo ""
  echo "✅ Subsetting complete!"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Original:  ${ORIGINAL_KB} KB"
  echo "Subset:    ${SUBSET_KB} KB"
  echo "Reduction: ${REDUCTION}%"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
else
  echo "Error: Subsetting failed"
  exit 1
fi
