/**
 * Realistic TDX API response fixtures for QA testing.
 */

import { makeJwt } from "../qa/helpers.js";

// Auth token valid for 24 hours from now
export const validAuthToken = () =>
	makeJwt(Math.floor(Date.now() / 1000) + 86400);

export const ticketSearchResults = [
	{
		ID: 12345,
		Title: "VPN not connecting from remote office",
		StatusName: "Open",
		PriorityName: "High",
		TypeName: "Incident",
		RequestorName: "Jane Smith",
		ResponsibleName: "IT Support",
		CreatedDate: "2026-03-28T10:15:00Z",
		ModifiedDate: "2026-04-01T14:30:00Z",
	},
	{
		ID: 12346,
		Title: "Request for new laptop",
		StatusName: "In Progress",
		PriorityName: "Medium",
		TypeName: "Service Request",
		RequestorName: "John Doe",
		ResponsibleName: "Hardware Team",
		CreatedDate: "2026-03-30T09:00:00Z",
		ModifiedDate: "2026-04-02T11:45:00Z",
	},
];

export const ticketDetail = {
	ID: 12345,
	Title: "VPN not connecting from remote office",
	Description:
		"<p>Users in building B cannot connect to VPN since the firmware update.</p>",
	StatusID: 1,
	StatusName: "Open",
	PriorityID: 2,
	PriorityName: "High",
	TypeID: 10,
	TypeName: "Incident",
	AccountID: 5,
	AccountName: "Engineering",
	RequestorUid: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
	RequestorName: "Jane Smith",
	RequestorEmail: "jane.smith@example.com",
	ResponsibleUid: "b2c3d4e5-f6a7-8901-bcde-f12345678901",
	ResponsibleName: "IT Support",
	ResponsibleGroupID: 100,
	CreatedDate: "2026-03-28T10:15:00Z",
	ModifiedDate: "2026-04-01T14:30:00Z",
	Attributes: [
		{ ID: 1001, Name: "Location", Value: "Building B" },
		{ ID: 1002, Name: "Affected Users", Value: "15" },
	],
};

export const ticketCreated = {
	ID: 12400,
	Title: "New printer installation request",
	StatusID: 1,
	StatusName: "New",
	TypeID: 20,
	TypeName: "Service Request",
	CreatedDate: "2026-04-03T09:00:00Z",
};

export const ticketUpdated = {
	ID: 12345,
	Title: "VPN not connecting from remote office",
	StatusID: 3,
	StatusName: "Resolved",
	ModifiedDate: "2026-04-03T10:00:00Z",
};

export const ticketFeed = [
	{
		ID: 50001,
		CreatedDate: "2026-03-28T10:15:00Z",
		CreatedUid: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
		CreatedFullName: "Jane Smith",
		Body: "Ticket created: VPN not connecting from remote office",
		IsPrivate: false,
	},
	{
		ID: 50002,
		CreatedDate: "2026-03-29T08:00:00Z",
		CreatedUid: "b2c3d4e5-f6a7-8901-bcde-f12345678901",
		CreatedFullName: "IT Support",
		Body: "Investigating the issue. Appears related to firmware update 3.2.1.",
		IsPrivate: false,
	},
];

export const feedPostResult = {
	ID: 50003,
	CreatedDate: "2026-04-03T10:30:00Z",
	Body: "Applied firmware rollback. Testing connectivity.",
	IsPrivate: false,
};

export const assetSearchResults = [
	{
		ID: 2001,
		Name: "Dell Latitude 7420",
		StatusName: "Active",
		SerialNumber: "SVC-DL7420-001",
		LocationName: "Building A, Room 201",
	},
	{
		ID: 2002,
		Name: "HP ProBook 450",
		StatusName: "Active",
		SerialNumber: "SVC-HP450-042",
		LocationName: "Building B, Room 105",
	},
];

export const assetDetail = {
	ID: 2001,
	Name: "Dell Latitude 7420",
	StatusID: 1,
	StatusName: "Active",
	SerialNumber: "SVC-DL7420-001",
	LocationName: "Building A, Room 201",
	OwnerName: "Jane Smith",
	PurchaseCost: 1299.99,
	AcquisitionDate: "2025-06-15T00:00:00Z",
};

export const kbSearchResults = [
	{
		ID: 3001,
		Subject: "How to connect to VPN",
		Summary: "Step-by-step guide for connecting to the corporate VPN.",
		CategoryName: "Networking",
		Status: "Published",
	},
	{
		ID: 3002,
		Subject: "Password reset procedures",
		Summary: "How to reset your Active Directory password.",
		CategoryName: "Account Management",
		Status: "Published",
	},
];

export const kbArticle = {
	ID: 3001,
	Subject: "How to connect to VPN",
	Body: "<h2>VPN Connection Guide</h2><p>1. Open the VPN client...</p>",
	CategoryID: 10,
	CategoryName: "Networking",
	Status: "Published",
	CreatedDate: "2025-01-10T00:00:00Z",
	ModifiedDate: "2026-02-15T00:00:00Z",
};

export const peopleSearchResults = [
	{
		UID: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
		FullName: "Jane Smith",
		PrimaryEmail: "jane.smith@example.com",
		IsActive: true,
		Title: "Software Engineer",
	},
];

export const personDetail = {
	UID: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
	FullName: "Jane Smith",
	FirstName: "Jane",
	LastName: "Smith",
	PrimaryEmail: "jane.smith@example.com",
	IsActive: true,
	Title: "Software Engineer",
	Department: "Engineering",
	Phone: "555-0123",
};

export const applicationsList = [
	{
		AppID: 123,
		AppName: "IT Ticketing",
		AppClass: "TDTickets",
		IsActive: true,
	},
	{
		AppID: 456,
		AppName: "Asset/CI",
		AppClass: "TDAssets",
		IsActive: true,
	},
	{
		AppID: 789,
		AppName: "Knowledge Base",
		AppClass: "TDKnowledgeBase",
		IsActive: true,
	},
];
