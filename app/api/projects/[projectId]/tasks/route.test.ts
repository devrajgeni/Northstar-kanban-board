/** @jest-environment node */

import { getServerSession } from "next-auth";
import { createTaskForUser } from "../../../../../lib/tasks";
import { POST } from "./route";

jest.mock("next-auth", () => ({ getServerSession: jest.fn() }));
jest.mock("../../../../../lib/tasks", () => ({ createTaskForUser: jest.fn() }));

const projectId = "3de55161-2d23-4b4f-b546-ebc0f6170d7a";
const columnId = "d7a42e41-2d23-4b4f-b546-ebc0f6170d7a";
const mockedSession = jest.mocked(getServerSession);
const mockedCreateTask = jest.mocked(createTaskForUser);
const request = (body: unknown) => new Request("http://localhost", { method: "POST", body: JSON.stringify(body) });

describe("POST /api/projects/{projectId}/tasks", () => {
  beforeEach(() => jest.resetAllMocks());

  test("rejects signed-out and invalid requests", async () => {
    mockedSession.mockResolvedValue(null);
    expect((await POST(request({}), { params: { projectId } })).status).toBe(401);
    mockedSession.mockResolvedValue({ user: { email: "person@example.com" } } as never);
    expect((await POST(request({}), { params: { projectId } })).status).toBe(400);
    expect((await POST(request({ columnId, title: "Task", assigneeIds: [columnId] }), { params: { projectId } })).status).toBe(422);
  });

  test("returns role and creation results without trusting client workspace data", async () => {
    mockedSession.mockResolvedValue({ user: { email: "person@example.com" } } as never);
    mockedCreateTask.mockResolvedValue({ kind: "forbidden" });
    expect((await POST(request({ columnId, title: "Task" }), { params: { projectId } })).status).toBe(403);
    mockedCreateTask.mockResolvedValue({ kind: "created", task: { id: projectId, project_id: projectId, column_id: columnId, title: "Task", description: "", priority: "medium", due_at: null, position: "1024", version: 1 } });
    const response = await POST(request({ columnId, title: "Task" }), { params: { projectId } });
    expect(mockedCreateTask).toHaveBeenLastCalledWith("person@example.com", projectId, expect.objectContaining({ title: "Task" }));
    expect(response.status).toBe(201);
  });
});