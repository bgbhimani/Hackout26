import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Standard shadcn/ui helper: merge conditional class names without Tailwind
 * class conflicts (e.g. `cn("p-2", isBig && "p-4")` correctly keeps only p-4). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
