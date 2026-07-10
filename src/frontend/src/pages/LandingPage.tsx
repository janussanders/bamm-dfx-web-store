import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  BarChart3,
  Calculator,
  Calendar,
  Check,
  ChevronDown,
  Database,
  DollarSign,
  Download,
  FileText,
  Lock,
  PieChart,
  Receipt,
  RefreshCw,
  Shield,
  Sparkles,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import DownloadForm from "../components/DownloadForm";
import RegulatedFeatureDisclaimer from "../components/RegulatedFeatureDisclaimer";
import {
  BASIC_BILLS_INTRO,
  BASIC_DASHBOARD_INTRO,
  BASIC_INCOME_TRACKING_INTRO,
  BASIC_SUBHEAD,
  BILL_TRACKING_FEATURE_BLURB,
  BUDGET_ANALYTICS_FEATURE_BLURB,
  FEATURES_SECTION_SUBHEAD,
  FREE_TO_START_CARD,
  GET_STARTED_FOOTER,
  GET_STARTED_STEP_1,
  GET_STARTED_STEP_2,
  GET_STARTED_STEP_3,
  GET_STARTED_SUBHEAD,
  HERO_BADGE_CHECKOUT,
  HERO_BADGE_TRIAL,
  HERO_SUBHEAD,
  INCOME_FEATURE_BLURB,
  LANDING_LEGAL_NOTICE,
  MULTI_USER_FEATURE_BLURB,
  PAYCHECK_SURPLUS_BLURB,
  PREMIUM_DATABASE_INTRO,
  PREMIUM_GOALS_INTRO,
  PREMIUM_MIGRATION_INTRO,
  PREMIUM_PAYCHECK_INTRO,
  PREMIUM_SUBHEAD,
  PRIVACY_CARD_ACCESS,
  PRIVACY_CARD_LOCAL,
  PRIVACY_CARD_SECURE,
  PRIVACY_FEATURE_BLURB,
  PRIVACY_HERO_BADGE,
  PRIVACY_SECTION_LEAD,
  PRIVACY_WHY_BAMM,
  PRODUCT_FEATURES_SUBHEAD,
  TRADES_BULLET_DATA,
  TRADES_BULLET_RISK,
  TRADES_BULLET_SIGNALS,
  TRADES_BULLET_STRATEGY,
  TRADES_FEATURE_BLURB,
  TRADES_INTRO,
  TX_BULLET_DEDUCTION,
  TX_BULLET_ESTIMATES,
  TX_BULLET_SCENARIO,
  TX_BULLET_WITHHOLDING,
  TX_SIMULATOR_FEATURE_BLURB,
  TX_SIMULATOR_INTRO,
} from "../legal/marketing";

