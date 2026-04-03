import { z } from "zod";

export const ticketSearchInputSchema = z.object({
	SearchText: z.string().max(500).optional().describe("Full-text search query"),
	StatusIDs: z
		.array(z.number().int())
		.optional()
		.describe("Filter by status IDs"),
	PriorityIDs: z
		.array(z.number().int())
		.optional()
		.describe("Filter by priority IDs"),
	TypeIDs: z.array(z.number().int()).optional().describe("Filter by type IDs"),
	ResponsibleGroupIDs: z
		.array(z.number().int())
		.optional()
		.describe("Filter by responsible group IDs"),
	DateFrom: z
		.string()
		.optional()
		.describe("Filter tickets created on or after this date (ISO 8601)"),
	DateTo: z
		.string()
		.optional()
		.describe("Filter tickets created on or before this date (ISO 8601)"),
	MaxResults: z
		.number()
		.int()
		.min(1)
		.optional()
		.default(25)
		.describe("Maximum number of results to return"),
});

export const ticketGetInputSchema = z.object({
	id: z.number().int().positive().describe("Ticket ID"),
});

export const ticketCreateInputSchema = z.object({
	TypeID: z.number().int().describe("Ticket type ID"),
	Title: z.string().min(1).describe("Ticket title"),
	Description: z.string().optional().describe("Ticket description (HTML)"),
	AccountID: z.number().int().optional().describe("Account/department ID"),
	PriorityID: z.number().int().optional().describe("Priority ID"),
	StatusID: z.number().int().optional().describe("Status ID"),
	RequestorUid: z.string().uuid().optional().describe("Requestor person UID"),
	RequestorEmail: z.string().email().optional().describe("Requestor email"),
	ResponsibleUid: z
		.string()
		.uuid()
		.optional()
		.describe("Responsible person UID"),
	ResponsibleGroupID: z
		.number()
		.int()
		.optional()
		.describe("Responsible group ID"),
	NotifyRequestor: z
		.boolean()
		.optional()
		.default(false)
		.describe("Notify the requestor"),
	NotifyResponsible: z
		.boolean()
		.optional()
		.default(false)
		.describe("Notify the responsible party"),
	EnableNotifyReviewer: z
		.boolean()
		.optional()
		.default(false)
		.describe("Notify the reviewer"),
	AllowRequestorCreation: z
		.boolean()
		.optional()
		.default(false)
		.describe("Allow creating a new requestor if not found"),
	applyDefaults: z
		.boolean()
		.optional()
		.default(false)
		.describe("Apply default values from ticket type"),
});

export const ticketUpdateInputSchema = z.object({
	id: z.number().int().positive().describe("Ticket ID to update"),
	patches: z
		.array(
			z.object({
				op: z
					.enum(["add", "remove", "replace"])
					.describe("Patch operation type"),
				path: z.string().describe("JSON pointer path to the field"),
				value: z.unknown().optional().describe("New value for the field"),
			}),
		)
		.min(1)
		.describe("Array of JSON Patch operations"),
	notifyNewResponsible: z
		.boolean()
		.optional()
		.default(false)
		.describe("Notify the new responsible party if changed"),
});

export const ticketFeedGetInputSchema = z.object({
	id: z.number().int().positive().describe("Ticket ID"),
});

export const ticketFeedPostInputSchema = z.object({
	id: z.number().int().positive().describe("Ticket ID"),
	NewStatusID: z.number().int().optional().describe("New status ID"),
	Comments: z.string().min(1).describe("Feed entry comment text"),
	IsPrivate: z
		.boolean()
		.optional()
		.default(false)
		.describe("Whether the comment is private"),
});
