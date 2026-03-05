import { test, expect } from "@playwright/test";
import { mockApi, mockParticipant, incompleteParticipant } from "./helpers.js";

test.describe("Search screen", () => {
  test("shows the search form on load", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Check In or Sign Up" })).toBeVisible();
    await expect(page.getByLabel(/name, email, or phone/i)).toBeFocused();
  });

  test("search button is disabled when input is too short", async ({ page }) => {
    await page.goto("/");
    const btn = page.getByRole("button", { name: "Search" });
    await expect(btn).toBeDisabled();

    await page.getByLabel(/name, email, or phone/i).fill("A");
    await expect(btn).toBeDisabled();

    await page.getByLabel(/name, email, or phone/i).fill("Ab");
    await expect(btn).toBeEnabled();
  });
});

test.describe("Returning participant — full details", () => {
  test("search → select → disclaimer → success", async ({ page }) => {
    await mockApi(page);
    await page.goto("/");

    // Search
    await page.getByLabel(/name, email, or phone/i).fill("John");
    await page.getByRole("button", { name: "Search" }).click();

    // Results
    await expect(page.getByText("We found you!")).toBeVisible();
    await expect(page.getByText("John Smith")).toBeVisible();
    await expect(page.getByText("john@example.com")).toBeVisible();

    // Select participant
    await page.getByText("John Smith").click();

    // Disclaimer (participant has all details so goes straight here)
    await expect(page.getByRole("heading", { name: "Safety Disclaimer" })).toBeVisible();
    await expect(page.getByText(/muddy paths/i)).toBeVisible();
    await expect(page.getByText(/each participant is responsible/i)).toBeVisible();
    await expect(page.getByText("Checking in: John Smith")).toBeVisible();

    // Accept
    await page.getByRole("button", { name: /I Accept/i }).click();

    // Success
    await expect(page.getByRole("heading", { name: "Welcome Back!" })).toBeVisible();
    await expect(page.getByText("You're checked in")).toBeVisible();
    await expect(page.getByText("This screen will reset automatically")).toBeVisible();
  });
});

test.describe("Returning participant — missing details", () => {
  test("search → select → update details → disclaimer → success", async ({ page }) => {
    const updated = {
      ...incompleteParticipant,
      phone: "07700111222",
      postcode: "TN34",
      emergencyName: "Alice Jones",
      emergencyPhone: "07700333444",
    };

    await mockApi(page, {
      search: { found: true, participants: [incompleteParticipant] },
      update: { participant: updated, message: "Participant updated successfully" },
      checkin: { participant: { ...updated, lastCheckedIn: new Date().toISOString() }, message: "Checked in successfully" },
    });
    await page.goto("/");

    // Search
    await page.getByLabel(/name, email, or phone/i).fill("Bob");
    await page.getByRole("button", { name: "Search" }).click();

    // Select incomplete participant
    await page.getByText("Bob Jones").click();

    // Update form should appear for missing fields
    await expect(page.getByRole("heading", { name: /Welcome back, Bob Jones/i })).toBeVisible();
    await expect(page.getByText("missing some of your details")).toBeVisible();

    // Phone, postcode, and emergency fields should be shown
    await expect(page.getByLabel("Phone Number")).toBeVisible();
    await expect(page.getByLabel(/Postcode/i)).toBeVisible();
    await expect(page.getByLabel("Contact Name")).toBeVisible();
    await expect(page.getByLabel("Contact Phone")).toBeVisible();

    // Email should NOT be shown (already has it)
    await expect(page.getByLabel("Email")).not.toBeVisible();

    // Fill in the missing fields
    await page.getByLabel("Phone Number").fill("07700111222");
    await page.getByLabel(/Postcode/i).fill("TN34");
    await page.getByLabel("Contact Name").fill("Alice Jones");
    await page.getByLabel("Contact Phone").fill("07700333444");

    // Submit update
    await page.getByRole("button", { name: "Update My Details" }).click();

    // Should go to disclaimer
    await expect(page.getByRole("heading", { name: "Safety Disclaimer" })).toBeVisible();

    // Accept and check in
    await page.getByRole("button", { name: /I Accept/i }).click();
    await expect(page.getByRole("heading", { name: "Welcome Back!" })).toBeVisible();
  });

  test("can skip updating details", async ({ page }) => {
    await mockApi(page, {
      search: { found: true, participants: [incompleteParticipant] },
      checkin: { participant: { ...incompleteParticipant, lastCheckedIn: new Date().toISOString() }, message: "Checked in successfully" },
    });
    await page.goto("/");

    await page.getByLabel(/name, email, or phone/i).fill("Bob");
    await page.getByRole("button", { name: "Search" }).click();
    await page.getByText("Bob Jones").click();

    // Skip
    await page.getByRole("button", { name: /Skip for now/i }).click();

    // Should go straight to disclaimer
    await expect(page.getByRole("heading", { name: "Safety Disclaimer" })).toBeVisible();
  });
});

