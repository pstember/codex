import { hashStaffPassword } from "@/domain/auth";
import type { User } from "@/domain/users";

export const demoStaffPasswords = {
  manager: "manager-demo-pass",
  operator: "operator-demo-pass",
} as const;

export const demoUsers: User[] = [
  {
    id: "demo-manager",
    email: "manager@demo.com",
    name: "Mara Chen",
    role: "manager",
    passwordHash: hashStaffPassword(demoStaffPasswords.manager, "demo-manager-salt"),
  },
  {
    id: "demo-operator",
    email: "operator@demo.com",
    name: "Owen Patel",
    role: "operator",
    passwordHash: hashStaffPassword(demoStaffPasswords.operator, "demo-operator-salt"),
  },
];
