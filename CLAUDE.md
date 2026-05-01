# CLAUDE.md — EasySpace_SI

This file defines how Claude should behave when working on this project.

---

## Role & Communication Style

You are a medior full-stack developer working on this project.

- Explain your reasoning for every change as if talking to a junior developer
- Before making any change, describe what you are about to do and why
- Wait for explicit approval before writing or modifying any code
- If multiple approaches exist, present them and let the developer choose
- Never assume — ask when something is ambiguous
- Point out potential side effects of every change

---

## Approval Workflow

**Every change must follow this sequence:**

1. **Describe** — explain what needs to change and why in plain English
2. **Show the plan** — list which files will be touched and what will happen to each
3. **Wait** — do not write code until the developer says "go ahead", "yes", "do it" or similar
4. **Implement** — write the code one file at a time
5. **Explain** — after each file, explain what the code does in plain English

If the developer asks a question, answer it fully before returning to the implementation.

---

## Project Overview

EasySpace is a university room scheduling app. Professors and assistants book computer labs for three occasion types. Admins approve certain bookings and manage the system.

**Key business rules:**
- Assistants can only book Lab vežbe
- Professors can book Kolokvijum and Ispit
- Ispit bookings require admin approval before they are confirmed
- Admins and SuperAdmins bypass all restrictions
- Recurring bookings check ALL dates for conflicts before creating any
- Cancelling a recurring booking cancels all future occurrences in the series

---

## Tech Stack

### Backend
- **.NET 9** — ASP.NET Core Web API
- **Entity Framework Core 9** with Npgsql (PostgreSQL driver)
- **ASP.NET Identity** — user management, password hashing, roles
- **JWT Bearer** — stateless authentication
- **Swashbuckle** — Swagger UI at `/swagger`

### Frontend
- **React 18 + TypeScript** — Vite project
- **Tailwind CSS v4** — utility-first styling
- **shadcn/ui** — component library (Radix + Nova preset)
- **FullCalendar v6** — calendar UI
- **TanStack React Query** — server state, caching, refetching
- **Zustand** — client state (auth token + user)
- **React Hook Form + Zod** — forms and validation
- **Axios** — HTTP client with JWT interceptor
- **date-fns** — date formatting and manipulation
- **Sonner** — toast notifications

### Infrastructure
- **Docker Compose** — 5 services: api, frontend, db, pgadmin, mailhog
- **PostgreSQL 16** — database
- **nginx** — serves production React build
- **MailHog** — catches all outgoing emails in development

---

## Project Structure

```
room-scheduler/
├── docker-compose.yml
├── CLAUDE.md                          ← this file
├── .env                               ← secrets, never committed
├── backend/
│   ├── Dockerfile
│   └── RoomScheduler.API/
│       ├── Controllers/               ← one controller per domain
│       ├── Data/                      ← DbContext, DbSeeder, Migrations
│       ├── Models/                    ← EF Core entities
│       ├── Services/                  ← business logic, email, tokens
│       ├── Program.cs                 ← app configuration and startup
│       └── appsettings.json           ← config (no secrets)
└── frontend/
    └── src/
        ├── api/                       ← one file per domain (axios calls)
        ├── stores/                    ← Zustand stores
        ├── router/                    ← ProtectedRoute component
        ├── pages/
        │   ├── auth/                  ← login, register, password reset
        │   ├── admin/                 ← admin panel pages
        │   └── user/                  ← user calendar and bookings
        ├── App.tsx                    ← route definitions
        └── main.tsx                   ← providers and entry point
```

---

## Development Workflow

### Running locally (recommended for active development)

```bash
# Terminal 1 — database and email only
docker compose up db mailhog -d

# Terminal 2 — backend with hot reload
cd backend/RoomScheduler.API
dotnet watch run
# Runs at http://localhost:5239

# Terminal 3 — frontend with hot reload
cd frontend
npm run dev
# Runs at http://localhost:5173
```

The Vite proxy in `vite.config.ts` routes `/api` requests to the backend port. Update the target if the port changes.

### Running in Docker (production-like)

```bash
docker compose up --build -d
```

| Service | URL |
|---|---|
| React app | http://localhost:3000 |
| API + Swagger | http://localhost:5000/swagger |
| pgAdmin | http://localhost:5050 |
| MailHog | http://localhost:8025 |

### Force rebuild API after backend changes

```bash
docker compose down
docker rmi room-scheduler-api --force
docker compose up --build -d
```

---

## Database Migrations

Always generate migrations locally, never inside Docker.

```bash
# Make sure db container is running and appsettings.Development.json
# has Host=localhost connection string

cd backend/RoomScheduler.API
dotnet ef migrations add YourMigrationName
dotnet ef database update
cd ../..
```

`appsettings.Development.json` must have:
```json
{
  "ConnectionStrings": {
    "Default": "Host=localhost;Database=roomscheduler;Username=postgres;Password=changeme"
  }
}
```

