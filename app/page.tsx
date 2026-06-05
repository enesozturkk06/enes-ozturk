import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import About from "./components/About";
import Services from "./components/Services";
import Branches from "./components/Branches";
import PackagesSection from "./components/PackagesSection";
import StoreFeatured from "./components/StoreFeatured";
import Contact from "./components/Contact";
import Footer from "./components/Footer";
import WhatsAppButton from "./components/shared/WhatsAppButton";
import LandingBackground from "./components/LandingBackground";

export default function Home() {
  return (
    <>
      <LandingBackground />
      <Navbar />
      <main className="relative z-10">
        <Hero />
        <About />
        <Services />
        <Branches />
        <PackagesSection />
        <StoreFeatured />
        <Contact />
      </main>
      <Footer />
      <WhatsAppButton />
    </>
  );
}
