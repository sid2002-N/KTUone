#!/bin/bash
# Assembles all KTU One source files into a single markdown document
OUT=/home/z/my-project/download/KTU_ONE_CODEBASE.md
> "$OUT"

cat >> "$OUT" << 'HEADER'
# KTU One — Complete Codebase Reference

**Phase 1 + Visual v3.1 (Material Realism)**

This document contains every piece of code written for KTU One Phase 1, organized by layer. Pre-existing shadcn/ui scaffold components are not included — only the KTU One application code.

---

## Table of Contents

1. Project Configuration
2. App Core (layout, page, globals)
3. Design System (globals.css)
4. Domain Types & Constants
5. Provider Architecture
6. Zustand Stores
7. Mock Data
8. Pure Utilities
9. Custom UI Components
10. Sketch & Editorial Components
11. Layout Components
12. Feature Views
13. Signature Experiences
14. File Tree Summary
15. Visual Iteration History

---

HEADER

# Helper to append a file with a header
append_file() {
  local file="$1"
  local title="$2"
  local lang="${3:-tsx}"
  echo "" >> "$OUT"
  echo "## $title" >> "$OUT"
  echo "" >> "$OUT"
  echo "**File:** \`$file\`" >> "$OUT"
  echo "" >> "$OUT"
  echo '```'$lang >> "$OUT"
  cat "$file" >> "$OUT"
  echo '```' >> "$OUT"
  echo "" >> "$OUT"
  echo "---" >> "$OUT"
}

# 1. Project Configuration
echo "# 1. Project Configuration" >> "$OUT"
append_file /home/z/my-project/package.json "package.json" json
append_file /home/z/my-project/public/manifest.webmanifest "manifest.webmanifest" json
append_file /home/z/my-project/tsconfig.json "tsconfig.json" json

# 2. App Core
echo "# 2. App Core" >> "$OUT"
append_file /home/z/my-project/src/app/layout.tsx "src/app/layout.tsx"
append_file /home/z/my-project/src/app/page.tsx "src/app/page.tsx"
append_file /home/z/my-project/src/app/api/route.ts "src/app/api/route.ts"

# 3. Design System
echo "# 3. Design System (globals.css)" >> "$OUT"
append_file /home/z/my-project/src/app/globals.css "src/app/globals.css" css

# 4. Types & Constants
echo "# 4. Domain Types & Constants" >> "$OUT"
append_file /home/z/my-project/src/lib/types/index.ts "src/lib/types/index.ts"
append_file /home/z/my-project/src/lib/constants/index.ts "src/lib/constants/index.ts"
append_file /home/z/my-project/src/lib/utils.ts "src/lib/utils.ts"

# 5. Providers
echo "# 5. Provider Architecture" >> "$OUT"
append_file /home/z/my-project/src/lib/providers/platform.ts "PlatformProvider"
append_file /home/z/my-project/src/lib/providers/storage.ts "StorageProvider"
append_file /home/z/my-project/src/lib/providers/student.ts "StudentService"
append_file /home/z/my-project/src/lib/providers/ads.ts "AdsProvider"
append_file /home/z/my-project/src/lib/providers/payment.ts "PaymentProvider"
append_file /home/z/my-project/src/lib/providers/analytics.ts "AnalyticsProvider"
append_file /home/z/my-project/src/lib/providers/notification.ts "NotificationProvider"
append_file /home/z/my-project/src/lib/providers/index.tsx "Providers (composition root)"

# 6. Stores
echo "# 6. Zustand Stores" >> "$OUT"
append_file /home/z/my-project/src/store/theme-store.ts "theme-store.ts"
append_file /home/z/my-project/src/store/auth-store.ts "auth-store.ts"
append_file /home/z/my-project/src/store/nav-store.ts "nav-store.ts"
append_file /home/z/my-project/src/store/supporter-store.ts "supporter-store.ts"
append_file /home/z/my-project/src/store/calc-history-store.ts "calc-history-store.ts"
append_file /home/z/my-project/src/store/bookmark-store.ts "bookmark-store.ts"

# 7. Mock Data
echo "# 7. Mock Data" >> "$OUT"
append_file /home/z/my-project/src/data/mock-data.ts "src/data/mock-data.ts"

# 8. Pure Utilities
echo "# 8. Pure Utilities (Calculator Logic)" >> "$OUT"
append_file /home/z/my-project/src/lib/utils/calc.ts "src/lib/utils/calc.ts"

# 9. Custom UI Components
echo "# 9. Custom UI Components" >> "$OUT"
append_file /home/z/my-project/src/components/ui-custom/glass-card.tsx "GlassCard"
append_file /home/z/my-project/src/components/ui-custom/gradient-card.tsx "GradientCard"
append_file /home/z/my-project/src/components/ui-custom/stat-card.tsx "StatCard"
append_file /home/z/my-project/src/components/ui-custom/circular-progress.tsx "CircularProgress"
append_file /home/z/my-project/src/components/ui-custom/animated-counter.tsx "AnimatedCounter"
append_file /home/z/my-project/src/components/ui-custom/empty-state.tsx "EmptyState"
append_file /home/z/my-project/src/components/ui-custom/banner-ad.tsx "BannerAd"

# 10. Sketch & Editorial
echo "# 10. Sketch & Editorial Components" >> "$OUT"
append_file /home/z/my-project/src/components/ui-custom/sketch-elements.tsx "SketchElements"
append_file /home/z/my-project/src/components/ui-custom/handwritten-text.tsx "HandwrittenText"
append_file /home/z/my-project/src/components/ui-custom/card-decoration.tsx "CardDecoration"
append_file /home/z/my-project/src/components/ui-custom/editorial-divider.tsx "EditorialDivider"
append_file /home/z/my-project/src/components/brand/logo.tsx "Logo"

# 11. Layout
echo "# 11. Layout Components" >> "$OUT"
append_file /home/z/my-project/src/components/layout/app-shell.tsx "AppShell"
append_file /home/z/my-project/src/components/layout/page-header.tsx "PageHeader"

# 12. Features
echo "# 12. Feature Views" >> "$OUT"
append_file /home/z/my-project/src/features/dashboard/dashboard.tsx "Dashboard"
append_file /home/z/my-project/src/features/calculators/calculators.tsx "Calculators"
append_file /home/z/my-project/src/features/papers/papers.tsx "Question Papers"
append_file /home/z/my-project/src/features/syllabus/syllabus.tsx "Syllabus"
append_file /home/z/my-project/src/features/calendar/calendar.tsx "Calendar"
append_file /home/z/my-project/src/features/notices/notices.tsx "Notices"
append_file /home/z/my-project/src/features/settings/settings.tsx "Settings"

# 13. Signature Experiences
echo "# 13. Signature Experiences" >> "$OUT"
append_file /home/z/my-project/src/components/support/support-curtain.tsx "Support Curtain"
append_file /home/z/my-project/src/features/login/login-dialog.tsx "Login Dialog"
append_file /home/z/my-project/src/features/search/search-overlay.tsx "Universal Search Overlay"

echo ""
echo "Done."
wc -l "$OUT"
ls -lh "$OUT"
