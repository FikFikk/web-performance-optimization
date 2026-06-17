#!/bin/bash

# Image Optimization Shell Script
# Batch convert JPEG/PNG to WebP and AVIF menggunakan CLI tools

set -e

# Colors untuk output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
INPUT_DIR="${1:-.}"
WEBP_QUALITY=85
AVIF_QUALITY=80
AVIF_SPEED=6

# Counters
CONVERTED=0
SKIPPED=0
ERRORS=0

echo "🖼️  Image Converter: WebP & AVIF"
echo "Input directory: $INPUT_DIR"
echo ""

# Check dependencies
check_dependencies() {
  local missing=()
  
  if ! command -v cwebp &> /dev/null; then
    missing+=("cwebp (webp)")
  fi
  
  if ! command -v avifenc &> /dev/null; then
    missing+=("avifenc (libavif)")
  fi
  
  if [ ${#missing[@]} -gt 0 ]; then
    echo -e "${RED}Error: Missing dependencies${NC}"
    for dep in "${missing[@]}"; do
      echo "  - $dep"
    done
    echo ""
    echo "Install with:"
    echo "  Ubuntu/Debian: apt-get install webp libavif-bin"
    echo "  macOS: brew install webp libavif"
    exit 1
  fi
}

# Convert single image
convert_image() {
  local input="$1"
  local base="${input%.*}"
  local webp_output="${base}.webp"
  local avif_output="${base}.avif"
  
  # Skip if both formats already exist
  if [ -f "$webp_output" ] && [ -f "$avif_output" ]; then
    echo -e "${YELLOW}⊘${NC} Skipped: $(basename "$input") (already converted)"
    ((SKIPPED++))
    return
  fi
  
  echo "Processing: $(basename "$input")"
  
  # Get original size
  local orig_size=$(stat -f%z "$input" 2>/dev/null || stat -c%s "$input" 2>/dev/null)
  
  # Convert to WebP
  if [ ! -f "$webp_output" ]; then
    if cwebp -q $WEBP_QUALITY "$input" -o "$webp_output" -quiet 2>/dev/null; then
      local webp_size=$(stat -f%z "$webp_output" 2>/dev/null || stat -c%s "$webp_output" 2>/dev/null)
      local webp_reduction=$(awk "BEGIN {printf \"%.1f\", (1 - $webp_size / $orig_size) * 100}")
      echo -e "  ${GREEN}✓${NC} WebP: $(numfmt --to=iec-i --suffix=B $webp_size) (-${webp_reduction}%)"
    else
      echo -e "  ${RED}✗${NC} WebP conversion failed"
      ((ERRORS++))
      return
    fi
  fi
  
  # Convert to AVIF
  if [ ! -f "$avif_output" ]; then
    if avifenc -s $AVIF_SPEED -q $AVIF_QUALITY "$input" "$avif_output" 2>/dev/null; then
      local avif_size=$(stat -f%z "$avif_output" 2>/dev/null || stat -c%s "$avif_output" 2>/dev/null)
      local avif_reduction=$(awk "BEGIN {printf \"%.1f\", (1 - $avif_size / $orig_size) * 100}")
      echo -e "  ${GREEN}✓${NC} AVIF: $(numfmt --to=iec-i --suffix=B $avif_size) (-${avif_reduction}%)"
    else
      echo -e "  ${RED}✗${NC} AVIF conversion failed"
      ((ERRORS++))
      return
    fi
  fi
  
  ((CONVERTED++))
}

# Main execution
main() {
  check_dependencies
  
  echo "Scanning for images..."
  echo ""
  
  # Find and convert all JPEG/PNG files
  find "$INPUT_DIR" -type f \( -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" \) | while read -r img; do
    convert_image "$img"
  done
  
  echo ""
  echo "=============================="
  echo "CONVERSION SUMMARY"
  echo "=============================="
  echo -e "Converted: ${GREEN}$CONVERTED${NC}"
  echo -e "Skipped: ${YELLOW}$SKIPPED${NC}"
  echo -e "Errors: ${RED}$ERRORS${NC}"
  echo "=============================="
}

main