export default function LandingPage() {
  const navigate = useNavigate();
  const [showDownloadForm, setShowDownloadForm] = useState(false);
  const [basicOpen, setBasicOpen] = useState(false);
  const [premiumOpen, setPremiumOpen] = useState(false);

  const features = [
    {
      icon: Lock,
      title: "Local-First Privacy",
      description: PRIVACY_FEATURE_BLURB,
    },
    {
      icon: TrendingUp,
      title: "Intelligent Bill Tracking",
      description: BILL_TRACKING_FEATURE_BLURB,
    },
    {
      icon: Calculator,
      title: "Real-Time Budget Analytics",
      description: BUDGET_ANALYTICS_FEATURE_BLURB,
    },
    {
      icon: FileText,
      title: "Income Management",
      description: INCOME_FEATURE_BLURB,
    },
    {
      icon: Shield,
      title: "Tx Simulator",
      description: TX_SIMULATOR_FEATURE_BLURB,
    },
    {
      icon: BarChart3,
      title: "Trades",
      description: TRADES_FEATURE_BLURB,
    },
    {
      icon: Users,
      title: "Multi-User Support",
      description: MULTI_USER_FEATURE_BLURB,
    },
  ];

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 md:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />
        <div className="container relative z-10">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="space-y-4"
            >
              <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
                B.A.M.M<span className="text-primary">!</span>
              </h1>
              <p className="text-2xl md:text-3xl font-semibold text-muted-foreground">
                BUDGET. ANALYZE. MANAGE.{" "}
                <span className="text-primary">MASTER!</span>
              </p>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                {HERO_SUBHEAD}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Button
                size="lg"
                onClick={() => setShowDownloadForm(true)}
                className="text-lg"
                data-ocid="hero.download_button"
              >
                <Download className="mr-2 h-5 w-5" />
                Download Free
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate({ to: "/premium" })}
                className="text-lg"
                data-ocid="hero.premium_button"
              >
                View Premium Features
              </Button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="flex items-center justify-center gap-6 text-sm text-muted-foreground"
            >
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <span>{PRIVACY_HERO_BADGE}</span>
              </div>
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-primary" />
                <span>{HERO_BADGE_CHECKOUT}</span>
              </div>
              <div className="flex items-center gap-2">
                <Download className="h-4 w-4 text-primary" />
                <span>{HERO_BADGE_TRIAL}</span>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Why BAMM? Section */}
      <section
        className="py-20 border-t border-border/30"
        data-ocid="why_bamm.section"
      >
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="text-center space-y-3 mb-16"
          >
            <p className="text-primary text-sm font-semibold uppercase tracking-widest">
              Why BAMM?
            </p>
            <h2 className="text-3xl md:text-4xl font-bold">
              Built Around Your Privacy
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {PRIVACY_WHY_BAMM}
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                icon: Lock,
                title: "Local-First Privacy",
                description: PRIVACY_CARD_LOCAL,
                accent: "text-primary",
                bg: "bg-primary/10",
              },
              {
                icon: Shield,
                title: "You Stay in Control",
                description: PRIVACY_CARD_ACCESS,
                accent: "text-primary",
                bg: "bg-primary/10",
              },
              {
                icon: Download,
                title: "Free to Start",
                description: FREE_TO_START_CARD,
                accent: "text-primary",
                bg: "bg-primary/10",
              },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.5, delay: i * 0.12, ease: "easeOut" }}
              >
                <Card className="h-full border-border/50 hover:border-primary/40 transition-colors duration-300 bg-card/50">
                  <CardHeader>
                    <div
                      className={`h-12 w-12 rounded-xl ${item.bg} flex items-center justify-center mb-3`}
                    >
                      <item.icon className={`h-6 w-6 ${item.accent}`} />
                    </div>
                    <CardTitle className="text-xl">{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base leading-relaxed">
                      {item.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Product Features — BAMM Basic & Premium */}
      <section className="py-20 bg-gradient-to-b from-background to-muted/30">
        <div className="container">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl md:text-4xl font-bold">Product Features</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {PRODUCT_FEATURES_SUBHEAD}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 max-w-7xl mx-auto items-stretch">
            {/* BAMM Basic */}
            <Card className="h-full flex flex-col border-2 border-primary/25 bg-gradient-to-br from-primary/5 to-background hover:border-primary/40 transition-colors duration-300">
              <CardHeader className="pb-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-12 w-12 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                    <Download className="h-7 w-7 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <CardTitle className="text-2xl lg:text-3xl leading-tight">
                      BAMM Basic: Powerful Financial Management, Always Free
                    </CardTitle>
                    <p className="text-base text-primary font-semibold mt-1">
                      {BASIC_SUBHEAD}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col flex-1 space-y-8">
                <button
                  type="button"
                  onClick={() => setBasicOpen((v) => !v)}
                  className="flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
                  data-ocid="basic.learn_more_button"
                >
                  {basicOpen ? "Show Less" : "Learn More -->"}
                  <ChevronDown
                    className={`h-4 w-4 transition-transform duration-300 ${basicOpen ? "rotate-180" : ""}`}
                  />
                </button>
                <div
                  className={`space-y-8 overflow-hidden transition-all duration-500 ease-in-out ${basicOpen ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"}`}
                >
                  {/* Dashboard */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <BarChart3 className="h-6 w-6 text-primary" />
                      <h3 className="text-xl font-bold">Dashboard</h3>
                    </div>
                    <p className="text-muted-foreground">
                      {BASIC_DASHBOARD_INTRO}
                    </p>
                    <ul className="space-y-3 ml-9">
                      <li className="flex gap-3">
                        <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold">Real-Time Overview</p>
                          <p className="text-sm text-muted-foreground">
                            Track income, expenses, and net balance in one clean
                            interface
                          </p>
                        </div>
                      </li>
                      <li className="flex gap-3">
                        <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold">Pay Period Insights</p>
                          <p className="text-sm text-muted-foreground">
                            Automatically calculate totals for your current pay
                            period
                          </p>
                        </div>
                      </li>
                      <li className="flex gap-3">
                        <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold">Visual Analytics</p>
                          <p className="text-sm text-muted-foreground">
                            Beautiful charts and graphs that make your money
                            make sense
                          </p>
                        </div>
                      </li>
                    </ul>
                  </div>

                  {/* Bill Files */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Receipt className="h-6 w-6 text-primary" />
                      <h3 className="text-xl font-bold">Bill Files</h3>
                    </div>
                    <p className="text-muted-foreground">{BASIC_BILLS_INTRO}</p>
                    <ul className="space-y-3 ml-9">
                      <li className="flex gap-3">
                        <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold">Smart Organization</p>
                          <p className="text-sm text-muted-foreground">
                            Group bills by category, due date, or custom tags
                          </p>
                        </div>
                      </li>
                      <li className="flex gap-3">
                        <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold">Payment Tracking</p>
                          <p className="text-sm text-muted-foreground">
                            Mark bills as paid, pending, or overdue with one
                            click
                          </p>
                        </div>
                      </li>
                      <li className="flex gap-3">
                        <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold">Due Date Reminders</p>
                          <p className="text-sm text-muted-foreground">
                            Stay on top of upcoming bills and avoid late fees
                          </p>
                        </div>
                      </li>
                      <li className="flex gap-3">
                        <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold">
                            Recurring Bill Support
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Set it once, track it forever—perfect for
                            subscriptions and utilities
                          </p>
                        </div>
                      </li>
                    </ul>
                  </div>

                  {/* Income and Bill Tracking */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <DollarSign className="h-6 w-6 text-primary" />
                      <h3 className="text-xl font-bold">
                        Income and Bill Tracking
                      </h3>
                    </div>
                    <p className="text-muted-foreground">
                      {BASIC_INCOME_TRACKING_INTRO}
                    </p>
                    <ul className="space-y-3 ml-9">
                      <li className="flex gap-3">
                        <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold">
                            Multiple Income Sources
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Track salary, freelance work, side hustles, and more
                          </p>
                        </div>
                      </li>
                      <li className="flex gap-3">
                        <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold">
                            Expense Categorization
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Automatically organize spending into meaningful
                            categories
                          </p>
                        </div>
                      </li>
                      <li className="flex gap-3">
                        <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold">Historical Data</p>
                          <p className="text-sm text-muted-foreground">
                            Review past periods to identify trends and patterns
                          </p>
                        </div>
                      </li>
                      <li className="flex gap-3">
                        <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold">
                            Net Income Calculation
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Instantly see what's left after all bills are paid
                          </p>
                        </div>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="pt-4 mt-auto">
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={() => setShowDownloadForm(true)}
                  >
                    <Download className="mr-2 h-5 w-5" />
                    Download BAMM Basic Free
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* BAMM Premium */}
            <Card className="h-full flex flex-col border-2 border-primary/50 bg-gradient-to-br from-primary/12 via-card to-background relative overflow-hidden hover:border-primary/70 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300">
              <div className="absolute top-4 right-4">
                <div className="bg-primary/20 text-primary border border-primary/35 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 backdrop-blur-sm">
                  <Sparkles className="h-3.5 w-3.5" />
                  Premium
                </div>
              </div>
              <CardHeader className="pb-6">
                <div className="flex items-center gap-3 mb-2 pr-20">
                  <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center shrink-0 ring-1 ring-primary/30">
                    <Sparkles className="h-7 w-7 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <CardTitle className="text-2xl lg:text-3xl leading-tight">
                      BAMM Premium: Unlock Your Financial Mastery
                    </CardTitle>
                    <p className="text-base text-primary/90 font-semibold mt-1">
                      {PREMIUM_SUBHEAD}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col flex-1 space-y-8">
                <button
                  type="button"
                  onClick={() => setPremiumOpen((v) => !v)}
                  className="flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
                  data-ocid="premium.learn_more_button"
                >
                  {premiumOpen ? "Show Less" : "Learn More -->"}
                  <ChevronDown
                    className={`h-4 w-4 transition-transform duration-300 ${premiumOpen ? "rotate-180" : ""}`}
                  />
                </button>
                <div
                  className={`space-y-8 overflow-hidden transition-all duration-500 ease-in-out ${premiumOpen ? "max-h-[4000px] opacity-100" : "max-h-0 opacity-0"}`}
                >
                  {/* Paycheck Budget */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-6 w-6 text-primary" />
                      <h3 className="text-xl font-bold">Paycheck Budget</h3>
                    </div>
                    <p className="text-muted-foreground">
                      {PREMIUM_PAYCHECK_INTRO}
                    </p>
                    <ul className="space-y-3 ml-9">
                      <li className="flex gap-3">
                        <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold">Pre-Paycheck Planning</p>
                          <p className="text-sm text-muted-foreground">
                            Allocate funds before you receive them—zero-based
                            budgeting made easy
                          </p>
                        </div>
                      </li>
                      <li className="flex gap-3">
                        <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold">Bill Prioritization</p>
                          <p className="text-sm text-muted-foreground">
                            Automatically assign bills to specific paychecks
                            based on due dates
                          </p>
                        </div>
                      </li>
                      <li className="flex gap-3">
                        <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold">Surplus Management</p>
                          <p className="text-sm text-muted-foreground">
                            {PAYCHECK_SURPLUS_BLURB}
                          </p>
                        </div>
                      </li>
                      <li className="flex gap-3">
                        <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold">
                            Multi-Paycheck Coordination
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Perfect for couples or multiple income streams
                          </p>
                        </div>
                      </li>
                    </ul>
                  </div>

                  {/* Goals */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Target className="h-6 w-6 text-primary" />
                      <h3 className="text-xl font-bold">Goals</h3>
                    </div>
                    <p className="text-muted-foreground">
                      {PREMIUM_GOALS_INTRO}
                    </p>
                    <ul className="space-y-3 ml-9">
                      <li className="flex gap-3">
                        <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold">Custom Goal Creation</p>
                          <p className="text-sm text-muted-foreground">
                            Set targets for savings, debt payoff, vacations, or
                            any financial objective
                          </p>
                        </div>
                      </li>
                      <li className="flex gap-3">
                        <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold">Progress Tracking</p>
                          <p className="text-sm text-muted-foreground">
                            Visual indicators show exactly how close you are to
                            achieving your goals
                          </p>
                        </div>
                      </li>
                      <li className="flex gap-3">
                        <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold">Timeline Projections</p>
                          <p className="text-sm text-muted-foreground">
                            See when you'll reach your goal based on current
                            contributions
                          </p>
                        </div>
                      </li>
                      <li className="flex gap-3">
                        <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold">
                            Milestone Celebrations
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Get notified when you hit important checkpoints
                          </p>
                        </div>
                      </li>
                    </ul>
                  </div>

                  {/* Tx Simulator */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Calculator className="h-6 w-6 text-primary" />
                      <h3 className="text-xl font-bold">Tx Simulator</h3>
                    </div>
                    <p className="text-muted-foreground">
                      {TX_SIMULATOR_INTRO}
                    </p>
                    <RegulatedFeatureDisclaimer variant="tx_simulator" />
                    <ul className="space-y-3 ml-9">
                      <li className="flex gap-3">
                        <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold">
                            Tax Planning Estimates
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {TX_BULLET_ESTIMATES}
                          </p>
                        </div>
                      </li>
                      <li className="flex gap-3">
                        <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold">Withholding Scenarios</p>
                          <p className="text-sm text-muted-foreground">
                            {TX_BULLET_WITHHOLDING}
                          </p>
                        </div>
                      </li>
                      <li className="flex gap-3">
                        <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold">Scenario Planning</p>
                          <p className="text-sm text-muted-foreground">
                            {TX_BULLET_SCENARIO}
                          </p>
                        </div>
                      </li>
                      <li className="flex gap-3">
                        <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold">Deduction Tracking</p>
                          <p className="text-sm text-muted-foreground">
                            {TX_BULLET_DEDUCTION}
                          </p>
                        </div>
                      </li>
                    </ul>
                  </div>

                  {/* Migration Management */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <RefreshCw className="h-6 w-6 text-primary" />
                      <h3 className="text-xl font-bold">
                        Migration Management
                      </h3>
                    </div>
                    <p className="text-muted-foreground">
                      {PREMIUM_MIGRATION_INTRO}
                    </p>
                    <ul className="space-y-3 ml-9">
                      <li className="flex gap-3">
                        <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold">Import from Anywhere</p>
                          <p className="text-sm text-muted-foreground">
                            Bring data from spreadsheets, other apps, or legacy
                            systems
                          </p>
                        </div>
                      </li>
                      <li className="flex gap-3">
                        <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold">Data Validation</p>
                          <p className="text-sm text-muted-foreground">
                            Automatic checks ensure accuracy during migration
                          </p>
                        </div>
                      </li>
                      <li className="flex gap-3">
                        <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold">Backup and Restore</p>
                          <p className="text-sm text-muted-foreground">
                            Create snapshots before major changes—roll back
                            anytime
                          </p>
                        </div>
                      </li>
                      <li className="flex gap-3">
                        <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold">Version Control</p>
                          <p className="text-sm text-muted-foreground">
                            Track changes over time and revert to previous
                            states if needed
                          </p>
                        </div>
                      </li>
                    </ul>
                  </div>

                  {/* Database Management */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Database className="h-6 w-6 text-primary" />
                      <h3 className="text-xl font-bold">Database Management</h3>
                    </div>
                    <p className="text-muted-foreground">
                      {PREMIUM_DATABASE_INTRO}
                    </p>
                    <ul className="space-y-3 ml-9">
                      <li className="flex gap-3">
                        <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold">
                            Direct Database Access
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Advanced users can query and manipulate data
                            directly
                          </p>
                        </div>
                      </li>
                      <li className="flex gap-3">
                        <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold">Custom Reports</p>
                          <p className="text-sm text-muted-foreground">
                            Build sophisticated reports with SQL-like queries
                          </p>
                        </div>
                      </li>
                      <li className="flex gap-3">
                        <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold">Data Export</p>
                          <p className="text-sm text-muted-foreground">
                            Export to CSV, JSON, or other formats for external
                            analysis
                          </p>
                        </div>
                      </li>
                      <li className="flex gap-3">
                        <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold">
                            Performance Optimization
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Tools to keep your database fast, even with years of
                            data
                          </p>
                        </div>
                      </li>
                    </ul>
                  </div>

                  {/* B.A.M.M! Trades */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <TrendingUp className="h-6 w-6 text-primary" />
                      <h3 className="text-xl font-bold">B.A.M.M! Trades</h3>
                    </div>
                    <p className="text-muted-foreground">{TRADES_INTRO}</p>
                    <RegulatedFeatureDisclaimer variant="trades" />
                    <ul className="space-y-3 ml-9">
                      <li className="flex gap-3">
                        <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold">
                            Strategy &amp; Execution Tools
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {TRADES_BULLET_STRATEGY}
                          </p>
                        </div>
                      </li>
                      <li className="flex gap-3">
                        <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold">Strategy Scanning</p>
                          <p className="text-sm text-muted-foreground">
                            {TRADES_BULLET_SIGNALS}
                          </p>
                        </div>
                      </li>
                      <li className="flex gap-3">
                        <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold">Risk Controls</p>
                          <p className="text-sm text-muted-foreground">
                            {TRADES_BULLET_RISK}
                          </p>
                        </div>
                      </li>
                      <li className="flex gap-3">
                        <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold">Market Data Feeds</p>
                          <p className="text-sm text-muted-foreground">
                            {TRADES_BULLET_DATA}
                          </p>
                        </div>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="pt-4 mt-auto">
                  <Button
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/25 transition-all hover:shadow-primary/40"
                    size="lg"
                    onClick={() => navigate({ to: "/premium" })}
                  >
                    <Sparkles className="mr-2 h-5 w-5" />
                    Upgrade to BAMM Premium
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features That Matter Section */}
      <section className="py-20 bg-muted/10" data-ocid="features.section">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="text-center space-y-3 mb-14"
          >
            <p className="text-primary text-sm font-semibold uppercase tracking-widest">
              What You Get
            </p>
            <h2 className="text-3xl md:text-4xl font-bold">
              Features That Matter
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {FEATURES_SECTION_SUBHEAD}
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{
                  duration: 0.5,
                  delay: index * 0.09,
                  ease: "easeOut",
                }}
                data-ocid={`features.item.${index + 1}`}
              >
                <Card className="h-full border-border/50 hover:border-primary/50 transition-colors duration-300">
                  <CardHeader>
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                      <feature.icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle>{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Privacy Section */}
      <section className="py-20">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
              <CardHeader className="text-center">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Shield className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-3xl">
                  Your Data, Your Device, Your Control
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-center">
                <p className="text-lg text-muted-foreground">
                  {PRIVACY_SECTION_LEAD}
                </p>
                <div className="grid md:grid-cols-3 gap-6 pt-6">
                  <div className="space-y-2">
                    <Lock className="h-8 w-8 text-primary mx-auto" />
                    <h3 className="font-semibold">Local Records</h3>
                    <p className="text-sm text-muted-foreground">
                      {PRIVACY_CARD_LOCAL}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Shield className="h-8 w-8 text-primary mx-auto" />
                    <h3 className="font-semibold">Your Control</h3>
                    <p className="text-sm text-muted-foreground">
                      {PRIVACY_CARD_ACCESS}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <FileText className="h-8 w-8 text-primary mx-auto" />
                    <h3 className="font-semibold">Portable Data</h3>
                    <p className="text-sm text-muted-foreground">
                      {PRIVACY_CARD_SECURE}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Get Started in Minutes Section */}
      <section
        className="py-20 bg-gradient-to-br from-primary/10 via-background to-background"
        data-ocid="get_started.section"
      >
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="text-center space-y-3 mb-16"
          >
            <p className="text-primary text-sm font-semibold uppercase tracking-widest">
              Quick Setup
            </p>
            <h2 className="text-3xl md:text-4xl font-bold">
              Get Started in Minutes
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {GET_STARTED_SUBHEAD}
            </p>
          </motion.div>

          <div className="max-w-4xl mx-auto relative">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-10 left-[calc(16.67%+1rem)] right-[calc(16.67%+1rem)] h-px bg-gradient-to-r from-primary/20 via-primary/60 to-primary/20" />

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  step: "01",
                  icon: Download,
                  title: "Download Free",
                  description: GET_STARTED_STEP_1,
                },
                {
                  step: "02",
                  icon: PieChart,
                  title: "Set Up Your Profile",
                  description: GET_STARTED_STEP_2,
                },
                {
                  step: "03",
                  icon: TrendingUp,
                  title: "Start Mastering Finances",
                  description: GET_STARTED_STEP_3,
                },
              ].map((item, i) => (
                <motion.div
                  key={item.step}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{
                    duration: 0.55,
                    delay: i * 0.15,
                    ease: "easeOut",
                  }}
                  className="flex flex-col items-center text-center gap-4"
                  data-ocid={`get_started.step.${i + 1}`}
                >
                  <div className="relative">
                    <div className="h-20 w-20 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center shadow-lg">
                      <item.icon className="h-8 w-8 text-primary" />
                    </div>
                    <span className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                      {item.step}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold">{item.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Dual CTA */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
            className="mt-16 flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <Button
              size="lg"
              onClick={() => setShowDownloadForm(true)}
              className="text-lg min-w-[200px]"
              data-ocid="get_started.download_button"
            >
              <Download className="mr-2 h-5 w-5" />
              Download Free
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate({ to: "/premium" })}
              className="text-lg min-w-[200px]"
              data-ocid="get_started.premium_button"
            >
              <Sparkles className="mr-2 h-5 w-5" />
              View Premium Features
            </Button>
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="text-center text-sm text-muted-foreground mt-4"
          >
            {GET_STARTED_FOOTER}
          </motion.p>
        </div>
      </section>

      {/* Legal notice */}
      <section className="py-12 border-t border-border/30 bg-muted/20">
        <div className="container max-w-3xl text-center space-y-3">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {LANDING_LEGAL_NOTICE}
          </p>
          <p className="text-sm text-muted-foreground">
            <Link to="/terms" className="text-primary hover:underline">
              Terms
            </Link>
            {" · "}
            <Link to="/privacy" className="text-primary hover:underline">
              Privacy
            </Link>
            {" · "}
            <Link to="/refunds" className="text-primary hover:underline">
              Refunds
            </Link>
          </p>
        </div>
      </section>

      {/* Download Form Modal */}
      {showDownloadForm && (
        <DownloadForm onClose={() => setShowDownloadForm(false)} />
      )}
    </div>
  );
}
