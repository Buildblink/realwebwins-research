import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface LoadingStateProps {
  label?: string;
  className?: string;
}

export function LoadingState({
  label = "Generating research...",
  className,
}: LoadingStateProps) {
  return (
    <motion.div
      className={cn(
        "flex w-full flex-col items-center justify-center rounded-xl border border-primary/30 bg-primary/5 px-6 py-10 text-center text-primary shadow-sm",
        className
      )}
      initial={{ opacity: 0.6 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, repeat: Infinity, repeatType: "reverse" }}
    >
      <motion.div
        className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border-4 border-primary/30 border-t-primary"
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
      />
      <p className="text-sm font-medium tracking-wide uppercase">{label}</p>
      <p className="mt-2 text-xs text-primary/80">
        Claude is running the seven-step validation for you.
      </p>
    </motion.div>
  );
}
