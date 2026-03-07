/**
 * Mock API helpers for Playwright E2E tests.
 * Intercepts fetch requests to the backend so tests run without a real API.
 */

/** A reusable participant record */
export const mockParticipant = {
  participantId: "test-id-123",
  name: "John Smith",
  lowerName: "john smith",
  email: "john@example.com",
  phone: "07700900000",
  postcode: "BN1",
  emergencyName: "Jane Smith",
  emergencyPhone: "07700900001",
  source: "import",
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-01T00:00:00.000Z",
};

/** A participant missing optional details (triggers the UpdateDetailsForm) */
export const incompleteParticipant = {
  participantId: "test-id-456",
  name: "Bob Jones",
  lowerName: "bob jones",
  email: "bob@example.com",
  phone: null,
  postcode: null,
  emergencyName: null,
  emergencyPhone: null,
  source: "import",
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-01T00:00:00.000Z",
};

/**
 * Sets up API route mocks on the page.
 * @param {import('@playwright/test').Page} page
 * @param {object} overrides - per-route response overrides
 */
export async function mockApi(page, overrides = {}) {
  // Default responses for each endpoint
  const defaults = {
    search: { found: true, participants: [mockParticipant] },
    create: { participant: mockParticipant, message: "Participant registered successfully" },
    update: { participant: mockParticipant, message: "Participant updated successfully" },
    checkin: { participant: { ...mockParticipant, lastCheckedIn: new Date().toISOString() }, message: "Checked in successfully" },
  };

  const responses = { ...defaults, ...overrides };

  await page.route("**/participants/search", (route) => {
    if (route.request().method() === "OPTIONS") {
      return route.fulfill({ status: 200, headers: corsHeaders() });
    }
    const status = overrides.searchStatus || 200;
    return route.fulfill({
      status,
      contentType: "application/json",
      headers: corsHeaders(),
      body: JSON.stringify(responses.search),
    });
  });

  await page.route("**/participants/checkin", (route) => {
    if (route.request().method() === "OPTIONS") {
      return route.fulfill({ status: 200, headers: corsHeaders() });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: corsHeaders(),
      body: JSON.stringify(responses.checkin),
    });
  });

  // Match /participants exactly (not /participants/search or /participants/checkin)
  await page.route(/\/participants$/, (route) => {
    if (route.request().method() === "OPTIONS") {
      return route.fulfill({ status: 200, headers: corsHeaders() });
    }
    if (route.request().method() === "PUT") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: corsHeaders(),
        body: JSON.stringify(responses.update),
      });
    }
    // POST = create
    const status = overrides.createStatus || 201;
    return route.fulfill({
      status,
      contentType: "application/json",
      headers: corsHeaders(),
      body: JSON.stringify(responses.create),
    });
  });
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
  };
}
