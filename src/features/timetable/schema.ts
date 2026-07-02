import { z } from "zod";

export const TimetableInputSchema = z.object({
  title: z.string().min(1).max(300),
  semester: z.number().min(1).max(8),
  branchCode: z.string().min(1),
  fileUrl: z.string().min(1),
  isActive: z.boolean().default(true),
});

export type TimetableInput = z.infer<typeof TimetableInputSchema>;

export interface Timetable {
  id: string;
  semester: number;
  branchCode: string;
  title: string;
  fileUrl: string;
  isActive: boolean;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
