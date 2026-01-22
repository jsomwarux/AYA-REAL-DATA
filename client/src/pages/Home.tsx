import { motion } from "framer-motion";

export default function Home() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background overflow-hidden relative">
      {/* Subtle background texture for premium feel */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/noise-lines.png')]"></div>

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10"
      >
        <h1 className="text-[12rem] md:text-[20rem] font-bold leading-none tracking-tighter text-primary select-none text-display">
          AYA
        </h1>
      </motion.div>
    </div>
  );
}
