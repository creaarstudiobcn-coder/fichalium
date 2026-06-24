import { z } from "zod";

export const registerSchema = z.object({
  companyName: z
    .string()
    .trim()
    .min(2, "El nombre de la empresa es demasiado corto")
    .max(120, "El nombre de la empresa es demasiado largo"),
  name: z
    .string()
    .trim()
    .min(2, "Tu nombre es demasiado corto")
    .max(120, "Tu nombre es demasiado largo"),
  email: z.string().trim().toLowerCase().email("Email no válido"),
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .max(100, "La contraseña es demasiado larga"),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Email no válido"),
  password: z.string().min(1, "Introduce tu contraseña"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const employeeSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "El nombre es demasiado corto")
    .max(120, "El nombre es demasiado largo"),
  email: z.string().trim().toLowerCase().email("Email no válido"),
});

export type EmployeeInput = z.infer<typeof employeeSchema>;

export const inviteSchema = z.object({
  employeeId: z.string().min(1, "Empleado no válido"),
});

export type InviteInput = z.infer<typeof inviteSchema>;

export const acceptInvitationSchema = z.object({
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .max(100, "La contraseña es demasiado larga"),
});

export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;
