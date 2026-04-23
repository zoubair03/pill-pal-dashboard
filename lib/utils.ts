import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const DAYS          = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
export const SESSIONS      = ["Morning","Midday","Night"];
export const SESSION_ICONS = ["🌅","☀️","🌙"];
export const SESSION_TIMES = ["9:00 AM","12:00 PM","8:00 PM"];

export const fmt = ({ hour, minute }: { hour: number, minute: number }) =>
  `${String(hour).padStart(2,"0")}:${String(minute).padStart(2,"0")}`;

export const parse = (str: string) => {
  const [h, m] = str.split(":").map(Number);
  return { hour: h, minute: m };
};
