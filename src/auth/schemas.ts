import { z } from "zod";

export const loginAdminRequestSchema = z.object({
	BEID: z.string().min(1),
	WebServicesKey: z.string().min(1),
});

export type LoginAdminRequest = z.infer<typeof loginAdminRequestSchema>;
