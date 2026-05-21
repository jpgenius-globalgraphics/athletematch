export const runtime = 'edge';
import Link from "next/link";
import { ArrowRight, Target, Users, TrendingUp, Shield } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-black">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 glass">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Target className="w-8 h-8 text-blue-500" />
            <span className="text-xl font-bold">AthleteMatch</span>
          </div>
          <Link
            href="/match"
            className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 transition-all"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="min-h-screen flex items-center justify-center pt-20 px-6 relative overflow-hidden">
        {/* Background blur elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
        </div>

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h1 className="text-6xl md:text-7xl font-bold mb-6 leading-tight">
            Find Your <span className="gradient-primary bg-clip-text text-transparent">Perfect College</span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-400 mb-8 leading-relaxed">
            Stop guessing. Get matched with colleges based on your GPA, test scores, athletic level, and recruiting profile. Free, fast, and accurate.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/match"
              className="px-8 py-4 rounded-lg gradient-primary text-white font-semibold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-blue-500/50 transition-all"
            >
              Find Your Match <ArrowRight className="w-5 h-5" />
            </Link>
            <button className="px-8 py-4 rounded-lg glass font-semibold hover:bg-white/10 transition-all">
              Learn More
            </button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 max-w-7xl mx-auto">
        <h2 className="text-4xl font-bold text-center mb-16">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              icon: Users,
              title: "Input Your Profile",
              description: "Tell us your GPA, test scores, athletic level, and club team information.",
            },
            {
              icon: Target,
              title: "Smart Matching",
              description: "Our algorithm matches you with colleges that fit your academic and athletic profile.",
            },
            {
              icon: TrendingUp,
              title: "Get Results",
              description: "Receive a curated list of schools actively recruiting athletes like you.",
            },
          ].map((feature, i) => (
            <div key={i} className="glass rounded-xl p-8 hover:bg-white/10 transition-all">
              <feature.icon className="w-12 h-12 text-blue-500 mb-4" />
              <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
              <p className="text-gray-400">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Why Us Section */}
      <section className="py-20 px-6 max-w-7xl mx-auto">
        <div className="glass rounded-2xl p-12">
          <div className="flex items-start gap-4 mb-6">
            <Shield className="w-8 h-8 text-blue-500 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-2xl font-bold mb-2">100% Free. No Hidden Fees.</h3>
              <p className="text-gray-400">
                We believe every athlete deserves access to recruiting information. No subscriptions, no upsells, no pressure. Just honest matches.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 max-w-7xl mx-auto text-center">
        <h2 className="text-4xl font-bold mb-6">Ready to Find Your Match?</h2>
        <p className="text-xl text-gray-400 mb-8">Takes 2 minutes. Get started now.</p>
        <Link
          href="/match"
          className="px-8 py-4 rounded-lg gradient-primary text-white font-semibold inline-flex items-center gap-2 hover:shadow-lg hover:shadow-blue-500/50 transition-all"
        >
          Start Matching <ArrowRight className="w-5 h-5" />
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 px-6">
        <div className="max-w-7xl mx-auto text-center text-gray-500">
          <p>© 2024 AthleteMatch. Built for athletes, by athletes.</p>
        </div>
      </footer>
    </main>
  );
}
