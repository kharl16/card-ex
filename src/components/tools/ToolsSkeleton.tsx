import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ToolsSkeletonProps {
  type?: "card" | "list" | "grid";
  count?: number;
}

const shimmer = {
  initial: { x: "-100%" },
  animate: { x: "100%" },
};

function SkeletonCard({ index }: { index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      className={cn(
        "rounded-2xl overflow-hidden relative",
        "bg-card border border-border/50"
      )}
    >
      {/* Thumbnail skeleton */}
      <div className="aspect-video bg-muted relative overflow-hidden">
        <motion.div
          variants={shimmer}
          initial="initial"
          animate="animate"
          transition={{ repeat: Infinity, duration: 1.5, ease: "linear", delay: index * 0.15 }}
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
        />
      </div>
      
      {/* Content skeleton */}
      <div className="p-4 space-y-3">
        <div className="h-5 bg-muted rounded-lg w-3/4 relative overflow-hidden">
          <motion.div
            variants={shimmer}
            initial="initial"
            animate="animate"
            transition={{ repeat: Infinity, duration: 1.5, ease: "linear", delay: index * 0.15 + 0.1 }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
          />
        </div>
        <div className="h-4 bg-muted rounded-lg w-1/2 relative overflow-hidden">
          <motion.div
            variants={shimmer}
            initial="initial"
            animate="animate"
            transition={{ repeat: Infinity, duration: 1.5, ease: "linear", delay: index * 0.15 + 0.2 }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
          />
        </div>
        <div className="h-10 bg-muted rounded-xl w-full relative overflow-hidden">
          <motion.div
            variants={shimmer}
            initial="initial"
            animate="animate"
            transition={{ repeat: Infinity, duration: 1.5, ease: "linear", delay: index * 0.15 + 0.3 }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
          />
        </div>
      </div>
    </motion.div>
  );
}

function SkeletonList({ index }: { index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.08, duration: 0.3 }}
      className={cn(
        "p-4 rounded-2xl relative",
        "bg-card border border-border/50",
        "flex gap-4 items-center"
      )}
    >
      {/* Icon skeleton */}
      <div className="w-14 h-14 rounded-xl bg-muted relative overflow-hidden flex-shrink-0">
        <motion.div
          variants={shimmer}
          initial="initial"
          animate="animate"
          transition={{ repeat: Infinity, duration: 1.5, ease: "linear", delay: index * 0.1 }}
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
        />
      </div>
      
      {/* Content skeleton */}
      <div className="flex-1 space-y-2">
        <div className="h-5 bg-muted rounded-lg w-3/4 relative overflow-hidden">
          <motion.div
            variants={shimmer}
            initial="initial"
            animate="animate"
            transition={{ repeat: Infinity, duration: 1.5, ease: "linear", delay: index * 0.1 + 0.1 }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
          />
        </div>
        <div className="h-4 bg-muted rounded-lg w-1/2 relative overflow-hidden">
          <motion.div
            variants={shimmer}
            initial="initial"
            animate="animate"
            transition={{ repeat: Infinity, duration: 1.5, ease: "linear", delay: index * 0.1 + 0.2 }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
          />
        </div>
      </div>
      
      {/* Action skeleton */}
      <div className="flex gap-2">
        <div className="h-10 w-10 bg-muted rounded-xl relative overflow-hidden">
          <motion.div
            variants={shimmer}
            initial="initial"
            animate="animate"
            transition={{ repeat: Infinity, duration: 1.5, ease: "linear", delay: index * 0.1 + 0.3 }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
          />
        </div>
        <div className="h-10 w-10 bg-muted rounded-xl relative overflow-hidden">
          <motion.div
            variants={shimmer}
            initial="initial"
            animate="animate"
            transition={{ repeat: Infinity, duration: 1.5, ease: "linear", delay: index * 0.1 + 0.4 }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
          />
        </div>
      </div>
    </motion.div>
  );
}

function SkeletonGridItem({ index }: { index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.08, duration: 0.3 }}
      className={cn(
        "rounded-2xl overflow-hidden relative",
        "bg-card border border-border/50"
      )}
    >
      {/* Square thumbnail */}
      <div className="aspect-square bg-muted relative overflow-hidden">
        <motion.div
          variants={shimmer}
          initial="initial"
          animate="animate"
          transition={{ repeat: Infinity, duration: 1.5, ease: "linear", delay: index * 0.12 }}
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
        />
      </div>
      
      {/* Content */}
      <div className="p-3 space-y-2">
        <div className="h-4 bg-muted rounded-lg w-full relative overflow-hidden">
          <motion.div
            variants={shimmer}
            initial="initial"
            animate="animate"
            transition={{ repeat: Infinity, duration: 1.5, ease: "linear", delay: index * 0.12 + 0.1 }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
          />
        </div>
        <div className="h-9 bg-muted rounded-xl w-full relative overflow-hidden">
          <motion.div
            variants={shimmer}
            initial="initial"
            animate="animate"
            transition={{ repeat: Infinity, duration: 1.5, ease: "linear", delay: index * 0.12 + 0.2 }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
          />
        </div>
      </div>
    </motion.div>
  );
}

export default function ToolsSkeleton({ type = "card", count = 3 }: ToolsSkeletonProps) {
  const items = Array.from({ length: count }, (_, i) => i);

  if (type === "list") {
    return (
      <div className="space-y-4">
        {items.map((i) => (
          <SkeletonList key={i} index={i} />
        ))}
      </div>
    );
  }

  if (type === "grid") {
    return (
      <div className="grid grid-cols-2 gap-4">
        {items.map((i) => (
          <SkeletonGridItem key={i} index={i} />
        ))}
      </div>
    );
  }

  // Default: horizontal card carousel
  return (
    <div className="space-y-6">
      {/* Category skeleton */}
      <div className="h-6 bg-muted rounded-lg w-32 relative overflow-hidden">
        <motion.div
          variants={shimmer}
          initial="initial"
          animate="animate"
          transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
        />
      </div>
      
      {/* Cards carousel */}
      <div className="flex gap-4 pb-4 overflow-hidden">
        {items.map((i) => (
          <div key={i} className="flex-shrink-0 w-64">
            <SkeletonCard index={i} />
          </div>
        ))}
      </div>
    </div>
  );
}
