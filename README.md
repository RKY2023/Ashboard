# Ashboard

A modern, responsive dashboard application built with Next.js 14, featuring interactive maps, user authentication, and a component-based UI architecture.

## Features

- **Dashboard Analytics** - Data visualization and metrics display
- **Interactive Maps** - Location-based data with React Leaflet integration
- **Authentication** - User registration and login with bcrypt password hashing
- **Theme Support** - Dark/light mode switching via next-themes
- **Responsive Design** - Mobile-first approach with TailwindCSS
- **Form Validation** - Schema validation using Zod and React Hook Form
- **Rate Limiting** - API protection with rate-limiter-flexible
- **Security Headers** - XSS protection, frame options, and content type sniffing prevention

## Tech Stack

| Category | Technologies |
|----------|-------------|
| Framework | Next.js 14.2, React 18.3, TypeScript |
| Styling | TailwindCSS 3.4, Framer Motion, tailwind-merge |
| UI Components | Radix UI (Label, Navigation Menu, Separator, Slot) |
| State Management | Redux Toolkit 2.8, Redux Persist, React Redux |
| Forms | React Hook Form 7.68, Zod 4.1, @hookform/resolvers |
| Maps | Leaflet 1.9, React Leaflet 4.2 |
| Icons | FontAwesome 6.5, Lucide React |
| Database | MongoDB 6.5 |
| Security | bcryptjs, rate-limiter-flexible |
| Caching | Redis 5.10 |

## Getting Started

### Prerequisites

- Node.js 18+ (LTS recommended)
- npm, yarn, or pnpm
- MongoDB instance (local or Atlas)
- Redis instance (optional, for rate limiting)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd ashboard
```

2. Install dependencies:
```bash
npm install
# or
pnpm install
```

3. Configure environment variables:
```bash
cp .env.example .env.local
```

4. Update `.env.local` with your credentials:
```env
API_URL=mongodb+srv://username:password@cluster.mongodb.net/database_name
API_URL2=mongodb+srv://username:password@cluster.mongodb.net/database_name
```

5. Start the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
ashboard/
├── components/
│   ├── ui/                 # Reusable UI components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── form.tsx
│   │   ├── input.tsx
│   │   ├── navigation-menu.tsx
│   │   ├── Carousel/
│   │   ├── Header/
│   │   ├── Layout/
│   │   ├── Modal/
│   │   └── Section/
│   ├── navigation/         # Navigation components
│   ├── login/              # Authentication components
│   ├── LeafletMap.tsx      # Map component
│   ├── DataList.tsx        # Data display component
│   └── List.tsx            # List component
├── pages/
│   ├── api/                # API routes
│   │   ├── createUser.ts   # User registration
│   │   ├── login.ts        # Authentication
│   │   ├── getMeetup.ts    # Meetup data
│   │   ├── grocery.ts      # Grocery data
│   │   ├── recipe.ts       # Recipe data
│   │   └── ipaddress.ts    # IP address utility
│   ├── auth/               # Authentication pages
│   ├── dashboard/          # Dashboard pages
│   ├── home/               # Home page
│   ├── login/              # Login page
│   ├── map/                # Map page
│   └── products/           # Products page
├── lib/
│   ├── mongodb.ts          # Database connection
│   ├── rateLimit.ts        # Rate limiting utilities
│   ├── validation.ts       # Input validation schemas
│   ├── pagination.ts       # Pagination helpers
│   └── utils.ts            # Utility functions
├── store/                  # Redux store configuration
├── hooks/                  # Custom React hooks
├── types/                  # TypeScript type definitions
├── data/                   # Static data files
├── styles/                 # Global styles
└── public/                 # Static assets
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build optimized production bundle |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint for code quality checks |

## API Routes

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/createUser` | POST | Register a new user |
| `/api/login` | POST | Authenticate user |
| `/api/getMeetup` | GET | Fetch meetup data |
| `/api/grocery` | GET | Fetch grocery items |
| `/api/recipe` | GET | Fetch recipes |
| `/api/ipaddress` | GET | Get client IP address |

## Security

This application implements several security measures:

- **Password Hashing** - bcryptjs for secure password storage
- **Rate Limiting** - Protection against brute force attacks
- **Input Validation** - Zod schemas for request validation
- **Security Headers** - Configured in `next.config.mjs`:
  - `X-Frame-Options: SAMEORIGIN`
  - `X-Content-Type-Options: nosniff`
  - `X-XSS-Protection: 1; mode=block`
  - `X-DNS-Prefetch-Control: on`

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m 'Add your feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Author

**Raj Kumar Yadav**
