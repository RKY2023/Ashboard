import Link from 'next/link';
import { Particle } from '@/src/components/effects/Particle';
import { AshboardLogo } from '@/src/components/brand/AshboardLogo';
import {
  Lightbulb,
  Shield,
  Zap,
  Snowflake,
  ShoppingCart,
  UtensilsCrossed,
  Wallet,
  Bell,
  Bot,
  ArrowRight,
  Activity,
  Flame,
  Car,
} from 'lucide-react';

export const metadata = {
  title: 'Ashboard — Home Automation & ERP',
  description:
    'A dashboard to organise your home activities to a singular platform with ease.',
};

const emissionPillars = [
  {
    icon: Activity,
    title: 'Energy Consumption',
    summary:
      'Monitor electricity meter readings and device usage patterns in real time.',
  },
  {
    icon: Flame,
    title: 'Cooking Emissions',
    summary: 'Track natural gas usage and kitchen ventilation performance.',
  },
  {
    icon: Car,
    title: 'Vehicle Emissions',
    summary:
      'Analyze distance traveled and fuel usage for eco-friendly driving.',
  },
];

const features = [
  {
    icon: Lightbulb,
    title: 'Devices',
    desc: 'Lights, locks, sensors and thermostats over MQTT, all in one panel.',
  },
  {
    icon: Bot,
    title: 'Automation',
    desc: 'Triggers, scenes, and schedules with a visual builder.',
  },
  {
    icon: Shield,
    title: 'Security',
    desc: 'Arm/disarm presets, motion events, and severity-tiered alerts.',
  },
  {
    icon: Zap,
    title: 'Energy',
    desc: 'Realtime power, hourly/daily charts, and monthly budget alerts.',
  },
  {
    icon: Snowflake,
    title: 'Climate',
    desc: 'HVAC zones with per-zone targets, modes, and weekly schedules.',
  },
  {
    icon: ShoppingCart,
    title: 'Grocery',
    desc: 'Pantry inventory with expiry tracking and shopping lists.',
  },
  {
    icon: UtensilsCrossed,
    title: 'Recipes',
    desc: 'Match recipes against your pantry — see what you can cook now.',
  },
  {
    icon: Wallet,
    title: 'Finance',
    desc: 'Transactions, budgets, and grocery-spending integration.',
  },
  {
    icon: Bell,
    title: 'Notifications',
    desc: 'Configurable alert rules across every domain.',
  },
];

export default function WelcomePage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <Particle />

      <div className="relative z-10">
        {/* Top bar */}
        <header className="flex items-center justify-between px-4 sm:px-8 py-5">
          <Link href="/" className="flex items-center gap-2.5">
            <AshboardLogo size={36} className="text-primary" />
            <span className="font-bold text-xl">Ashboard</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-medium rounded-lg hover:bg-accent transition-colors"
            >
              Log in
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Sign up
            </Link>
          </div>
        </header>

        {/* Hero — Check Home Emission */}
        <section
          className="w-full pt-16 pb-32 text-white -mt-2"
          style={{
            backgroundImage:
              'linear-gradient(22.5deg, #0aa6ec, #a35df2)',
            clipPath: 'polygon(100% 85%, 0 100%, 0 0, 100% 0)',
          }}
        >
          <div className="px-4 sm:px-8 text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center justify-center mb-6">
              <div className="p-4 rounded-2xl bg-white/15 backdrop-blur border border-white/20">
                <AshboardLogo size={72} className="text-white" />
              </div>
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-5">
              Check Home Emission
              <br />
              for Smart Home
            </h1>
            <p className="text-lg sm:text-xl text-white/90 max-w-2xl mx-auto mb-8">
              A dashboard to organise your home activities to a singular
              platform with ease.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-white text-[#0885bd] font-semibold hover:bg-white/90 transition-colors shadow-md"
              >
                Get Started
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-white/40 text-white font-medium hover:bg-white/10 transition-colors"
              >
                I already have an account
              </Link>
            </div>
          </div>
        </section>

        {/* Why Choose Ashboard? */}
        <section className="px-4 sm:px-8 pb-24 max-w-5xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-3">
            Why Choose Ashboard?
          </h2>
          <p className="text-center text-muted-foreground mb-10">
            Three pillars for tracking your household&apos;s carbon footprint.
          </p>
          <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
            {emissionPillars.map((p) => (
              <div
                key={p.title}
                className="rounded-xl border border-border bg-card/80 backdrop-blur p-6 shadow-sm hover:shadow-md hover:border-primary/40 transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                  <p.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{p.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {p.summary}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Beyond emissions — full feature grid */}
        <section className="px-4 sm:px-8 pb-24 max-w-6xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-2">
            And much more under one roof
          </h2>
          <p className="text-center text-muted-foreground mb-10">
            Every feature ships behind RBAC, audit logs, and household isolation.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-border bg-card/80 backdrop-blur p-5 hover:border-primary/50 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-3">
                  <f.icon className="w-5 h-5" />
                </div>
                <h3 className="font-semibold mb-1">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-border px-4 sm:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <AshboardLogo size={20} className="text-muted-foreground" />
            <span>© {new Date().getFullYear()} Ashboard. Built by Raj Kumar Yadav.</span>
          </div>
          <div className="flex gap-4">
            <Link href="/login" className="hover:text-foreground">
              Log in
            </Link>
            <Link href="/register" className="hover:text-foreground">
              Sign up
            </Link>
            <Link href="/dashboard" className="hover:text-foreground">
              Dashboard
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
