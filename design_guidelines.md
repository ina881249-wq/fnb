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
