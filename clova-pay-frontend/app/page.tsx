"use client";

import Navbar from "@/components/Navbar";
import FeatureCard from "@/components/FeatureCard";
import { useWallet } from "@/context/WalletContext";
import { SUPPORTED_CURRENCIES } from "@/lib/stacks";
import {
  Zap,
  Shield,
  Coins,
  Globe,
  ArrowRight,
  Wallet
} from "lucide-react";
import Link from "next/link";

export default function Home() {
  const { isConnected, connectWallet } = useWallet();

  return (
    <div className="min-h-screen bg-black">
      <Navbar />

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center hero-gradient pt-16">
        {/* Background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/20 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl animate-float" style={{ animationDelay: "-3s" }} />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/10 mb-8">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm text-gray-300">Powered by Stacks & Bitcoin</span>
          </div>

          {/* Main heading */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
            Convert Crypto to
            <span className="block gradient-text">African Fiat</span>
          </h1>

          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10">
            Seamlessly convert your STX and stablecoins to NGN, KES, GHS and more.
            Fast off-ramp powered by Stacks blockchain.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {isConnected ? (
              <Link
                href="/dashboard"
                className="btn-primary px-8 py-4 rounded-full text-white font-semibold flex items-center gap-2"
              >
                Open Dashboard
                <ArrowRight className="w-5 h-5" />
              </Link>
            ) : (
              <button
                onClick={connectWallet}
                className="btn-primary px-8 py-4 rounded-full text-white font-semibold flex items-center gap-2"
              >
                <Wallet className="w-5 h-5" />
                Connect Wallet to Start
              </button>
            )}
            <a
              href="#how-it-works"
              className="px-8 py-4 rounded-full border border-white/20 text-white font-semibold hover:bg-white/5 transition-colors"
            >
              Learn More
            </a>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 mt-16 max-w-lg mx-auto">
            <div>
              <div className="text-3xl font-bold text-white">1%</div>
              <div className="text-sm text-gray-500">Low Fees</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white">5+</div>
              <div className="text-sm text-gray-500">Currencies</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white">Fast</div>
              <div className="text-sm text-gray-500">Settlement</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Why ClovaPay?</h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              Built on Bitcoin via Stacks, offering secure and transparent off-ramp services.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FeatureCard
              icon={Zap}
              title="Lightning Fast"
              description="Orders processed within minutes, not hours. Get fiat in your bank quickly."
              gradient="from-yellow-500 to-orange-500"
            />
            <FeatureCard
              icon={Shield}
              title="Secure Escrow"
              description="Funds held safely in smart contract until your fiat is confirmed delivered."
              gradient="from-green-500 to-emerald-500"
            />
            <FeatureCard
              icon={Coins}
              title="Low Fees"
              description="Just 1% platform fee. No hidden charges or surprise deductions."
              gradient="from-orange-500 to-red-500"
            />
            <FeatureCard
              icon={Globe}
              title="Africa First"
              description="Designed for Nigerian Naira, Kenyan Shilling, Ghanaian Cedi and more."
              gradient="from-purple-500 to-pink-500"
            />
          </div>
        </div>
      </section>

      {/* Supported Currencies */}
      <section id="currencies" className="py-24 px-4 sm:px-6 lg:px-8 bg-white/[0.02]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Supported Currencies</h2>
            <p className="text-gray-400">Convert to your local currency with ease</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {SUPPORTED_CURRENCIES.map((currency) => (
              <div
                key={currency.code}
                className="glass rounded-2xl p-6 text-center card-hover"
              >
                <div className="text-4xl mb-3">{currency.flag}</div>
                <div className="text-xl font-semibold text-white">{currency.code}</div>
                <div className="text-sm text-gray-400">{currency.name}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">How It Works</h2>
            <p className="text-gray-400">Three simple steps to convert your crypto</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Connect Wallet",
                description: "Link your Stacks wallet to get started. We support Hiro Wallet and Xverse."
              },
              {
                step: "02",
                title: "Create Order",
                description: "Enter amount and bank details. Your STX is locked in secure escrow."
              },
              {
                step: "03",
                title: "Receive Fiat",
                description: "We process your order and send fiat directly to your bank account."
              }
            ].map((item, index) => (
              <div key={index} className="relative">
                {/* Connector line */}
                {index < 2 && (
                  <div className="hidden md:block absolute top-12 left-1/2 w-full h-0.5 bg-gradient-to-r from-orange-500/50 to-purple-500/50" />
                )}

                <div className="relative glass rounded-2xl p-8 text-center">
                  <div className="w-12 h-12 mx-auto mb-4 bg-gradient-to-br from-orange-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                    {item.step}
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">{item.title}</h3>
                  <p className="text-gray-400">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="glass rounded-3xl p-12 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-purple-500/10" />
            <div className="relative z-10">
              <h2 className="text-4xl font-bold text-white mb-4">
                Ready to Convert?
              </h2>
              <p className="text-gray-400 mb-8 max-w-lg mx-auto">
                Join thousands of users converting crypto to fiat seamlessly across Africa.
              </p>
              <button
                onClick={connectWallet}
                className="btn-primary px-10 py-4 rounded-full text-white font-semibold inline-flex items-center gap-2"
              >
                Get Started Now
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-white/10">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">CP</span>
              </div>
              <span className="text-xl font-bold text-white">ClovaPay</span>
            </div>
            <div className="flex items-center gap-6 text-gray-400 text-sm">
              <span>Built on Stacks</span>
              <span>•</span>
              <span>Secured by Bitcoin</span>
            </div>
            <div className="text-gray-500 text-sm">
              © 2026 ClovaPay. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
