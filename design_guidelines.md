{
  "meta": {
    "product": "F&B Financial Control Platform (Multi-portal ERP)",
    "style": "Dark glassmorphism + enterprise data-density (executive drill-down + fast outlet ops)",
    "implementation_note": "Project uses React .js (not .tsx). Use shadcn/ui components from /frontend/src/components/ui/*.jsx."
  },
  "brand_attributes": [
    "trustworthy (finance-grade)",
    "decisive (exception-led dashboards)",
    "fast (ops screens)",
    "calm (low-glare dark surfaces)",
    "premium (glass depth, subtle glow)"
  ],
  "design_tokens": {
    "css_custom_properties": {
      "where": "/app/frontend/src/index.css (replace :root + .dark tokens)",
      "tokens": {
        "--background": "222 35% 6%",
        "--foreground": "210 25% 96%",
        "--card": "222 35% 8%",
        "--card-foreground": "210 25% 96%",
        "--popover": "222 35% 8%",
        "--popover-foreground": "210 25% 96%",
        "--primary": "174 84% 45%",
        "--primary-foreground": "222 35% 8%",
        "--secondary": "222 22% 14%",
        "--secondary-foreground": "210 25% 96%",
        "--muted": "222 18% 16%",
        "--muted-foreground": "215 16% 72%",
        "--accent": "198 92% 55%",
        "--accent-foreground": "222 35% 8%",
        "--destructive": "0 72% 52%",
        "--destructive-foreground": "210 25% 96%",
        "--border": "222 18% 18%",
        "--input": "222 18% 18%",
        "--ring": "174 84% 45%",
        "--radius": "0.9rem",
        "--chart-1": "174 84% 45%",
        "--chart-2": "198 92% 55%",
        "--chart-3": "43 92% 58%",
        "--chart-4": "0 72% 52%",
        "--chart-5": "262 70% 62%",
        "--glass-bg": "rgba(255,255,255,0.06)",
        "--glass-bg-strong": "rgba(255,255,255,0.10)",
        "--glass-border": "rgba(255,255,255,0.12)",
        "--glass-border-strong": "rgba(255,255,255,0.18)",
        "--glass-shadow": "0 18px 60px rgba(0,0,0,0.55)",
        "--glass-shadow-soft": "0 10px 30px rgba(0,0,0,0.35)",
        "--focus-ring": "0 0 0 3px rgba(45, 212, 191, 0.35)",
        "--noise-opacity": "0.06",
        "--sidebar-width": "280px",
        "--topbar-height": "56px"
      },
      "palette_hex_reference": {
        "bg_0": "#070B12",
        "bg_1": "#0B1220",
        "surface_glass": "rgba(255,255,255,0.06)",
        "surface_glass_strong": "rgba(255,255,255,0.10)",
        "stroke": "rgba(255,255,255,0.12)",
        "text_primary": "#EAF0F7",
        "text_muted": "#A9B6C6",
        "primary_teal": "#2DD4BF",
        "accent_cyan": "#38BDF8",
        "warn_amber": "#F59E0B",
        "danger": "#EF4444",
        "success": "#22C55E"
      },
      "gradient_policy": {
        "allowed": [
          "Only as section background overlays (hero / portal selector header) and decorative blobs",
          "Max 20% viewport coverage",
          "Never on text-heavy reading areas",
          "Never on small UI elements (<100px)"
        ],
        "recommended_gradients": [
          {
            "name": "teal-cyan-mist",
            "css": "radial-gradient(900px circle at 20% 10%, rgba(45,212,191,0.18), transparent 55%), radial-gradient(700px circle at 80% 20%, rgba(56,189,248,0.14), transparent 55%)"
          },
          {
            "name": "amber-alert-hint (exceptions only)",
            "css": "radial-gradient(700px circle at 70% 0%, rgba(245,158,11,0.10), transparent 55%)"
          }
        ],
        "prohibited": [
          "blue-500 to purple-600",
          "purple-500 to pink-500",
          "green-500 to blue-500",
          "red to pink",
          "any dark/saturated gradient combos"
        ]
      }
    },
    "tailwind_utility_recipes": {
      "app_background": "min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))]",
      "glass_panel": "bg-[var(--glass-bg)] border border-[var(--glass-border)] backdrop-blur-xl shadow-[var(--glass-shadow-soft)]",
      "glass_panel_strong": "bg-[var(--glass-bg-strong)] border border-[var(--glass-border-strong)] backdrop-blur-2xl shadow-[var(--glass-shadow)]",
      "hairline_divider": "border-t border-white/10",
      "focus_ring": "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-0",
      "kpi_value": "text-2xl sm:text-3xl font-semibold tracking-tight",
      "kpi_label": "text-xs uppercase tracking-[0.14em] text-[hsl(var(--muted-foreground))]",
      "chip": "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs bg-white/5 border border-white/10"
    }
  },
  "typography": {
    "font_pairing": {
      "headings": {
        "family": "Space Grotesk",
        "weights": [500, 600, 700]
      },
      "body": {
        "family": "Manrope",
        "weights": [400, 500, 600]
      },
      "numbers_optional": {
        "family": "IBM Plex Mono",
        "use_for": "ledger-like amounts in dense tables, optional"
      },
      "google_fonts_import": "@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');"
    },
    "scale": {
      "h1": "text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight",
      "h2": "text-base md:text-lg text-[hsl(var(--muted-foreground))]",
      "section_title": "text-lg font-semibold tracking-tight",
      "card_title": "text-sm font-semibold",
      "body": "text-sm sm:text-base leading-relaxed",
      "caption": "text-xs text-[hsl(var(--muted-foreground))]"
    },
    "usage_rules": [
      "Use Space Grotesk for portal names, page titles, KPI numbers headings.",
      "Use Manrope for forms, tables, helper text.",
      "Amounts: tabular numbers (CSS: font-variant-numeric: tabular-nums) for alignment."
    ]
  },
  "layout": {
    "global_structure": {
      "management_portal": {
        "pattern": "Left sidebar + topbar + content",
        "sidebar": {
          "width": "var(--sidebar-width)",
          "sections": [
            "Executive",
            "Finance",
            "Inventory",
            "Reports",
            "Admin",
            "Approvals",
            "Audit Trail"
          ],
          "behavior": "Collapsible on desktop; becomes Sheet/Drawer on mobile"
        },
        "topbar": {
          "height": "var(--topbar-height)",
          "contents": [
            "Outlet scope pill (current outlet/city)",
            "Global search (Command palette)",
            "Notifications bell (WebSocket)",
            "User menu"
          ]
        }
      },
      "outlet_portal": {
        "pattern": "Topbar + quick actions + single-column fast forms",
        "behavior": "Mobile-first; large tap targets; minimal navigation depth"
      }
    },
    "grid_system": {
      "page_container": "max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8",
      "dashboard_grid": "grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6",
      "kpi_row": "grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4",
      "report_layout": "A4-like content width inside page container; use Card with strong border; keep margins for print"
    },
    "portal_selector_layout": {
      "pattern": "Bento grid of 5 portal cards; 2 columns mobile, 3 columns tablet, 5 columns desktop",
      "coming_soon": "Disabled cards with lock badge + tooltip; keep visible to set expectation"
    }
  },
  "components": {
    "component_path": {
      "shadcn_primary": [
        "/app/frontend/src/components/ui/button.jsx",
        "/app/frontend/src/components/ui/card.jsx",
        "/app/frontend/src/components/ui/input.jsx",
        "/app/frontend/src/components/ui/label.jsx",
        "/app/frontend/src/components/ui/select.jsx",
        "/app/frontend/src/components/ui/table.jsx",
        "/app/frontend/src/components/ui/tabs.jsx",
        "/app/frontend/src/components/ui/dialog.jsx",
        "/app/frontend/src/components/ui/sheet.jsx",
        "/app/frontend/src/components/ui/drawer.jsx",
        "/app/frontend/src/components/ui/command.jsx",
        "/app/frontend/src/components/ui/dropdown-menu.jsx",
        "/app/frontend/src/components/ui/tooltip.jsx",
        "/app/frontend/src/components/ui/badge.jsx",
        "/app/frontend/src/components/ui/separator.jsx",
        "/app/frontend/src/components/ui/scroll-area.jsx",
        "/app/frontend/src/components/ui/pagination.jsx",
        "/app/frontend/src/components/ui/calendar.jsx",
        "/app/frontend/src/components/ui/sonner.jsx"
      ]
    },
    "navigation": {
      "sidebar": {
        "use": ["navigation-menu.jsx", "collapsible.jsx", "scroll-area.jsx"],
        "notes": [
          "Sidebar groups are Collapsible sections.",
          "Active item: left accent bar (2px) in primary teal + subtle glass highlight."
        ]
      },
      "command_palette": {
        "use": ["command.jsx", "dialog.jsx"],
        "trigger": "Ctrl/⌘K",
        "items": ["Navigate pages", "Search outlets", "Create cash movement", "Open report"]
      },
      "breadcrumbs": {
        "use": ["breadcrumb.jsx"],
        "rule": "Always show on Management portal deep pages (Finance/Inventory/Admin)"
      }
    },
    "cards_and_kpis": {
      "kpi_card": {
        "use": ["card.jsx", "badge.jsx"],
        "structure": [
          "Label (uppercase)",
          "Value (tabular nums)",
          "Delta badge (up/down)",
          "Mini sparkline (Recharts)"
        ],
        "states": {
          "normal": "glass_panel",
          "warning": "add border-amber-400/30 + amber glow blob behind",
          "danger": "add border-red-400/30 + red glow blob behind"
        }
      },
      "exception_list": {
        "use": ["table.jsx", "badge.jsx", "button.jsx"],
        "rule": "Exception-first: show top 5 anomalies with severity chips + 'Investigate' CTA"
      }
    },
    "tables": {
      "base": {
        "use": ["table.jsx", "dropdown-menu.jsx", "pagination.jsx", "input.jsx", "select.jsx"],
        "features": [
          "Column sorting",
          "Filter row (search + select filters)",
          "Pagination",
          "Row actions menu",
          "Sticky header"
        ],
        "density_toggle": "Add a 'Density' toggle (Comfortable/Compact) using toggle-group.jsx",
        "row_interaction": "Row hover: bg-white/5; selected: bg-white/8 + border-l-2 border-[hsl(var(--primary))]"
      },
      "audit_trail": {
        "pattern": "Timeline-like table: time, actor, action, entity, diff preview",
        "use": ["hover-card.jsx", "dialog.jsx"],
        "interaction": "Hover-card shows JSON diff snippet; Dialog opens full event"
      }
    },
    "forms_minimal_typing": {
      "principles": [
        "Default values + smart presets (Today, Current outlet)",
        "Use Select/Combobox (Command) for long lists",
        "Inline calculators for amounts (optional)",
        "Use InputOTP only where needed (2FA), otherwise avoid"
      ],
      "patterns": {
        "quick_entry_drawer": {
          "use": ["drawer.jsx", "form.jsx", "input.jsx", "select.jsx", "calendar.jsx"],
          "rule": "For Outlet portal: open forms in Drawer from bottom; keep 1 primary action"
        },
        "approval_forms": {
          "use": ["tabs.jsx", "textarea.jsx", "badge.jsx"],
          "rule": "Tabs: Details / Attachments / Audit"
        }
      }
    },
    "reports_export_ready": {
      "header": {
        "use": ["card.jsx", "button.jsx", "select.jsx", "calendar.jsx"],
        "must_have": [
          "Report title",
          "Scope chips (Outlet/City/Period)",
          "Export buttons (PDF/Excel) prominent",
          "Last refreshed timestamp"
        ],
        "export_buttons": "Primary: Excel (teal). Secondary: PDF (outline). Both with icons. data-testid required."
      },
      "report_body": {
        "pattern": "Summary KPIs -> Statement table -> Drill-down sections",
        "drill_down": "Click row to open Sheet with breakdown (e.g., P&L line item -> outlets -> transactions)"
      }
    },
    "notifications": {
      "use": ["sonner.jsx"],
      "types": ["success", "info", "warning", "error"],
      "rule": "WebSocket events: approvals assigned, settlement completed, stock below reorder"
    }
  },
  "data_visualization": {
    "library": {
      "recommended": "recharts",
      "install": "npm i recharts",
      "why": "Fast, React-native, good for KPI sparklines + drill-down charts"
    },
    "chart_styles": {
      "container": "glass_panel p-4",
      "grid": "stroke: rgba(255,255,255,0.08)",
      "axis": "tick fill: rgba(234,240,247,0.65)",
      "tooltip": "Use shadcn Tooltip/Popover styling: bg-white/10 border-white/15 backdrop-blur-xl",
      "colors": {
        "primary": "#2DD4BF",
        "accent": "#38BDF8",
        "warning": "#F59E0B",
        "danger": "#EF4444",
        "neutral": "rgba(234,240,247,0.55)"
      }
    },
    "recommended_charts": [
      "Executive: Revenue vs COGS area chart + margin line",
      "Cash: Daily cash position line chart with anomaly markers",
      "Inventory: Stock value by category stacked bar",
      "Approvals: SLA aging histogram",
      "Outlet: Sales by hour sparkline"
    ]
  },
  "motion_microinteractions": {
    "library": {
      "recommended": "framer-motion",
      "install": "npm i framer-motion",
      "usage": "Use for page transitions, KPI card entrance, drawer/sheet easing"
    },
    "principles": [
      "Fast ops screens: motion <= 180ms, minimal",
      "Executive dashboards: subtle entrance (240–320ms) to feel premium",
      "Never animate layout on tables while user is interacting"
    ],
    "recipes": {
      "glass_hover": "On hover: increase bg opacity slightly (white/6 -> white/9) + border (white/12 -> white/18).",
      "button_press": "active: scale-[0.98] (only on buttons), shadow reduces",
      "drawer_open": "spring: stiffness 380, damping 34",
      "kpi_reveal": "stagger children 0.04s; y: 8 -> 0; opacity 0 -> 1"
    }
  },
  "accessibility": {
    "rules": [
      "WCAG AA contrast: raise glass opacity for text blocks (use --glass-bg-strong).",
      "Focus visible: ring uses --ring teal; never remove outlines without replacement.",
      "Keyboard: Command palette, sidebar navigation, table row actions must be reachable.",
      "Reduced motion: respect prefers-reduced-motion (disable entrance animations).",
      "Touch targets: Outlet portal buttons >= 44px height."
    ]
  },
  "testing_attributes": {
    "rule": "All interactive and key informational elements MUST include data-testid (kebab-case, role-based).",
    "examples": [
      "data-testid=\"login-submit-button\"",
      "data-testid=\"portal-selector-management-card\"",
      "data-testid=\"management-kpi-total-revenue\"",
      "data-testid=\"report-export-excel-button\"",
      "data-testid=\"table-row-actions-menu\"",
      "data-testid=\"outlet-cash-close-submit\"",
      "data-testid=\"approvals-inbox-item\""
    ]
  },
  "page_blueprints": {
    "login": {
      "layout": "Split: left brand panel (glass) + right form card; on mobile single column",
      "components": ["card", "input", "button", "select"],
      "details": [
        "Outlet selection can be Select (searchable via Command pattern if list is long).",
        "Show 'Remember outlet' checkbox.",
        "Secondary action: 'Request access' (ghost)."
      ]
    },
    "portal_selector": {
      "layout": "Top header with mild teal/cyan mist gradient (<=20% viewport) + bento portal grid",
      "components": ["card", "badge", "tooltip", "button"],
      "interaction": [
        "Hover: card lifts 2px + border glow.",
        "Coming soon: disabled + tooltip 'Launching soon'."
      ]
    },
    "executive_dashboard": {
      "sections": [
        "KPI row (4)",
        "Revenue/COGS chart (8 cols) + Cash position (4 cols)",
        "Exceptions table (12 cols)",
        "Approvals SLA widget"
      ]
    },
    "reports": {
      "export_ready": [
        "Report header card with export buttons pinned right",
        "Print-friendly spacing; avoid heavy blur in print mode (use solid backgrounds in @media print)"
      ]
    },
    "outlet_dashboard": {
      "sections": [
        "Today summary (cash, sales, variance)",
        "Quick actions (Open cash, Close cash, Add expense, Stock count)",
        "Mini P&L preview"
      ],
      "rule": "Keep primary actions above the fold on mobile"
    }
  },
  "images": {
    "image_urls": [
      {
        "category": "background_texture",
        "description": "Abstract teal/cyan blur for portal selector header overlay (use as background-image with low opacity)",
        "url": "https://images.unsplash.com/photo-1707209856577-eeea3627f8bf?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85"
      },
      {
        "category": "background_texture",
        "description": "Layered geometric teal for login/portal hero side panel",
        "url": "https://images.unsplash.com/photo-1576502202167-791eca35a78d?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85"
      },
      {
        "category": "context_photo",
        "description": "Moody operational photo for Kitchen/Warehouse coming soon cards (very low opacity, decorative only)",
        "url": "https://images.unsplash.com/photo-1650114361959-e3dc0b5bb1f1?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85"
      },
      {
        "category": "context_photo",
        "description": "Receipt/ledger close-up for Finance empty states (decorative, small)",
        "url": "https://images.unsplash.com/photo-1606150118744-e7275cf07679?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85"
      }
    ]
  },
  "instructions_to_main_agent": {
    "global_css_changes": [
      "Remove any centered layout defaults (do not add .App { text-align:center }).",
      "Replace index.css tokens with the provided dark-first palette; keep :root for light if needed but default app should run with .dark on html/body.",
      "Add a reusable .glass class in App.css or a new utilities layer: uses --glass-bg, --glass-border, backdrop-blur.",
      "Add subtle noise overlay via pseudo-element on body: background-image: url(data-uri svg noise) OR CSS repeating-radial; opacity var(--noise-opacity)."
    ],
    "portal_scoping_ui": [
      "Always show current outlet scope as a chip in topbar with data-testid=\"outlet-scope-chip\".",
      "Any cross-outlet view must show a scope selector (Select + Command search)."
    ],
    "tables": [
      "Implement sticky headers and compact density option.",
      "Row actions must be DropdownMenu with data-testid per row (e.g., table-row-actions-<id>)."
    ],
    "reports": [
      "Export buttons must be visually prominent and always visible near report title.",
      "Add @media print styles: disable blur, force solid backgrounds, ensure black text on white for print."
    ],
    "forms": [
      "Outlet portal forms should open in Drawer (bottom) with one primary CTA.",
      "Use Calendar for date picking; avoid native date inputs."
    ],
    "realtime": [
      "WebSocket notifications should surface via Sonner toasts + a notifications panel (Sheet)."
    ]
  },
  "executive_dashboard_premium_interactive_guidelines": {
    "section_title": "# Executive Dashboard — Premium Interactive Guidelines",
    "design_personality": {
      "keywords": [
        "dark-premium",
        "electric accents",
        "glass depth",
        "data-dense but calm",
        "drill-down everywhere"
      ],
      "north_star": "Match Dashbrd X: compact KPI tiles, crisp typography, subtle blue glow, floating tooltip markers, and interaction-first charts (hover + click + drill-down)."
    },
    "color_tokens_exec_only": {
      "where": "/app/frontend/src/index.css (add tokens under :root/.dark and .light; do not hardcode hex in components)",
      "tokens": {
        "--exec-accent-blue": "214 95% 60%",
        "--exec-accent-blue-soft": "214 95% 60% / 0.18",
        "--exec-accent-glow": "214 95% 60% / 0.35",
        "--exec-ring": "214 95% 60%",
        "--exec-grid": "214 40% 60% / 0.10",
        "--exec-marker": "214 95% 60%",
        "--exec-positive": "142 72% 45%",
        "--exec-negative": "0 72% 52%",
        "--exec-warning": "43 92% 58%"
      },
      "mapping_rules": [
        "Primary teal stays global: use --primary for primary CTAs and global navigation.",
        "Executive Portal secondary accent: use --exec-accent-blue for chart strokes, active period pills, focus rings inside Exec pages, and selected states.",
        "Never replace global --accent; scope exec accent via wrapper class on Exec pages (e.g., .exec-portal) and use CSS vars there if needed.",
        "Light mode: keep the same HSL hue but reduce glow opacity; ensure text contrast on white cards."
      ],
      "tailwind_usage": {
        "accent_text": "text-[hsl(var(--exec-accent-blue))]",
        "accent_bg_soft": "bg-[hsl(var(--exec-accent-blue-soft))]",
        "accent_ring": "focus-visible:ring-2 focus-visible:ring-[hsl(var(--exec-ring))]",
        "accent_border": "border-[hsl(var(--exec-accent-blue)/0.28)]",
        "accent_shadow_glow": "shadow-[0_0_0_1px_hsl(var(--exec-accent-blue)/0.18),0_18px_60px_hsl(var(--exec-accent-blue)/0.10)]"
      }
    },
    "exec_spacing_elevation_radius_tokens": {
      "tokens": {
        "--exec-card-radius": "1.05rem",
        "--exec-card-padding": "1rem",
        "--exec-card-padding-lg": "1.25rem",
        "--exec-card-gap": "0.875rem",
        "--exec-hairline": "1px",
        "--exec-shadow": "0 18px 60px rgba(0,0,0,0.55)",
        "--exec-shadow-soft": "0 10px 30px rgba(0,0,0,0.35)",
        "--exec-hover-lift": "translateY(-2px)",
        "--exec-hover-bg": "rgba(255,255,255,0.085)",
        "--exec-hover-border": "rgba(255,255,255,0.18)"
      },
      "card_recipe": "rounded-[var(--exec-card-radius)] bg-[var(--glass-bg)] border border-[var(--glass-border)] shadow-[var(--glass-shadow-soft)] backdrop-blur-xl",
      "hover_recipe": "hover:bg-[var(--exec-hover-bg)] hover:border-[var(--exec-hover-border)]",
      "interaction_note": "Do not use transition-all. Use transition-[background-color,border-color,box-shadow] duration-200 ease-out."
    },
    "typography_exec_scale": {
      "fonts": {
        "headings_metrics": "Space Grotesk",
        "body": "Inter (already loaded in app context per requirement; if not, keep Manrope but do not change global fonts for other portals)",
        "numbers": "tabular-nums utility"
      },
      "scale": {
        "page_title": "text-xl sm:text-2xl font-semibold tracking-tight",
        "hero_metric": "text-4xl sm:text-5xl font-semibold tracking-tight tabular-nums",
        "kpi_value": "text-[28px] sm:text-[32px] font-semibold tracking-tight tabular-nums",
        "kpi_label": "text-[10px] sm:text-[11px] uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]",
        "micro_label": "text-[11px] text-[hsl(var(--muted-foreground))]",
        "table_body": "text-sm",
        "badge": "text-[11px]"
      },
      "number_formatting": [
        "Always use tabular numbers for KPIs and chart tooltip values.",
        "Use compact notation for big numbers (e.g., 1.2B) but show full value in tooltip and drill-down modal."
      ]
    },
    "component_path": {
      "shadcn_required": {
        "period_picker": [
          "/app/frontend/src/components/ui/popover.jsx",
          "/app/frontend/src/components/ui/calendar.jsx",
          "/app/frontend/src/components/ui/tabs.jsx",
          "/app/frontend/src/components/ui/toggle-group.jsx",
          "/app/frontend/src/components/ui/switch.jsx",
          "/app/frontend/src/components/ui/button.jsx",
          "/app/frontend/src/components/ui/badge.jsx",
          "/app/frontend/src/components/ui/separator.jsx"
        ],
        "kpi_drilldown": [
          "/app/frontend/src/components/ui/card.jsx",
          "/app/frontend/src/components/ui/sheet.jsx",
          "/app/frontend/src/components/ui/dialog.jsx",
          "/app/frontend/src/components/ui/table.jsx",
          "/app/frontend/src/components/ui/scroll-area.jsx",
          "/app/frontend/src/components/ui/skeleton.jsx",
          "/app/frontend/src/components/ui/tooltip.jsx"
        ]
      }
    },
    "interactive_kpi_card_spec": {
      "purpose": "Compact KPI tile with value + trend + inline sparkline; click opens Sheet with breakdown.",
      "anatomy": {
        "header_row": [
          "Label (kpi_label)",
          "Trend badge (Badge) with arrow icon",
          "Optional realtime dot (pulse)"
        ],
        "value_row": [
          "Primary value (kpi_value)",
          "Compare-to-previous mini delta (caption) when enabled"
        ],
        "sparkline_row": [
          "Inline sparkline (Recharts LineChart/AreaChart) height 44–56px",
          "No axes; 1–2 reference dots (latest + peak)"
        ],
        "footer_row": [
          "Secondary metric chips (e.g., Margin %, Avg Ticket) optional",
          "Chevron affordance (lucide ChevronRight)"
        ]
      },
      "layout_classes": {
        "card": "group relative overflow-hidden rounded-[var(--exec-card-radius)] bg-[var(--glass-bg)] border border-[var(--glass-border)] p-4 shadow-[var(--glass-shadow-soft)] backdrop-blur-xl",
        "clickable": "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--exec-ring))]",
        "hover": "transition-[background-color,border-color,box-shadow] duration-200 ease-out hover:bg-[var(--exec-hover-bg)] hover:border-[var(--exec-hover-border)] hover:shadow-[0_18px_60px_rgba(0,0,0,0.55),0_0_0_1px_hsl(var(--exec-accent-blue)/0.18)]",
        "glow_blob": "pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-[hsl(var(--exec-accent-blue)/0.18)] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-200"
      },
      "states": {
        "default": [
          "Sparkline uses exec accent stroke; fill uses very low opacity.",
          "Trend badge uses semantic colors (positive/negative) but keep premium (no neon)."
        ],
        "hover": [
          "Lift illusion via shadow + glow blob (no translate on container unless using Framer Motion).",
          "Sparkline marker grows slightly (scale 1.0 -> 1.12)."
        ],
        "loading": [
          "Use Skeleton for label/value and a shimmering sparkline placeholder.",
          "Keep card height stable to avoid layout shift."
        ],
        "error": [
          "Show compact Alert inside card: 'Failed to load' + Retry button (ghost).",
          "Border becomes destructive/30; keep glass background."
        ],
        "clicked_active": [
          "When Sheet open, keep card in 'selected' state: border exec accent/35 + subtle inner ring."
        ]
      },
      "sparkline_spec": {
        "chart": "Recharts LineChart or AreaChart",
        "stroke": "hsl(var(--exec-accent-blue))",
        "strokeWidth": 2,
        "fill": "hsl(var(--exec-accent-blue) / 0.12)",
        "dot": "Only show dot for active point and last point",
        "activeDot": "r=4, stroke=white/70, strokeWidth=2, fill=exec accent",
        "interaction": "Hover within card reveals tooltip-like mini label (optional) but primary drill-down is click."
      },
      "data_testids": {
        "card": "exec-kpi-card-<metric-key>",
        "value": "exec-kpi-card-<metric-key>-value",
        "trend_badge": "exec-kpi-card-<metric-key>-trend-badge",
        "open_sheet": "exec-kpi-card-<metric-key>-open-sheet"
      }
    },
    "premium_period_picker_spec": {
      "purpose": "Executive-grade period control with presets + custom range + compare toggle.",
      "anatomy": {
        "left": [
          "Preset pills row: Today, 7D, 30D, MTD, QTD, YTD, Custom",
          "Custom opens Popover with Calendar range"
        ],
        "right": [
          "Compare-to-previous toggle (Switch) + label",
          "Optional 'Last refreshed' timestamp"
        ]
      },
      "preset_pills": {
        "component": "ToggleGroup (type=single)",
        "pill_style": "rounded-full px-3 py-1.5 text-xs border border-white/10 bg-white/5 hover:bg-white/8",
        "active_style": "data-[state=on]:bg-[hsl(var(--exec-accent-blue)/0.18)] data-[state=on]:border-[hsl(var(--exec-accent-blue)/0.35)] data-[state=on]:text-[hsl(var(--foreground))]",
        "focus": "focus-visible:ring-2 focus-visible:ring-[hsl(var(--exec-ring))]",
        "data_testid": "exec-period-picker-preset-<preset>"
      },
      "custom_range": {
        "component": "Popover + Calendar (range)",
        "trigger": "Button variant=outline (glass) with calendar icon",
        "popover_surface": "glass_panel_strong rounded-xl p-3 w-[320px]",
        "calendar_rules": [
          "Use shadcn Calendar only.",
          "Highlight range with exec accent soft background.",
          "Show quick actions inside popover footer: Apply / Cancel."
        ],
        "data_testids": {
          "trigger": "exec-period-picker-custom-trigger",
          "apply": "exec-period-picker-custom-apply-button",
          "cancel": "exec-period-picker-custom-cancel-button"
        }
      },
      "compare_toggle": {
        "component": "Switch",
        "label": "Compare to previous",
        "helper": "Shows baseline values + delta",
        "data_testid": "exec-period-picker-compare-toggle"
      }
    },
    "chart_styling_specs_recharts": {
      "global_rules": [
        "Charts live inside glass cards; never on raw background.",
        "Use subtle grid lines (exec grid token) and minimal axis ticks.",
        "Hover shows floating glass tooltip + marker; click opens drill-down Dialog.",
        "All chart wrappers must be keyboard focusable when clickable (tabIndex=0) and have aria-label."
      ],
      "axes": {
        "tick": "fill: hsl(var(--muted-foreground) / 0.85); fontSize: 11",
        "axisLine": "stroke: hsl(var(--border) / 0.55)",
        "tickLine": "stroke: hsl(var(--border) / 0.35)",
        "padding": "{ left: 8, right: 8 }"
      },
      "grid": {
        "stroke": "hsl(var(--exec-grid))",
        "strokeDasharray": "3 6",
        "vertical": false
      },
      "area_line": {
        "lineStroke": "hsl(var(--exec-accent-blue))",
        "lineStrokeWidth": 2,
        "areaFill": "linearGradient: exec-blue-fade (0% 0.22 -> 100% 0.00)",
        "activeDot": "r=5, fill exec accent, stroke white/70, strokeWidth 2"
      },
      "bar": {
        "radius": "[6,6,0,0]",
        "fill": "linearGradient: exec-blue-bar (0% 0.55 -> 100% 0.18)",
        "compare": "Previous period uses muted foreground / 0.22 fill + dashed outline"
      },
      "donut": {
        "innerRadius": "68%",
        "outerRadius": "86%",
        "center_metric": "Big number (kpi_value) + label (micro_label)",
        "ring": "Outer ring uses exec accent soft; segment separators are background/transparent"
      },
      "tooltip_spec": {
        "container_classes": "rounded-xl bg-[var(--glass-bg-strong)] border border-[var(--glass-border-strong)] backdrop-blur-2xl shadow-[var(--glass-shadow)] px-3 py-2",
        "title": "text-xs uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]",
        "value": "text-sm font-semibold tabular-nums",
        "marker": "Small dot with exec accent + subtle glow",
        "cursor": "Disable default cursor fill; instead render a thin vertical line (stroke exec accent/25)"
      },
      "data_testids": {
        "chart": "exec-chart-<chart-key>",
        "tooltip": "exec-chart-<chart-key>-tooltip",
        "datapoint": "exec-chart-<chart-key>-datapoint-<index>"
      }
    },
    "kpi_detail_sheet_spec": {
      "component": "Sheet (right side)",
      "width": "w-full sm:max-w-[520px] lg:max-w-[640px]",
      "surface": "glass_panel_strong",
      "header": {
        "elements": [
          "Metric title + scope chips",
          "Period summary",
          "Close button"
        ],
        "classes": "border-b border-white/10 px-5 py-4"
      },
      "body": {
        "sections": [
          "Metric hero: value + delta + compare baseline",
          "Breakdown chart area (height 220–260)",
          "Ranked list or table (ScrollArea)"
        ],
        "classes": "px-5 py-4 space-y-4"
      },
      "footer": {
        "cta": "View Full Report (primary teal) + Secondary action (ghost)",
        "classes": "border-t border-white/10 px-5 py-4 flex items-center justify-between"
      },
      "data_testids": {
        "sheet": "exec-kpi-detail-sheet",
        "close": "exec-kpi-detail-sheet-close-button",
        "view_report": "exec-kpi-detail-sheet-view-report-button"
      }
    },
    "datapoint_drilldown_dialog_spec": {
      "component": "Dialog",
      "size": "w-[92vw] sm:max-w-[720px]",
      "surface": "glass_panel_strong rounded-2xl",
      "layout": [
        "Header: title + subtitle (date/outlet) + actions",
        "Body: mini chart (optional) + Table of entries",
        "Footer: primary action (Open Journal) + secondary (Export CSV)"
      ],
      "table": {
        "density": "compact",
        "columns": ["Time", "Outlet", "Source", "Amount", "Reference"],
        "row_action": "Open entry (icon button)"
      },
      "data_testids": {
        "dialog": "exec-drilldown-dialog",
        "close": "exec-drilldown-dialog-close-button",
        "primary_action": "exec-drilldown-dialog-primary-button"
      }
    },
    "outlet_leaderboard_card_spec": {
      "purpose": "Ranked outlets with mini bars + trend arrows; click opens outlet drill-down modal.",
      "anatomy": {
        "row": [
          "Rank badge (#1, #2...)",
          "Outlet avatar (Avatar) or initials",
          "Outlet name + city chip",
          "Primary metric (tabular) + trend arrow",
          "Mini horizontal bar (Progress)"
        ],
        "multi_metric_inline": "Show 2–3 micro metrics (Margin, Waste, Compliance) as tiny chips",
        "interaction": [
          "Row hover highlights with exec accent soft background",
          "Row click opens Dialog with outlet profile + charts"
        ]
      },
      "classes": {
        "container": "rounded-[var(--exec-card-radius)] bg-[var(--glass-bg)] border border-[var(--glass-border)] p-4",
        "row": "flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-white/6 transition-[background-color] duration-150",
        "rank_badge": "h-7 w-7 rounded-full grid place-items-center text-xs font-semibold bg-white/6 border border-white/10",
        "trend_up": "text-[hsl(var(--exec-positive))]",
        "trend_down": "text-[hsl(var(--exec-negative))]"
      },
      "data_testids": {
        "card": "exec-outlet-leaderboard-card",
        "row": "exec-outlet-leaderboard-row-<outlet-id>",
        "open": "exec-outlet-leaderboard-open-<outlet-id>"
      }
    },
    "control_tower_feed_item_spec": {
      "purpose": "Live alert stream with priority coding + resolve actions.",
      "anatomy": {
        "left": [
          "Priority dot",
          "Alert title + short description"
        ],
        "right": [
          "Outlet chip",
          "Timestamp",
          "Actions: View / Resolve"
        ]
      },
      "priority_colors": {
        "p0_critical": "border-red-400/30 + dot bg-red-400",
        "p1_high": "border-amber-400/30 + dot bg-amber-400",
        "p2_medium": "border-sky-400/30 + dot bg-sky-400",
        "p3_low": "border-white/10 + dot bg-white/30"
      },
      "classes": {
        "item": "group flex items-start justify-between gap-3 rounded-2xl bg-[var(--glass-bg)] border border-[var(--glass-border)] p-4 hover:bg-white/7 transition-[background-color,border-color] duration-200",
        "dot": "mt-1.5 h-2.5 w-2.5 rounded-full shadow-[0_0_0_3px_rgba(255,255,255,0.06)]",
        "title": "text-sm font-semibold",
        "meta": "text-xs text-[hsl(var(--muted-foreground))]"
      },
      "actions": {
        "view": "Button ghost sm",
        "resolve": "Button secondary sm (or outline)"
      },
      "data_testids": {
        "item": "exec-control-tower-alert-<alert-id>",
        "view": "exec-control-tower-alert-view-<alert-id>",
        "resolve": "exec-control-tower-alert-resolve-<alert-id>"
      }
    },
    "motion_guidelines_exec": {
      "libraries": {
        "required": ["framer-motion"],
        "optional": ["react-countup"]
      },
      "timings": {
        "card_hover": "150–200ms",
        "page_enter": "260–340ms",
        "sheet_enter": "240ms",
        "dialog_enter": "220ms",
        "pulse": "900ms"
      },
      "easings": {
        "standard": "cubic-bezier(0.2, 0.8, 0.2, 1)",
        "snappy": "cubic-bezier(0.2, 0.9, 0.2, 1)"
      },
      "recipes": {
        "card_entry_stagger": "Stagger KPI cards by 40ms; animate opacity 0->1 and y 10->0.",
        "count_up": "On initial load, count KPI values from 0 to value over 650ms (respect reduced motion).",
        "websocket_update_pulse": "When KPI updates, flash a 1px inner ring in exec accent + subtle background brighten for 600ms.",
        "chart_hover_marker": "Active dot scales 1.0->1.15; tooltip fades in 120ms.",
        "sheet_dialog": "Use motion for overlay fade + panel slide; avoid bouncing."
      }
    },
    "empty_loading_error_states": {
      "global": [
        "Skeleton first: keep layout stable.",
        "Empty states must be informative: show what data is missing + how to fix (change period/scope).",
        "Errors must include Retry action and preserve context (period + scope)."
      ],
      "kpi_card": {
        "loading": "Skeleton label + value + sparkline block (h-12).",
        "empty": "Show '--' value + caption 'No data for selected period'.",
        "error": "Inline Alert with Retry button (data-testid=exec-kpi-retry-<metric>)."
      },
      "charts": {
        "loading": "Skeleton chart area (h-[260px]) + legend skeleton.",
        "empty": "Centered message + small 'Adjust filters' button; keep axes hidden.",
        "error": "Alert with 'Retry' + 'Open diagnostics' (optional)."
      },
      "leaderboard": {
        "loading": "5 skeleton rows.",
        "empty": "Message: 'No outlets in scope' + scope selector hint.",
        "error": "Retry row at top."
      },
      "control_tower": {
        "loading": "Skeleton feed items with dot + two lines.",
        "empty": "Message: 'All clear' + subtle check icon (lucide).",
        "error": "Banner alert at top + retry."
      }
    },
    "performance_notes": {
      "websocket": [
        "Debounce KPI updates (e.g., 250–400ms) to avoid chart re-render storms.",
        "Animate only the changed KPI card (pulse), not the whole grid."
      ],
      "charts": [
        "Use memoized data transforms.",
        "Prefer fewer ticks; avoid heavy gradients; keep tooltip lightweight."
      ]
    },
    "implementation_checklist_for_main_agent": [
      "Add exec-only CSS vars (exec accent blue + glow) in index.css for both .dark and .light.",
      "Scope exec styling via a wrapper class on Exec pages (e.g., <div className=\"exec-portal\">) if needed.",
      "Build PremiumPeriodPicker component using ToggleGroup + Popover + Calendar + Switch; ensure all controls have data-testid.",
      "Build InteractiveKpiCard component: Card + sparkline + trend badge; keyboard accessible; data-testid on card/value/badge.",
      "Implement Recharts CustomTooltip component with glass styling; add active dot marker and thin cursor line.",
      "Wire click interactions: KPI card -> Sheet; chart datapoint -> Dialog; leaderboard row -> Dialog.",
      "Add skeletons for KPI cards, charts, lists; keep heights stable.",
      "Add WebSocket update pulse animation (respect prefers-reduced-motion).",
      "Ensure no hardcoded hex in Exec components; use CSS vars only.",
      "Verify dark/light mode contrast for tooltip, pills, and badges.",
      "Ensure every interactive element and key metric has data-testid (kebab-case, role-based)."
    ]
  },
  "general_ui_ux_design_guidelines": [
    "You must **not** apply universal transition. Eg: `transition: all`. This results in breaking transforms. Always add transitions for specific interactive elements like button, input excluding transforms",
    "You must **not** center align the app container, ie do not add `.App { text-align: center; }` in the css file. This disrupts the human natural reading flow of text",
    "NEVER: use AI assistant Emoji characters like`🤖🧠💭💡🔮🎯📚🎭🎬🎪🎉🎊🎁🎀🎂🍰🎈🎨🎰💰💵💳🏦💎🪙💸🤑📊📈📉💹🔢🏆🥇 etc for icons. Always use **FontAwesome cdn** or **lucid-react** library already installed in the package.json",
    " **GRADIENT RESTRICTION RULE**",
    "NEVER use dark/saturated gradient combos (e.g., purple/pink) on any UI element.  Prohibited gradients: blue-500 to purple 600, purple 500 to pink-500, green-500 to blue-500, red to pink etc",
    "NEVER use dark gradients for logo, testimonial, footer etc",
    "NEVER let gradients cover more than 20% of the viewport.",
    "NEVER apply gradients to text-heavy content or reading areas.",
    "NEVER use gradients on small UI elements (<100px width).",
    "NEVER stack multiple gradient layers in the same viewport.",
    "**ENFORCEMENT RULE:**",
    "    • Id gradient area exceeds 20% of viewport OR affects readability, **THEN** use solid colors",
    "**How and where to use:**",
    "   • Section backgrounds (not content backgrounds)",
    "   • Hero section header content. Eg: dark to light to dark color",
    "   • Decorative overlays and accent elements only",
    "   • Hero section with 2-3 mild color",
    "   • Gradients creation can be done for any angle say horizontal, vertical or diagonal",
    "- For AI chat, voice application, **do not use purple color. Use color like light green, ocean blue, peach orange etc**",
    "- Every interaction needs micro-animations - hover states, transitions, parallax effects, and entrance animations. Static = dead.",
    "- Use 2-3x more spacing than feels comfortable. Cramped designs look cheap.",
    "- Subtle grain textures, noise overlays, custom cursors, selection states, and loading animations: separates good from extraordinary.",
    "- Before generating UI, infer the visual style from the problem statement (palette, contrast, mood, motion) and immediately instantiate it by setting global design tokens (primary, secondary/accent, background, foreground, ring, state colors), rather than relying on any library defaults. Don't make the background dark as a default step, always understand problem first and define colors accordingly",
    "**Component Reuse:**",
    "\t- Prioritize using pre-existing components from src/components/ui when applicable",
    "\t- Create new components that match the style and conventions of existing components when needed",
    "\t- Examine existing components to understand the project's component patterns before creating new ones",
    "**IMPORTANT**: Do not use HTML based component like dropdown, calendar, toast etc. You **MUST** always use `/app/frontend/src/components/ui/ ` only as a primary components as these are modern and stylish component",
    "**Best Practices:**",
    "\t- Use Shadcn/UI as the primary component library for consistency and accessibility",
    "\t- Import path: ./components/[component-name]",
    "**Export Conventions:**",
    "\t- Components MUST use named exports (export const ComponentName = ...)",
    "\t- Pages MUST use default exports (export default function PageName() {...})",
    "**Toasts:**",
    "  - Use `sonner` for toasts\"",
    "  - Sonner component are located in `/app/src/components/ui/sonner.tsx`",
    "Use 2–4 color gradients, subtle textures/noise overlays, or CSS-based noise to avoid flat visuals."
  ]
}
