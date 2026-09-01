/** @jest-environment node */

import { getServerSession } from "next-auth";
import { ensureWorkspaceForUser, listWorkspacesForUser } from "../../../lib/workspaces";
import { GET } from "./route";

jest.mock("next-auth", () => ({ getServerSession: jest.fn() }));
jest.mock("../../../lib/workspaces", () => ({
  ensureWorkspaceForUser: jest.fn(),
  listWorkspacesForUser: jest.fn(),
}));

const mockedSession = jest.mocked(getServerSession);
const mockedEnsureWorkspace = jest.mocked(ensureWorkspaceForUser);
const mockedListWorkspaces = jest.mocked(listWorkspacesForUser);

describe("GET /api/workspaces", () => {
  beforeEach(() => jest.resetAllMocks());

  test("rejects a signed-out request", async () => {
    mockedSession.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized", code: "UNAUTHORIZED" });
  });

  test("provisions a first-time user and returns their workspaces", async () => {
    mockedSession.mockResolvedValue({ user: { email: "person@example.com", name: "Person" } } as never);
    mockedListWorkspaces.mockResolvedValue([{ id: "workspace-id", slug: "workspace-person", name: "Person's workspace", role: "owner" }]);

    const response = await GET();

    expect(mockedEnsureWorkspace).toHaveBeenCalledWith("person@example.com", "Person");
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ workspaces: [{ id: "workspace-id", slug: "workspace-person", name: "Person's workspace", role: "owner" }] });
  });

  test("returns existing member workspaces after idempotent provisioning", async () => {
    mockedSession.mockResolvedValue({ user: { email: "member@example.com" } } as never);
    mockedListWorkspaces.mockResolvedValue([{ id: "existing-workspace", slug: "existing-workspace", name: "Existing workspace", role: "member" }]);

    const response = await GET();

    expect(mockedEnsureWorkspace).toHaveBeenCalledWith("member@example.com", "member");
    await expect(response.json()).resolves.toEqual({ workspaces: [{ id: "existing-workspace", slug: "existing-workspace", name: "Existing workspace", role: "member" }] });
  });
});