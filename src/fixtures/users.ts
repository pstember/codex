import type { User } from "@/domain/users";

export const demoUsers: User[] = [
  {
    id: "demo-manager",
    email: "manager@demo.com",
    name: "Mara Chen",
    role: "manager",
  },
  {
    id: "demo-operator",
    email: "operator@demo.com",
    name: "Owen Patel",
    role: "operator",
  },
  {
    id: "demo-guest",
    email: "guest@demo.com",
    name: "Guest Shopper",
    role: "guest",
  },
];
