import { NextResponse } from "next/server";

const spec = {
  openapi: "3.1.0",
  info: {
    title: "bum.pt API",
    version: "1.0.0",
    description:
      "API to manage and monitor software, system, Docker container and service versions. Zuplo compatible.",
    contact: { name: "bum.pt" },
  },
  servers: [
    {
      url: "{baseUrl}",
      description: "Application server",
      variables: { baseUrl: { default: "http://localhost:3000" } },
    },
  ],
  security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: "apiKey",
        in: "header",
        name: "X-API-Key",
        description: "API key generated from the dashboard (prefix bumpt_)",
      },
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "JWT token obtained via POST /api/auth/login",
      },
    },
    schemas: {
      Error: {
        type: "object",
        properties: {
          error: { type: "string" },
          details: { type: "object" },
        },
        required: ["error"],
      },
      PaginatedResponse: {
        type: "object",
        properties: {
          data: { type: "array", items: {} },
          total: { type: "integer" },
          page: { type: "integer" },
          pageSize: { type: "integer" },
        },
      },
      MonitoredItem: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          type: { type: "string", enum: ["software", "system", "docker", "service"] },
          currentVersion: { type: "string", nullable: true },
          latestVersion: { type: "string", nullable: true },
          checkMethod: { type: "string", enum: ["manual", "api", "scraping"] },
          checkConfig: { type: "string", nullable: true },
          sourceId: { type: "string", nullable: true },
          sourceParams: { type: "string", nullable: true },
          status: { type: "string", enum: ["up_to_date", "outdated", "critical"] },
          monitoringEnabled: { type: "boolean" },
          lastChecked: { type: "string", format: "date-time", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
          tags: { type: "array", items: { type: "string" }, description: "User-defined tags for categorization" },
        },
      },
      CreateItem: {
        type: "object",
        required: ["name", "type"],
        properties: {
          name: { type: "string", minLength: 1, maxLength: 255 },
          type: { type: "string", enum: ["software", "system", "docker", "service"] },
          currentVersion: { type: "string", nullable: true },
          latestVersion: { type: "string", nullable: true },
          checkMethod: { type: "string", enum: ["manual", "api", "scraping"], default: "manual" },
          checkConfig: { type: "string", nullable: true },
          sourceId: { type: "string", nullable: true },
          sourceParams: { type: "string", nullable: true },
          status: { type: "string", enum: ["up_to_date", "outdated", "critical"], default: "up_to_date" },
          monitoringEnabled: { type: "boolean" },
          tags: { type: "array", items: { type: "string" }, description: "Tags for the item (max 10)" },
        },
      },
      UpdateItem: {
        type: "object",
        properties: {
          name: { type: "string", minLength: 1, maxLength: 255 },
          type: { type: "string", enum: ["software", "system", "docker", "service"] },
          currentVersion: { type: "string", nullable: true },
          latestVersion: { type: "string", nullable: true },
          checkMethod: { type: "string", enum: ["manual", "api", "scraping"] },
          checkConfig: { type: "string", nullable: true },
          sourceId: { type: "string", nullable: true },
          sourceParams: { type: "string", nullable: true },
          status: { type: "string", enum: ["up_to_date", "outdated", "critical"] },
          monitoringEnabled: { type: "boolean" },
          tags: { type: "array", items: { type: "string" }, description: "Tags for the item (max 10)" },
        },
      },
      CheckSource: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          type: { type: "string" },
          config: { type: "string" },
          isBuiltIn: { type: "boolean" },
          description: { type: "string", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      User: {
        type: "object",
        properties: {
          id: { type: "string" },
          email: { type: "string", format: "email" },
          role: { type: "string", enum: ["SUPER_ADMIN", "ADMIN"] },
          authType: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      AuditLog: {
        type: "object",
        properties: {
          id: { type: "string" },
          action: { type: "string" },
          entityType: { type: "string" },
          entityId: { type: "string", nullable: true },
          entityName: { type: "string", nullable: true },
          details: { type: "string", nullable: true },
          userId: { type: "string", nullable: true },
          userEmail: { type: "string", nullable: true },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      ApiKeyInfo: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          keyPrefix: { type: "string" },
          userId: { type: "string" },
          userEmail: { type: "string" },
          role: { type: "string" },
          expiresAt: { type: "string", format: "date-time", nullable: true },
          lastUsedAt: { type: "string", format: "date-time", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          revokedAt: { type: "string", format: "date-time", nullable: true },
        },
      },
      Webhook: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          url: { type: "string" },
          type: { type: "string", enum: ["custom", "slack", "teams", "discord", "email"] },
          events: { type: "array", items: { type: "string" } },
          headers: { type: "object", nullable: true },
          secret: { type: "string", nullable: true },
          enabled: { type: "boolean" },
          fromEnv: { type: "boolean", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      CreateWebhook: {
        type: "object",
        properties: {
          name: { type: "string" },
          url: { type: "string" },
          type: { type: "string", enum: ["custom", "slack", "teams", "discord", "email"] },
          events: { type: "array", items: { type: "string" } },
          headers: { type: "object", nullable: true },
          secret: { type: "string", nullable: true },
          enabled: { type: "boolean" },
        },
      },
      UpdateWebhook: {
        type: "object",
        properties: {
          name: { type: "string" },
          url: { type: "string" },
          type: { type: "string", enum: ["custom", "slack", "teams", "discord", "email"] },
          events: { type: "array", items: { type: "string" } },
          headers: { type: "object", nullable: true },
          secret: { type: "string", nullable: true },
          enabled: { type: "boolean" },
        },
      },
      WebhookLog: {
        type: "object",
        properties: {
          id: { type: "string" },
          webhookId: { type: "string" },
          event: { type: "string" },
          status: { type: "integer" },
          response: { type: "string", nullable: true },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      ScheduledReport: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          schedule: { type: "string", enum: ["daily", "weekly", "monthly"] },
          dayOfWeek: { type: "integer", nullable: true },
          dayOfMonth: { type: "integer", nullable: true },
          hour: { type: "integer" },
          filters: { type: "string", description: "JSON string with optional type, status, tags filters" },
          sections: { type: "string", description: "JSON array of sections to include" },
          channelEmail: { type: "boolean" },
          emailRecipients: { type: "string", nullable: true },
          channelSlack: { type: "boolean" },
          channelDiscord: { type: "boolean" },
          channelTeams: { type: "boolean" },
          channelInApp: { type: "boolean" },
          enabled: { type: "boolean" },
          lastSentAt: { type: "string", format: "date-time", nullable: true },
          nextRunAt: { type: "string", format: "date-time", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      CreateScheduledReport: {
        type: "object",
        required: ["name"],
        properties: {
          name: { type: "string" },
          schedule: { type: "string", enum: ["daily", "weekly", "monthly"], default: "weekly" },
          dayOfWeek: { type: "integer", nullable: true },
          dayOfMonth: { type: "integer", nullable: true },
          hour: { type: "integer", default: 8 },
          filters: { type: "object", properties: { type: { type: "string" }, status: { type: "string" }, tags: { type: "array", items: { type: "string" } } } },
          sections: { type: "array", items: { type: "string" } },
          channelEmail: { type: "boolean" },
          emailRecipients: { type: "string", nullable: true },
          channelSlack: { type: "boolean" },
          channelDiscord: { type: "boolean" },
          channelTeams: { type: "boolean" },
          channelInApp: { type: "boolean" },
          enabled: { type: "boolean" },
        },
      },
      ReportHistory: {
        type: "object",
        properties: {
          id: { type: "string" },
          reportId: { type: "string" },
          summary: { type: "string", nullable: true },
          channels: { type: "string", description: "JSON array of channels used" },
          status: { type: "string", enum: ["sent", "failed"] },
          error: { type: "string", nullable: true },
          createdAt: { type: "string", format: "date-time" },
        },
      },
    },
  },
  paths: {
    "/api/health": {
      get: {
        tags: ["Health"],
        summary: "API health check",
        security: [],
        responses: {
          "200": {
            description: "API operational",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string", example: "ok" },
                    timestamp: { type: "string", format: "date-time" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Log in and get a JWT token",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Login successful",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    user: { $ref: "#/components/schemas/User" },
                    token: { type: "string", description: "JWT token to use with Authorization: Bearer" },
                  },
                },
              },
            },
          },
          "401": { description: "Invalid credentials", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/api/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Get the logged-in user's information",
        responses: {
          "200": { description: "User information", content: { "application/json": { schema: { $ref: "#/components/schemas/User" } } } },
          "401": { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/api/items": {
      get: {
        tags: ["Items"],
        summary: "List monitored items",
        description: "Returns a paginated list of monitored items with optional filters.",
        parameters: [
          { name: "type", in: "query", schema: { type: "string", enum: ["software", "system", "docker", "service"] }, description: "Filter by type" },
          { name: "status", in: "query", schema: { type: "string", enum: ["up_to_date", "outdated", "critical"] }, description: "Filter by status" },
          { name: "search", in: "query", schema: { type: "string" }, description: "Search by name" },
          { name: "tags", in: "query", schema: { type: "string" }, description: "Filter by tags (comma-separated)" },
          { name: "monitoringEnabled", in: "query", schema: { type: "string", enum: ["true", "false"] }, description: "Filter by monitoring enabled" },
          { name: "page", in: "query", schema: { type: "integer", default: 1 }, description: "Page number" },
          { name: "pageSize", in: "query", schema: { type: "integer", default: 50 }, description: "Page size" },
        ],
        responses: {
          "200": {
            description: "Paginated list",
            content: {
              "application/json": {
                schema: {
                  allOf: [
                    { $ref: "#/components/schemas/PaginatedResponse" },
                    { type: "object", properties: { data: { type: "array", items: { $ref: "#/components/schemas/MonitoredItem" } } } },
                  ],
                },
              },
            },
          },
          "401": { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
      post: {
        tags: ["Items"],
        summary: "Create a monitored item",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/CreateItem" } } },
        },
        responses: {
          "201": { description: "Item created", content: { "application/json": { schema: { $ref: "#/components/schemas/MonitoredItem" } } } },
          "400": { description: "Invalid data", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "401": { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/api/items/{id}": {
      get: {
        tags: ["Items"],
        summary: "Get an item by ID",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Item details", content: { "application/json": { schema: { $ref: "#/components/schemas/MonitoredItem" } } } },
          "404": { description: "Item not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
      put: {
        tags: ["Items"],
        summary: "Update an item",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/UpdateItem" } } },
        },
        responses: {
          "200": { description: "Item updated", content: { "application/json": { schema: { $ref: "#/components/schemas/MonitoredItem" } } } },
          "400": { description: "Invalid data", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "404": { description: "Item not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
      delete: {
        tags: ["Items"],
        summary: "Delete an item",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Item deleted", content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" } } } } } },
          "404": { description: "Item not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/api/items/{id}/check": {
      post: {
        tags: ["Items"],
        summary: "Run a version check",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": {
            description: "Check result",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    latestVersion: { type: "string" },
                    status: { type: "string" },
                    changed: { type: "boolean" },
                  },
                },
              },
            },
          },
          "404": { description: "Item not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/api/items/{id}/acknowledge": {
      post: {
        tags: ["Items"],
        summary: "Acknowledge an update (mark as up to date)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Update acknowledged", content: { "application/json": { schema: { $ref: "#/components/schemas/MonitoredItem" } } } },
          "404": { description: "Item not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/api/sources": {
      get: {
        tags: ["Sources"],
        summary: "List check sources",
        responses: {
          "200": { description: "List of sources", content: { "application/json": { schema: { type: "object", properties: { data: { type: "array", items: { $ref: "#/components/schemas/CheckSource" } }, total: { type: "integer" } } } } } },
        },
      },
      post: {
        tags: ["Sources"],
        summary: "Create a check source",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "type"],
                properties: {
                  name: { type: "string" },
                  type: { type: "string" },
                  config: { type: "string", default: "{}" },
                  description: { type: "string", nullable: true },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Source created", content: { "application/json": { schema: { $ref: "#/components/schemas/CheckSource" } } } },
          "400": { description: "Invalid data", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/api/sources/{id}": {
      get: {
        tags: ["Sources"],
        summary: "Get a source by ID",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Source details", content: { "application/json": { schema: { $ref: "#/components/schemas/CheckSource" } } } },
          "404": { description: "Source not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
      put: {
        tags: ["Sources"],
        summary: "Update a source",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { name: { type: "string" }, type: { type: "string" }, config: { type: "string" }, description: { type: "string", nullable: true } } } } } },
        responses: {
          "200": { description: "Source updated", content: { "application/json": { schema: { $ref: "#/components/schemas/CheckSource" } } } },
          "404": { description: "Source not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
      delete: {
        tags: ["Sources"],
        summary: "Delete a source",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Source deleted", content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" } } } } } },
          "404": { description: "Source not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/api/logs": {
      get: {
        tags: ["Logs"],
        summary: "View the audit log",
        parameters: [
          { name: "entityType", in: "query", schema: { type: "string" }, description: "Filter by entity type" },
          { name: "action", in: "query", schema: { type: "string" }, description: "Filter by action" },
          { name: "search", in: "query", schema: { type: "string" }, description: "Text search" },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "pageSize", in: "query", schema: { type: "integer", default: 50 } },
        ],
        responses: {
          "200": {
            description: "Paginated log",
            content: {
              "application/json": {
                schema: {
                  allOf: [
                    { $ref: "#/components/schemas/PaginatedResponse" },
                    { type: "object", properties: { data: { type: "array", items: { $ref: "#/components/schemas/AuditLog" } } } },
                  ],
                },
              },
            },
          },
        },
      },
      delete: {
        tags: ["Logs"],
        summary: "Purge the audit log (SUPER_ADMIN)",
        description: "Permanently deletes all audit log entries. This action is irreversible. A new audit event « logs.purged » is created after the purge.",
        responses: {
          "200": {
            description: "Log purged",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    deleted: { type: "integer", description: "Number of entries deleted" },
                  },
                },
              },
            },
          },
          "401": { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "403": { description: "Access denied (SUPER_ADMIN required)", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/api/users": {
      get: {
        tags: ["Users"],
        summary: "List users (SUPER_ADMIN)",
        responses: {
          "200": { description: "List of users", content: { "application/json": { schema: { type: "object", properties: { data: { type: "array", items: { $ref: "#/components/schemas/User" } }, total: { type: "integer" } } } } } },
          "403": { description: "Access denied", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/api/api-keys": {
      get: {
        tags: ["API Keys"],
        summary: "List API keys (SUPER_ADMIN)",
        responses: {
          "200": { description: "List of API keys", content: { "application/json": { schema: { type: "object", properties: { data: { type: "array", items: { $ref: "#/components/schemas/ApiKeyInfo" } } } } } } },
          "403": { description: "Access denied" },
        },
      },
      post: {
        tags: ["API Keys"],
        summary: "Generate a new API key (SUPER_ADMIN)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name"],
                properties: {
                  name: { type: "string", description: "Descriptive name for the key" },
                  role: { type: "string", enum: ["ADMIN", "SUPER_ADMIN"], default: "ADMIN", description: "Role assigned to the key" },
                  expiresInDays: { type: "integer", description: "Validity period in days (optional)", nullable: true },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Key created. **The full key is returned only once.**",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    name: { type: "string" },
                    key: { type: "string", description: "The full API key (store securely)" },
                    keyPrefix: { type: "string" },
                    expiresAt: { type: "string", format: "date-time", nullable: true },
                    createdAt: { type: "string", format: "date-time" },
                  },
                },
              },
            },
          },
          "403": { description: "Access denied" },
        },
      },
    },
    "/api/api-keys/{id}": {
      delete: {
        tags: ["API Keys"],
        summary: "Revoke an API key (SUPER_ADMIN)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Key revoked", content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" } } } } } },
          "404": { description: "Key not found" },
        },
      },
    },
    "/api/webhooks": {
      get: {
        tags: ["Webhooks"],
        summary: "List all webhooks (SUPER_ADMIN)",
        security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
        responses: {
          "200": { description: "List of webhooks", content: { "application/json": { schema: { type: "object", properties: { data: { type: "array", items: { $ref: "#/components/schemas/Webhook" } } } } } } },
          "401": { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "403": { description: "Access denied", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
      post: {
        tags: ["Webhooks"],
        summary: "Create webhook (SUPER_ADMIN, Professional)",
        security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/CreateWebhook" } } },
        },
        responses: {
          "201": { description: "Webhook created", content: { "application/json": { schema: { $ref: "#/components/schemas/Webhook" } } } },
          "400": { description: "Invalid data", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "401": { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "403": { description: "Access denied", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/api/webhooks/{id}": {
      put: {
        tags: ["Webhooks"],
        summary: "Update webhook",
        security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/UpdateWebhook" } } },
        },
        responses: {
          "200": { description: "Webhook updated", content: { "application/json": { schema: { $ref: "#/components/schemas/Webhook" } } } },
          "400": { description: "Invalid data", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "401": { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "404": { description: "Webhook not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
      delete: {
        tags: ["Webhooks"],
        summary: "Delete webhook",
        security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Webhook deleted", content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" } } } } } },
          "401": { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "404": { description: "Webhook not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/api/webhooks/{id}/test": {
      post: {
        tags: ["Webhooks"],
        summary: "Send test notification",
        security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Test sent", content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" } } } } } },
          "401": { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "404": { description: "Webhook not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/api/reports": {
      get: {
        tags: ["Reports"],
        summary: "List scheduled reports (SUPER_ADMIN, Professional)",
        responses: {
          "200": { description: "List of reports", content: { "application/json": { schema: { type: "object", properties: { data: { type: "array", items: { $ref: "#/components/schemas/ScheduledReport" } } } } } } },
          "401": { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "403": { description: "Access denied", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
      post: {
        tags: ["Reports"],
        summary: "Create a scheduled report (SUPER_ADMIN, Professional)",
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/CreateScheduledReport" } } } },
        responses: {
          "201": { description: "Report created", content: { "application/json": { schema: { $ref: "#/components/schemas/ScheduledReport" } } } },
          "400": { description: "Invalid data", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "403": { description: "Feature requires Professional license", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/api/reports/{id}": {
      put: {
        tags: ["Reports"],
        summary: "Update a scheduled report",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/CreateScheduledReport" } } } },
        responses: {
          "200": { description: "Report updated", content: { "application/json": { schema: { $ref: "#/components/schemas/ScheduledReport" } } } },
          "404": { description: "Report not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
      delete: {
        tags: ["Reports"],
        summary: "Delete a scheduled report",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Report deleted", content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" } } } } } },
          "404": { description: "Report not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/api/reports/{id}/preview": {
      post: {
        tags: ["Reports"],
        summary: "Generate and preview report HTML",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "HTML content", content: { "text/html": { schema: { type: "string" } } } },
          "404": { description: "Report not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/api/reports/{id}/send": {
      post: {
        tags: ["Reports"],
        summary: "Generate and send report immediately",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": {
            description: "Send result",
            content: { "application/json": { schema: { type: "object", properties: { channels: { type: "array", items: { type: "string" } }, status: { type: "string" }, error: { type: "string", nullable: true } } } } },
          },
          "404": { description: "Report not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/api/reports/{id}/history": {
      get: {
        tags: ["Reports"],
        summary: "Get send history for a report",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Report history", content: { "application/json": { schema: { type: "object", properties: { data: { type: "array", items: { $ref: "#/components/schemas/ReportHistory" } } } } } } },
          "404": { description: "Report not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/api/reports/history/{historyId}": {
      get: {
        tags: ["Reports"],
        summary: "Get HTML content of a specific report history entry",
        parameters: [{ name: "historyId", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "HTML content", content: { "text/html": { schema: { type: "string" } } } },
          "404": { description: "History entry not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/api/webhooks/{id}/logs": {
      get: {
        tags: ["Webhooks"],
        summary: "Get delivery logs",
        security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Webhook delivery logs", content: { "application/json": { schema: { type: "object", properties: { data: { type: "array", items: { $ref: "#/components/schemas/WebhookLog" } } } } } } },
          "401": { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "404": { description: "Webhook not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
  },
  tags: [
    { name: "Health", description: "API health check" },
    { name: "Auth", description: "Authentication and session management" },
    { name: "Items", description: "CRUD for monitored items" },
    { name: "Sources", description: "Version check source management" },
    { name: "Logs", description: "Audit log" },
    { name: "Users", description: "User management (SUPER_ADMIN)" },
    { name: "API Keys", description: "API key management (SUPER_ADMIN)" },
    { name: "Webhooks", description: "Webhook management and delivery logs" },
    { name: "Reports", description: "Scheduled reports management (Professional)" },
  ],
};

export async function GET() {
  return NextResponse.json(spec, {
    headers: {
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
