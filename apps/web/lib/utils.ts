import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  const isToday = date.toDateString() === now.toDateString();
  const isYesterday = date.toDateString() === yesterday.toDateString();
  const isThisYear = date.getFullYear() === now.getFullYear();

  const timeString = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  if (isToday) return `${timeString}`;
  if (isYesterday) return `${timeString} yesterday`;
  if (isThisYear) return `${timeString} ${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
  return `${timeString} ${date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
}