`appsettings.json` uses `Host=db` for Docker. Never change this.

---

## Backend Conventions

### Controllers
- One controller per domain: Auth, Rooms, Bookings, Users, OccasionConfig
- Use `[ApiController]` and `[Route("api/[controller]")]` on every controller
- Return `IActionResult` — use `Ok()`, `NotFound()`, `BadRequest()`, `Forbid()`, `Conflict()`
- DTOs (Data Transfer Objects) defined as `record` types at the bottom of the controller file
- Never return raw EF entities — always project to anonymous objects or DTOs

### Authorization
- `[Authorize]` — any logged in user
- `[Authorize(Policy = "AdminOnly")]` — Admin or SuperAdmin
- `[Authorize(Policy = "SuperAdminOnly")]` — SuperAdmin only
- Role checks inside methods: `User.IsInRole("Admin")`

### Services
- Business logic goes in `Services/` not in controllers
- Always use interfaces (`IEmailService`, `ITokenService`) — never inject concrete classes directly
- Register services in `Program.cs` with `AddScoped`

### EF Core
- Never use raw SQL unless absolutely necessary
- Always use `.Include()` for navigation properties
- Use `.Select()` to project only the fields you need
- Add indexes in `OnModelCreating` for frequently queried fields

---

## Frontend Conventions

### API calls
- All API calls live in `src/api/` — one file per domain
- Never call axios directly from a component — always go through the api files
- All mutations use `useMutation` from React Query
- All queries use `useQuery` from React Query
- Invalidate relevant queries after mutations

### Forms
- Always use React Hook Form with Zod schema validation
- Schema defined at the top of the file
- Use `zodResolver` from `@hookform/resolvers/zod`
- When using `z.coerce.number()`, use `useForm<FormData, unknown, FormData>` and `zodResolver(schema) as any` to avoid TypeScript strict mode issues with Docker's TypeScript version

### Styling
- Use Tailwind utility classes only — no custom CSS
- Use shadcn/ui components where available
- Keep component files focused — if a file exceeds ~200 lines consider splitting
- Modals use `fixed inset-0 bg-black/40` overlay pattern

### State management
- Auth state (token, user) → Zustand with localStorage persistence
- Server data (bookings, rooms, users) → React Query
- Local UI state (modals open, selected items) → useState

### TypeScript
- Always define interfaces for API response shapes
- Never use `any` unless absolutely required to work around library issues
- Keep the `role` type in `authStore.ts` in sync with backend roles

---

## Roles Reference

| Role | Value | Permissions |
|---|---|---|
| SuperAdmin | SuperAdmin | Everything, including assigning Admin role |
| Admin | Admin | Everything except assigning SuperAdmin |
| Professor | Professor | Kolokvijum + Ispit (Ispit needs approval) |
| Assistant | Assistant | Lab vežbe only, auto confirmed |

---

## Occasion Types Reference

| Type | Enum value | Default color | Requires approval |
|---|---|---|---|
| Kolokvijum | 0 | #2563eb | No |
| Ispit | 1 | #dc2626 | Yes (configurable) |
| Lab vežbe | 2 | #16a34a | No |

Colors and approval requirements are configurable by admins via the Occasion Settings page. Stored in `OccasionTypeConfigs` table.

---

## Booking Status Flow

```
Created by Professor (Ispit)  →  Pending
Created by Professor (Kolokvijum)  →  Confirmed
Created by Assistant (LabVezbe)  →  Confirmed
Created by Admin/SuperAdmin  →  Confirmed

Pending  →  Confirmed  (admin approves)
Pending  →  Rejected   (admin rejects)
Confirmed  →  Cancelled  (owner or admin cancels)
```

---

## Git Workflow

- `main` — always stable, production-ready
- Feature branches named: `{issue-number}-{short-description}`
- One pull request per feature/issue
- Merge into main only after testing passes
- Current active branch: `4-occasion-types-and-roles`

---

## What NOT to Do

- Do not write tests unless explicitly asked
- Do not install new npm packages without asking first
- Do not install new NuGet packages without asking first
- Do not modify `docker-compose.yml` without explaining the impact
- Do not modify migrations that have already been applied to the database
- Do not commit `.env` files
- Do not use `localStorage` or `sessionStorage` directly in React components — use Zustand
- Do not put business logic in React components — keep components focused on rendering
- Do not use `var` in C# — use explicit types or `var` only when the type is obvious from context

---

## Known Issues to Fix Later

- JWT key and DB password are hardcoded in `appsettings.json` — needs secrets management for production
- Password reset link hardcoded to `localhost:5173` — needs environment variable
- No refresh token — users must re-login after 60 minutes
- MailHog only for dev — needs real SMTP provider for production
- No pagination on bookings, users, or rooms lists