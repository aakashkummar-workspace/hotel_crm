"""
Generates a comprehensive Word report about the Aurelia Hotel CRM project.
Output: ./Aurelia-Hotel-CRM-Report.docx
"""
from docx import Document
from docx.shared import Pt, RGBColor, Inches, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_ALIGN_VERTICAL
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
import os

GOLD = RGBColor(0xC9, 0xA9, 0x6E)
GOLD_DARK = RGBColor(0x8A, 0x6F, 0x3C)
INK = RGBColor(0x29, 0x26, 0x1B)
INK_LIGHT = RGBColor(0x6E, 0x64, 0x50)
DIVIDER = RGBColor(0xE2, 0xD8, 0xC4)


def set_cell_bg(cell, color_hex):
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:fill"), color_hex)
    tc_pr.append(shd)


def add_heading(doc, text, level=1):
    h = doc.add_heading(text, level=level)
    for run in h.runs:
        run.font.color.rgb = GOLD_DARK if level <= 2 else INK
        run.font.name = "Georgia"
    return h


def add_para(doc, text, *, bold=False, italic=False, color=None, size=11):
    p = doc.add_paragraph()
    run = p.add_run(text)
    run.font.size = Pt(size)
    run.bold = bold
    run.italic = italic
    if color:
        run.font.color.rgb = color
    return p


def add_bullet(doc, text, *, color=None):
    p = doc.add_paragraph(style="List Bullet")
    run = p.add_run(text)
    run.font.size = Pt(11)
    if color:
        run.font.color.rgb = color
    return p


def add_kv_table(doc, rows, *, col_widths=(Cm(4.5), Cm(11))):
    table = doc.add_table(rows=len(rows), cols=2)
    table.autofit = False
    for i, (k, v) in enumerate(rows):
        c0, c1 = table.rows[i].cells
        c0.width = col_widths[0]
        c1.width = col_widths[1]
        c0.text = ""
        c1.text = ""
        p0 = c0.paragraphs[0]
        r0 = p0.add_run(k)
        r0.bold = True
        r0.font.size = Pt(10)
        r0.font.color.rgb = INK_LIGHT
        p1 = c1.paragraphs[0]
        r1 = p1.add_run(v)
        r1.font.size = Pt(10)
    return table


def add_module_table(doc, rows):
    table = doc.add_table(rows=len(rows) + 1, cols=2)
    table.style = "Light Grid Accent 1"
    table.autofit = False
    head = table.rows[0].cells
    head[0].width = Cm(4)
    head[1].width = Cm(11.5)
    head[0].text = "Module"
    head[1].text = "What it does"
    for i, (mod, desc) in enumerate(rows, start=1):
        c0, c1 = table.rows[i].cells
        c0.width = Cm(4)
        c1.width = Cm(11.5)
        c0.text = mod
        c1.text = desc
        for run in c0.paragraphs[0].runs:
            run.bold = True
    return table


def add_endpoint_table(doc, rows):
    table = doc.add_table(rows=len(rows) + 1, cols=3)
    table.style = "Light Grid Accent 1"
    table.autofit = False
    head = table.rows[0].cells
    head[0].text = "Method"
    head[1].text = "Path"
    head[2].text = "Purpose"
    for i, (method, path, purpose) in enumerate(rows, start=1):
        c = table.rows[i].cells
        c[0].text = method
        c[1].text = path
        c[2].text = purpose
        for r in c[1].paragraphs[0].runs:
            r.font.name = "Consolas"
            r.font.size = Pt(9)
    return table


def add_hr(doc):
    p = doc.add_paragraph()
    p_pr = p._p.get_or_add_pPr()
    pBdr = OxmlElement("w:pBdr")
    bottom = OxmlElement("w:bottom")
    bottom.set(qn("w:val"), "single")
    bottom.set(qn("w:sz"), "6")
    bottom.set(qn("w:space"), "1")
    bottom.set(qn("w:color"), "C9A96E")
    pBdr.append(bottom)
    p_pr.append(pBdr)


