import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import About from "./components/About";
import Branches from "./components/Branches";
import PackagesSection from "./components/PackagesSection";
import Contact from "./components/Contact";
import Footer from "./components/Footer";
import WhatsAppButton from "./components/shared/WhatsAppButton";
import LandingBackground from "./components/LandingBackground";

export default function Home() {
  return (
    <>
      {/* Tam ekran animasyonlu arka plan */}
      <LandingBackground />

      <Navbar />
      <main className="relative z-10">
        <Hero />
        <About />
        <Branches />
        <PackagesSection />
        <Contact />
      </main>
      <Footer />
      <WhatsAppButton />
    </>
  );
}