test.describe("New participant signup", () => {
  test("search with no results → signup form → disclaimer → success", async ({ page }) => {
    const newParticipant = {
      participantId: "new-id-789",
      name: "Dave Wilson",
      email: "dave@example.com",
      phone: "07700555666",
      postcode: "RH10",
      emergencyName: "Sue Wilson",
      emergencyPhone: "07700777888",
    };

    await mockApi(page, {
      search: { found: false, participants: [] },
      create: { participant: newParticipant, message: "Participant registered successfully" },
      checkin: { participant: { ...newParticipant, lastCheckedIn: new Date().toISOString() }, message: "Checked in successfully" },
    });
    await page.goto("/");

    // Search with no results goes to signup
    await page.getByLabel(/name, email, or phone/i).fill("Dave Wilson");
    await page.getByRole("button", { name: "Search" }).click();

    // Signup form
    await expect(page.getByRole("heading", { name: /New Participant/i })).toBeVisible();
    await expect(page.getByLabel("Full Name *")).toHaveValue("Dave Wilson"); // pre-filled from search

    // Fill required fields
    await page.getByLabel("Email").fill("dave@example.com");
    await page.getByLabel("Phone Number").fill("07700555666");
    await page.getByLabel(/Postcode/i).fill("RH10");
    await page.getByLabel("Contact Name").fill("Sue Wilson");
    await page.getByLabel("Contact Phone").fill("07700777888");

    await page.getByRole("button", { name: "Sign Up" }).click();

    // Should go to disclaimer (new signup still needs disclaimer)
    await expect(page.getByRole("heading", { name: "Safety Disclaimer" })).toBeVisible();

    // Accept
    await page.getByRole("button", { name: /I Accept/i }).click();

    // Success — new signup shows "Welcome!" not "Welcome Back!"
    await expect(page.getByRole("heading", { name: "Welcome!" })).toBeVisible();
    await expect(page.getByText("registered for the Men's Way of the Cross")).toBeVisible();
  });

  test("signup requires name and at least email or phone", async ({ page }) => {
    await mockApi(page, {
      search: { found: false, participants: [] },
    });
    await page.goto("/");

    await page.getByLabel(/name, email, or phone/i).fill("nobody");
    await page.getByRole("button", { name: "Search" }).click();

    // Signup form — button should be disabled with no input
    const signupBtn = page.getByRole("button", { name: "Sign Up" });
    await expect(signupBtn).toBeDisabled();

    // Just name → still disabled
    await page.getByLabel("Full Name *").fill("Test Name");
    await expect(signupBtn).toBeDisabled();

    // Name + email → enabled
    await page.getByLabel("Email").fill("test@test.com");
    await expect(signupBtn).toBeEnabled();
  });

  test("can navigate to signup from results via 'not in the list' button", async ({ page }) => {
    await mockApi(page);
    await page.goto("/");

    await page.getByLabel(/name, email, or phone/i).fill("John");
    await page.getByRole("button", { name: "Search" }).click();
    await expect(page.getByText("We found you!")).toBeVisible();

    // Click "not in the list"
    await page.getByRole("button", { name: /not in the list/i }).click();
    await expect(page.getByRole("heading", { name: /New Participant/i })).toBeVisible();
  });
});

test.describe("Navigation", () => {
  test("Start Over resets to search from any view", async ({ page }) => {
    await mockApi(page);
    await page.goto("/");

    // Go to results
    await page.getByLabel(/name, email, or phone/i).fill("John");
    await page.getByRole("button", { name: "Search" }).click();
    await expect(page.getByText("We found you!")).toBeVisible();

    // Start Over
    await page.getByRole("button", { name: "Start Over" }).click();
    await expect(page.getByRole("heading", { name: "Check In or Sign Up" })).toBeVisible();
    await expect(page.getByLabel(/name, email, or phone/i)).toHaveValue("");
  });

  test("Back to Search from signup form", async ({ page }) => {
    await mockApi(page, {
      search: { found: false, participants: [] },
    });
    await page.goto("/");

    await page.getByLabel(/name, email, or phone/i).fill("nobody");
    await page.getByRole("button", { name: "Search" }).click();

    await page.getByRole("button", { name: "Back to Search" }).click();
    await expect(page.getByRole("heading", { name: "Check In or Sign Up" })).toBeVisible();
  });

  test("Next Person on success screen resets to search", async ({ page }) => {
    await mockApi(page);
    await page.goto("/");

    await page.getByLabel(/name, email, or phone/i).fill("John");
    await page.getByRole("button", { name: "Search" }).click();
    await page.getByText("John Smith").click();
    await page.getByRole("button", { name: /I Accept/i }).click();

    await expect(page.getByRole("heading", { name: "Welcome Back!" })).toBeVisible();
    await page.getByRole("button", { name: "Next Person" }).click();
    await expect(page.getByRole("heading", { name: "Check In or Sign Up" })).toBeVisible();
  });
});

test.describe("Error handling", () => {
  test("shows error when search API fails", async ({ page }) => {
    await page.route("**/participants/search", (route) => {
      return route.fulfill({
        status: 500,
        contentType: "application/json",
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "Internal server error" }),
      });
    });
    await page.goto("/");

    await page.getByLabel(/name, email, or phone/i).fill("John");
    await page.getByRole("button", { name: "Search" }).click();

    await expect(page.getByText("Internal server error")).toBeVisible();
  });

  test("handles duplicate participant on signup (409)", async ({ page }) => {
    await mockApi(page, {
      search: { found: false, participants: [] },
      create: { participant: mockParticipant, error: "A participant with this email already exists" },
      createStatus: 409,
    });
    await page.goto("/");

    await page.getByLabel(/name, email, or phone/i).fill("nobody");
    await page.getByRole("button", { name: "Search" }).click();

    await page.getByLabel("Full Name *").fill("John Smith");
    await page.getByLabel("Email").fill("john@example.com");
    await page.getByRole("button", { name: "Sign Up" }).click();

    // 409 still proceeds to disclaimer (existing participant returned)
    await expect(page.getByRole("heading", { name: "Safety Disclaimer" })).toBeVisible();
  });
});

test.describe("Header", () => {
  test("shows app title and cross icon", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /Men's Way of the Cross/i })).toBeVisible();
    await expect(page.getByText("Participant Check-In")).toBeVisible();
  });
});
