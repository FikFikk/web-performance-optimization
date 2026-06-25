#!/bin/bash

# Script untuk pre-compress build output dengan Brotli + Gzip
# Usage: ./compress-build.sh [build-directory]

set -e

BUILD_DIR="${1:-dist}"
BROTLI_QUALITY="${BROTLI_QUALITY:-11}"
GZIP_LEVEL="${GZIP_LEVEL:-9}"
MIN_SIZE="${MIN_SIZE:-1024}"  # 1KB minimum

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🗜️  Compressing build output...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# Check if build directory exists
if [ ! -d "$BUILD_DIR" ]; then
    echo -e "${RED}✗ Error: Build directory '$BUILD_DIR' not found${NC}"
    exit 1
fi

# Check if brotli is installed
if ! command -v brotli &> /dev/null; then
    echo -e "${YELLOW}⚠ Warning: brotli not found, installing...${NC}"
    npm install -g brotli-cli
fi

# Stats
total_files=0
compressed_files=0
total_original_size=0
total_brotli_size=0
total_gzip_size=0

# Find files to compress
echo -e "${BLUE}Searching for compressible files in $BUILD_DIR...${NC}\n"

find "$BUILD_DIR" -type f \( \
    -name "*.js" -o \
    -name "*.css" -o \
    -name "*.html" -o \
    -name "*.json" -o \
    -name "*.svg" -o \
    -name "*.xml" -o \
    -name "*.txt" \
\) -size +${MIN_SIZE}c | while read -r file; do
    
    # Skip already compressed files
    if [[ "$file" == *.br ]] || [[ "$file" == *.gz ]]; then
        continue
    fi
    
    total_files=$((total_files + 1))
    
    original_size=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file")
    total_original_size=$((total_original_size + original_size))
    
    # Brotli compression
    if brotli -q "$BROTLI_QUALITY" -o "$file.br" "$file" 2>/dev/null; then
        brotli_size=$(stat -f%z "$file.br" 2>/dev/null || stat -c%s "$file.br")
        total_brotli_size=$((total_brotli_size + brotli_size))
        
        brotli_ratio=$(awk "BEGIN {printf \"%.1f\", (1 - $brotli_size / $original_size) * 100}")
        
        echo -e "${GREEN}✓${NC} $(basename "$file")"
        echo -e "  Original: $(numfmt --to=iec-i --suffix=B $original_size)"
        echo -e "  Brotli:   $(numfmt --to=iec-i --suffix=B $brotli_size) (${brotli_ratio}% reduction)"
    else
        echo -e "${RED}✗${NC} Failed to compress $(basename "$file") with Brotli"
    fi
    
    # Gzip compression
    if gzip -${GZIP_LEVEL}c "$file" > "$file.gz" 2>/dev/null; then
        gzip_size=$(stat -f%z "$file.gz" 2>/dev/null || stat -c%s "$file.gz")
        total_gzip_size=$((total_gzip_size + gzip_size))
        
        gzip_ratio=$(awk "BEGIN {printf \"%.1f\", (1 - $gzip_size / $original_size) * 100}")
        
        echo -e "  Gzip:     $(numfmt --to=iec-i --suffix=B $gzip_size) (${gzip_ratio}% reduction)"
    else
        echo -e "${RED}✗${NC} Failed to compress $(basename "$file") with Gzip"
    fi
    
    compressed_files=$((compressed_files + 1))
    echo ""
done

# Summary
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📊 Compression Summary${NC}\n"

if [ $compressed_files -eq 0 ]; then
    echo -e "${YELLOW}No files were compressed (minimum size: $MIN_SIZE bytes)${NC}"
else
    echo -e "Files processed:     $compressed_files"
    echo -e "Total original size: $(numfmt --to=iec-i --suffix=B $total_original_size)"
    echo -e "Total Brotli size:   $(numfmt --to=iec-i --suffix=B $total_brotli_size)"
    echo -e "Total Gzip size:     $(numfmt --to=iec-i --suffix=B $total_gzip_size)"
    
    brotli_total_ratio=$(awk "BEGIN {printf \"%.1f\", (1 - $total_brotli_size / $total_original_size) * 100}")
    gzip_total_ratio=$(awk "BEGIN {printf \"%.1f\", (1 - $total_gzip_size / $total_original_size) * 100}")
    
    echo ""
    echo -e "${GREEN}Brotli reduction: ${brotli_total_ratio}%${NC}"
    echo -e "${GREEN}Gzip reduction:   ${gzip_total_ratio}%${NC}"
    
    brotli_vs_gzip=$(awk "BEGIN {printf \"%.1f\", (1 - $total_brotli_size / $total_gzip_size) * 100}")
    echo -e "${GREEN}Brotli vs Gzip:   ${brotli_vs_gzip}% smaller${NC}"
    
    echo ""
    echo -e "${GREEN}✓ Compression complete!${NC}"
fi

exit 0
