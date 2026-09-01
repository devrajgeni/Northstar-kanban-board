/** @jest-environment node */

import { getServerSession } from "next-auth";
import { getBoardForWorkspace } from "../../../../../lib/workspaces";
import { GET } from "./route";

jest.mock("next-auth", () => ({ getServerSession: jest.fn() }));
jest.mock("../../../../../lib/workspaces", () => ({ getBoardForWorkspace: jest.fn() }));

const workspaceId = "3de55161-2d23-4b4f-b546-ebc0f6170d7a";
const mockedSession = jest.mocked(getServerSession);
const mockedGetBoard = jest.mocked(getBoardForWorkspace);

describe("GET /api/workspaces/{workspaceId}/board", () => {
  beforeEach(() => jest.resetAllMocks());

  test("rejects a signed-out request", async () => {
    mockedSession.mockResolvedValue(null);

    const response = await GET(new Request("http://localhost"), { params: { workspaceId } });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized", code: "UNAUTHORIZED" });
  });

  test("rejects malformed workspace IDs before reading the database", async () => {
    mockedSession.mockResolvedValue({ user: { email: "person@example.com" } } as never);

    const response = await GET(new Request("http://localhost"), { params: { workspaceId: "invalid" } });

    expect(mockedGetBoard).not.toHaveBeenCalled();
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid workspace ID", code: "INVALID_WORKSPACE_ID" });
  });

  test("returns a board only for an authorized membership", async () => {
    mockedSession.mockResolvedValue({ user: { email: "person@example.com" } } as never);
    mockedGetBoard.mockResolvedValue({ role: "owner", projects: [], columns: [], tasks: [] });

    const response = await GET(new Request("http://localhost"), { params: { workspaceId } });

    expect(mockedGetBoard).toHaveBeenCalledWith("person@example.com", workspaceId);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ role: "owner", projects: [], columns: [], tasks: [] });
  });

  test.each(["member", "viewer"] as const)("allows a %s to read an authorized board", async (role) => {
    mockedSession.mockResolvedValue({ user: { email: "person@example.com" } } as never);
    mockedGetBoard.mockResolvedValue({ role, projects: [], columns: [], tasks: [] });

    const response = await GET(new Request("http://localhost"), { params: { workspaceId } });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ role, projects: [], columns: [], tasks: [] });
  });

  test("hides nonexistent and unrelated workspaces", async () => {
    mockedSession.mockResolvedValue({ user: { email: "person@example.com" } } as never);
    mockedGetBoard.mockResolvedValue(null);

    const response = await GET(new Request("http://localhost"), { params: { workspaceId } });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Workspace not found", code: "WORKSPACE_NOT_FOUND" });
  });
});