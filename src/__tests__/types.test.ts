import { describe, expect, it } from "vitest";
import {
  AccountResponseSchema,
  AppDataResponseSchema,
  CreateAdvancedAlertArgsSchema,
  CreateBasicAlertArgsSchema,
  GetAlertArgsSchema,
  ListAlertsArgsSchema,
  PauseAlertArgsSchema,
  UnpauseAlertArgsSchema,
  UpdateAlertArgsSchema,
} from "../types.js";

describe("Schema Validation", () => {
  describe("ListAlertsArgsSchema", () => {
    it("should validate valid arguments", () => {
      const valid = { limit: 50, cursor: "next-page" };
      expect(() => ListAlertsArgsSchema.parse(valid)).not.toThrow();
    });

    it("should accept empty object", () => {
      expect(() => ListAlertsArgsSchema.parse({})).not.toThrow();
    });

    it("should reject invalid limit", () => {
      const invalid = { limit: 0 };
      expect(() => ListAlertsArgsSchema.parse(invalid)).toThrow();
    });

    it("should reject limit over 100", () => {
      const invalid = { limit: 101 };
      expect(() => ListAlertsArgsSchema.parse(invalid)).toThrow();
    });
  });

  describe("CreateBasicAlertArgsSchema", () => {
    it("should validate minimal valid alert", () => {
      const valid = {
        group_id: "group-123",
        name: "Test Alert",
        included_keywords: ["test"],
        languages: ["en"],
        sources: ["web"],
      };
      expect(() => CreateBasicAlertArgsSchema.parse(valid)).not.toThrow();
    });

    it("should validate complete alert", () => {
      const valid = {
        group_id: "group-123",
        name: "Complete Alert",
        description: "A test alert",
        color: "#ff0000",
        included_keywords: ["test", "keyword"],
        required_keywords: ["required"],
        excluded_keywords: ["spam"],
        monitored_website: {
          domain: "example.com",
          block_self: true,
        },
        languages: ["en", "fr"],
        countries: ["US", "FR"],
        sources: ["twitter", "news"],
        blocked_sites: ["spam.com"],
        noise_detection: false,
      };
      expect(() => CreateBasicAlertArgsSchema.parse(valid)).not.toThrow();
    });

    it("should reject empty name", () => {
      const invalid = {
        name: "",
        included_keywords: ["test"],
      };
      expect(() => CreateBasicAlertArgsSchema.parse(invalid)).toThrow();
    });

    it("should reject invalid color format", () => {
      const invalid = {
        name: "Test",
        color: "red",
        included_keywords: ["test"],
      };
      expect(() => CreateBasicAlertArgsSchema.parse(invalid)).toThrow();
    });

    it("should reject too many languages", () => {
      const invalid = {
        name: "Test",
        included_keywords: ["test"],
        languages: ["en", "fr", "de", "es", "it", "pt"],
      };
      expect(() => CreateBasicAlertArgsSchema.parse(invalid)).toThrow();
    });

    it("should reject empty included_keywords", () => {
      const invalid = {
        name: "Test",
        included_keywords: [],
      };
      expect(() => CreateBasicAlertArgsSchema.parse(invalid)).toThrow();
    });
  });

  describe("CreateAdvancedAlertArgsSchema", () => {
    it("should validate minimal advanced alert", () => {
      const valid = {
        group_id: "group-123",
        name: "Advanced Alert",
        query_string: "(NASA OR SpaceX) AND mars",
        languages: ["en"],
        sources: ["web"],
      };
      expect(() => CreateAdvancedAlertArgsSchema.parse(valid)).not.toThrow();
    });

    it("should require query_string", () => {
      const invalid = {
        name: "Advanced Alert",
      };
      expect(() => CreateAdvancedAlertArgsSchema.parse(invalid)).toThrow();
    });
  });

  describe("UpdateAlertArgsSchema", () => {
    it("should validate with alert_id only", () => {
      const valid = {
        alert_id: "alert-123",
      };
      expect(() => UpdateAlertArgsSchema.parse(valid)).not.toThrow();
    });

    it("should validate with all fields", () => {
      const valid = {
        alert_id: "alert-123",
        name: "Updated Alert",
        query_type: "basic" as const,
        included_keywords: ["updated"],
      };
      expect(() => UpdateAlertArgsSchema.parse(valid)).not.toThrow();
    });

    it("should require alert_id", () => {
      const invalid = {
        name: "Updated Alert",
      };
      expect(() => UpdateAlertArgsSchema.parse(invalid)).toThrow();
    });
  });

  describe("AccountResponseSchema", () => {
    it("should validate account response", () => {
      const valid = {
        account: {
          id: "account-123",
          subscription: {
            advanced_query_access: true,
          },
          groups: [
            {
              id: "group-1",
              name: "Test Group",
            },
          ],
        },
      };
      expect(() => AccountResponseSchema.parse(valid)).not.toThrow();
    });

    it("should validate without groups", () => {
      const valid = {
        account: {
          id: "account-123",
          subscription: {
            advanced_query_access: false,
          },
        },
      };
      expect(() => AccountResponseSchema.parse(valid)).not.toThrow();
    });
  });

  describe("AppDataResponseSchema", () => {
    it("should validate app data response", () => {
      const valid = {
        alert_languages: {
          en: { name: "English" },
          fr: { name: "French" },
        },
        alert_countries: {
          US: "United States",
          FR: "France",
        },
        alert_sources: {
          twitter: { name: "Twitter", hidden: false },
          hidden_source: { name: "Hidden", hidden: true },
        },
      };
      expect(() => AppDataResponseSchema.parse(valid)).not.toThrow();
    });

    it("should validate empty app data", () => {
      const valid = {};
      expect(() => AppDataResponseSchema.parse(valid)).not.toThrow();
    });
  });
});
