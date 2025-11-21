import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Activity,
  BarChart3,
  Code,
  DollarSign,
  Layers,
  Zap,
  ArrowRight,
  Github,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

const features = [
  {
    icon: Activity,
    title: "Real-time Logs",
    description: "Stream every prompt, response, and model call as they happen in production.",
  },
  {
    icon: DollarSign,
    title: "Cost Analytics",
    description: "Track spending per model, route, user, or feature with detailed breakdowns.",
  },
  {
    icon: Layers,
    title: "Multi-tenant",
    description: "Secure workspace isolation with project-level permissions and API keys.",
  },
  {
    icon: Code,
    title: "SDK Drop-in",
    description: "Tiny Python & JavaScript clients. No heavy setup, no complex infrastructure.",
  },
  {
    icon: BarChart3,
    title: "Performance Metrics",
    description: "Monitor latency, token usage, and throughput across all your AI features.",
  },
  {
    icon: Zap,
    title: "Instant Setup",
    description: "Get visibility in minutes. Simple, fast, and built for real-world workflows.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
              <BarChart3 className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold">AI Observability SDK</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/dashboard">
              <Button data-testid="button-dashboard">Dashboard</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-24">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-bold tracking-tight mb-6">
            Real-time AI Observability for Modern Apps
          </h1>
          <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
            The fastest way to understand what your AI features are doing in production.
            Drop in a tiny SDK and instantly get visibility into every prompt, response,
            latency spike, and cost across your app.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/dashboard">
              <Button size="lg" data-testid="button-start-free">
                Get Started <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" asChild>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                data-testid="link-github"
              >
                <Github className="mr-2 h-4 w-4" />
                View on GitHub
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            Everything you need to ship with confidence
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <Card key={feature.title} className="hover-elevate">
                <CardContent className="p-6">
                  <feature.icon className="h-10 w-10 text-primary mb-4" />
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* SDK Integration Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8">
            Drop in and start monitoring
          </h2>
          <Card>
            <CardContent className="p-8">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-3">Install the SDK</h3>
                  <div className="bg-muted rounded-md p-4 font-mono text-sm">
                    <code>npm install @ai-obs/sdk</code>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-3">Initialize in your app</h3>
                  <div className="bg-muted rounded-md p-4 font-mono text-sm overflow-x-auto">
                    <pre>{`import { ObservabilitySDK } from '@ai-obs/sdk';

const obs = new ObservabilitySDK({
  apiKey: 'your-api-key',
  project: 'my-project'
});

// Wrap your AI calls
const response = await obs.track(async () => {
  return await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: 'Hello!' }]
  });
});`}</pre>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t mt-24">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">Features</a></li>
                <li><a href="#" className="hover:text-foreground">Pricing</a></li>
                <li><a href="#" className="hover:text-foreground">Documentation</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">API Reference</a></li>
                <li><a href="#" className="hover:text-foreground">Guides</a></li>
                <li><a href="#" className="hover:text-foreground">Blog</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">About</a></li>
                <li><a href="#" className="hover:text-foreground">Careers</a></li>
                <li><a href="#" className="hover:text-foreground">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">Privacy</a></li>
                <li><a href="#" className="hover:text-foreground">Terms</a></li>
                <li><a href="#" className="hover:text-foreground">Security</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
            © 2024 AI Observability SDK. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
