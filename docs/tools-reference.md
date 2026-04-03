# Tools Reference

The TDX MCP server exposes 13 tools organized by domain. All tools return JSON-stringified TDX API responses as MCP text content.

## Tickets

### `tdx_tickets_search`

Search for tickets. Returns abbreviated results (no Description, Attributes, or Attachments). Use `tdx_tickets_get` for full details.

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `SearchText` | string | no | | Full-text search query (max 500 chars) |
| `StatusIDs` | number[] | no | | Filter by status IDs |
| `PriorityIDs` | number[] | no | | Filter by priority IDs |
| `TypeIDs` | number[] | no | | Filter by type IDs |
| `ResponsibleGroupIDs` | number[] | no | | Filter by responsible group IDs |
| `DateFrom` | string | no | | Created on or after (ISO 8601) |
| `DateTo` | string | no | | Created on or before (ISO 8601) |
| `MaxResults` | number | no | 25 | Maximum results to return |

**TDX endpoint:** `POST /{appId}/tickets/search`

---

### `tdx_tickets_get`

Get a ticket by ID. Returns full details including Description and Attributes.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `id` | number | **yes** | Ticket ID |

**TDX endpoint:** `GET /{appId}/tickets/{id}`

---

### `tdx_tickets_create`

Create a new ticket. At least one of `RequestorUid`, `RequestorEmail`, or `AccountID` should be provided.

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `TypeID` | number | **yes** | | Ticket type ID |
| `Title` | string | **yes** | | Ticket title |
| `Description` | string | no | | Ticket description (HTML) |
| `AccountID` | number | no | | Account/department ID |
| `PriorityID` | number | no | | Priority ID |
| `StatusID` | number | no | | Status ID |
| `RequestorUid` | string (UUID) | no | | Requestor person UID |
| `RequestorEmail` | string (email) | no | | Requestor email address |
| `ResponsibleUid` | string (UUID) | no | | Responsible person UID |
| `ResponsibleGroupID` | number | no | | Responsible group ID |
| `NotifyRequestor` | boolean | no | false | Notify the requestor |
| `NotifyResponsible` | boolean | no | false | Notify the responsible party |
| `EnableNotifyReviewer` | boolean | no | false | Notify the reviewer |
| `AllowRequestorCreation` | boolean | no | false | Create requestor if not found |
| `applyDefaults` | boolean | no | false | Apply default values from ticket type |

**TDX endpoint:** `POST /{appId}/tickets`

---

### `tdx_tickets_update`

Update a ticket using JSON Patch operations ([RFC 6902](https://www.rfc-editor.org/rfc/rfc6902)). Use this for partial updates to specific fields.

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `id` | number | **yes** | | Ticket ID to update |
| `patches` | PatchOp[] | **yes** | | Array of patch operations (min 1) |
| `notifyNewResponsible` | boolean | no | false | Notify new responsible if changed |

Each patch operation:

| Field | Type | Required | Description |
|---|---|---|---|
| `op` | `"add"` \| `"remove"` \| `"replace"` | **yes** | Operation type |
| `path` | string | **yes** | JSON pointer path (e.g., `/StatusID`) |
| `value` | any | no | New value (required for add/replace) |

**Example:**

```json
{
  "id": 12345,
  "patches": [
    { "op": "replace", "path": "/StatusID", "value": 362 },
    { "op": "replace", "path": "/ResponsibleGroupID", "value": 48 }
  ],
  "notifyNewResponsible": true
}
```

**TDX endpoint:** `PATCH /{appId}/tickets/{id}`

---

### `tdx_tickets_feed_get`

Get the activity feed (comments, status changes) for a ticket.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `id` | number | **yes** | Ticket ID |

**TDX endpoint:** `GET /{appId}/tickets/{id}/feed`

---

### `tdx_tickets_feed_post`

Post a comment to a ticket's activity feed.

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `id` | number | **yes** | | Ticket ID |
| `Comments` | string | **yes** | | Comment text |
| `NewStatusID` | number | no | | Change ticket status with this comment |
| `IsPrivate` | boolean | no | false | Make comment private (staff-only) |

**TDX endpoint:** `POST /{appId}/tickets/{id}/feed`

---

## Assets

### `tdx_assets_search`

Search for assets/configuration items. Returns abbreviated results (no Attributes or Attachments).

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `SearchText` | string | no | | Full-text search query (max 500 chars) |
| `StatusIDs` | number[] | no | | Filter by status IDs |
| `MaxResults` | number | no | 25 | Maximum results to return |

**TDX endpoint:** `POST /{appId}/assets/search`

---

### `tdx_assets_get`

Get an asset by ID.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `id` | number | **yes** | Asset ID |

**TDX endpoint:** `GET /{appId}/assets/{id}`

---

## Knowledge Base

### `tdx_kb_search`

Search knowledge base articles.

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `SearchText` | string | no | | Full-text search query (max 500 chars) |
| `CategoryIDs` | number[] | no | | Filter by category IDs |
| `ReturnCount` | number | no | 25 | Maximum results to return |

**TDX endpoint:** `POST /{appId}/knowledgebase/search`

---

### `tdx_kb_get`

Get a knowledge base article by ID.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `id` | number | **yes** | KB article ID |

**TDX endpoint:** `GET /{appId}/knowledgebase/{id}`

---

## People

### `tdx_people_search`

Search for people/users.

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `SearchText` | string | no | | Full-text search query (max 500 chars) |
| `IsActive` | boolean | no | | Filter by active status |
| `MaxResults` | number | no | 25 | Maximum results to return |

**TDX endpoint:** `POST /people/search`

---

### `tdx_people_get`

Get a person by UID.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `uid` | string (UUID) | **yes** | Person UID (GUID format) |

**TDX endpoint:** `GET /people/{uid}`

---

## Applications

### `tdx_applications_list`

List all applications configured in the TDX instance. Use this to discover application IDs for tickets, assets, and knowledge base.

*No parameters.*

**TDX endpoint:** `GET /applications`