def build():
    doc = Document()

    # Default style
    style = doc.styles["Normal"]
    style.font.name = "Calibri"
    style.font.size = Pt(11)

    section = doc.sections[0]
    section.left_margin = Cm(2)
    section.right_margin = Cm(2)
    section.top_margin = Cm(1.8)
    section.bottom_margin = Cm(1.8)

    # ── Title page ──────────────────────────────────────────────────────────
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run("AURELIA")
    r.font.size = Pt(48)
    r.font.color.rgb = GOLD_DARK
    r.font.name = "Georgia"
    r.bold = False

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run("Heritage Hotel CRM")
    r.font.size = Pt(20)
    r.font.color.rgb = INK
    r.font.name = "Georgia"
    r.italic = True

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run("Full-Stack Property Management System")
    r.font.size = Pt(14)
    r.font.color.rgb = INK_LIGHT

    doc.add_paragraph()
    add_hr(doc)

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run(
        "An 11-room boutique hotel & coffee house management application built end-to-end "
        "from a Claude Design handoff bundle. Includes staff CRM, public booking site, café POS, "
        "event hall reservations, expenses, invoicing, and analytics."
    )
    r.font.size = Pt(11)
    r.font.color.rgb = INK_LIGHT
    r.italic = True

    doc.add_paragraph()
    add_kv_table(doc, [
        ("Project", "Aurelia Hotel CRM"),
        ("Property", "11 rooms · 4 room types · café · 80-guest event hall"),
        ("Location", "Pondicherry, India"),
        ("Stack", "Vite + React 18 (frontend) · Node.js + Express + SQLite (backend)"),
        ("Repository", "https://github.com/aakashkummar-workspace/hotel_crm"),
        ("Currency", "INR (₹)"),
        ("License", "Private"),
    ], col_widths=(Cm(4), Cm(13)))

    doc.add_page_break()

    # ── Executive Summary ──────────────────────────────────────────────────
    add_heading(doc, "1. Executive Summary", 1)
    add_para(doc,
        "Aurelia is a production-ready property management system for a small heritage hotel. "
        "It replaces spreadsheet-driven operations with a single integrated CRM that staff use "
        "to manage rooms, bookings, guests, café orders, hall events, expenses, and invoices — "
        "and a separate public-facing booking site that guests use to enquire about stays."
    )
    add_para(doc,
        "The application was built from a high-fidelity HTML/CSS/JS prototype delivered through "
        "the Claude Design handoff, then re-architected as a real full-stack app with a SQLite-backed "
        "REST API, JWT authentication, transactional booking logic, file-based data persistence, "
        "and a single-port production deployment."
    )

    add_heading(doc, "Key capabilities", 2)
    for b in [
        "Live dashboard with revenue charts, occupancy gauge, and click-through KPI detail modals",
        "Full booking lifecycle with automatic room status sync (reserved → occupied → cleaning → available)",
        "Date-overlap collision detection — no double-booking, even via the API",
        "Per-room rate, max-guest, and image overrides on top of type-level defaults",
        "Café POS with cart, multiple payment methods, and an end-of-day Z-report",
        "Mini Hall reservations with rate card, advance tracking, and event drawer",
        "Expense ledger with category filters and CSV export",
        "Invoice generation with status filter, mark-as-paid, and printable view",
        "Guest CRM with WhatsApp/email/call links and per-guest activity",
        "Analytics: 7d / 30d / 90d / YTD revenue, occupancy, expense, and module breakdowns",
        "Public booking page with date range picker, guest stepper, and reservation modal",
        "Settings: editable hotel profile, tax rates, integrations, security, audit log",
        "Global ⌘K command palette for jump-to-page and entity search",
    ]:
        add_bullet(doc, b)

    doc.add_page_break()

    # ── Architecture ──────────────────────────────────────────────────────
    add_heading(doc, "2. Architecture", 1)
    add_kv_table(doc, [
        ("Frontend", "Vite + React 18 (no UI library, custom design system)"),
        ("Backend", "Node.js + Express 4 + better-sqlite3"),
        ("Database", "SQLite — file-based, WAL mode, foreign keys on"),
        ("Auth", "JWT (7-day expiry) + scrypt-hashed passwords"),
        ("Validation", "Zod schemas on every write endpoint"),
        ("Security", "Helmet, CORS allowlist, compression, morgan logs"),
        ("Build", "Vite (~80 KB gzipped total for both bundles)"),
        ("Dev mode", "Concurrent — backend on :4000, frontend on :5180 with /api proxy"),
        ("Prod mode", "Single port — Express serves /api and the built dist/ assets"),
        ("Container", "Multi-stage Dockerfile producing a slim runtime image"),
    ])

    add_heading(doc, "Project layout", 2)
    add_para(doc, "The repository uses npm workspaces with two packages:", size=10)
    add_para(doc,
        "hotel_crm/\n"
        "├── backend/\n"
        "│   ├── src/index.js          (Express entry, route mounting, prod static serving)\n"
        "│   ├── src/db.js             (SQLite, schema init, idempotent migrations)\n"
        "│   ├── src/seed.js           (Demo data + admin user seeding)\n"
        "│   ├── src/lib/dates.js      (Date parsing + range-overlap helpers)\n"
        "│   ├── src/middleware/       (auth.js, error.js)\n"
        "│   └── src/routes/           (auth, rooms, bookings, guests, coffee, hall,\n"
        "│                              expenses, invoices, settings, reports, public,\n"
        "│                              activity, search)\n"
        "├── frontend/\n"
        "│   ├── index.html            (CRM SPA entry)\n"
        "│   ├── booking.html          (Public booking site entry)\n"
        "│   ├── vite.config.js\n"
        "│   └── src/\n"
        "│       ├── App.jsx           (Top-level state, routing, mobile nav)\n"
        "│       ├── api.js            (Typed fetch client, CSV download helper)\n"
        "│       ├── booking.jsx       (Public site root)\n"
        "│       ├── components/       (Icon, Sidebar, Topbar, primitives, charts,\n"
        "│                              CommandPalette, TweaksPanel)\n"
        "│       ├── pages/            (Dashboard, Rooms, Bookings, Coffee, Hall,\n"
        "│                              Expenses, CRM, Reports, Invoices, Settings,\n"
        "│                              Login)\n"
        "│       └── styles/           (theme.css, booking.css)\n"
        "├── Dockerfile\n"
        "├── README.md\n"
        "└── package.json              (workspaces root)",
        size=9
    )

    doc.add_page_break()

    # ── Modules ────────────────────────────────────────────────────────────
    add_heading(doc, "3. Modules", 1)
    add_para(doc,
        "Every module is fully wired to the backend — buttons create real database rows, "
        "filters re-query the API, exports stream actual CSV from current data."
    )

    add_module_table(doc, [
        ("Dashboard",
         "Live KPIs (today, MTD, expenses, profit) — each clickable for a detail modal. "
         "30d/90d/YTD period filter slices the revenue chart. Stacked area chart, occupancy ring "
         "gauge, module cards, upcoming check-ins (with one-click check-in), recent transactions, "
         "booking-source breakdown, expense bars."),
        ("Rooms",
         "Per-type inventory cards (free / total) — clickable to edit type defaults. Grid / list / "
         "calendar views. Status filter chips, floor select, Add Room modal. Detail drawer with "
         "editable photo (auto-resized via canvas), rate override, max-guest override, status "
         "switcher, and Book This Room CTA."),
        ("Bookings",
         "Sortable list with All / Checked-in / Confirmed / Pending tabs and source filter. "
         "New Booking modal with date-aware availability — only shows rooms genuinely free for "
         "the chosen dates. Per-row dropdown: mark checked-in/out, confirm/pending, WhatsApp guest, "
         "delete (with confirm). Bulk-select + CSV export."),
        ("Coffee Shop",
         "POS-style layout: menu grid (left) + cart (right). Category chips, table assignment, "
         "customer name, four payment methods. Live tax calculation. Z-Report modal showing "
         "daily totals, payment-method breakdown, and CSV export. Menu modal listing every item."),
        ("Mini Hall",
         "Hero card with rate card. Reserve Hall modal. Click an event row to open a drawer with "
         "guest count, balance due, and a Confirm/Mark Pending toggle. Hall booking link copy."),
        ("Expenses",
         "Metric cards (this month, largest category, avg/day, pending). By-category bar chart, "
         "profit waterfall. Live category filter. Per-row delete with confirm dialog. CSV export."),
        ("Guests CRM",
         "Searchable list, profile drawer with WhatsApp / Email / Call shortcuts (real wa.me, "
         "mailto:, tel: links), Add Guest modal, Send Campaign (mailto BCC of all guest emails), "
         "New Booking shortcut that pre-fills the booking modal."),
        ("Reports",
         "Period-aware charts: 7d/30d/90d/YTD slices the revenue chart, occupancy bars, donut "
         "module mix, and expense breakdown. PDF (window.print) and CSV exports. Saved-report "
         "cards each export their own dataset."),
        ("Invoices",
         "Metrics (billed, collected, pending, avg). Status filter chips. New Invoice modal with "
         "auto-tax. Drawer view with Mark Paid, printable PDF, and Send actions."),
        ("Settings",
         "Hotel profile (saved to DB). Team list. Integrations grid with persistent connect/"
         "disconnect (localStorage). Billing & tax (rates, invoice prefix). Security toggles. "
         "Activity log fed by /api/activity."),
        ("Public Booking",
         "Standalone page at /booking.html with hero, date range picker, guest stepper, room "
         "grid, experiences, story, reviews, footer. Reserve button opens an inline modal "
         "(name/phone/email/notes) that POSTs an enquiry — staff see it instantly in Bookings."),
    ])

    doc.add_page_break()

    # ── Data model ─────────────────────────────────────────────────────────
    add_heading(doc, "4. Data Model", 1)
    add_para(doc, "Tables in the SQLite database (created with foreign keys ON, WAL journal):")

    for tbl, desc in [
        ("settings", "Key/value JSON store — hotel profile, tax rates, invoice numbering."),
        ("users", "Staff accounts — id, email (unique), scrypt password hash, name, role."),
        ("room_types", "Type catalogue — id, name, base_price, sqft, beds, max_guests."),
        ("rooms", "11 rooms — num (PK), type_id (FK), floor, status, guest, checkin, checkout, "
                  "image, price (override), max_guests (override). Last three are nullable; the "
                  "API resolves effective_price and effective_max_guests by falling back to the type."),
        ("guests", "CRM rows — id, name, email, phone, visits, lifetime, last_stay, status, note. "
                   "Auto-upserted by the booking POST."),
        ("bookings", "Reservations — id (BK-NNNN), guest, phone, email, room (FK), checkin, "
                     "checkout, nights, amount, status, source, created_at."),
        ("coffee_menu", "Menu — id, name, category, price, description, emoji."),
        ("coffee_orders", "POS orders — id (C-NNNN), time, items_count, total, table_label, "
                          "payment, items_json (the cart snapshot)."),
        ("hall_bookings", "Events — id (H-NNN), title, date, time, guests, advance, total, "
                          "status, contact."),
        ("expenses", "id (E-NNNN), date, category, vendor, amount, method, note."),
        ("invoices", "id (INV-prefix-NNNN), guest, date, amount, tax, total, status, method."),
        ("activity", "Audit trail — id, user_name, action, target, created_at. Auto-populated "
                     "on every booking write."),
    ]:
        p = doc.add_paragraph()
        r = p.add_run(tbl + " — ")
        r.bold = True
        r.font.color.rgb = GOLD_DARK
        r.font.name = "Consolas"
        r.font.size = Pt(10)
        r2 = p.add_run(desc)
        r2.font.size = Pt(10)

    doc.add_page_break()

    # ── API ────────────────────────────────────────────────────────────────
    add_heading(doc, "5. REST API Surface", 1)
    add_para(doc,
        "All endpoints return JSON. Mutating endpoints expect application/json. "
        "Unauthenticated callers may use public/* and read-only summary endpoints; the rest "
        "require Bearer auth."
    )

    add_endpoint_table(doc, [
        ("GET",   "/api/health",                       "Liveness probe"),
        ("POST",  "/api/auth/login",                   "Email + password → JWT"),
        ("GET",   "/api/auth/me",                      "Current user"),
        ("GET",   "/api/rooms",                        "All rooms + types with effective price/max"),
        ("GET",   "/api/rooms/types",                  "Room types with counts"),
        ("PATCH", "/api/rooms/types/:id",              "Edit type defaults (name, base price…)"),
        ("GET",   "/api/rooms/available",              "Rooms bookable for ?checkin=&checkout="),
        ("POST",  "/api/rooms",                        "Add a room"),
        ("PATCH", "/api/rooms/:num",                   "Update status, guest, price, max_guests, image"),
        ("DELETE","/api/rooms/:num",                   "Remove a room"),
        ("GET",   "/api/bookings",                     "List (?status=…)"),
        ("POST",  "/api/bookings",                     "Create — date-overlap rejected with 409"),
        ("PATCH", "/api/bookings/:id",                 "Update — re-checks overlap if dates change"),
        ("DELETE","/api/bookings/:id",                 "Cancel + free room if reserved"),
        ("GET",   "/api/guests",                       "List (?search=…)"),
        ("POST",  "/api/guests",                       "Add"),
        ("PATCH", "/api/guests/:id",                   "Update"),
        ("GET",   "/api/coffee/menu",                  "Café menu"),
        ("GET",   "/api/coffee/orders",                "Today's POS orders"),
        ("POST",  "/api/coffee/orders",                "Charge a cart"),
        ("GET",   "/api/hall",                         "Event reservations"),
        ("POST",  "/api/hall",                         "New reservation"),
        ("PATCH", "/api/hall/:id",                     "Update"),
        ("GET",   "/api/expenses",                     "Ledger"),
        ("POST",  "/api/expenses",                     "Add expense"),
        ("DELETE","/api/expenses/:id",                 "Remove"),
        ("GET",   "/api/invoices",                     "List"),
        ("POST",  "/api/invoices",                     "Create"),
        ("PATCH", "/api/invoices/:id",                 "Update (e.g. mark paid)"),
        ("GET",   "/api/settings/profile",             "Hotel profile"),
        ("PUT",   "/api/settings/profile",             "Save profile"),
        ("GET",   "/api/settings/tax",                 "Tax rates"),
        ("PUT",   "/api/settings/tax",                 "Save tax rates"),
        ("GET",   "/api/reports/summary",              "Dashboard aggregate"),
        ("GET",   "/api/activity",                     "Audit log"),
        ("GET",   "/api/search",                       "Global search across rooms/bookings/guests/invoices"),
        ("GET",   "/api/public/rooms",                 "Public room catalogue"),
        ("GET",   "/api/public/profile",               "Public hotel profile"),
        ("POST",  "/api/public/enquiries",             "Public reservation enquiry"),
    ])

    doc.add_page_break()

    # ── Booking lifecycle ─────────────────────────────────────────────────
    add_heading(doc, "6. Booking Lifecycle", 1)
    add_para(doc,
        "Creating a booking triggers a transactional cascade that keeps every related entity "
        "consistent — staff don't have to remember to flip room statuses or add guests by hand."
    )

    rows = [
        ("Create booking",
         "Inserts the booking, marks the room reserved with the guest's name + dates, "
         "upserts the guest into the CRM (visits + lifetime incremented if returning), "
         "logs the action."),
        ("Mark checked-in",
         "Room → occupied. Activity logged."),
        ("Mark checked-out",
         "Room → cleaning. Activity logged."),
        ("Mark cancelled",
         "Room → available (if it was reserved for this booking)."),
        ("Delete booking",
         "Frees the reserved room, logs deletion."),
        ("Date / room change",
         "Re-runs the overlap check. Rejects with 409 Conflict if the new room/dates clash "
         "with an existing reservation (ignores the booking being edited)."),
    ]
    add_module_table(doc, rows)

    doc.add_paragraph()
    add_para(doc, "Date-overlap detection uses a half-open range comparison — same-day "
                  "check-in on someone else's check-out day is allowed.", size=10, italic=True, color=INK_LIGHT)

    # ── Setup ─────────────────────────────────────────────────────────────
    doc.add_page_break()
    add_heading(doc, "7. Setup & Deployment", 1)

    add_heading(doc, "Local development", 2)
    add_para(doc,
        "git clone https://github.com/aakashkummar-workspace/hotel_crm.git\n"
        "cd hotel_crm\n"
        "npm install --workspaces --include-workspace-root\n"
        "cp backend/.env.example backend/.env\n"
        "npm run dev\n",
        size=10
    )
    add_para(doc, "Frontend: http://localhost:5180   ·   Backend: http://localhost:4000/api", size=10)
    add_para(doc, "Default login: concierge@aurelia.in / admin12345 (override via ADMIN_PASSWORD in .env)", size=10)

    add_heading(doc, "Production build", 2)
    add_para(doc,
        "npm run build              # builds both index.html and booking.html bundles\n"
        "NODE_ENV=production npm start\n",
        size=10
    )
    add_para(doc, "In production the Express server serves the static dist/ assets and the /api routes from a single port. Mount backend/data as a volume to persist the SQLite database between restarts.", size=10)

    add_heading(doc, "Docker", 2)
    add_para(doc,
        "docker build -t aurelia-crm .\n"
        "docker run -p 4000:4000 \\\n"
        "  -e JWT_SECRET=$(openssl rand -hex 32) \\\n"
        "  -v aurelia-data:/app/backend/data \\\n"
        "  aurelia-crm",
        size=10
    )

    add_heading(doc, "Environment variables", 2)
    add_kv_table(doc, [
        ("NODE_ENV", "development | production"),
        ("PORT", "Server port (default 4000)"),
        ("DATABASE_PATH", "SQLite file location (default ./data/aurelia.db)"),
        ("JWT_SECRET", "Required in production — at least 32 random bytes"),
        ("CORS_ORIGIN", "Allowlist (comma-separated for multiple)"),
        ("ADMIN_EMAIL", "Initial admin email (only used at first seed)"),
        ("ADMIN_PASSWORD", "Initial admin password (only used at first seed)"),
    ])

    # ── Production checklist ──────────────────────────────────────────────
    doc.add_page_break()
    add_heading(doc, "8. Production Checklist", 1)
    for b in [
        "Set a strong JWT_SECRET (≥32 random bytes)",
        "Set a strong ADMIN_PASSWORD and re-seed the DB once",
        "Set CORS_ORIGIN to your real domain (no wildcards)",
        "Put the app behind a reverse proxy (nginx / Caddy) with TLS",
        "Mount backend/data/ as a persistent volume",
        "Schedule SQLite backups: sqlite3 aurelia.db \".backup snapshot.db\"",
        "Configure log rotation for the morgan access log",
        "Replace stock Unsplash images in seed data with your own assets",
        "Review the Activity log periodically",
        "Configure your real WhatsApp / Razorpay / Channel-manager API keys",
    ]:
        add_bullet(doc, b)

    # ── Future enhancements ──────────────────────────────────────────────
    add_heading(doc, "9. Future Enhancements", 1)
    for b in [
        "Per-room calendar drag-and-drop to move/extend bookings",
        "Real channel manager sync (Booking.com, MakeMyTrip ARI push/pull)",
        "Razorpay payment intent generation on the public booking page",
        "WhatsApp Business API integration for booking confirmations and reminders",
        "S3 / Cloudinary upload for room photos (currently stored as data URLs)",
        "Multi-property support (current schema assumes a single property)",
        "Role-based permissions (admin / front desk / housekeeping / café manager)",
        "Real-time push (Server-Sent Events) for new bookings on the dashboard",
        "Invoice PDF generation server-side (currently client-side window.print)",
        "Cohort and retention analytics in the Reports module",
    ]:
        add_bullet(doc, b)

    # ── Repository ────────────────────────────────────────────────────────
    doc.add_page_break()
    add_heading(doc, "10. Repository & Credits", 1)
    add_kv_table(doc, [
        ("Repository", "https://github.com/aakashkummar-workspace/hotel_crm"),
        ("Branch", "main"),
        ("License", "Private (all rights reserved)"),
        ("Designed via", "Claude Design (claude.ai/design) handoff bundle"),
        ("Implemented with", "Claude Code (Anthropic)"),
        ("Commit count", "ce80370 onwards across 16+ feature commits"),
    ])

    add_para(doc,
        "Every module ships with working buttons, real database persistence, and end-to-end "
        "verified flows. The application can be run locally for evaluation in under five minutes "
        "from a fresh clone.",
        italic=True, color=INK_LIGHT
    )

    out_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "Aurelia-Hotel-CRM-Report.docx"))
    doc.save(out_path)
    print(f"OK: {out_path}")


if __name__ == "__main__":
    build()
